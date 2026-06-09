import pytest
from datetime import datetime, timedelta, timezone
from crow.models import User, Project


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


@pytest.mark.asyncio
async def test_related_ranks_by_tag_overlap(client, db):
    u = await make_user(db)
    target = await make_project(db, u, "Target", tech_tags=["React", "TS", "Node"])
    await make_project(db, u, "TwoMatch", tech_tags=["React", "TS"], momentum=1)
    await make_project(db, u, "OneMatch", tech_tags=["React"], momentum=99)
    await make_project(db, u, "NoMatch", tech_tags=["Rust"])
    r = await client.get(f"/api/projects/{target.id}/related")
    names = [i["name"] for i in r.json()["items"]]
    assert names[0] == "TwoMatch"
    assert "OneMatch" in names
    assert "NoMatch" not in names
    assert "Target" not in names


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
