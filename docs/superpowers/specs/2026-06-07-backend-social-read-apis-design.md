# Backend Social Read APIs — Design (Spec A)

**Date:** 2026-06-07
**Scope:** Backend only. Five read-only query endpoints over existing tables. **No migrations, no new infrastructure.**
**Goal:** Replace the redesigned frontend's degraded/derived social features with real backend data: a projects list/query endpoint (Explore, Trending, Top Builders, a user's projects, fossil graveyard), public user profiles, a live activity feed, and project recommendations.

**Out of scope (separate specs later):** Follow system (needs a `follows` table); screenshot upload (needs object storage).

---

## Context

The core game loop is implemented and live (auth incl. device flow, grid, create/abandon/resurrect, interact, `/me`, decay worker). The redesigned frontend currently fakes/derives several social features client-side because no endpoint exists:
- Trending / Top Builders → derived from the 60×60 grid snapshot (only top-8 by territory, momentum only for those fetched).
- Live Activity → client-side snapshot diff (lossy, resets on reload, single-user view).
- Other users' profiles → not viewable (only `/me`).
- "More like this" → top-territory projects, not real similarity.

All data needed already exists in the `projects`, `users`, and `interactions` tables. These endpoints expose it.

### Existing tables (no changes)
- `projects`: `id, name, description, url, tech_tags[], owner_id, status (alive|dying|dead), expires_at, momentum, territory_size, color, resurrected_from, created_at, died_at`
- `users`: `id, github_id, handle (unique), email, avatar_url, credits, resurrection_count, created_at`
- `interactions`: `id, project_id, user_id, type (click|boost), momentum_granted, time_granted, credits_granted, created_at`

### Existing conventions to follow
- FastAPI routers under `crow/routers/`, registered in `main.py` with `prefix="/api"`.
- Pydantic schemas under `crow/schemas/`, `ProjectOut` already exists with `model_config = {"from_attributes": True}`.
- Async SQLAlchemy (`select`, `func`), `AsyncSession` via `Depends(get_db)`.
- Tests in `tests/` using `client` + `db` fixtures against a real Postgres test DB (`pytest_asyncio`).

---

## Endpoints

### 1. `GET /api/projects` — list / sort / filter / paginate

The single workhorse list endpoint. Public (no auth required).

**Query parameters**

| Param | Type | Values | Default |
|---|---|---|---|
| `status` | str | `active` (alive+dying) \| `alive` \| `dying` \| `dead` \| `all` | `active` |
| `sort` | str | `momentum` \| `recent` \| `territory` | `momentum` |
| `owner_handle` | str? | filter to one builder's projects | none |
| `tag` | str? | exact membership in `tech_tags` | none |
| `limit` | int | 1–50 (clamped) | 20 |
| `offset` | int | ≥0 | 0 |

**Sort semantics**
- `momentum` → `momentum DESC, created_at DESC`
- `territory` → `territory_size DESC, created_at DESC`
- `recent` → for `status=dead`: `died_at DESC`; otherwise `created_at DESC`

**Behavior**
- `status=active` → `status IN ('alive','dying')`. `all` → no status filter.
- `owner_handle` resolves to a user; if the handle doesn't exist → `404`.
- `tag` → `:tag = ANY(projects.tech_tags)`.
- Invalid `status` or `sort` → `400`. `limit` above 50 is clamped to 50 (not an error); negative `offset` → `400`.

**Response** `200`
```json
{ "items": [ProjectOut, ...], "total": 123, "limit": 20, "offset": 0 }
```
`total` is the unpaginated count for the same filters (for pager UIs).

**Frontend mapping:** Trending = `?sort=momentum&status=active`; Top Builders = `?sort=territory&status=active`; a user's projects = `?owner_handle=x&status=all`; fossil graveyard = `?owner_handle=x&status=dead&sort=recent`.

---

### 2. `GET /api/users/{handle}` — public profile

Public. Returns a builder's public-facing record. **Credits are NOT included** (private spend balance, only on `/me`).

**Response** `200` (`UserProfileOut`)
```json
{
  "handle": "alice",
  "avatar_url": "https://…" ,
  "resurrection_count": 2,
  "created_at": "2026-01-02T…Z",
  "project_count": 4,        // total projects ever (any status)
  "territory_total": 24      // sum of territory_size over alive+dying projects
}
```
- Unknown handle → `404 {"detail":"User not found"}`.
- `project_count` = count of all projects with `owner_id = user.id`.
- `territory_total` = sum of `territory_size` where status in (alive, dying); `0` if none.

---

### 3. `GET /api/activity` — derived live feed

Public. Merges recent real events from existing tables — **no event-log table**. Clicks are excluded (too noisy); boosts are included.

**Query:** `limit` int 1–50 (clamped), default 20.

**Event sources**
| `type` | Source | `at` |
|---|---|---|
| `claimed` | `projects` (newest by `created_at`) | `created_at` |
| `faded` | `projects WHERE died_at IS NOT NULL` (newest by `died_at`) | `died_at` |
| `boosted` | `interactions WHERE type='boost'` (newest by `created_at`), join project + user | `created_at` |

**Implementation:** query the newest `limit` rows from each source, build event objects, merge in Python, sort by `at DESC`, truncate to `limit`. (Three small indexed-order queries; fine at this scale.)

**Response** `200`
```json
{ "events": [
  { "type": "boosted", "project_id": "…", "project_name": "EchoFlow",
    "color": "#ac3509", "actor_handle": "bob", "at": "2026-06-07T…Z" },
  { "type": "claimed", "project_id": "…", "project_name": "HabitLoop",
    "color": "#006a63", "actor_handle": null, "at": "…" },
  { "type": "faded", "project_id": "…", "project_name": "OldThing",
    "color": "#9f4122", "actor_handle": null, "at": "…" }
] }
```
- `actor_handle` is set only for `boosted` (the booster; `null` if the interaction had no user). `claimed`/`faded` use `null` (the owner is implied by the project, kept simple).

---

### 4. `GET /api/projects/{id}/related` — recommendations

Public. Active projects most similar by tech-tag overlap.

**Query:** `limit` int 1–12 (clamped), default 4.

**Algorithm**
1. Load the target project; `404` if missing.
2. Candidates = active projects (`status IN ('alive','dying')`), excluding the target id.
3. If the target has tags: keep candidates sharing ≥1 tag; rank by `overlap_count DESC, momentum DESC`.
4. If the target has no tags (or fewer than `limit` tag-matches): fill the remainder with top-`momentum` active projects (excluding the target and already-included).
5. Return up to `limit`.

**Response** `200`: `{ "items": [ProjectOut, ...] }`

Overlap is computed in Python over candidate `tech_tags` (project counts are small; no need for SQL array-intersection gymnastics). To bound work, first narrow candidates in SQL with `tech_tags && :tags` (array overlap) when the target has tags.

---

## File structure

- `crow/schemas/project.py` — add `ProjectListOut { items: list[ProjectOut]; total: int; limit: int; offset: int }` and `RelatedOut { items: list[ProjectOut] }`.
- `crow/schemas/user.py` — **new**: `UserProfileOut`.
- `crow/schemas/activity.py` — **new**: `ActivityEventOut`, `ActivityOut { events: list[ActivityEventOut] }`.
- `crow/routers/projects.py` — add `GET /projects` (list) and `GET /projects/{id}/related`. Place the collection `GET /projects` and `/projects/{id}/related` so they don't shadow `/projects/mine` or `/projects/{id}` (literal/static segments and distinct suffixes — order alongside existing GETs; `/projects/mine` already precedes `/projects/{id}`).
- `crow/routers/users.py` — **new**: `GET /users/{handle}`.
- `crow/routers/activity.py` — **new**: `GET /activity`.
- `crow/main.py` — register `users.router` and `activity.router` with `prefix="/api"`.

Each router stays small and single-purpose. A shared sort/status/pagination helper for the project list lives in `projects.py` (local module function) rather than a new utils module, to match the codebase's current flat style.

---

## Error handling
- Invalid enum (`status`, `sort`) → `400` with a clear `detail`.
- Unknown `owner_handle` (endpoint 1) / `handle` (endpoint 2) / project `id` (endpoint 4) → `404`.
- `limit` over the max is clamped silently; negative `offset`/`limit` → `400`.
- All endpoints are public (no auth); they must not leak private fields (notably `users.credits`, `users.email`, `users.github_id`).

---

## Testing

`tests/test_projects_list.py`, `tests/test_users.py`, `tests/test_activity.py`, `tests/test_related.py` — using the existing `client` + `db` fixtures (real Postgres test DB, fresh schema per test via the `engine` fixture).

Key cases:
- **list:** sort by momentum/territory/recent gives correct order; `status` filters (active excludes dead; dead returns only dead); `owner_handle` filter + unknown handle 404; `tag` filter; `limit` clamping; `total` reflects filters not the page; invalid `sort`/`status` → 400.
- **profile:** returns public fields with correct `project_count`/`territory_total`; **never** includes `credits`/`email`/`github_id`; unknown handle → 404.
- **activity:** boosts appear, clicks do NOT; claimed/faded ordering by time; merged feed is time-sorted desc and respects `limit`; `boosted` carries `actor_handle`.
- **related:** tag-overlap ranking; excludes self; excludes dead; no-tags fallback to momentum; `limit` clamp.

---

## Success criteria
1. All four endpoints return correct data shapes and status codes; all new tests pass (`cd backend && pytest`).
2. No private user fields (`credits`, `email`, `github_id`) appear in any public response.
3. No DB migration introduced; existing tests still pass.
4. Frontend can drop its grid-snapshot derivations for Trending/Top Builders/Activity and its "More on the grid" stopgap in favor of these endpoints (frontend rewire is a follow-up, not part of this spec).
