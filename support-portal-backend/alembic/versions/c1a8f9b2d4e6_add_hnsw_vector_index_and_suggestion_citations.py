"""Add HNSW vector index on knowledge_vectors and citations_json on ai_suggestions

Revision ID: c1a8f9b2d4e6
Revises: bebeb1f3ef90
Create Date: 2026-10-19 20:05:00.000000

Locking & Concurrency Note:
--------------------------
In development and test environments, this migration executes standard CREATE INDEX.
In production with active high-concurrency writes, PostgreSQL takes a SHARE lock on
`knowledge_vectors` during HNSW index builds (reads allowed, writes blocked until completion).
For large production tables, execute `CREATE INDEX CONCURRENTLY` outside of a transactional
migration block.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c1a8f9b2d4e6"
down_revision: Union[str, Sequence[str], None] = "bebeb1f3ef90"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add citations_json to ai_suggestions for Copilot draft auditability
    op.add_column(
        "ai_suggestions",
        sa.Column("citations_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )

    # 2. Add HNSW index on knowledge_vectors embedding using L2 distance metric
    # In PostgreSQL production, execute CONCURRENTLY inside autocommit_block() to avoid locking table
    context = op.get_context()
    if context.bind and context.bind.dialect.name == "postgresql":
        with context.autocommit_block():
            op.execute(
                "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_knowledge_vectors_embedding_hnsw "
                "ON knowledge_vectors USING hnsw (embedding vector_l2_ops)"
            )
    else:
        op.execute(
            "CREATE INDEX IF NOT EXISTS ix_knowledge_vectors_embedding_hnsw "
            "ON knowledge_vectors USING hnsw (embedding vector_l2_ops)"
        )


def downgrade() -> None:
    # 1. Drop HNSW index
    context = op.get_context()
    if context.bind and context.bind.dialect.name == "postgresql":
        with context.autocommit_block():
            op.execute("DROP INDEX CONCURRENTLY IF EXISTS ix_knowledge_vectors_embedding_hnsw")
    else:
        op.execute("DROP INDEX IF EXISTS ix_knowledge_vectors_embedding_hnsw")

    # 2. Drop citations_json column
    op.drop_column("ai_suggestions", "citations_json")
