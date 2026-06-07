# Backend Social Read APIs — Implementation Plan (Spec A)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four read-only API endpoints (`GET /api/projects`, `GET /api/users/{handle}`, `GET /api/activity`, `GET /api/projects/{id}/related`) backed by existing tables, replacing the frontend's client-side derivations.

**Architecture:** FastAPI routers under `crow/routers/`, async SQLAlchemy queries over the existing `projects`/`users`/`interactions` tables, Pydantic response schemas under `crow/schemas/`. No DB migrations, no new infra. Public endpoints (no auth) that must not leak private user fields.

**Tech Stack:** Python, FastAPI, async SQLAlchemy, Pydantic v2, pytest + pytest-asyncio (real Postgres test DB).

**Spec:** `docs/superpowers/specs/2026-06-07-backend-social-read-apis-design.md`

---

## Prerequisite (run once before Task 1)

All work is in `backend/`. The test suite needs the Postgres test DB from `tests/conftest.py` (`postgresql+asyncpg://crow:crow@localhost:5432/crow_test`).

- [ ] **Confirm the test environment works**

Run: `cd backend && pytest -q`
Expected: existing tests PASS. If they error on DB connection, start Postgres and create the `crow_test` database before continuing (e.g. the project's usual `docker compose up db` or a local `createdb crow_test`). Do not proceed until the existing suite is green.

---

## File Structure

- `crow/schemas/project.py` — add `ProjectListOut`, `RelatedOut`
- `crow/schemas/user.py` — **new**: `UserProfileOut`
- `crow/schemas/activity.py` — **new**: `ActivityEventOut`, `ActivityOut`
- `crow/routers/projects.py` — add `GET /projects` (list) + `GET /projects/{project_id}/related`
- `crow/routers/users.py` — **new**: `GET /users/{handle}`
- `crow/routers/activity.py` — **new**: `GET /activity`
- `crow/main.py` — register `users` + `activity` routers
- `tests/test_projects_list.py`, `tests/test_users.py`, `tests/test_activity.py`, `tests/test_related.py` — **new**

### Shared test helpers (used across the new test files)

Each new test file starts with these helpers (repeated per file — they're tiny and keep files self-contained):

```python
import pytest
from datetime import datetime, timedelta, timezone
from crow.models import User, Project, Interaction


def _now():
    return datetime.now(timezone.utc)


async def make_user(db, handle="alice", gh="1"):
    u = User(github_id=gh, handle=handle)
    db.add(u)
    await db.commit()
    await db.refresh(u)
    return u


async def make_project(db, owner, name, **kw):
    p = Project(
        name=name,
        owner_id=owner.id,
        status=kw.get("status", "alive"),
        expires_at=kw.get("expires_at", _now() + timedelta(hours=24)),
        momentum=kw.get("momentum", 0),
        territory_size=kw.get("territory_size", 1),
        color=kw.get("color", "#ac3509"),
        tech_tags=kw.get("tech_tags", []),
        died_at=kw.get("died_at"),
    )
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return p
```

---

### Task 1: `GET /api/projects` — list / sort / filter / paginate

**Files:**
- Modify: `crow/schemas/project.py`
- Modify: `crow/routers/projects.py`
- Test: `tests/test_projects_list.py`

- [ ] **Step 1: Write the failing tests**

Create `tests/test_projects_list.py` (helpers from the File Structure section, then):

```python
@pytest.mark.asyncio
async def test_list_sorts_by_momentum_desc(client, db):
    u = await make_user(db)
    await make_project(db, u, "Low", momentum=10)
    await make_project(db, u, "High", momentum=90)
    r = await client.get("/api/projects?sort=momentum")
    assert r.status_code == 200
    body = r.json()
    assert [i["name"] for i in body["items"]] == ["High", "Low"]
    assert body["total"] == 2


@pytest.mark.asyncio
async def test_list_sorts_by_territory(client, db):
    u = await make_user(db)
    await make_project(db, u, "Small", territory_size=2)
    await make_project(db, u, "Big", territory_size=40)
    r = await client.get("/api/projects?sort=territory")
    assert [i["name"] for i in r.json()["items"]] == ["Big", "Small"]


@pytest.mark.asyncio
async def test_active_status_excludes_dead(client, db):
    u = await make_user(db)
    await make_project(db, u, "Alive", status="alive")
    await make_project(db, u, "Dead", status="dead", died_at=_now())
    r = await client.get("/api/projects?status=active")
    names = [i["name"] for i in r.json()["items"]]
    assert "Alive" in names and "Dead" not in names


@pytest.mark.asyncio
async def test_dead_status_recent_orders_by_died_at(client, db):
    u = await make_user(db)
    await make_project(db, u, "OlderDeath", status="dead", died_at=_now() - timedelta(hours=2))
    await make_project(db, u, "NewerDeath", status="dead", died_at=_now())
    r = await client.get("/api/projects?status=dead&sort=recent")
    assert [i["name"] for i in r.json()["items"]] == ["NewerDeath", "OlderDeath"]


@pytest.mark.asyncio
async def test_owner_handle_filter_and_unknown_404(client, db):
    a = await make_user(db, handle="alice", gh="1")
    b = await make_user(db, handle="bob", gh="2")
    await make_project(db, a, "AliceProj")
    await make_project(db, b, "BobProj")
    r = await client.get("/api/projects?owner_handle=alice&status=all")
    assert [i["name"] for i in r.json()["items"]] == ["AliceProj"]
    r404 = await client.get("/api/projects?owner_handle=ghost")
    assert r404.status_code == 404


@pytest.mark.asyncio
async def test_tag_filter(client, db):
    u = await make_user(db)
    await make_project(db, u, "Reacty", tech_tags=["React", "TS"])
    await make_project(db, u, "Pythonic", tech_tags=["Python"])
    r = await client.get("/api/projects?tag=React")
    assert [i["name"] for i in r.json()["items"]] == ["Reacty"]


@pytest.mark.asyncio
async def test_limit_clamped_and_total_reflects_filter(client, db):
    u = await make_user(db)
    for i in range(5):
        await make_project(db, u, f"P{i}", momentum=i)
    r = await client.get("/api/projects?limit=2")
    body = r.json()
    assert len(body["items"]) == 2
    assert body["total"] == 5
    assert body["limit"] == 2


@pytest.mark.asyncio
async def test_invalid_sort_and_status_400(client, db):
    assert (await client.get("/api/projects?sort=bogus")).status_code == 400
    assert (await client.get("/api/projects?status=bogus")).status_code == 400
    assert (await client.get("/api/projects?offset=-1")).status_code == 400
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && pytest tests/test_projects_list.py -q`
Expected: FAIL (endpoint returns 404/422, schema/route not present).

- [ ] **Step 3: Add the response schemas**

In `crow/schemas/project.py`, append:

```python
class ProjectListOut(BaseModel):
    items: list[ProjectOut]
    total: int
    limit: int
    offset: int


class RelatedOut(BaseModel):
    items: list[ProjectOut]
```

- [ ] **Step 4: Implement the list endpoint**

In `crow/routers/projects.py`:

1. Change the FastAPI import line to include `Query`:
   `from fastapi import APIRouter, Depends, HTTPException, status, Query`
2. Add `ProjectListOut, RelatedOut` to the schema import:
   `from ..schemas.project import ProjectCreate, ProjectOut, ProjectListOut, RelatedOut`
3. Add these module-level constants just after `router = APIRouter()`:

```python
_VALID_STATUS = {"active", "alive", "dying", "dead", "all"}
_VALID_SORT = {"momentum", "recent", "territory"}
```

4. Add the list handler. Place it **above** `@router.get("/projects/mine")` so all GET routes read top-down (FastAPI still resolves correctly regardless, but keep collection routes grouped):

```python
@router.get("/projects", response_model=ProjectListOut)
async def list_projects(
    db: AsyncSession = Depends(get_db),
    status: str = Query("active"),
    sort: str = Query("momentum"),
    owner_handle: str | None = Query(None),
    tag: str | None = Query(None),
    limit: int = Query(20),
    offset: int = Query(0),
):
    if status not in _VALID_STATUS:
        raise HTTPException(status_code=400, detail="invalid status")
    if sort not in _VALID_SORT:
        raise HTTPException(status_code=400, detail="invalid sort")
    if limit < 0 or offset < 0:
        raise HTTPException(status_code=400, detail="limit/offset must be >= 0")
    limit = min(limit, 50)

    base = select(Project)
    if status == "active":
        base = base.where(Project.status.in_(["alive", "dying"]))
    elif status != "all":
        base = base.where(Project.status == status)

    if owner_handle is not None:
        owner = (
            await db.execute(select(User).where(User.handle == owner_handle))
        ).scalar_one_or_none()
        if not owner:
            raise HTTPException(status_code=404, detail="User not found")
        base = base.where(Project.owner_id == owner.id)

    if tag is not None:
        base = base.where(Project.tech_tags.any(tag))

    total = await db.scalar(select(func.count()).select_from(base.subquery()))

    if sort == "momentum":
        ordering = (Project.momentum.desc(), Project.created_at.desc())
    elif sort == "territory":
        ordering = (Project.territory_size.desc(), Project.created_at.desc())
    elif status == "dead":  # sort == "recent" on dead projects
        ordering = (Project.died_at.desc(),)
    else:  # sort == "recent"
        ordering = (Project.created_at.desc(),)

    rows = (
        await db.execute(base.order_by(*ordering).limit(limit).offset(offset))
    ).scalars().all()
    return ProjectListOut(items=rows, total=total or 0, limit=limit, offset=offset)
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && pytest tests/test_projects_list.py -q`
Expected: PASS (8 tests).

- [ ] **Step 6: Commit**

```bash
git add backend/crow/schemas/project.py backend/crow/routers/projects.py backend/tests/test_projects_list.py
git commit -m "feat(backend): GET /api/projects list/sort/filter/paginate"
```

---

### Task 2: `GET /api/users/{handle}` — public profile

**Files:**
- Create: `crow/schemas/user.py`
- Create: `crow/routers/users.py`
- Modify: `crow/main.py`
- Test: `tests/test_users.py`

- [ ] **Step 1: Write the failing tests**

Create `tests/test_users.py` (helpers from the File Structure section, then):

```python
@pytest.mark.asyncio
async def test_profile_returns_public_fields(client, db):
    u = await make_user(db, handle="alice")
    u.resurrection_count = 3
    u.avatar_url = "https://x/a.png"
    await db.commit()
    await make_project(db, u, "P1", territory_size=10, status="alive")
    await make_project(db, u, "P2", territory_size=5, status="dying")
    await make_project(db, u, "Dead", territory_size=7, status="dead", died_at=_now())

    r = await client.get("/api/users/alice")
    assert r.status_code == 200
    body = r.json()
    assert body["handle"] == "alice"
    assert body["avatar_url"] == "https://x/a.png"
    assert body["resurrection_count"] == 3
    assert body["project_count"] == 3          # all statuses
    assert body["territory_total"] == 15        # alive + dying only


@pytest.mark.asyncio
async def test_profile_never_leaks_private_fields(client, db):
    u = await make_user(db, handle="alice")
    u.credits = 999
    u.email = "secret@x.com"
    await db.commit()
    body = (await client.get("/api/users/alice")).json()
    assert "credits" not in body
    assert "email" not in body
    assert "github_id" not in body


@pytest.mark.asyncio
async def test_profile_unknown_handle_404(client, db):
    assert (await client.get("/api/users/ghost")).status_code == 404
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && pytest tests/test_users.py -q`
Expected: FAIL (404 route missing).

- [ ] **Step 3: Create the schema**

Create `crow/schemas/user.py`:

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
```

- [ ] **Step 4: Create the router**

Create `crow/routers/users.py`:

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from ..database import get_db
from ..models import User, Project
from ..schemas.user import UserProfileOut

router = APIRouter()


@router.get("/users/{handle}", response_model=UserProfileOut)
async def get_user_profile(handle: str, db: AsyncSession = Depends(get_db)):
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
    return UserProfileOut(
        handle=user.handle,
        avatar_url=user.avatar_url,
        resurrection_count=user.resurrection_count,
        created_at=user.created_at,
        project_count=project_count or 0,
        territory_total=territory_total or 0,
    )
```

- [ ] **Step 5: Register the router in main.py**

In `crow/main.py`, add `users` to the routers import tuple:

```python
from .routers import (
    grid,
    auth as auth_router,
    projects as projects_router,
    interact as interact_router,
    og as og_router,
    users as users_router,
)
```

And add after the projects router registration:

```python
app.include_router(users_router.router, prefix="/api")
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd backend && pytest tests/test_users.py -q`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add backend/crow/schemas/user.py backend/crow/routers/users.py backend/crow/main.py backend/tests/test_users.py
git commit -m "feat(backend): GET /api/users/{handle} public profile"
```

---

### Task 3: `GET /api/activity` — derived live feed

**Files:**
- Create: `crow/schemas/activity.py`
- Create: `crow/routers/activity.py`
- Modify: `crow/main.py`
- Test: `tests/test_activity.py`

- [ ] **Step 1: Write the failing tests**

Create `tests/test_activity.py` (helpers from the File Structure section, then):

```python
async def make_interaction(db, project, user, type_, when=None):
    i = Interaction(
        project_id=project.id,
        user_id=user.id if user else None,
        type=type_,
        momentum_granted=25 if type_ == "boost" else 5,
        time_granted=0,
        credits_granted=0,
    )
    db.add(i)
    await db.commit()
    await db.refresh(i)
    return i


@pytest.mark.asyncio
async def test_activity_includes_boosts_excludes_clicks(client, db):
    u = await make_user(db, handle="bob")
    p = await make_project(db, u, "EchoFlow")
    await make_interaction(db, p, u, "boost")
    await make_interaction(db, p, u, "click")
    body = (await client.get("/api/activity")).json()
    types = [e["type"] for e in body["events"]]
    assert "boosted" in types
    boosted = next(e for e in body["events"] if e["type"] == "boosted")
    assert boosted["actor_handle"] == "bob"
    assert boosted["project_name"] == "EchoFlow"
    # a click must never appear as an event
    assert all(e["type"] != "clicked" for e in body["events"])


@pytest.mark.asyncio
async def test_activity_has_claimed_and_faded(client, db):
    u = await make_user(db)
    await make_project(db, u, "NewProj", status="alive")
    await make_project(db, u, "DeadProj", status="dead", died_at=_now())
    body = (await client.get("/api/activity")).json()
    types = {e["type"] for e in body["events"]}
    assert "claimed" in types
    assert "faded" in types


@pytest.mark.asyncio
async def test_activity_sorted_desc_and_limited(client, db):
    u = await make_user(db)
    # 3 claims; request limit=2 → newest two only, time-desc
    await make_project(db, u, "A")
    await make_project(db, u, "B")
    await make_project(db, u, "C")
    body = (await client.get("/api/activity?limit=2")).json()
    assert len(body["events"]) == 2
    ats = [e["at"] for e in body["events"]]
    assert ats == sorted(ats, reverse=True)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && pytest tests/test_activity.py -q`
Expected: FAIL (route missing).

- [ ] **Step 3: Create the schema**

Create `crow/schemas/activity.py`:

```python
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
```

- [ ] **Step 4: Create the router**

Create `crow/routers/activity.py`:

```python
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_db
from ..models import Project, Interaction, User
from ..schemas.activity import ActivityEventOut, ActivityOut

router = APIRouter()


@router.get("/activity", response_model=ActivityOut)
async def get_activity(db: AsyncSession = Depends(get_db), limit: int = Query(20)):
    limit = min(max(limit, 1), 50)
    events: list[ActivityEventOut] = []

    claimed = (
        await db.execute(select(Project).order_by(Project.created_at.desc()).limit(limit))
    ).scalars().all()
    for p in claimed:
        events.append(ActivityEventOut(
            type="claimed", project_id=p.id, project_name=p.name,
            color=p.color, actor_handle=None, at=p.created_at,
        ))

    faded = (
        await db.execute(
            select(Project).where(Project.died_at.is_not(None))
            .order_by(Project.died_at.desc()).limit(limit)
        )
    ).scalars().all()
    for p in faded:
        events.append(ActivityEventOut(
            type="faded", project_id=p.id, project_name=p.name,
            color=p.color, actor_handle=None, at=p.died_at,
        ))

    boosts = (
        await db.execute(
            select(Interaction, Project, User)
            .join(Project, Interaction.project_id == Project.id)
            .outerjoin(User, Interaction.user_id == User.id)
            .where(Interaction.type == "boost")
            .order_by(Interaction.created_at.desc())
            .limit(limit)
        )
    ).all()
    for inter, proj, usr in boosts:
        events.append(ActivityEventOut(
            type="boosted", project_id=proj.id, project_name=proj.name,
            color=proj.color, actor_handle=(usr.handle if usr else None),
            at=inter.created_at,
        ))

    events.sort(key=lambda e: e.at, reverse=True)
    return ActivityOut(events=events[:limit])
```

- [ ] **Step 5: Register the router in main.py**

In `crow/main.py`, add `activity` to the import tuple:

```python
    og as og_router,
    users as users_router,
    activity as activity_router,
)
```

And register after the users router:

```python
app.include_router(activity_router.router, prefix="/api")
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd backend && pytest tests/test_activity.py -q`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add backend/crow/schemas/activity.py backend/crow/routers/activity.py backend/crow/main.py backend/tests/test_activity.py
git commit -m "feat(backend): GET /api/activity derived live feed"
```

---

### Task 4: `GET /api/projects/{id}/related` — recommendations

**Files:**
- Modify: `crow/routers/projects.py`
- Test: `tests/test_related.py`

(`RelatedOut` was already added in Task 1.)

- [ ] **Step 1: Write the failing tests**

Create `tests/test_related.py` (helpers from the File Structure section, then):

```python
@pytest.mark.asyncio
async def test_related_ranks_by_tag_overlap(client, db):
    u = await make_user(db)
    target = await make_project(db, u, "Target", tech_tags=["React", "TS", "Node"])
    await make_project(db, u, "TwoMatch", tech_tags=["React", "TS"], momentum=1)
    await make_project(db, u, "OneMatch", tech_tags=["React"], momentum=99)
    await make_project(db, u, "NoMatch", tech_tags=["Rust"])
    r = await client.get(f"/api/projects/{target.id}/related")
    names = [i["name"] for i in r.json()["items"]]
    assert names[0] == "TwoMatch"          # more overlap beats higher momentum
    assert "OneMatch" in names
    assert "NoMatch" not in names
    assert "Target" not in names           # excludes self


@pytest.mark.asyncio
async def test_related_excludes_dead(client, db):
    u = await make_user(db)
    target = await make_project(db, u, "Target", tech_tags=["React"])
    await make_project(db, u, "DeadMatch", tech_tags=["React"], status="dead", died_at=_now())
    names = [i["name"] for i in (await client.get(f"/api/projects/{target.id}/related")).json()["items"]]
    assert "DeadMatch" not in names


@pytest.mark.asyncio
async def test_related_falls_back_to_momentum_when_no_tags(client, db):
    u = await make_user(db)
    target = await make_project(db, u, "Target", tech_tags=[])
    await make_project(db, u, "Hot", tech_tags=["X"], momentum=90)
    await make_project(db, u, "Cold", tech_tags=["Y"], momentum=5)
    names = [i["name"] for i in (await client.get(f"/api/projects/{target.id}/related?limit=1")).json()["items"]]
    assert names == ["Hot"]


@pytest.mark.asyncio
async def test_related_unknown_project_404(client, db):
    import uuid
    r = await client.get(f"/api/projects/{uuid.uuid4()}/related")
    assert r.status_code == 404
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && pytest tests/test_related.py -q`
Expected: FAIL (route missing).

- [ ] **Step 3: Implement the related endpoint**

In `crow/routers/projects.py`, add this handler (place it after the `get_project` handler):

```python
@router.get("/projects/{project_id}/related", response_model=RelatedOut)
async def related_projects(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(4),
):
    limit = min(max(limit, 1), 12)
    target = (
        await db.execute(select(Project).where(Project.id == project_id))
    ).scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Project not found")

    active = (Project.status.in_(["alive", "dying"]), Project.id != target.id)
    chosen: list[Project] = []
    seen: set = set()

    if target.tech_tags:
        candidates = (
            await db.execute(
                select(Project).where(*active, Project.tech_tags.overlap(target.tech_tags))
            )
        ).scalars().all()
        target_tags = set(target.tech_tags)
        candidates.sort(
            key=lambda p: (len(set(p.tech_tags) & target_tags), p.momentum),
            reverse=True,
        )
        for p in candidates:
            chosen.append(p)
            seen.add(p.id)
            if len(chosen) >= limit:
                break

    if len(chosen) < limit:
        fill = (
            await db.execute(
                select(Project).where(*active)
                .order_by(Project.momentum.desc(), Project.created_at.desc())
                .limit(limit * 3)
            )
        ).scalars().all()
        for p in fill:
            if p.id in seen:
                continue
            chosen.append(p)
            seen.add(p.id)
            if len(chosen) >= limit:
                break

    return RelatedOut(items=chosen[:limit])
```

Note: `Project.tech_tags.overlap(...)` uses the Postgres array `&&` operator (the column is a `postgresql.ARRAY`).

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && pytest tests/test_related.py -q`
Expected: PASS (4 tests).

- [ ] **Step 5: Run the full backend suite**

Run: `cd backend && pytest -q`
Expected: all tests PASS (existing + new).

- [ ] **Step 6: Commit**

```bash
git add backend/crow/routers/projects.py backend/tests/test_related.py
git commit -m "feat(backend): GET /api/projects/{id}/related recommendations"
```

---

## Self-Review

- **Spec coverage:** endpoint 1 list/sort/filter/paginate → Task 1 ✓; endpoint 2 public profile (no credits/email/github_id) → Task 2 ✓ (explicit leak test); endpoint 3 activity (boosts not clicks, claimed/faded, time-sorted, limit) → Task 3 ✓; endpoint 4 related (tag overlap, exclude self/dead, momentum fallback, 404) → Task 4 ✓. Error handling (400 invalid enum, 404 unknown handle/id, limit clamp) covered in Tasks 1/2/4.
- **No migrations:** all tasks query existing tables only. ✓
- **Placeholder scan:** no TBD/TODO; every code step has full code; every test has assertions.
- **Type consistency:** `ProjectListOut`/`RelatedOut` defined in Task 1 and used in Tasks 1/4; `Query` import added once in Task 1 and reused in Task 4 (same file); `UserProfileOut`, `ActivityEventOut`/`ActivityOut` defined and used within their tasks; router registrations in `main.py` use the `<name> as <name>_router` alias style matching the existing file.
- **Route ordering:** `/projects` (collection), `/projects/mine`, `/projects/{project_id}`, `/projects/{project_id}/related` are all distinct paths; FastAPI resolves them unambiguously. `/projects/mine` already precedes `/projects/{project_id}`.
- **Frontend rewire** to consume these endpoints is intentionally a separate follow-up (noted in the spec), not in this plan.
