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

    r2 = await client.post("/api/users/alice/follow", headers=auth(bob))
    assert r2.json()["follower_count"] == 1

    r3 = await client.delete("/api/users/alice/follow", headers=auth(bob))
    assert r3.status_code == 200
    assert r3.json() == {"is_following": False, "follower_count": 0}

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
