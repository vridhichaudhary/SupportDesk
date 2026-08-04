import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Table,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from src.core.database import Base

JSONType = JSONB().with_variant(JSON, "sqlite")


# Enums
class TicketStatus(enum.Enum):
    NEW = "NEW"
    OPEN = "OPEN"
    ASSIGNED = "ASSIGNED"
    PENDING_CUSTOMER = "PENDING_CUSTOMER"
    PENDING_INTERNAL = "PENDING_INTERNAL"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"
    REOPENED = "REOPENED"
    CANCELLED = "CANCELLED"


class OrganizationStatus(enum.Enum):
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"


class TicketPriority(enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"
    CRITICAL = "CRITICAL"

class TicketCategory(enum.Enum):
    BILLING = "BILLING"
    TECHNICAL = "TECHNICAL"
    BUG_REPORT = "BUG_REPORT"
    FEATURE_REQUEST = "FEATURE_REQUEST"
    ACCOUNT = "ACCOUNT"
    SECURITY = "SECURITY"
    SALES = "SALES"
    GENERAL = "GENERAL"


class TicketSource(enum.Enum):
    EMAIL = "EMAIL"
    WEB = "WEB"
    API = "API"
    INTERNAL = "INTERNAL"


class ThreadType(enum.Enum):
    CUSTOMER_REPLY = "CUSTOMER_REPLY"
    AGENT_REPLY = "AGENT_REPLY"
    INTERNAL_NOTE = "INTERNAL_NOTE"
    SYSTEM_EVENT = "SYSTEM_EVENT"



class UserRole(enum.Enum):
    OWNER = "OWNER"
    ADMIN = "ADMIN"
    AGENT = "AGENT"


class KBArticleStatus(enum.Enum):
    DRAFT = "DRAFT"
    IN_REVIEW = "IN_REVIEW"
    PUBLISHED = "PUBLISHED"
    ARCHIVED = "ARCHIVED"


class AuthTokenType(enum.Enum):
    EMAIL_VERIFICATION = "EMAIL_VERIFICATION"
    PASSWORD_RESET = "PASSWORD_RESET"


class ActionType(enum.Enum):
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    SIGNUP = "SIGNUP"
    LOGIN = "LOGIN"
    LOGOUT = "LOGOUT"
    PASSWORD_CHANGE = "PASSWORD_CHANGE"
    PASSWORD_RESET = "PASSWORD_RESET"
    EMAIL_VERIFY = "EMAIL_VERIFY"
    PROFILE_UPDATE = "PROFILE_UPDATE"
    AVATAR_CHANGE = "AVATAR_CHANGE"
    # RBAC Events
    PERMISSION_GRANTED = "PERMISSION_GRANTED"
    PERMISSION_REVOKED = "PERMISSION_REVOKED"
    ROLE_CREATED = "ROLE_CREATED"
    ROLE_ASSIGNED = "ROLE_ASSIGNED"
    ROLE_REMOVED = "ROLE_REMOVED"
    # Ticket Events
    TICKET_CREATED = "TICKET_CREATED"
    TICKET_ASSIGNED = "TICKET_ASSIGNED"
    TICKET_REPLIED = "TICKET_REPLIED"
    TICKET_STATUS_CHANGED = "TICKET_STATUS_CHANGED"
    TICKET_PRIORITY_CHANGED = "TICKET_PRIORITY_CHANGED"
    TICKET_MERGED = "TICKET_MERGED"
    TICKET_CLOSED = "TICKET_CLOSED"
    TICKET_REOPENED = "TICKET_REOPENED"


class SenderType(enum.Enum):
    CUSTOMER = "CUSTOMER"
    AGENT = "AGENT"
    AI = "AI"


class SuggestionStatus(enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    EDITED = "EDITED"


class DepartmentStatus(enum.Enum):
    ACTIVE = "ACTIVE"
    ARCHIVED = "ARCHIVED"
    DELETED = "DELETED"


class TeamStatus(enum.Enum):
    ACTIVE = "ACTIVE"
    ARCHIVED = "ARCHIVED"
    DELETED = "DELETED"


class SkillCategory(enum.Enum):
    TECHNICAL = "TECHNICAL"
    PRODUCT = "PRODUCT"
    BILLING = "BILLING"
    SALES = "SALES"
    SOFT_SKILL = "SOFT_SKILL"
    OTHER = "OTHER"


class ProficiencyLevel(enum.Enum):
    BEGINNER = "BEGINNER"
    INTERMEDIATE = "INTERMEDIATE"
    ADVANCED = "ADVANCED"
    EXPERT = "EXPERT"


class AgentStatus(enum.Enum):
    AVAILABLE = "AVAILABLE"
    BUSY = "BUSY"
    AWAY = "AWAY"
    OFFLINE = "OFFLINE"
    BREAK = "BREAK"
    MEETING = "MEETING"
    TRAINING = "TRAINING"
    VACATION = "VACATION"
    SICK_LEAVE = "SICK_LEAVE"


# Association Tables

ticket_tags = Table(
    "ticket_tags",
    Base.metadata,
    Column(
        "ticket_id",
        UUID(as_uuid=True),
        ForeignKey("tickets.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "tag_id", UUID(as_uuid=True), ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True
    ),
)


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    industry = Column(String(255), nullable=True)
    domain = Column(String(255), nullable=True)
    status = Column(Enum(OrganizationStatus), default=OrganizationStatus.ACTIVE, nullable=False)
    timezone = Column(String(50), default="UTC", nullable=False)
    support_email = Column(String(255), nullable=True)
    support_phone = Column(String(50), nullable=True)
    website = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)
    logo_url = Column(String(1024), nullable=True)
    settings = Column(JSONType, default=dict, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    users = relationship("User", back_populates="organization", cascade="all, delete-orphan")
    departments = relationship("Department", back_populates="organization", cascade="all, delete-orphan")
    teams = relationship("Team", back_populates="organization", cascade="all, delete-orphan")
    customers = relationship(
        "Customer", back_populates="organization", cascade="all, delete-orphan"
    )
    tickets = relationship("Ticket", back_populates="organization", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    email = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.AGENT)
    first_name = Column(String(255), nullable=True)
    last_name = Column(String(255), nullable=True)
    display_name = Column(String(255), nullable=True)
    avatar_url = Column(String(1024), nullable=True)
    job_title = Column(String(255), nullable=True)
    bio = Column(Text, nullable=True)
    timezone = Column(String(50), default="UTC", nullable=False)
    preferred_language = Column(String(10), default="en", nullable=False)
    theme_preference = Column(String(20), default="system", nullable=False)
    notification_preferences = Column(JSONType, default=dict, nullable=False)
    is_email_verified = Column(Boolean, default=False, nullable=False)
    last_login_at = Column(DateTime, nullable=True)
    last_active_at = Column(DateTime, nullable=True)
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    organization = relationship("Organization", back_populates="users")
    agent_profile = relationship("AgentProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    team_memberships = relationship("TeamMember", back_populates="user", cascade="all, delete-orphan")
    teams = relationship("Team", secondary="team_members", back_populates="members", viewonly=True)
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    auth_tokens = relationship("AuthToken", back_populates="user", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("organization_id", "email", name="uq_organization_user_email"),
        Index("ix_user_organization", "organization_id"),
    )


class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    organization_id = Column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    refresh_token_hash = Column(String(255), nullable=False, unique=True)
    device_info = Column(String(255), nullable=True)
    ip_address = Column(String(50), nullable=True)
    is_revoked = Column(Boolean, default=False, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_accessed_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="sessions")
    organization = relationship("Organization")

    __table_args__ = (
        Index("ix_session_user", "user_id"),
        Index("ix_session_org", "organization_id"),
    )


class AuthToken(Base):
    __tablename__ = "auth_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash = Column(String(255), nullable=False, unique=True)
    token_type = Column(Enum(AuthTokenType), nullable=False)
    is_used = Column(Boolean, default=False, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="auth_tokens")

    __table_args__ = (
        Index("ix_auth_token_user", "user_id"),
        Index("ix_auth_token_hash", "token_hash"),
    )


class Department(Base):
    __tablename__ = "departments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String(7), nullable=True)
    status = Column(Enum(DepartmentStatus), default=DepartmentStatus.ACTIVE, nullable=False)
    manager_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    organization = relationship("Organization", back_populates="departments")
    manager = relationship("User")
    teams = relationship("Team", back_populates="department")

    __table_args__ = (
        UniqueConstraint("organization_id", "name", name="uq_organization_department_name"),
        Index("ix_department_organization", "organization_id"),
    )


class Team(Base):
    __tablename__ = "teams"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    department_id = Column(
        UUID(as_uuid=True), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True
    )
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    avatar_url = Column(String(1024), nullable=True)
    color = Column(String(7), nullable=True)
    status = Column(Enum(TeamStatus), default=TeamStatus.ACTIVE, nullable=False)
    max_capacity = Column(Integer, default=50, nullable=False)
    current_capacity = Column(Integer, default=0, nullable=False)
    default_sla = Column(Integer, nullable=True)
    business_hours = Column(JSONType, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    organization = relationship("Organization", back_populates="teams")
    department = relationship("Department", back_populates="teams")
    memberships = relationship("TeamMember", back_populates="team", cascade="all, delete-orphan")
    members = relationship("User", secondary="team_members", back_populates="teams", viewonly=True)

    __table_args__ = (Index("ix_team_organization", "organization_id"),)


class TeamMember(Base):
    __tablename__ = "team_members"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id = Column(
        UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False
    )
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    is_primary = Column(Boolean, default=False, nullable=False)
    joined_at = Column(DateTime, default=datetime.utcnow)
    
    team = relationship("Team", back_populates="memberships")
    user = relationship("User", back_populates="team_memberships")

    __table_args__ = (
        UniqueConstraint("team_id", "user_id", name="uq_team_user"),
        Index("ix_teammember_team", "team_id"),
        Index("ix_teammember_user", "user_id"),
    )


class AgentProfile(Base):
    __tablename__ = "agent_profiles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    agent_code = Column(String(50), nullable=True)
    employee_id = Column(String(100), nullable=True)
    experience_level = Column(Enum(ProficiencyLevel), default=ProficiencyLevel.BEGINNER)
    languages_spoken = Column(JSONType, default=list)
    max_concurrent_tickets = Column(Integer, default=5, nullable=False)
    current_active_tickets = Column(Integer, default=0, nullable=False)
    max_daily_tickets = Column(Integer, default=50, nullable=False)
    current_daily_tickets = Column(Integer, default=0, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="agent_profile")


class Skill(Base):
    __tablename__ = "skills"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(Enum(SkillCategory), default=SkillCategory.OTHER, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        UniqueConstraint("organization_id", "name", name="uq_skill_org_name"),
        Index("ix_skill_organization", "organization_id"),
    )


class AgentSkill(Base):
    __tablename__ = "agent_skills"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    skill_id = Column(
        UUID(as_uuid=True), ForeignKey("skills.id", ondelete="CASCADE"), nullable=False
    )
    proficiency_level = Column(Enum(ProficiencyLevel), default=ProficiencyLevel.BEGINNER, nullable=False)
    years_of_experience = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", backref="skills")
    skill = relationship("Skill")
    
    __table_args__ = (
        UniqueConstraint("user_id", "skill_id", name="uq_agent_skill"),
    )


class AgentAvailability(Base):
    __tablename__ = "agent_availabilities"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    status = Column(Enum(AgentStatus), default=AgentStatus.OFFLINE, nullable=False)
    since = Column(DateTime, default=datetime.utcnow, nullable=False)
    expected_return = Column(DateTime, nullable=True)
    
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", backref="availability")


class WorkingHours(Base):
    __tablename__ = "working_hours"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    timezone = Column(String(50), default="UTC", nullable=False)
    shifts = Column(JSONType, nullable=True) 
    working_days = Column(JSONType, nullable=False) 
    start_time = Column(String(5), nullable=False) 
    end_time = Column(String(5), nullable=False) 
    lunch_break_start = Column(String(5), nullable=True)
    lunch_break_end = Column(String(5), nullable=True)
    
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", backref="working_hours")


class Customer(Base):
    __tablename__ = "customers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    email = Column(String(255), nullable=False)
    name = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    company = Column(String(255), nullable=True)
    timezone = Column(String(50), default="UTC", nullable=False)
    language = Column(String(10), default="en", nullable=False)
    is_vip = Column(Boolean, default=False, nullable=False)
    total_tickets = Column(Integer, default=0, nullable=False)
    avg_satisfaction = Column(Integer, nullable=True)
    metadata_json = Column(JSONType, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    organization = relationship("Organization", back_populates="customers")
    tickets = relationship("Ticket", back_populates="customer")

    __table_args__ = (
        UniqueConstraint("organization_id", "email", name="uq_organization_customer_email"),
        Index("ix_customer_organization", "organization_id"),
    )


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    customer_id = Column(
        UUID(as_uuid=True), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False
    )
    assigned_user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    assigned_team_id = Column(
        UUID(as_uuid=True), ForeignKey("teams.id", ondelete="SET NULL"), nullable=True
    )

    ticket_number = Column(String(50), nullable=False, unique=True)
    department_id = Column(
        UUID(as_uuid=True), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True
    )
    created_by_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    merged_into_id = Column(
        UUID(as_uuid=True), ForeignKey("tickets.id", ondelete="SET NULL"), nullable=True
    )

    subject = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    status = Column(Enum(TicketStatus), nullable=False, default=TicketStatus.NEW)
    priority = Column(Enum(TicketPriority), nullable=False, default=TicketPriority.MEDIUM)
    category = Column(Enum(TicketCategory), nullable=False, default=TicketCategory.GENERAL)
    source = Column(Enum(TicketSource), nullable=False, default=TicketSource.WEB)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)
    sla_due_at = Column(DateTime, nullable=True)
    deleted_at = Column(DateTime, nullable=True)

    organization = relationship("Organization", back_populates="tickets")
    customer = relationship("Customer", back_populates="tickets")
    assigned_user = relationship("User", foreign_keys=[assigned_user_id])
    assigned_team = relationship("Team")
    department = relationship("Department")
    created_by = relationship("User", foreign_keys=[created_by_id])
    merged_into = relationship("Ticket", remote_side=[id])

    threads = relationship("TicketThread", back_populates="ticket", cascade="all, delete-orphan")
    timeline_events = relationship("TicketTimeline", back_populates="ticket", cascade="all, delete-orphan")
    attachments = relationship("TicketAttachment", back_populates="ticket", cascade="all, delete-orphan")
    ai_suggestions = relationship("AISuggestion", back_populates="ticket", cascade="all, delete-orphan")
    tags = relationship("Tag", secondary=ticket_tags, back_populates="tickets")

    __table_args__ = (
        Index("ix_ticket_organization", "organization_id"),
        Index("ix_ticket_org_status_date", "organization_id", "status", "created_at"),
        Index("ix_ticket_number", "ticket_number"),
    )


class TicketThread(Base):
    __tablename__ = "ticket_threads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id = Column(
        UUID(as_uuid=True), ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False
    )
    thread_type = Column(Enum(ThreadType), nullable=False)
    sender_user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    sender_customer_id = Column(
        UUID(as_uuid=True), ForeignKey("customers.id", ondelete="SET NULL"), nullable=True
    )
    body = Column(Text, nullable=False)
    is_edited = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    ticket = relationship("Ticket", back_populates="threads")
    sender_user = relationship("User")
    sender_customer = relationship("Customer")

    __table_args__ = (Index("ix_thread_ticket", "ticket_id"),)


class TicketTimeline(Base):
    __tablename__ = "ticket_timeline"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id = Column(
        UUID(as_uuid=True), ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False
    )
    actor_user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    actor_customer_id = Column(
        UUID(as_uuid=True), ForeignKey("customers.id", ondelete="SET NULL"), nullable=True
    )
    event_type = Column(String(50), nullable=False)
    event_data = Column(JSONType, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    ticket = relationship("Ticket", back_populates="timeline_events")
    actor_user = relationship("User")
    actor_customer = relationship("Customer")

    __table_args__ = (Index("ix_timeline_ticket", "ticket_id"),)


class TicketAttachment(Base):
    __tablename__ = "ticket_attachments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id = Column(
        UUID(as_uuid=True), ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False
    )
    thread_id = Column(
        UUID(as_uuid=True), ForeignKey("ticket_threads.id", ondelete="SET NULL"), nullable=True
    )
    uploaded_by_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    filename = Column(String(255), nullable=False)
    file_url = Column(String(1024), nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    ticket = relationship("Ticket", back_populates="attachments")
    thread = relationship("TicketThread")
    uploaded_by = relationship("User")

    __table_args__ = (Index("ix_attachment_ticket", "ticket_id"),)


class TicketMerge(Base):
    __tablename__ = "ticket_merges"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_ticket_id = Column(
        UUID(as_uuid=True), ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    target_ticket_id = Column(
        UUID(as_uuid=True), ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False
    )
    merged_by_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at = Column(DateTime, default=datetime.utcnow)

    source_ticket = relationship("Ticket", foreign_keys=[source_ticket_id])
    target_ticket = relationship("Ticket", foreign_keys=[target_ticket_id])
    merged_by = relationship("User")

    __table_args__ = (Index("ix_merge_target", "target_ticket_id"),)


class Tag(Base):
    __tablename__ = "tags"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    name = Column(String(50), nullable=False)
    color = Column(String(7), nullable=True)

    tickets = relationship("Ticket", secondary=ticket_tags, back_populates="tags")

    __table_args__ = (
        UniqueConstraint("organization_id", "name", name="uq_organization_tag_name"),
        Index("ix_tag_organization", "organization_id"),
    )


class KBArticle(Base):
    __tablename__ = "kb_articles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    author_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    status = Column(Enum(KBArticleStatus), nullable=False, default=KBArticleStatus.DRAFT)
    version = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    author = relationship("User")
    metadata_entries = relationship(
        "KBMetadata", back_populates="article", cascade="all, delete-orphan"
    )

    __table_args__ = (Index("ix_kb_article_organization", "organization_id"),)


class KBMetadata(Base):
    __tablename__ = "kb_metadata"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    article_id = Column(
        UUID(as_uuid=True), ForeignKey("kb_articles.id", ondelete="CASCADE"), nullable=False
    )
    vector_id = Column(UUID(as_uuid=True), nullable=True)  # ID mapping to Qdrant, if applicable
    chunk_count = Column(Integer, default=0)
    last_indexed_at = Column(DateTime, nullable=True)

    article = relationship("KBArticle", back_populates="metadata_entries")


class AISuggestion(Base):
    __tablename__ = "ai_suggestions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id = Column(
        UUID(as_uuid=True), ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False
    )
    suggested_reply = Column(Text, nullable=False)
    confidence_score = Column(Integer, nullable=True)  # 0-100
    status = Column(Enum(SuggestionStatus), nullable=False, default=SuggestionStatus.PENDING)
    created_at = Column(DateTime, default=datetime.utcnow)

    ticket = relationship("Ticket", back_populates="ai_suggestions")

    __table_args__ = (Index("ix_ai_suggestion_ticket", "ticket_id"),)


class Workflow(Base):
    __tablename__ = "workflows"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    name = Column(String(255), nullable=False)
    trigger_event = Column(String(100), nullable=False)
    conditions_json = Column(JSONType, nullable=True)
    actions_json = Column(JSONType, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (Index("ix_workflow_organization", "organization_id"),)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    actor_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    action_type = Column(Enum(ActionType), nullable=False)
    entity_type = Column(String(100), nullable=False)
    entity_id = Column(UUID(as_uuid=True), nullable=False)
    changes_json = Column(JSONType, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    actor = relationship("User")

    __table_args__ = (
        Index("ix_audit_log_organization", "organization_id"),
        Index("ix_audit_log_entity", "organization_id", "entity_type", "entity_id"),
    )


# ─────────────────────────────────────────────────────────────────────────────
# RBAC Models
# ─────────────────────────────────────────────────────────────────────────────


class Permission(Base):
    """
    Canonical registry of every named capability in the system.
    Records are seeded at migration time and do not change at runtime.
    """

    __tablename__ = "permissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # e.g. "manage_users", "view_analytics" — unique system-wide identifier
    codename = Column(String(100), nullable=False, unique=True)
    display_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    # Logical grouping for UI display ("Users", "Tickets", "Knowledge", etc.)
    module = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    role_permissions = relationship("RolePermission", back_populates="permission", cascade="all, delete-orphan")

    __table_args__ = (Index("ix_permission_codename", "codename"),)


class Role(Base):
    """
    Extensible role registry.
    System roles (OWNER, ADMIN, AGENT) have organization_id=NULL and is_system=True.
    Custom org roles have organization_id set and is_custom=True.
    """

    __tablename__ = "roles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # NULL for system-wide roles; set for org-scoped custom roles
    organization_id = Column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True
    )
    name = Column(String(100), nullable=False)  # e.g. "OWNER", "Senior Agent"
    description = Column(Text, nullable=True)
    is_system = Column(Boolean, default=False, nullable=False)  # Cannot be deleted/mutated
    is_custom = Column(Boolean, default=False, nullable=False)  # Org-created role
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    organization = relationship("Organization")
    permissions = relationship("RolePermission", back_populates="role", cascade="all, delete-orphan")
    assignments = relationship("UserRoleAssignment", back_populates="role", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("organization_id", "name", name="uq_role_org_name"),
        Index("ix_role_organization", "organization_id"),
    )


class RolePermission(Base):
    """
    Junction table: which permissions a given role possesses.
    """

    __tablename__ = "role_permissions"

    role_id = Column(
        UUID(as_uuid=True), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True
    )
    permission_codename = Column(
        String(100), ForeignKey("permissions.codename", ondelete="CASCADE"), primary_key=True
    )
    granted_at = Column(DateTime, default=datetime.utcnow)

    role = relationship("Role", back_populates="permissions")
    permission = relationship("Permission", back_populates="role_permissions")


class UserRoleAssignment(Base):
    """
    Explicit per-user role assignment within an organization.
    Enables future multi-role and cross-org-role support.
    The User.role enum remains the fast-path for JWT; this table
    is the authoritative source for permission resolution.
    """

    __tablename__ = "user_role_assignments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    organization_id = Column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    role_id = Column(
        UUID(as_uuid=True), ForeignKey("roles.id", ondelete="CASCADE"), nullable=False
    )
    assigned_by_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    assigned_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])
    assigned_by = relationship("User", foreign_keys=[assigned_by_id])
    role = relationship("Role", back_populates="assignments")
    organization = relationship("Organization")

    __table_args__ = (
        # One active role assignment per user per org (can be extended to multi-role later)
        UniqueConstraint("user_id", "organization_id", name="uq_user_org_role_assignment"),
        Index("ix_role_assignment_user", "user_id"),
        Index("ix_role_assignment_org", "organization_id"),
    )
