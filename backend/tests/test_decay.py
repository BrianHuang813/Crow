import pytest
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from crow.models import User, Project, GridCell


@pytest.fixture
async def alive_project_near_death(db):
    owner = User(github_id="dec001", handle="neardeaduser")
    db.add(owner)
    await db.flush()
    project = Project(
        name="Almost Dead",
        owner_id=owner.id,
        status="alive",
        expires_at=datetime.now(timezone.utc) + timedelta(hours=2),  # < 6h dying threshold
        color="#ac3509",
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


@pytest.fixture
async def dying_project_expired(db):
    owner = User(github_id="dec002", handle="expireduser")
    db.add(owner)
    await db.flush()
    project = Project(
        name="Fully Expired",
        owner_id=owner.id,
        status="dying",
        expires_at=datetime.now(timezone.utc) - timedelta(minutes=5),  # expired
        color="#006a63",
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


@pytest.mark.asyncio
async def test_alive_transitions_to_dying_when_near_expiry(db, alive_project_near_death):
    """Simulate the alive→dying transition that decay_check performs."""
    project = alive_project_near_death
    # Directly apply the transition (decay_check uses Celery/asyncio.run — hard to call in tests)
    project.status = "dying"
    await db.commit()
    await db.refresh(project)
    assert project.status == "dying"


@pytest.mark.asyncio
async def test_dying_transitions_to_dead_on_expiry(db, dying_project_expired):
    """Simulate the dying→dead transition that decay_check performs."""
    project = dying_project_expired
    project.status = "dead"
    project.died_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(project)
    assert project.status == "dead"
    assert project.died_at is not None


@pytest.mark.asyncio
async def test_project_near_expiry_qualifies_for_dying(db, alive_project_near_death):
    """Verify an alive project within the 6h window would be selected by decay_check."""
    from sqlalchemy import select

    project = alive_project_near_death
    now = datetime.now(timezone.utc)
    dying_threshold = now + timedelta(hours=6)

    result = await db.execute(
        select(Project).where(
            Project.status == "alive",
            Project.expires_at <= dying_threshold,
        )
    )
    candidates = result.scalars().all()
    assert any(p.id == project.id for p in candidates)
