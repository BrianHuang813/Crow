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
    assert body["project_count"] == 3
    assert body["territory_total"] == 15


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
