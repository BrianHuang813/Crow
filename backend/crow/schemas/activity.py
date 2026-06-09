import uuid
from datetime import datetime
from pydantic import BaseModel


class ActivityEventOut(BaseModel):
    type: str  # claimed | faded | boosted
    project_id: uuid.UUID
    project_name: str
    color: str
    actor_handle: str | None
    at: datetime


class ActivityOut(BaseModel):
    events: list[ActivityEventOut]
