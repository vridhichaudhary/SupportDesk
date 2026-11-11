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
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import google.generativeai as genai
import structlog
from sqlalchemy import func
from sqlalchemy.orm import Session

from src.core.config import settings
from src.models import (
    ActionType,
    AgentStatus,
    AssignmentHistory,
    AuditLog,
    AutomationRule,
    Department,
    RoutingDecision,
    Team,
    Ticket,
    TicketCategory,
    TicketPriority,
    TicketStatus,
    User,
    UserRole,
    WorkflowExecution,
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

MODEL_VERSION = settings.GEMINI_MODEL


class RoutingEngine:
    def __init__(self):
        self.model_version = settings.GEMINI_MODEL
        if settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.model = genai.GenerativeModel(self.model_version)
        else:
            self.model = None

    # ------------------------------------------------------------------
    # Step 1: AI Classification
    # ------------------------------------------------------------------
    def classify_ticket(self, subject: str, body: str) -> Dict[str, Any]:
        """
        Call Gemini to classify the ticket. Returns structured JSON.
        Falls back to defaults if model is unavailable or response is invalid.
        """
        if not self.model:
            logger.info("Gemini model not configured; using fallback classification")
            return self._default_classification(
                reason="AI model not configured — defaulting to GENERAL/MEDIUM."
            )

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
            text = (getattr(response, "text", "") or "").strip()
            # Strip any markdown code fences
            if "```" in text:
                parts = text.split("```")
                if len(parts) >= 2:
                    text = parts[1]
                    if text.startswith("json"):
                        text = text[4:]
                    text = text.strip()

            data = json.loads(text)
            if not isinstance(data, dict):
                raise ValueError(f"Expected JSON object, got {type(data).__name__}")

            # Validate and normalize category
            raw_category = str(data.get("category", "")).strip().upper()
            valid_categories = {c.name for c in TicketCategory}
            if raw_category in valid_categories:
                category = raw_category
            else:
                logger.warning(
                    "Invalid category from AI model; using GENERAL", raw_category=raw_category
                )
                category = TicketCategory.GENERAL.name

            # Validate and normalize priority
            raw_priority = str(data.get("priority", "")).strip().upper()
            valid_priorities = {p.name for p in TicketPriority}
            if raw_priority in valid_priorities:
                priority = raw_priority
            else:
                logger.warning(
                    "Invalid priority from AI model; using MEDIUM", raw_priority=raw_priority
                )
                priority = TicketPriority.MEDIUM.name

            # Validate confidence
            try:
                confidence = int(data.get("confidence", 50))
                confidence = max(0, min(100, confidence))
            except (ValueError, TypeError):
                confidence = 50

            # Suggested tags
            raw_tags = data.get("suggested_tags", [])
            suggested_tags = [
                str(t).strip() for t in raw_tags if isinstance(t, (str, int)) and str(t).strip()
            ]

            intent = str(data.get("intent", "")).strip() or "General customer support request."
            sentiment = str(data.get("sentiment", "NEUTRAL")).strip().upper()
            reasoning = str(data.get("reasoning", "")).strip() or "AI classification completed."

            return {
                "category": category,
                "priority": priority,
                "intent": intent,
                "sentiment": sentiment,
                "suggested_tags": suggested_tags,
                "confidence": confidence,
                "reasoning": reasoning,
                "is_fallback": False,
            }
        except Exception as e:
            logger.error("Gemini classification failed or returned invalid output", error=str(e))
            return self._default_classification(
                reason=f"AI classification error ({type(e).__name__}) — defaulting to GENERAL/MEDIUM."
            )

    def _default_classification(
        self, reason: str = "AI model unavailable — defaulting to GENERAL/MEDIUM."
    ) -> Dict[str, Any]:
        return {
            "category": TicketCategory.GENERAL.name,
            "priority": TicketPriority.MEDIUM.name,
            "intent": "Ticket requires manual review.",
            "sentiment": "NEUTRAL",
            "suggested_tags": [],
            "confidence": 0,
            "reasoning": reason,
            "is_fallback": True,
        }

    # ------------------------------------------------------------------
    # Step 2: Rule Engine
    # ------------------------------------------------------------------
    def evaluate_rules(
        self, db: Session, org_id: uuid.UUID, ticket: Ticket, classification: Dict[str, Any]
    ) -> Tuple[Dict[str, Any], List[Tuple[AutomationRule, str]]]:
        """
        Evaluate AutomationRules for the organization. Rules can override
        classification outputs. Returns a dict of override values.
        """
        rules = (
            db.query(AutomationRule)
            .filter(
                AutomationRule.organization_id == org_id,
                AutomationRule.is_active,
                AutomationRule.trigger_event == "TICKET_CREATED",
            )
            .all()
        )

        overrides: Dict[str, Any] = {}
        executed_rules: List[Tuple[AutomationRule, str]] = []

        for rule in rules:
            conditions = rule.conditions_json or {}
            matched = self._match_conditions(conditions, classification, ticket)  # type: ignore[arg-type]

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
                logger.info(
                    "Automation rule matched", rule_name=rule.name, ticket_id=str(ticket.id)
                )

        return overrides, executed_rules

    def _match_conditions(
        self, conditions: Dict[str, Any], classification: Dict[str, Any], ticket: Ticket
    ) -> bool:
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
                return False
        return True

    def _calculate_availability_score(self, avail: Any) -> float:
        if not avail:
            return 0.0
        if avail.status == AgentStatus.AVAILABLE:
            return 40.0
        if avail.status == AgentStatus.BUSY:
            return 10.0
        return -20.0

    def _calculate_skill_score(self, agent: Any, category: str) -> float:
        category_map = {
            "BILLING": "BILLING",
            "TECHNICAL": "TECHNICAL",
            "BUG_REPORT": "TECHNICAL",
            "SALES": "SALES",
        }
        target_category = category_map.get(category)
        if not (target_category and hasattr(agent, "skills") and agent.skills):
            return 0.0

        proficiency_weights = {
            "BEGINNER": 5,
            "INTERMEDIATE": 15,
            "ADVANCED": 25,
            "EXPERT": 35,
        }
        skill_score = 0.0
        for agent_skill in agent.skills:
            if (
                agent_skill
                and agent_skill.skill
                and getattr(agent_skill.skill, "category", None)
                and agent_skill.skill.category.value == target_category
            ):
                prof_val = getattr(agent_skill.proficiency_level, "value", "BEGINNER")
                skill_score += proficiency_weights.get(prof_val, 5)
        return skill_score

    # ------------------------------------------------------------------
    # Step 3: Agent Ranking
    # ------------------------------------------------------------------
    def rank_agents(
        self, db: Session, org_id: uuid.UUID, category: str, team_id: Optional[uuid.UUID]
    ) -> List[Dict]:
        """
        Rank available agents. Factors: availability, active load, skills matching category.
        Returns up to 5 best agents.
        """
        query = db.query(User).filter(
            User.organization_id == org_id,
            User.role.in_(
                [UserRole.AGENT, UserRole.ADMIN, UserRole.OWNER, "AGENT", "ADMIN", "OWNER"]
            ),
            User.is_active,
        )

        if team_id:
            from sqlalchemy import select

            from src.models import TeamMember

            agent_ids_in_team = (
                db.execute(select(TeamMember.user_id).where(TeamMember.team_id == team_id))
                .scalars()
                .all()
            )
            if agent_ids_in_team:
                query = query.filter(User.id.in_(agent_ids_in_team))

        agents = query.all()

        ranked = []
        for agent in agents:
            # Availability (safely handle list or single object)
            avail = None
            if hasattr(agent, "availability") and agent.availability:
                if isinstance(agent.availability, list):
                    avail = agent.availability[0] if len(agent.availability) > 0 else None
                else:
                    avail = agent.availability

            score = self._calculate_availability_score(avail)
            score += self._calculate_skill_score(agent, category)

            # Active ticket load (lower is better)
            active_count = (
                db.query(func.count(Ticket.id))
                .filter(
                    Ticket.assigned_user_id == agent.id,
                    Ticket.status.in_([TicketStatus.OPEN, TicketStatus.ASSIGNED]),
                )
                .scalar()
                or 0
            )
            score -= active_count * 5

            agent_name = (
                agent.display_name
                or f"{agent.first_name or ''} {agent.last_name or ''}".strip()
                or agent.email
            )

            ranked.append(
                {
                    "agent_id": str(agent.id),
                    "agent_name": agent_name,
                    "agent_email": agent.email,
                    "score": round(score, 2),
                    "active_tickets": active_count,
                    "availability": avail.status.value if avail else "UNKNOWN",
                }
            )

        ranked.sort(key=lambda x: x["score"], reverse=True)
        return ranked[:5]

    # ------------------------------------------------------------------
    # Step 4: Team & Department Selection
    # ------------------------------------------------------------------
    def select_team_and_department(
        self, db: Session, org_id: uuid.UUID, category: str, rule_overrides: Dict[str, Any]
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
                dept = (
                    db.query(Department)
                    .filter(
                        Department.organization_id == org_id,
                        Department.name.ilike(f"%{dept_name}%"),
                    )
                    .first()
                )
                if dept:
                    dept_id = dept.id
                    team = db.query(Team).filter(Team.department_id == dept.id).first()
                    if team:
                        team_id = team.id

        if not team_id:
            # Fallback: pick first available team in organization
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
        classification = self.classify_ticket(str(ticket.subject), str(ticket.body))
        category_str = classification.get("category", "GENERAL")
        priority_str = classification.get("priority", "MEDIUM")
        confidence = classification.get("confidence", 0)
        reasoning = classification.get("reasoning", "")
        suggested_tags = classification.get("suggested_tags", [])
        is_fallback = classification.get("is_fallback", False)

        # 2. Rules (override classification)
        rule_overrides, executed_rules = self.evaluate_rules(db, org_id, ticket, classification)  # type: ignore[arg-type]
        if "category" in rule_overrides:
            category_str = rule_overrides["category"]
            reasoning += " [Rule Override: Category]"
        if "priority" in rule_overrides:
            priority_str = rule_overrides["priority"]
            reasoning += " [Rule Override: Priority]"

        # 3. Team/Department
        team_id, dept_id = self.select_team_and_department(db, org_id, category_str, rule_overrides)  # type: ignore[arg-type]

        # 4. Agent ranking
        top_agents = self.rank_agents(db, org_id, category_str, team_id)  # type: ignore[arg-type]
        best_agent_id = uuid.UUID(top_agents[0]["agent_id"]) if top_agents else None

        # 5. SLA prediction
        sla_hours = SLA_HOURS.get(priority_str, 24)

        end_ms = int(time.time() * 1000)
        exec_time = end_ms - start_ms

        # 6. Apply to ticket
        self._apply_route_to_ticket(
            ticket, category_str, priority_str, best_agent_id, team_id, dept_id, sla_hours
        )

        model_ver = (
            "fallback" if is_fallback else (self.model_version if self.model else "fallback")
        )

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
            model_version=model_ver,
        )
        db.add(decision)

        # 8. AssignmentHistory entries
        if best_agent_id:
            assign_reason = (
                f"Auto-assigned by AI Routing Engine. Confidence: {confidence}%"
                if not is_fallback
                else "Auto-assigned via fallback routing engine."
            )
            db.add(
                AssignmentHistory(
                    organization_id=org_id,
                    ticket_id=ticket_id,
                    actor_id=None,
                    assignment_type="AGENT",
                    old_value_id=None,
                    new_value_id=best_agent_id,
                    reason=assign_reason,
                    is_override=False,
                )
            )
        if team_id:
            db.add(
                AssignmentHistory(
                    organization_id=org_id,
                    ticket_id=ticket_id,
                    actor_id=None,
                    assignment_type="TEAM",
                    old_value_id=None,
                    new_value_id=team_id,
                    reason=f"Auto-assigned by routing engine based on category: {category_str}",
                    is_override=False,
                )
            )

        # 9. Workflow executions for matched rules
        for rule, log_msg in executed_rules:
            db.add(
                WorkflowExecution(
                    organization_id=org_id,
                    rule_id=rule.id,
                    ticket_id=ticket_id,
                    status="SUCCESS",
                    logs=log_msg,
                )
            )

        # 10. Audit Log
        db.add(
            AuditLog(
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
            )
        )

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

    def _apply_route_to_ticket(
        self,
        ticket: Ticket,
        category_str: str,
        priority_str: str,
        best_agent_id: Optional[uuid.UUID],
        team_id: Optional[uuid.UUID],
        dept_id: Optional[uuid.UUID],
        sla_hours: int,
    ) -> None:
        try:
            category_enum = TicketCategory[category_str]
        except KeyError:
            category_enum = TicketCategory.GENERAL
        try:
            priority_enum = TicketPriority[priority_str]
        except KeyError:
            priority_enum = TicketPriority.MEDIUM

        ticket.category = category_enum  # type: ignore[assignment]
        ticket.priority = priority_enum  # type: ignore[assignment]
        if best_agent_id:
            ticket.assigned_user_id = best_agent_id  # type: ignore[assignment]
            ticket.status = TicketStatus.ASSIGNED  # type: ignore[assignment]
        if team_id:
            ticket.assigned_team_id = team_id  # type: ignore[assignment]
        if dept_id:
            ticket.department_id = dept_id  # type: ignore[assignment]
        if ticket.sla_due_at is None:
            from datetime import timedelta, timezone

            ticket.sla_due_at = datetime.now(timezone.utc) + timedelta(hours=sla_hours)


routing_engine = RoutingEngine()
