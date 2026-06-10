# Backend Follow System — Design (Spec B)

**Date:** 2026-06-10
**Scope:** Backend only. A user-to-user follow graph: follow/unfollow endpoints + follower/following counts and an `is_following` flag on the public profile. **Graph + counts only** — no following-feed, no notifications, no follower/following list endpoints (deferred).
**Goal:** Make the "Follow" button on the project detail author card and profile pages real.

---

## Context

Core platform + Spec A (social read APIs) are live. The frontend currently renders a **disabled** "Follow" button (ProjectDetailPage author card) because no follow endpoint exists. This spec adds the minimal follow graph to make it work.

The backend uses **Alembic** for schema (one migration: `560ec278a583` initial schema). Tests build the schema via `Base.metadata.create_all` (conftest `engine` fixture), so they don't need migrations. Production applies migrations separately (`alembic upgrade head`) — the Dockerfile only runs uvicorn.

### Existing pieces reused
- `users` table (`id, handle (unique), avatar_url, resurrection_count, ...`).
- `GET /api/users/{handle}` (Spec A) returns the public profile — this spec extends it.
- `crow/auth.py` has `get_current_user` (required auth). This spec adds `get_optional_user`.

---

## Data model — new `follows` table

```
follows
  follower_id  UUID  FK users.id  NOT NULL
  followee_id  UUID  FK users.id  NOT NULL
  created_at   timestamptz  NOT NULL  default now()
  PRIMARY KEY (follower_id, followee_id)   -- prevents duplicate follows; indexes follower→
  INDEX ix_follows_followee_id (followee_id)  -- fast follower counts
```

- **Uniqueness:** the composite PK makes a (follower, followee) pair unique — a second follow is a no-op.
- **Self-follow:** blocked at the **application layer** (`400` if `follower == followee`). No DB CHECK constraint (app-level is enough, per design decision); the meaningless self-row also can't help anyone since the API rejects it.
- **Counts:** followers of X = `count(followee_id = X)`; following of X = `count(follower_id = X)`.

SQLAlchemy model `crow/models/follow.py`, registered in `crow/models/__init__.py`.

---

## Auth helper — `get_optional_user`

`crow/auth.py` gains a dependency that returns `User | None`: if a valid `Authorization: Bearer` token is present, resolve the user; otherwise return `None`. It must **never raise** (unlike `get_current_user`, which 401s). Used only by the profile endpoint so anonymous callers still get a profile (with `is_following = false`).

---

## Endpoints

### `POST /api/users/{handle}/follow` — follow (auth required)
- Resolve `{handle}` → target user; unknown → `404`.
- If target is the caller → `400 {"detail":"Cannot follow yourself"}`.
- Insert `(follower=caller, followee=target)` if not already present (**idempotent** — already following returns success, not an error).
- Returns `200 { "is_following": true, "follower_count": <int> }` (follower_count after the change).

### `DELETE /api/users/{handle}/follow` — unfollow (auth required)
- Resolve `{handle}`; unknown → `404`.
- Delete the `(caller, target)` row if present (**idempotent** — not following returns success).
- Returns `200 { "is_following": false, "follower_count": <int> }`.

Both require auth (`get_current_user`) → `401` when unauthenticated.

### `GET /api/users/{handle}` — extended (optionally authenticated)
Adds three fields to the existing `UserProfileOut`:
- `follower_count: int` — `count(follows where followee_id = user.id)`
- `following_count: int` — `count(follows where follower_id = user.id)`
- `is_following: bool` — whether the **caller** follows this user; `false` if the caller is anonymous or is viewing their own profile.

The endpoint switches from no-auth to `get_optional_user`. All existing fields and the privacy guarantee (no `credits`/`email`/`github_id`) are unchanged.

**Response shape (extended):**
```json
{
  "handle": "alice", "avatar_url": null, "resurrection_count": 2,
  "created_at": "…", "project_count": 4, "territory_total": 24,
  "follower_count": 12, "following_count": 5, "is_following": true
}
```

---

## File structure

- `crow/models/follow.py` — **new**: `Follow` model
- `crow/models/__init__.py` — register `Follow`
- `alembic/versions/<rev>_add_follows.py` — **new**: create `follows` table (+ followee index), `down_revision = '560ec278a583'`
- `crow/auth.py` — add `get_optional_user`
- `crow/schemas/user.py` — extend `UserProfileOut` (+`follower_count`, `following_count`, `is_following`); add `FollowStateOut { is_following, follower_count }`
- `crow/routers/users.py` — add the two follow endpoints; extend `get_user_profile` to compute counts + `is_following` via `get_optional_user`
- `tests/test_follow.py` — **new**; `tests/test_users.py` — extend for the new profile fields

---

## Error handling
- Follow/unfollow unauthenticated → `401` (via `get_current_user`).
- Unknown `{handle}` → `404` on all three endpoints.
- Self-follow → `400`.
- Duplicate follow / redundant unfollow → success (idempotent), not `409`.

---

## Testing (`tests/test_follow.py`, extend `tests/test_users.py`)

Using the existing `client` + `db` fixtures (real Postgres test DB; schema via `create_all`).

- **follow:** authed follow returns `is_following:true` + correct `follower_count`; following again is idempotent (count stays 1); self-follow → 400; unknown handle → 404; unauthenticated → 401.
- **unfollow:** authed unfollow returns `is_following:false`; unfollowing when not following is idempotent; unauthenticated → 401.
- **profile counts:** `follower_count`/`following_count` reflect the graph; `is_following` is `true` when the authed caller follows, `false` when they don't, and `false` for an anonymous request; profile still omits `credits`/`email`/`github_id`.

Tests authenticate by creating a `User` + token (mirroring `tests/test_auth.py`'s `create_token` usage) and sending `Authorization: Bearer <token>`.

---

## Success criteria
1. `follows` table + Alembic migration; `alembic upgrade head` applies cleanly; existing migration chain intact.
2. Follow/unfollow are idempotent, auth-guarded, self-follow-blocked; profile exposes correct counts + caller-relative `is_following`.
3. No private user fields leak. All new + existing backend tests pass.
4. Frontend can enable the Follow button (separate follow-up, not in this spec).

**Deploy note:** run `alembic upgrade head` against the Railway DB after deploying this change.
