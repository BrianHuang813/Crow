import uuid
from datetime import datetime
from sqlalchemy import SmallInteger, String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from ..database import Base

class GridCell(Base):
    __tablename__ = "grid_cells"

    x: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    y: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    project_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True)
    state: Mapped[str] = mapped_column(String(10), nullable=False, default="empty")
    claimed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
