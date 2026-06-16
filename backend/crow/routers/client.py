from fastapi import APIRouter

from ..config import settings

router = APIRouter(tags=["client"])


@router.get("/client/version")
async def client_version():
    """Version metadata for the crow-submit plugin.

    Unauthenticated and cheap — the plugin calls this before anything else to
    decide whether to hard-block (below min_supported) or soft-warn (below
    latest). Values are config-driven so compatibility can be tightened without
    a code change.
    """
    return {
        "latest": settings.crow_client_latest,
        "min_supported": settings.crow_client_min,
        "message": settings.crow_client_message or None,
    }
