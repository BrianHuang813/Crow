import pytest
from datetime import datetime, timedelta, timezone
from crow.models import User, Project, GridCell
from crow.services.expansion import run_expansion


@pytest.fixture
async def project_with_cell(db):
    owner = User(github_id="exp001", handle="expowner")
    db.add(owner)
    await db.flush()
    project = Project(
        name="Expanding App",
        owner_id=owner.id,
        status="alive",
        momentum=100,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=48),
        color="#ac3509",
    )
    db.add(project)
    await db.flush()
    # Place at (10, 10)
    cell = await db.get(GridCell, (10, 10))
    cell.project_id = project.id
    cell.state = "alive"
    await db.commit()
    await db.refresh(project)
    return project


@pytest.mark.asyncio
async def test_expansion_claims_adjacent_empty_cell(db, project_with_cell):
    project = project_with_cell
    expanded = await run_expansion(str(project.id), db)
    assert expanded is True
    await db.refresh(project)
    assert project.territory_size == 2
    assert project.momentum == 0  # 100 consumed


@pytest.mark.asyncio
async def test_no_expansion_when_momentum_below_100(db):
    owner = User(github_id="exp002", handle="lowmom")
    db.add(owner)
    await db.flush()
    project = Project(
        name="Low Momentum",
        owner_id=owner.id,
        status="alive",
        momentum=50,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=48),
        color="#006a63",
    )
    db.add(project)
    await db.commit()
    expanded = await run_expansion(str(project.id), db)
    assert expanded is False


@pytest.mark.asyncio
async def test_no_expansion_for_dead_project(db):
    owner = User(github_id="exp003", handle="deadexp")
    db.add(owner)
    await db.flush()
    project = Project(
        name="Dead High Momentum",
        owner_id=owner.id,
        status="dead",
        momentum=150,
        expires_at=datetime.now(timezone.utc) - timedelta(hours=1),
        color="#ff5722",
    )
    db.add(project)
    await db.commit()
    expanded = await run_expansion(str(project.id), db)
    assert expanded is False
