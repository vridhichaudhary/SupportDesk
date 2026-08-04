import re

with open('src/models.py', 'r') as f:
    content = f.read()

# Expand TicketStatus
content = re.sub(
    r'class TicketStatus\(enum\.Enum\):.*?CLOSED = "CLOSED"',
    '''class TicketStatus(enum.Enum):
    NEW = "NEW"
    OPEN = "OPEN"
    ASSIGNED = "ASSIGNED"
    PENDING_CUSTOMER = "PENDING_CUSTOMER"
    PENDING_INTERNAL = "PENDING_INTERNAL"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"
    REOPENED = "REOPENED"
    CANCELLED = "CANCELLED"''',
    content,
    flags=re.DOTALL
)

# Expand TicketPriority
content = re.sub(
    r'class TicketPriority\(enum\.Enum\):.*?CRITICAL = "CRITICAL"',
    '''class TicketPriority(enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"
    CRITICAL = "CRITICAL"''',
    content,
    flags=re.DOTALL
)

# Add TicketCategory, TicketSource, ThreadType
new_enums = '''

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
'''
content = re.sub(
    r'(class TicketPriority\(enum\.Enum\):.*?CRITICAL = "CRITICAL")',
    r'\1' + new_enums,
    content,
    flags=re.DOTALL
)

# Expand ActionType
content = re.sub(
    r'ROLE_REMOVED = "ROLE_REMOVED"',
    '''ROLE_REMOVED = "ROLE_REMOVED"
    # Ticket Events
    TICKET_CREATED = "TICKET_CREATED"
    TICKET_ASSIGNED = "TICKET_ASSIGNED"
    TICKET_REPLIED = "TICKET_REPLIED"
    TICKET_STATUS_CHANGED = "TICKET_STATUS_CHANGED"
    TICKET_PRIORITY_CHANGED = "TICKET_PRIORITY_CHANGED"
    TICKET_MERGED = "TICKET_MERGED"
    TICKET_CLOSED = "TICKET_CLOSED"
    TICKET_REOPENED = "TICKET_REOPENED"''',
    content
)

# Extend Customer
content = re.sub(
    r'    metadata_json = Column\(JSONType, nullable=True\)',
    '''    phone = Column(String(50), nullable=True)
    company = Column(String(255), nullable=True)
    timezone = Column(String(50), default="UTC", nullable=False)
    language = Column(String(10), default="en", nullable=False)
    is_vip = Column(Boolean, default=False, nullable=False)
    total_tickets = Column(Integer, default=0, nullable=False)
    avg_satisfaction = Column(Integer, nullable=True)
    metadata_json = Column(JSONType, nullable=True)''',
    content
)

# Extend Ticket
ticket_updates = '''
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
    )'''

content = re.sub(
    r'    subject = Column\(String\(255\), nullable=False\).*?__table_args__ = \([^)]+\)',
    ticket_updates.strip(),
    content,
    flags=re.DOTALL
)

# Remove TicketMessage and InternalNote, add TicketThread, TicketTimeline, TicketAttachment, TicketMerge
thread_models = '''
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
'''

content = re.sub(
    r'class TicketMessage\(Base\):.*?__table_args__ = \(Index\("ix_internal_note_ticket", "ticket_id"\),\)',
    thread_models.strip(),
    content,
    flags=re.DOTALL
)

with open('src/models.py', 'w') as f:
    f.write(content)
