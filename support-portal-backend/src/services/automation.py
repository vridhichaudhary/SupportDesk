"""
AutomationRule CRUD service.
"""
import uuid
import structlog
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from src.models import AutomationRule
from src.core.exceptions import NotFoundException

logger = structlog.get_logger()


class AutomationService:
    def list_rules(self, db: Session, org_id: uuid.UUID) -> List[AutomationRule]:
        return (
            db.query(AutomationRule)
            .filter(AutomationRule.organization_id == org_id)
            .order_by(AutomationRule.created_at.desc())
            .all()
        )

    def create_rule(
        self, db: Session, org_id: uuid.UUID, name: str, trigger_event: str,
        conditions_json: Dict, actions_json: Dict, is_active: bool = True
    ) -> AutomationRule:
        rule = AutomationRule(
            organization_id=org_id,
            name=name,
            trigger_event=trigger_event,
            conditions_json=conditions_json,
            actions_json=actions_json,
            is_active=is_active,
        )
        db.add(rule)
        db.commit()
        db.refresh(rule)
        logger.info("Automation rule created", rule_id=str(rule.id), name=name)
        return rule

    def update_rule(
        self, db: Session, org_id: uuid.UUID, rule_id: uuid.UUID, updates: Dict[str, Any]
    ) -> AutomationRule:
        rule = db.query(AutomationRule).filter(
            AutomationRule.id == rule_id, AutomationRule.organization_id == org_id
        ).first()
        if not rule:
            raise NotFoundException("Automation rule not found")
        for k, v in updates.items():
            if hasattr(rule, k):
                setattr(rule, k, v)
        db.commit()
        db.refresh(rule)
        return rule

    def delete_rule(self, db: Session, org_id: uuid.UUID, rule_id: uuid.UUID) -> None:
        rule = db.query(AutomationRule).filter(
            AutomationRule.id == rule_id, AutomationRule.organization_id == org_id
        ).first()
        if not rule:
            raise NotFoundException("Automation rule not found")
        db.delete(rule)
        db.commit()


automation_service = AutomationService()
