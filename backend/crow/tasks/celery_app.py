from celery import Celery
from celery.schedules import crontab
from ..config import settings

celery_app = Celery(
    "crow",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        "crow.tasks.decay",
        "crow.tasks.grid_cache",
        "crow.tasks.snapshot",
        "crow.tasks.expansion",
    ],
)

celery_app.conf.beat_schedule = {
    "decay-check-every-minute": {
        "task": "crow.tasks.decay.decay_check",
        "schedule": 60.0,
    },
    "refresh-grid-cache-every-30s": {
        "task": "crow.tasks.grid_cache.refresh_grid_cache",
        "schedule": 30.0,
    },
    "snapshot-grid-every-hour": {
        "task": "crow.tasks.snapshot.snapshot_grid",
        "schedule": crontab(minute=0),
    },
}
celery_app.conf.timezone = "UTC"
