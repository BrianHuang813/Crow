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


async def make_interaction(db, project, user, type_):
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
    await make_project(db, u, "A")
    await make_project(db, u, "B")
    await make_project(db, u, "C")
    body = (await client.get("/api/activity?limit=2")).json()
    assert len(body["events"]) == 2
    ats = [e["at"] for e in body["events"]]
    assert ats == sorted(ats, reverse=True)
