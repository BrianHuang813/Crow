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
