from datetime import datetime
from pydantic import BaseModel


class UserProfileOut(BaseModel):
    handle: str
    avatar_url: str | None
    resurrection_count: int
    created_at: datetime
    project_count: int
    territory_total: int
