from datetime import datetime
from pydantic import BaseModel


class UserProfileOut(BaseModel):
    handle: str
    avatar_url: str | None
    resurrection_count: int
    created_at: datetime
    project_count: int
    territory_total: int
    follower_count: int
    following_count: int
    is_following: bool


class FollowStateOut(BaseModel):
    is_following: bool
    follower_count: int


class UserSearchItemOut(BaseModel):
    handle: str
    avatar_url: str | None
    project_count: int
    territory_total: int
    follower_count: int


class UserSearchOut(BaseModel):
    items: list[UserSearchItemOut]
    total: int
    limit: int
    offset: int
