"""add_ticket_engine_tables

Revision ID: e535f775e5ee
Revises: f75f1deac5b0
Create Date: 2026-08-04 17:03:30.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "e535f775e5ee"
down_revision: Union[str, None] = "f0aee41cb77e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add new Enums
    sa.Enum(
        "BILLING",
        "TECHNICAL",
        "BUG_REPORT",
        "FEATURE_REQUEST",
        "ACCOUNT",
        "SECURITY",
        "SALES",
        "GENERAL",
        name="ticketcategory",
    ).create(op.get_bind())
    sa.Enum("EMAIL", "WEB", "API", "INTERNAL", name="ticketsource").create(op.get_bind())
    sa.Enum(
        "CUSTOMER_REPLY", "AGENT_REPLY", "INTERNAL_NOTE", "SYSTEM_EVENT", name="threadtype"
    ).create(op.get_bind())

    # 2. Alter existing Enums
    with op.get_context().autocommit_block():
        # TicketStatus
        op.execute("ALTER TYPE ticketstatus ADD VALUE IF NOT EXISTS 'NEW'")
        op.execute("ALTER TYPE ticketstatus ADD VALUE IF NOT EXISTS 'ASSIGNED'")
        op.execute("ALTER TYPE ticketstatus ADD VALUE IF NOT EXISTS 'PENDING_CUSTOMER'")
        op.execute("ALTER TYPE ticketstatus ADD VALUE IF NOT EXISTS 'PENDING_INTERNAL'")
        op.execute("ALTER TYPE ticketstatus ADD VALUE IF NOT EXISTS 'REOPENED'")
        op.execute("ALTER TYPE ticketstatus ADD VALUE IF NOT EXISTS 'CANCELLED'")

        # TicketPriority
        op.execute("ALTER TYPE ticketpriority ADD VALUE IF NOT EXISTS 'URGENT'")

        # ActionType
        op.execute("ALTER TYPE actiontype ADD VALUE IF NOT EXISTS 'TICKET_CREATED'")
        op.execute("ALTER TYPE actiontype ADD VALUE IF NOT EXISTS 'TICKET_ASSIGNED'")
        op.execute("ALTER TYPE actiontype ADD VALUE IF NOT EXISTS 'TICKET_REPLIED'")
        op.execute("ALTER TYPE actiontype ADD VALUE IF NOT EXISTS 'TICKET_STATUS_CHANGED'")
        op.execute("ALTER TYPE actiontype ADD VALUE IF NOT EXISTS 'TICKET_PRIORITY_CHANGED'")
        op.execute("ALTER TYPE actiontype ADD VALUE IF NOT EXISTS 'TICKET_MERGED'")
        op.execute("ALTER TYPE actiontype ADD VALUE IF NOT EXISTS 'TICKET_CLOSED'")
        op.execute("ALTER TYPE actiontype ADD VALUE IF NOT EXISTS 'TICKET_REOPENED'")

    # 3. Drop old tables
    op.drop_index("ix_internal_note_ticket", table_name="internal_notes")
    op.drop_table("internal_notes")

    op.drop_index("ix_message_ticket", table_name="ticket_messages")
    op.drop_table("ticket_messages")

    # 4. Extend Customers
    op.add_column("customers", sa.Column("phone", sa.String(length=50), nullable=True))
    op.add_column("customers", sa.Column("company", sa.String(length=255), nullable=True))
    op.add_column(
        "customers",
        sa.Column("timezone", sa.String(length=50), server_default="UTC", nullable=False),
    )
    op.add_column(
        "customers",
        sa.Column("language", sa.String(length=10), server_default="en", nullable=False),
    )
    op.add_column(
        "customers", sa.Column("is_vip", sa.Boolean(), server_default="false", nullable=False)
    )
    op.add_column(
        "customers", sa.Column("total_tickets", sa.Integer(), server_default="0", nullable=False)
    )
    op.add_column("customers", sa.Column("avg_satisfaction", sa.Integer(), nullable=True))

    # 5. Extend Tickets
    op.add_column("tickets", sa.Column("ticket_number", sa.String(length=50), nullable=True))
    op.add_column(
        "tickets", sa.Column("department_id", postgresql.UUID(as_uuid=True), nullable=True)
    )
    op.add_column(
        "tickets", sa.Column("created_by_id", postgresql.UUID(as_uuid=True), nullable=True)
    )
    op.add_column(
        "tickets", sa.Column("merged_into_id", postgresql.UUID(as_uuid=True), nullable=True)
    )
    op.add_column(
        "tickets",
        sa.Column(
            "category",
            postgresql.ENUM(
                "BILLING",
                "TECHNICAL",
                "BUG_REPORT",
                "FEATURE_REQUEST",
                "ACCOUNT",
                "SECURITY",
                "SALES",
                "GENERAL",
                name="ticketcategory",
                create_type=False,
            ),
            server_default="GENERAL",
            nullable=False,
        ),
    )
    op.add_column(
        "tickets",
        sa.Column(
            "source",
            postgresql.ENUM(
                "EMAIL", "WEB", "API", "INTERNAL", name="ticketsource", create_type=False
            ),
            server_default="WEB",
            nullable=False,
        ),
    )
    op.add_column("tickets", sa.Column("closed_at", sa.DateTime(), nullable=True))
    op.add_column("tickets", sa.Column("sla_due_at", sa.DateTime(), nullable=True))

    # Set default values for ticket_number if tickets exist (just using id as a hack for existing records)
    op.execute("UPDATE tickets SET ticket_number = left(id::text, 8)")
    op.alter_column("tickets", "ticket_number", nullable=False)

    op.create_index("ix_ticket_number", "tickets", ["ticket_number"], unique=False)
    op.create_foreign_key(
        "fk_ticket_department",
        "tickets",
        "departments",
        ["department_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_ticket_created_by", "tickets", "users", ["created_by_id"], ["id"], ondelete="SET NULL"
    )
    op.create_foreign_key(
        "fk_ticket_merged_into",
        "tickets",
        "tickets",
        ["merged_into_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.execute("ALTER TABLE tickets ALTER COLUMN status SET DEFAULT 'NEW'")

    # 6. Create new tables
    op.create_table(
        "ticket_threads",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("ticket_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "thread_type",
            postgresql.ENUM(
                "CUSTOMER_REPLY",
                "AGENT_REPLY",
                "INTERNAL_NOTE",
                "SYSTEM_EVENT",
                name="threadtype",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("sender_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("sender_customer_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("is_edited", sa.Boolean(), server_default="false", nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["sender_customer_id"], ["customers.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["sender_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["ticket_id"], ["tickets.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_thread_ticket", "ticket_threads", ["ticket_id"], unique=False)

    op.create_table(
        "ticket_timeline",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("ticket_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("actor_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("actor_customer_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("event_type", sa.String(length=50), nullable=False),
        sa.Column("event_data", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["actor_customer_id"], ["customers.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["ticket_id"], ["tickets.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_timeline_ticket", "ticket_timeline", ["ticket_id"], unique=False)

    op.create_table(
        "ticket_attachments",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("ticket_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("thread_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("uploaded_by_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("file_url", sa.String(length=1024), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("mime_type", sa.String(length=100), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["thread_id"], ["ticket_threads.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["ticket_id"], ["tickets.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["uploaded_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_attachment_ticket", "ticket_attachments", ["ticket_id"], unique=False)

    op.create_table(
        "ticket_merges",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("source_ticket_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("target_ticket_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("merged_by_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["merged_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["source_ticket_id"], ["tickets.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["target_ticket_id"], ["tickets.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source_ticket_id"),
    )
    op.create_index("ix_merge_target", "ticket_merges", ["target_ticket_id"], unique=False)


def downgrade() -> None:
    pass
