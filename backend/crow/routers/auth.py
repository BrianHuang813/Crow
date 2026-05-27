import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..config import settings
from ..database import get_db
from ..models import User
from ..auth import create_token

router = APIRouter(prefix="/auth")


# --- Web OAuth (for browser login) ---

@router.get("/github")
async def github_login():
    return RedirectResponse(
        f"https://github.com/login/oauth/authorize"
        f"?client_id={settings.github_client_id}"
        f"&scope=read:user,user:email"
    )


@router.get("/callback")
async def github_callback(code: str, db: AsyncSession = Depends(get_db)):
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://github.com/login/oauth/access_token",
            json={
                "client_id": settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "code": code,
            },
            headers={"Accept": "application/json"},
        )
        token_data = token_resp.json()
        access_token = token_data.get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail="GitHub OAuth failed")

        user_resp = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        gh_user = user_resp.json()

    result = await db.execute(select(User).where(User.github_id == str(gh_user["id"])))
    user = result.scalar_one_or_none()
    if not user:
        user = User(
            github_id=str(gh_user["id"]),
            handle=gh_user["login"],
            email=gh_user.get("email"),
            avatar_url=gh_user.get("avatar_url"),
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    return {"token": create_token(str(user.id)), "handle": user.handle}


# --- Device Flow (for Crow Submit Skill) ---

@router.post("/device/code")
async def device_code():
    """Initiate GitHub Device Flow. Returns device_code, user_code, verification_uri."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://github.com/login/device/code",
            json={"client_id": settings.github_client_id, "scope": "read:user,user:email"},
            headers={"Accept": "application/json"},
        )
    return resp.json()


@router.post("/device/token")
async def device_token(device_code: str, db: AsyncSession = Depends(get_db)):
    """Poll to exchange device_code for a Crow JWT once user has authorized."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://github.com/login/oauth/access_token",
            json={
                "client_id": settings.github_client_id,
                "device_code": device_code,
                "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
            },
            headers={"Accept": "application/json"},
        )
        data = resp.json()

    if "error" in data:
        raise HTTPException(status_code=400, detail=data["error"])

    access_token = data.get("access_token")
    async with httpx.AsyncClient() as client:
        user_resp = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        gh_user = user_resp.json()

    result = await db.execute(select(User).where(User.github_id == str(gh_user["id"])))
    user = result.scalar_one_or_none()
    if not user:
        user = User(
            github_id=str(gh_user["id"]),
            handle=gh_user["login"],
            email=gh_user.get("email"),
            avatar_url=gh_user.get("avatar_url"),
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    return {"token": create_token(str(user.id)), "handle": user.handle}
