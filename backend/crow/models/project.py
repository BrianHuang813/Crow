import uuid
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from ..database import Base

class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    tech_tags: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False, server_default="{}")
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="alive")
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    momentum: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    territory_size: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    color: Mapped[str] = mapped_column(String(7), nullable=False)
    resurrected_from: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    died_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
