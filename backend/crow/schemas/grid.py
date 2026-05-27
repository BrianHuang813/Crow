from pydantic import BaseModel
from datetime import datetime


class GridCellOut(BaseModel):
    x: int
    y: int
    state: str  # empty | alive | dying | fossil
    project_id: str | None
    color: str | None


class GridSnapshotOut(BaseModel):
    updated_at: datetime
    width: int
    height: int
    cells: list[GridCellOut]
