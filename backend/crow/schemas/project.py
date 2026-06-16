import uuid
from datetime import datetime
from pydantic import BaseModel


class ProjectCreate(BaseModel):
    name: str
    description: str | None = None
    url: str | None = None
    repo: str | None = None
    tech_tags: list[str] = []


class ProjectOut(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    url: str | None
    repo: str | None
    tech_tags: list[str]
    owner_id: uuid.UUID
    status: str
    expires_at: datetime
    momentum: int
    territory_size: int
    color: str
    created_at: datetime
    died_at: datetime | None

    model_config = {"from_attributes": True}


class ProjectListOut(BaseModel):
    items: list[ProjectOut]
    total: int
    limit: int
    offset: int


class RelatedOut(BaseModel):
    items: list[ProjectOut]
