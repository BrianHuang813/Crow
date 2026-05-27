import pytest
from datetime import datetime, timezone, timedelta
from crow.models import User, Project, GridCell

@pytest.mark.asyncio
async def test_create_user(db):
    user = User(github_id="12345", handle="testuser")
    db.add(user)
    await db.commit()
    await db.refresh(user)
    assert user.id is not None
    assert user.credits == 0
    assert user.resurrection_count == 0

@pytest.mark.asyncio
async def test_create_project(db):
    user = User(github_id="99999", handle="builder")
    db.add(user)
    await db.flush()
    project = Project(
        name="Test App",
        owner_id=user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=48),
        color="#ac3509",
        tech_tags=["Python"],
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    assert project.status == "alive"
    assert project.momentum == 0
    assert project.territory_size == 1
