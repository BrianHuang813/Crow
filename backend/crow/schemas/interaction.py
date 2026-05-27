from pydantic import BaseModel


class InteractionCreate(BaseModel):
    type: str  # "click" | "boost"


class InteractionOut(BaseModel):
    momentum_added: int
    time_added_seconds: int
    credits_earned: int
    new_momentum: int
    new_expires_at: str
