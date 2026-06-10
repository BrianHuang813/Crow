# Backend Follow System — Implementation Plan (Spec B)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a user-to-user follow graph: a `follows` table + Alembic migration, follow/unfollow endpoints, and follower/following counts + `is_following` on the public profile.

**Architecture:** A `Follow` SQLAlchemy model with a composite PK `(follower_id, followee_id)` and a followee index. Two auth-guarded, idempotent endpoints on the users router. The existing `GET /api/users/{handle}` switches to optional auth (`get_optional_user`, already present in `auth.py`) and gains three computed fields. No notifications, no following-feed, no list endpoints.

**Tech Stack:** Python, FastAPI, async SQLAlchemy, Alembic, Pydantic v2, pytest + pytest-asyncio (real Postgres test DB).

**Spec:** `docs/superpowers/specs/2026-06-10-backend-follow-system-design.md`

---

## Environment / prerequisites

All work in `backend/`. **Prefix every pytest run** (config needs these at import):
```
DATABASE_URL="postgresql+asyncpg://crow:crow@localhost:5432/crow_test" REDIS_URL="redis://localhost:6379/0"
```
Tests build the schema via `create_all` (conftest), so they don't need the migration. The migration is validated separately against the **dev** `crow` DB (Task 1).

- [ ] **Confirm baseline:** `cd backend && DATABASE_URL="postgresql+asyncpg://crow:crow@localhost:5432/crow_test" REDIS_URL="redis://localhost:6379/0" pytest -q` → all existing tests pass before starting.

---

## File Structure

- `crow/models/follow.py` — **new**: `Follow` model
- `crow/models/__init__.py` — register `Follow`
- `alembic/versions/b1f0110f0110_add_follows.py` — **new** migration (`down_revision = '560ec278a583'`)
- `crow/schemas/user.py` — extend `UserProfileOut`; add `FollowStateOut`
- `crow/routers/users.py` — extend `get_user_profile`; add `follow_user` + `unfollow_user`
- `tests/test_follow.py` — **new**; `tests/test_users.py` — extend

Note: `crow/auth.py` already exports `get_optional_user` (returns `User | None`, never raises) — no change needed there.

---

### Task 1: Follow model + Alembic migration

**Files:**
- Create: `crow/models/follow.py`
- Modify: `crow/models/__init__.py`
- Create: `alembic/versions/b1f0110f0110_add_follows.py`

- [ ] **Step 1: Create the model**

Create `crow/models/follow.py`:

```python
import uuid
from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, func, Index
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from ..database import Base


class Follow(Base):
    __tablename__ = "follows"

    follower_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True
    )
    followee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    __table_args__ = (Index("ix_follows_followee_id", "followee_id"),)
```

- [ ] **Step 2: Register the model**

In `crow/models/__init__.py`, add the import and `__all__` entry so it reads:

```python
from .user import User
from .project import Project
from .grid_cell import GridCell
from .interaction import Interaction
from .grid_snapshot import GridSnapshot
from .follow import Follow

__all__ = ["User", "Project", "GridCell", "Interaction", "GridSnapshot", "Follow"]
```

- [ ] **Step 3: Create the Alembic migration**

Create `alembic/versions/b1f0110f0110_add_follows.py`:

```python
"""add follows table

Revision ID: b1f0110f0110
Revises: 560ec278a583
Create Date: 2026-06-10

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "b1f0110f0110"
down_revision: Union[str, None] = "560ec278a583"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "follows",
        sa.Column("follower_id", sa.UUID(), nullable=False),
        sa.Column("followee_id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["follower_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["followee_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("follower_id", "followee_id"),
    )
    op.create_index("ix_follows_followee_id", "follows", ["followee_id"])


def downgrade() -> None:
    op.drop_index("ix_follows_followee_id", table_name="follows")
    op.drop_table("follows")
```

- [ ] **Step 4: Validate the migration against the dev `crow` DB**

The test DB uses `create_all`; validate the real migration chain against the empty dev `crow` database (the docker `db` service):

Run: `cd backend && DATABASE_URL="postgresql+asyncpg://crow:crow@localhost:5432/crow" REDIS_URL="redis://localhost:6379/0" alembic upgrade head`
Expected: applies `560ec278a583` then `b1f0110f0110` with no error (output ends at `Running upgrade 560ec278a583 -> b1f0110f0110`). If the dev DB was already at head from a prior run, it's a no-op — that's fine.

Then confirm the model imports cleanly (registers with `Base.metadata`):
Run: `cd backend && DATABASE_URL="postgresql+asyncpg://crow:crow@localhost:5432/crow_test" REDIS_URL="redis://localhost:6379/0" python -c "from crow.models import Follow; print('ok', Follow.__tablename__)"`
Expected: `ok follows`.

- [ ] **Step 5: Commit**

```bash
git add backend/crow/models/follow.py backend/crow/models/__init__.py backend/alembic/versions/b1f0110f0110_add_follows.py
git commit -m "feat(backend): Follow model + follows table migration"
```

---

### Task 2: Extend the profile endpoint with counts + is_following

**Files:**
- Modify: `crow/schemas/user.py`
- Modify: `crow/routers/users.py`
- Modify: `tests/test_users.py`

- [ ] **Step 1: Write the failing tests** (append to `tests/test_users.py`)

Add these imports at the top of `tests/test_users.py` if not already present: `from crow.auth import create_token` and `from crow.models import Follow`. Then append:

```python
async def make_follow(db, follower, followee):
    db.add(Follow(follower_id=follower.id, followee_id=followee.id))
    await db.commit()


def auth(user):
    return {"Authorization": f"Bearer {create_token(str(user.id))}"}


@pytest.mark.asyncio
async def test_profile_has_follow_counts(client, db):
    alice = await make_user(db, handle="alice", gh="1")
    bob = await make_user(db, handle="bob", gh="2")
    carol = await make_user(db, handle="carol", gh="3")
    await make_follow(db, bob, alice)     # bob follows alice
    await make_follow(db, carol, alice)   # carol follows alice
    await make_follow(db, alice, bob)     # alice follows bob

    body = (await client.get("/api/users/alice")).json()
    assert body["follower_count"] == 2
    assert body["following_count"] == 1


@pytest.mark.asyncio
async def test_is_following_reflects_caller(client, db):
    alice = await make_user(db, handle="alice", gh="1")
    bob = await make_user(db, handle="bob", gh="2")
    await make_follow(db, bob, alice)  # bob follows alice

    # bob (authed) viewing alice -> is_following true
    body = (await client.get("/api/users/alice", headers=auth(bob))).json()
    assert body["is_following"] is True

    # alice (authed) viewing alice (self) -> false
    self_body = (await client.get("/api/users/alice", headers=auth(alice))).json()
    assert self_body["is_following"] is False

    # anonymous viewing alice -> false
    anon = (await client.get("/api/users/alice")).json()
    assert anon["is_following"] is False
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && DATABASE_URL="postgresql+asyncpg://crow:crow@localhost:5432/crow_test" REDIS_URL="redis://localhost:6379/0" pytest tests/test_users.py -q`
Expected: FAIL (response has no `follower_count`/`is_following`).

- [ ] **Step 3: Extend the schema**

Replace the body of `crow/schemas/user.py` with:

```python
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
```

- [ ] **Step 4: Extend the profile handler**

In `crow/routers/users.py`:
1. Update imports:
```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from ..database import get_db
from ..auth import get_current_user, get_optional_user
from ..models import User, Project, Follow
from ..schemas.user import UserProfileOut, FollowStateOut

router = APIRouter()


async def _follower_count(db: AsyncSession, user_id) -> int:
    return await db.scalar(
        select(func.count()).select_from(Follow).where(Follow.followee_id == user_id)
    ) or 0
```
2. Replace the existing `get_user_profile` with:
```python
@router.get("/users/{handle}", response_model=UserProfileOut)
async def get_user_profile(
    handle: str,
    db: AsyncSession = Depends(get_db),
    viewer: User | None = Depends(get_optional_user),
):
    user = (
        await db.execute(select(User).where(User.handle == handle))
    ).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    project_count = await db.scalar(
        select(func.count()).select_from(Project).where(Project.owner_id == user.id)
    )
    territory_total = await db.scalar(
        select(func.coalesce(func.sum(Project.territory_size), 0)).where(
            Project.owner_id == user.id,
            Project.status.in_(["alive", "dying"]),
        )
    )
    follower_count = await _follower_count(db, user.id)
    following_count = await db.scalar(
        select(func.count()).select_from(Follow).where(Follow.follower_id == user.id)
    )

    is_following = False
    if viewer and viewer.id != user.id:
        row = await db.scalar(
            select(Follow).where(
                Follow.follower_id == viewer.id,
                Follow.followee_id == user.id,
            )
        )
        is_following = row is not None

    return UserProfileOut(
        handle=user.handle,
        avatar_url=user.avatar_url,
        resurrection_count=user.resurrection_count,
        created_at=user.created_at,
        project_count=project_count or 0,
        territory_total=territory_total or 0,
        follower_count=follower_count,
        following_count=following_count or 0,
        is_following=is_following,
    )
```

- [ ] **Step 5: Run to verify it passes**

Run: `cd backend && DATABASE_URL="postgresql+asyncpg://crow:crow@localhost:5432/crow_test" REDIS_URL="redis://localhost:6379/0" pytest tests/test_users.py -q`
Expected: PASS (existing user tests + the 2 new ones). The existing privacy test still passes (no new private fields).

- [ ] **Step 6: Commit**

```bash
git add backend/crow/schemas/user.py backend/crow/routers/users.py backend/tests/test_users.py
git commit -m "feat(backend): profile exposes follower/following counts + is_following"
```

---

### Task 3: Follow / unfollow endpoints

**Files:**
- Modify: `crow/routers/users.py`
- Test: `tests/test_follow.py`

- [ ] **Step 1: Write the failing tests**

Create `tests/test_follow.py`:

```python
import pytest
from crow.models import User
from crow.auth import create_token


async def make_user(db, handle="alice", gh="1"):
    u = User(github_id=gh, handle=handle)
    db.add(u)
    await db.commit()
    await db.refresh(u)
    return u


def auth(user):
    return {"Authorization": f"Bearer {create_token(str(user.id))}"}


@pytest.mark.asyncio
async def test_follow_then_unfollow(client, db):
    alice = await make_user(db, handle="alice", gh="1")
    bob = await make_user(db, handle="bob", gh="2")

    r = await client.post("/api/users/alice/follow", headers=auth(bob))
    assert r.status_code == 200
    assert r.json() == {"is_following": True, "follower_count": 1}

    # idempotent — following again keeps count at 1
    r2 = await client.post("/api/users/alice/follow", headers=auth(bob))
    assert r2.json()["follower_count"] == 1

    r3 = await client.delete("/api/users/alice/follow", headers=auth(bob))
    assert r3.status_code == 200
    assert r3.json() == {"is_following": False, "follower_count": 0}

    # idempotent unfollow
    r4 = await client.delete("/api/users/alice/follow", headers=auth(bob))
    assert r4.json()["is_following"] is False


@pytest.mark.asyncio
async def test_cannot_follow_self(client, db):
    alice = await make_user(db, handle="alice", gh="1")
    r = await client.post("/api/users/alice/follow", headers=auth(alice))
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_follow_unknown_handle_404(client, db):
    bob = await make_user(db, handle="bob", gh="2")
    r = await client.post("/api/users/ghost/follow", headers=auth(bob))
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_follow_requires_auth(client, db):
    await make_user(db, handle="alice", gh="1")
    r = await client.post("/api/users/alice/follow")
    assert r.status_code == 401
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && DATABASE_URL="postgresql+asyncpg://crow:crow@localhost:5432/crow_test" REDIS_URL="redis://localhost:6379/0" pytest tests/test_follow.py -q`
Expected: FAIL (routes 404/405).

- [ ] **Step 3: Add the endpoints**

Append to `crow/routers/users.py` (the imports from Task 2 already include `get_current_user`, `Follow`, `FollowStateOut`, `_follower_count`):

```python
@router.post("/users/{handle}/follow", response_model=FollowStateOut)
async def follow_user(
    handle: str,
    db: AsyncSession = Depends(get_db),
    me: User = Depends(get_current_user),
):
    target = (
        await db.execute(select(User).where(User.handle == handle))
    ).scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == me.id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")

    existing = await db.scalar(
        select(Follow).where(Follow.follower_id == me.id, Follow.followee_id == target.id)
    )
    if not existing:
        db.add(Follow(follower_id=me.id, followee_id=target.id))
        await db.commit()

    return FollowStateOut(is_following=True, follower_count=await _follower_count(db, target.id))


@router.delete("/users/{handle}/follow", response_model=FollowStateOut)
async def unfollow_user(
    handle: str,
    db: AsyncSession = Depends(get_db),
    me: User = Depends(get_current_user),
):
    target = (
        await db.execute(select(User).where(User.handle == handle))
    ).scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    existing = await db.scalar(
        select(Follow).where(Follow.follower_id == me.id, Follow.followee_id == target.id)
    )
    if existing:
        await db.delete(existing)
        await db.commit()

    return FollowStateOut(is_following=False, follower_count=await _follower_count(db, target.id))
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd backend && DATABASE_URL="postgresql+asyncpg://crow:crow@localhost:5432/crow_test" REDIS_URL="redis://localhost:6379/0" pytest tests/test_follow.py -q`
Expected: PASS (4 tests).

- [ ] **Step 5: Run the full backend suite**

Run: `cd backend && DATABASE_URL="postgresql+asyncpg://crow:crow@localhost:5432/crow_test" REDIS_URL="redis://localhost:6379/0" pytest -q`
Expected: all tests PASS (existing + new).

- [ ] **Step 6: Commit**

```bash
git add backend/crow/routers/users.py backend/tests/test_follow.py
git commit -m "feat(backend): follow/unfollow endpoints (idempotent, auth-guarded)"
```

---

## Self-Review

- **Spec coverage:** `follows` table + migration (Task 1); follow/unfollow idempotent + auth + self-block + 404 (Task 3); profile counts + caller-relative `is_following` via optional auth (Task 2). Privacy unchanged (existing test still asserts no `credits`/`email`/`github_id`).
- **Placeholder scan:** no TBD/TODO; full code in every step; every test has assertions.
- **Type consistency:** `Follow` (follower_id/followee_id/created_at) used identically in model, migration, router, and tests. `FollowStateOut {is_following, follower_count}` is the response of both follow endpoints and matches the test assertions exactly. `UserProfileOut` gains the three fields used by the profile test. `_follower_count` defined once in Task 2 and reused in Task 3 (same file).
- **Migration chain:** `down_revision = '560ec278a583'` (the only existing revision) — single linear chain. Tests don't depend on it (`create_all`).
- **Deploy note:** after deploying, run `alembic upgrade head` on the Railway DB (Dockerfile doesn't auto-migrate).
- **Route ordering:** `GET /users/{handle}`, `POST/DELETE /users/{handle}/follow` are distinct by path+method; no shadowing.
