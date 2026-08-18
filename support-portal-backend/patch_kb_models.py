import re

with open("src/models.py", "r") as f:
    content = f.read()

# 1. Update Enums
kb_status_enum = """class KBArticleStatus(enum.Enum):
    DRAFT = "DRAFT"
    IN_REVIEW = "IN_REVIEW"
    APPROVED = "APPROVED"
    PUBLISHED = "PUBLISHED"
    ARCHIVED = "ARCHIVED"
    REJECTED = "REJECTED"


class VisibilityLevel(enum.Enum):
    INTERNAL = "INTERNAL"
    PUBLIC = "PUBLIC"
    PRIVATE_TEAM = "PRIVATE_TEAM"
    DEPARTMENT = "DEPARTMENT"
    ORGANIZATION = "ORGANIZATION"
"""
content = re.sub(
    r"class KBArticleStatus\(enum\.Enum\):.*?ARCHIVED = \"ARCHIVED\"\n",
    kb_status_enum,
    content,
    flags=re.DOTALL,
)

# 2. Add Association Tables and New Models
kb_models_pattern = r"class KBArticle\(Base\):.*?class AISuggestion\(Base\):"

kb_new_models = """# KB Association Tables
kb_article_tags = Table(
    "kb_article_tags",
    Base.metadata,
    Column("article_id", UUID(as_uuid=True), ForeignKey("kb_articles.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", UUID(as_uuid=True), ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)

kb_related_articles = Table(
    "kb_related_articles",
    Base.metadata,
    Column("article_id", UUID(as_uuid=True), ForeignKey("kb_articles.id", ondelete="CASCADE"), primary_key=True),
    Column("related_article_id", UUID(as_uuid=True), ForeignKey("kb_articles.id", ondelete="CASCADE"), primary_key=True),
)


class KBCategory(Base):
    __tablename__ = "kb_categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("kb_categories.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    display_order = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    organization = relationship("Organization")
    subcategories = relationship("KBCategory", backref=relationship("KBCategory", remote_side=[id]))
    articles = relationship("KBArticle", back_populates="category")

    __table_args__ = (
        UniqueConstraint("organization_id", "slug", name="uq_kb_category_slug"),
        Index("ix_kb_category_org", "organization_id"),
    )


class KBArticle(Base):
    __tablename__ = "kb_articles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey("kb_categories.id", ondelete="SET NULL"), nullable=True)
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewer_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    title = Column(String(255), nullable=False)
    slug = Column(String(255), nullable=False)
    summary = Column(Text, nullable=True)
    content = Column(Text, nullable=False)
    rendered_html = Column(Text, nullable=True)

    status = Column(Enum(KBArticleStatus), nullable=False, default=KBArticleStatus.DRAFT)
    visibility = Column(Enum(VisibilityLevel), nullable=False, default=VisibilityLevel.INTERNAL)
    version = Column(Integer, default=1, nullable=False)

    reading_time_minutes = Column(Integer, default=0)
    views = Column(Integer, default=0)
    helpful_count = Column(Integer, default=0)
    not_helpful_count = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    published_at = Column(DateTime, nullable=True)
    deleted_at = Column(DateTime, nullable=True)

    organization = relationship("Organization")
    category = relationship("KBCategory", back_populates="articles")
    author = relationship("User", foreign_keys=[author_id])
    reviewer = relationship("User", foreign_keys=[reviewer_id])

    tags = relationship("Tag", secondary=kb_article_tags)
    related_to = relationship(
        "KBArticle",
        secondary=kb_related_articles,
        primaryjoin=id==kb_related_articles.c.article_id,
        secondaryjoin=id==kb_related_articles.c.related_article_id,
        backref="related_from"
    )
    versions = relationship("KBArticleVersion", back_populates="article", cascade="all, delete-orphan")
    attachments = relationship("KBAttachment", back_populates="article", cascade="all, delete-orphan")
    analytics = relationship("KBAnalytics", back_populates="article", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("organization_id", "slug", name="uq_kb_article_slug"),
        Index("ix_kb_article_org_status", "organization_id", "status"),
    )


class KBArticleVersion(Base):
    __tablename__ = "kb_article_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    article_id = Column(UUID(as_uuid=True), ForeignKey("kb_articles.id", ondelete="CASCADE"), nullable=False)
    editor_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    version_number = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    summary = Column(Text, nullable=True)
    edit_reason = Column(String(255), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    article = relationship("KBArticle", back_populates="versions")
    editor = relationship("User")

    __table_args__ = (
        Index("ix_kb_version_article", "article_id"),
    )


class KBAttachment(Base):
    __tablename__ = "kb_attachments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    article_id = Column(UUID(as_uuid=True), ForeignKey("kb_articles.id", ondelete="CASCADE"), nullable=False)
    uploader_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    filename = Column(String(255), nullable=False)
    file_url = Column(String(1024), nullable=False)
    size = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    article = relationship("KBArticle", back_populates="attachments")
    uploader = relationship("User")


class KBAnalytics(Base):
    __tablename__ = "kb_analytics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    article_id = Column(UUID(as_uuid=True), ForeignKey("kb_articles.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    session_id = Column(String(255), nullable=True)
    event_type = Column(String(50), nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    article = relationship("KBArticle", back_populates="analytics")

    __table_args__ = (
        Index("ix_kb_analytics_article", "article_id"),
    )


class KBMetadata(Base):
    __tablename__ = "kb_metadata"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    article_id = Column(UUID(as_uuid=True), ForeignKey("kb_articles.id", ondelete="CASCADE"), nullable=False)
    vector_id = Column(UUID(as_uuid=True), nullable=True)
    chunk_count = Column(Integer, default=0)
    last_indexed_at = Column(DateTime, nullable=True)

    article = relationship("KBArticle")


class AISuggestion(Base):"""

content = re.sub(kb_models_pattern, kb_new_models, content, flags=re.DOTALL)

with open("src/models.py", "w") as f:
    f.write(content)
print("Models patched successfully.")
