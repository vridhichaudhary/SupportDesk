from src.models import AuditLog
from src.repositories.base import BaseRepository
from src.schemas.audit_log import AuditLogCreate, AuditLogUpdate


class AuditLogRepository(BaseRepository[AuditLog, AuditLogCreate, AuditLogUpdate]):
    def __init__(self):
        super().__init__(AuditLog)


audit_log_repository = AuditLogRepository()
