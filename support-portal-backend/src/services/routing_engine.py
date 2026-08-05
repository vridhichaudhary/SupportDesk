"""
AI Routing Engine — Heart of SPEC-013.

Pipeline:
  1. Classify ticket (category, priority, intent, sentiment) via Gemini.
  2. Evaluate AutomationRules — rules run before AI fills gaps.
  3. Rank agents using skills, availability, active load, and working hours.
  4. Select best team and department.
  5. Persist RoutingDecision, update Ticket, create AssignmentHistory.
"""
import json
import time
import uuid
import structlog
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple

from sqlalchemy.orm import Session
from sqlalchemy import and_, func

import google.generativeai as genai

from src.core.config import settings
from src.core.database import SessionLocal
from src.models import (
    Ticket, TicketPriority, TicketCategory, TicketStatus,
    User, Team, Department, AgentAvailability, AgentStatus, AgentSkill,
    WorkingHours, AutomationRule, RoutingDecision, AssignmentHistory,
    WorkflowExecution, ActionType, AuditLog
)

logger = structlog.get_logger()

# SLA matrix: priority -> hours
SLA_HOURS = {
    "CRITICAL": 1,
    "HIGH": 4,
    "MEDIUM": 24,
    "LOW": 72,
}

CATEGORY_PRIORITY_BOOST = {
    "SECURITY": "HIGH",
    "BILLING": "MEDIUM",
}

MODEL_VERSION = "gemini-2.5-flash"


class RoutingEngine:
    def __init__(self):
        if settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.model = genai.GenerativeModel(MODEL_VERSION)
        else:
            self.model = None

    # ------------------------------------------------------------------
    # Step 1: AI Classification
    # ------------------------------------------------------------------
    def classify_ticket(self, subject: str, body: str) -> Dict[str, Any]:
        """
        Call Gemini to classify the ticket. Returns structured JSON.
        Falls back to defaults if model is unavailable.
        """
        if not self.model:
            return self._default_classification()

        prompt = f"""
You are a support ticket classifier. Analyze the ticket below and return a JSON object only.

Ticket Subject: {subject}
Ticket Body: {body}

Return this exact JSON schema, with no extra text:
{{
  "category": "<one of: BILLING, TECHNICAL, BUG_REPORT, FEATURE_REQUEST, ACCOUNT, SECURITY, SALES, GENERAL>",
  "priority": "<one of: LOW, MEDIUM, HIGH, CRITICAL>",
  "intent": "<a short 1-sentence description of what the customer wants>",
  "sentiment": "<one of: POSITIVE, NEUTRAL, NEGATIVE, URGENT>",
  "suggested_tags": ["<tag1>", "<tag2>"],
  "confidence": <integer 0-100>,
  "reasoning": "<1-2 sentences explaining your classification>"
}}
"""
        try:
            response = self.model.generate_content(prompt)
            text = response.text.strip()
            # strip any markdown fences
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            return json.loads(text.strip())
        except Exception as e:
            logger.error("Gemini classification failed", error=str(e))
            return self._default_classification()

    def _default_classification(self) -> Dict[str, Any]:
        return {
            "category": "GENERAL",
            "priority": "MEDIUM",
            "intent": "Ticket requires manual review.",
            "sentiment": "NEUTRAL",
            "suggested_tags": [],
            "confidence": 0,
            "reasoning": "AI model unavailable — defaulting to GENERAL/MEDIUM.",
        }

    # ------------------------------------------------------------------
    # Step 2: Rule Engine
    # ------------------------------------------------------------------
    def evaluate_rules(self, db: Session, org_id: uuid.UUID, ticket: Ticket, classification: Dict) -> Dict[str, Any]:
        """
        Evaluate AutomationRules for the organization. Rules can override
        classification outputs. Returns a dict of override values.
        """
        rules = db.query(AutomationRule).filter(
            AutomationRule.organization_id == org_id,
            AutomationRule.is_active == True,
            AutomationRule.trigger_event == "TICKET_CREATED"
        ).all()

        overrides: Dict[str, Any] = {}
        executed_rules: List[Tuple[AutomationRule, str]] = []

        for rule in rules:
            conditions = rule.conditions_json or {}
            matched = True

            for key, expected in conditions.items():
                actual = None
                if key == "category":
                    actual = classification.get("category", "GENERAL")
                elif key == "priority":
                    actual = classification.get("priority", "MEDIUM")
                elif key == "sentiment":
                    actual = classification.get("sentiment", "NEUTRAL")
                elif key == "customer_language":
                    actual = ticket.customer.language if ticket.customer else "en"
                elif key == "is_vip":
                    actual = ticket.customer.is_vip if ticket.customer else False
                elif key == "keyword_in_subject":
                    actual = expected.lower() in ticket.subject.lower()
                    expected = True
                elif key == "keyword_in_body":
                    actual = expected.lower() in ticket.body.lower()
                    expected = True

                if actual != expected:
                    matched = False
                    break

            if matched:
                actions = rule.actions_json or {}
                for action_key, action_val in actions.items():
                    if action_key == "set_priority":
                        overrides["priority"] = action_val
                    elif action_key == "set_category":
                        overrides["category"] = action_val
                    elif action_key == "set_team_id":
                        overrides["team_id"] = uuid.UUID(action_val)
                    elif action_key == "set_department_id":
                        overrides["department_id"] = uuid.UUID(action_val)

                executed_rules.append((rule, "Rule matched and applied."))
                logger.info("Automation rule matched", rule_name=rule.name, ticket_id=str(ticket.id))

        return overrides, executed_rules

    # ------------------------------------------------------------------
    # Step 3: Agent Ranking
    # ------------------------------------------------------------------
    def rank_agents(self, db: Session, org_id: uuid.UUID, category: str, team_id: Optional[uuid.UUID]) -> List[Dict]:
        """
        Rank available agents. Factors: availability, active load, skills matching category.
        Returns up to 5 best agents.
        """
        query = db.query(User).filter(
            User.organization_id == org_id,
            User.role.in_(["AGENT", "ADMIN", "OWNER"]),
            User.is_active == True
        )

        if team_id:
            from src.models import team_members
            agent_ids_in_team = db.execute(
                __import__("sqlalchemy", fromlist=["select"]).select(
                    team_members.c.user_id
                ).where(team_members.c.team_id == team_id)
            ).scalars().all()
            if agent_ids_in_team:
                query = query.filter(User.id.in_(agent_ids_in_team))

        agents = query.all()

        ranked = []
        for agent in agents:
            score = 0.0

            # Availability
            avail = agent.availability[0] if agent.availability else None
            if avail:
                if avail.status == AgentStatus.AVAILABLE:
                    score += 40
                elif avail.status == AgentStatus.BUSY:
                    score += 10
                else:
                    score -= 20  # OFFLINE, AWAY, BREAK

            # Skill match
            category_map = {
                "BILLING": "BILLING",
                "TECHNICAL": "TECHNICAL",
                "BUG_REPORT": "TECHNICAL",
                "SALES": "SALES",
            }
            target_category = category_map.get(category, None)
            if target_category:
                from src.models import SkillCategory, ProficiencyLevel
                proficiency_weights = {
                    "BEGINNER": 5,
                    "INTERMEDIATE": 15,
                    "ADVANCED": 25,
                    "EXPERT": 35,
                }
                for agent_skill in agent.skills:
                    if agent_skill.skill and agent_skill.skill.category.value == target_category:
                        score += proficiency_weights.get(agent_skill.proficiency_level.value, 5)

            # Active ticket load (lower is better)
            from sqlalchemy import func
            active_count = db.query(func.count(Ticket.id)).filter(
                Ticket.assigned_user_id == agent.id,
                Ticket.status.in_([TicketStatus.OPEN, TicketStatus.ASSIGNED])
            ).scalar() or 0
            score -= active_count * 5

            ranked.append({
                "agent_id": str(agent.id),
                "agent_name": agent.name,
                "agent_email": agent.email,
                "score": round(score, 2),
                "active_tickets": active_count,
                "availability": avail.status.value if avail else "UNKNOWN",
            })

        ranked.sort(key=lambda x: x["score"], reverse=True)
        return ranked[:5]

    # ------------------------------------------------------------------
    # Step 4: Team & Department Selection
    # ------------------------------------------------------------------
    def select_team_and_department(
        self, db: Session, org_id: uuid.UUID, category: str, rule_overrides: Dict
    ) -> Tuple[Optional[uuid.UUID], Optional[uuid.UUID]]:
        """
        Find the best team for a given category. Rule overrides take precedence.
        """
        team_id = rule_overrides.get("team_id")
        dept_id = rule_overrides.get("department_id")

        if not team_id:
            # Try to find team by matching department name
            category_dept_map = {
                "BILLING": "Billing",
                "TECHNICAL": "Technical Support",
                "BUG_REPORT": "Engineering",
                "SECURITY": "Security",
                "SALES": "Sales",
                "ACCOUNT": "Account Management",
            }
            dept_name = category_dept_map.get(category)
            if dept_name:
                dept = db.query(Department).filter(
                    Department.organization_id == org_id,
                    Department.name.ilike(f"%{dept_name}%")
                ).first()
                if dept:
                    dept_id = dept.id
                    team = db.query(Team).filter(Team.department_id == dept.id).first()
                    if team:
                        team_id = team.id
            else:
                # Fallback: pick first available team
                first_team = db.query(Team).filter(Team.organization_id == org_id).first()
                team_id = first_team.id if first_team else None

        return team_id, dept_id

    # ------------------------------------------------------------------
    # Step 5: Main Route Entry Point
    # ------------------------------------------------------------------
    def route(self, db: Session, ticket_id: uuid.UUID) -> Optional[RoutingDecision]:
        """
        Main pipeline: classify, rules, team select, agent rank, assign.
        """
        start_ms = int(time.time() * 1000)
        ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if not ticket:
            logger.error("Ticket not found for routing", ticket_id=str(ticket_id))
            return None

        org_id = ticket.organization_id

        # 1. Classify
        classification = self.classify_ticket(ticket.subject, ticket.body)
        category_str = classification.get("category", "GENERAL")
        priority_str = classification.get("priority", "MEDIUM")
        confidence = classification.get("confidence", 0)
        reasoning = classification.get("reasoning", "")
        suggested_tags = classification.get("suggested_tags", [])

        # 2. Rules (override classification)
        rule_overrides, executed_rules = self.evaluate_rules(db, org_id, ticket, classification)
        if "category" in rule_overrides:
            category_str = rule_overrides["category"]
            reasoning += " [Rule Override: Category]"
        if "priority" in rule_overrides:
            priority_str = rule_overrides["priority"]
            reasoning += " [Rule Override: Priority]"

        # 3. Team/Department
        team_id, dept_id = self.select_team_and_department(db, org_id, category_str, rule_overrides)

        # 4. Agent ranking
        top_agents = self.rank_agents(db, org_id, category_str, team_id)
        best_agent_id = uuid.UUID(top_agents[0]["agent_id"]) if top_agents else None

        # 5. SLA prediction
        sla_hours = SLA_HOURS.get(priority_str, 24)

        end_ms = int(time.time() * 1000)
        exec_time = end_ms - start_ms

        # 6. Apply to ticket
        try:
            category_enum = TicketCategory[category_str]
        except KeyError:
            category_enum = TicketCategory.GENERAL
        try:
            priority_enum = TicketPriority[priority_str]
        except KeyError:
            priority_enum = TicketPriority.MEDIUM

        ticket.category = category_enum
        ticket.priority = priority_enum
        if best_agent_id:
            ticket.assigned_user_id = best_agent_id
            ticket.status = TicketStatus.ASSIGNED
        if team_id:
            ticket.assigned_team_id = team_id
        if dept_id:
            ticket.department_id = dept_id
        if ticket.sla_due_at is None:
            from datetime import timedelta
            ticket.sla_due_at = datetime.utcnow() + timedelta(hours=sla_hours)

        # 7. RoutingDecision
        decision = RoutingDecision(
            organization_id=org_id,
            ticket_id=ticket_id,
            predicted_category=category_str,
            predicted_priority=priority_str,
            assigned_department_id=dept_id,
            assigned_team_id=team_id,
            assigned_agent_id=best_agent_id,
            suggested_tags_json=suggested_tags,
            suggested_sla_hours=sla_hours,
            confidence_score=confidence,
            reasoning=reasoning,
            execution_time_ms=exec_time,
            model_version=MODEL_VERSION if self.model else "fallback",
        )
        db.add(decision)

        # 8. AssignmentHistory entries
        if best_agent_id:
            db.add(AssignmentHistory(
                organization_id=org_id,
                ticket_id=ticket_id,
                actor_id=None,
                assignment_type="AGENT",
                old_value_id=None,
                new_value_id=best_agent_id,
                reason=f"Auto-assigned by AI Routing Engine. Confidence: {confidence}%",
                is_override=False,
            ))
        if team_id:
            db.add(AssignmentHistory(
                organization_id=org_id,
                ticket_id=ticket_id,
                actor_id=None,
                assignment_type="TEAM",
                old_value_id=None,
                new_value_id=team_id,
                reason=f"Auto-assigned by AI Routing Engine based on category: {category_str}",
                is_override=False,
            ))

        # 9. Workflow executions for matched rules
        for rule, log_msg in executed_rules:
            db.add(WorkflowExecution(
                organization_id=org_id,
                rule_id=rule.id,
                ticket_id=ticket_id,
                status="SUCCESS",
                logs=log_msg,
            ))

        # 10. Audit Log
        db.add(AuditLog(
            organization_id=org_id,
            actor_id=None,
            action_type=ActionType.TICKET_ASSIGNED,
            entity_type="Ticket",
            entity_id=ticket_id,
            changes_json={
                "category": category_str,
                "priority": priority_str,
                "agent_id": str(best_agent_id) if best_agent_id else None,
                "team_id": str(team_id) if team_id else None,
                "confidence": confidence,
                "routing_engine": "ai",
            },
        ))

        db.commit()
        db.refresh(decision)
        logger.info(
            "Ticket routed",
            ticket_id=str(ticket_id),
            category=category_str,
            priority=priority_str,
            agent=str(best_agent_id),
            confidence=confidence,
            exec_ms=exec_time,
        )
        return decision


routing_engine = RoutingEngine()
