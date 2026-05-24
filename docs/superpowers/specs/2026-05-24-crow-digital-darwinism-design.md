# Crow — Digital Darwinism Platform: Design Spec

**Date:** 2026-05-24  
**Status:** Approved  
**Author:** Brian Huang

---

## 1. Product Vision

Crow is a digital arena where developer projects compete for survival and territory. There is no algorithm — a project's lifespan and territory are determined entirely by real user interactions. Interaction is fuel; losing momentum means death.

This is not a traditional showcase platform. It is a **living, competitive map** where every project fights to stay alive.

---

## 2. Core Mechanics

### 2.1 Territory & The Ticking Clock

- The homepage is a **60×60 grid map** (3,600 cells), rendered as pixel-art squares on an HTML Canvas.
- Every new project claims a random initial cell and receives a starting countdown timer (e.g., 48 hours).
- User interactions (clicks, boosts, comments) inject **energy** and **time** into the project.
- When energy reaches 100%, the project expands to one adjacent empty or fossil cell. Energy resets to 0 after expansion.
- Projects can only expand into `empty` or `fossil` cells — never into living (`alive`) cells. This prevents abuse.
- When the timer hits zero, the project dies.

### 2.2 Dying State

- When `expires_at` is less than 6 hours away, a project enters the `dying` state.
- The `dying` state triggers: visual pulsing on the grid, an SOS video pre-generation job, and a change in the share card appearance.

### 2.3 The Graveyard & Resurrection

- Dead projects are not deleted. Their cells become grey **fossil** tiles on the grid.
- Any authenticated user can resurrect a fossil project by spending their accumulated energy contribution points.
- The resurrected project restarts with a fresh timer and the fossil's original territory.
- Resurrecting earns a **Necromancer** achievement card for social sharing.

### 2.4 Viral Export Hooks

| Hook | Trigger | Output | Phase |
|---|---|---|---|
| Dynamic OG Card | Any `/api/og/{id}` request | PNG (1200×630), cached 60s | MVP |
| SOS Video | Project enters `dying` state | 5-second MP4, pre-generated | Phase 2 |
| Timelapse War Report | Project dies or user requests | MP4/GIF from hourly snapshots | Phase 2 |
| Necromancer Card | Successful resurrection | Static achievement PNG | Phase 2 |

---

## 3. System Architecture

### 3.1 Component Overview

```
Browser (React + Canvas)
    │ HTTP Polling every 15s
    │ REST API calls
FastAPI Application Server
    ├── /api/grid          (public, from Redis cache)
    ├── /api/projects      (CRUD)
    ├── /api/interact      (auth required)
    ├── /api/resurrect     (auth required)
    ├── /api/og            (public, image response)
    └── /api/share         (signed media URLs)
         │
    ┌────┴────────────────────┐
    │                         │
PostgreSQL              Redis
(persistent data)       (grid cache, Celery broker)
                              │
                        Celery Workers
                        ├── decay_check      (every minute, Beat)
                        ├── snapshot_grid    (every hour, Beat)
                        ├── refresh_cache    (every 30s, Beat)
                        ├── check_expansion  (post-interaction)
                        ├── generate_og      (on project creation)
                        ├── generate_sos     (on dying transition)
                        └── generate_timelapse (on death)
```

### 3.2 Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Backend API | FastAPI (Python 3.12) | Async, fast, familiar to author |
| Background Jobs | Celery + Redis broker | Decoupled heavy tasks from request cycle |
| Primary Database | PostgreSQL 16 | Relational, reliable, supports JSONB for snapshots |
| Cache / Broker | Redis 7 | Grid snapshot cache (30s TTL) + Celery broker |
| Media Generation | Pillow (images), MoviePy + FFmpeg (video) | Best Python media ecosystem |
| Frontend | React + TypeScript + Vite | Component model + type safety |
| Grid Rendering | HTML Canvas API | Performance over DOM for 3,600 cells; preserves pixel art sharpness |
| Data Fetching | TanStack Query | Built-in polling, stale management, background refresh |
| Auth | GitHub OAuth | Zero-friction for the developer target audience |
| Animations | CSS Animations + Motion One (4KB) | Lightweight; matches pixel art aesthetic |
| Deployment | Docker Compose (local) → Railway (production) | Single-person ops simplicity |

### 3.3 Scale Target (MVP)

- **Concurrent users:** < 500
- **Grid update mechanism:** Polling (15s interval), not WebSocket
- **Architecture principle:** Single-language backend (Python only). Go is deferred until Python becomes a measurable bottleneck.

---

## 4. Data Model

### 4.1 Database Schema

```sql
CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    handle              VARCHAR(50)  UNIQUE NOT NULL,
    email               VARCHAR(255) UNIQUE NOT NULL,
    avatar_url          VARCHAR(500),
    energy_contributed  INTEGER DEFAULT 0,
    resurrection_count  INTEGER DEFAULT 0,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE projects (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name             VARCHAR(100) NOT NULL,
    description      TEXT,
    url              VARCHAR(500),
    tech_tags        TEXT[],
    owner_id         UUID REFERENCES users(id),
    status           VARCHAR(20) DEFAULT 'alive', -- alive | dying | dead
    expires_at       TIMESTAMPTZ NOT NULL,
    energy           INTEGER DEFAULT 0,           -- 0~100
    territory_size   INTEGER DEFAULT 1,
    color            VARCHAR(7) NOT NULL,          -- hex color on the grid
    resurrected_from UUID REFERENCES projects(id),
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    died_at          TIMESTAMPTZ
);

CREATE TABLE grid_cells (
    x          SMALLINT NOT NULL,
    y          SMALLINT NOT NULL,
    project_id UUID REFERENCES projects(id),
    state      VARCHAR(10) DEFAULT 'empty',  -- empty | alive | fossil
    claimed_at TIMESTAMPTZ,
    PRIMARY KEY (x, y)
);

CREATE TABLE interactions (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id     UUID REFERENCES projects(id) NOT NULL,
    user_id        UUID REFERENCES users(id),
    type           VARCHAR(20) NOT NULL,   -- click | comment | boost
    energy_granted INTEGER NOT NULL,
    time_granted   INTEGER NOT NULL,       -- seconds added to expires_at
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE grid_snapshots (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_data JSONB NOT NULL,
    captured_at   TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.2 Project State Machine

```
[submitted]
     │
     ▼
  [alive] ◄──────── [resurrected]
     │                    ▲
     │ < 6h remaining      │ user pays energy points
     ▼                    │
  [dying] → triggers SOS  │
     │                    │
     │ expires_at < now   │
     ▼                    │
  [dead / fossil] ────────┘
```

State transitions are driven exclusively by the `decay_check` Celery Beat task (every minute) — never by user requests.

### 4.3 Redis Grid Snapshot Format

```json
{
  "updated_at": "2026-05-24T10:00:00Z",
  "width": 60,
  "height": 60,
  "cells": [
    { "x": 0, "y": 0, "state": "alive",  "project_id": "uuid", "color": "#ac3509" },
    { "x": 1, "y": 0, "state": "fossil", "project_id": "uuid", "color": "#3a3a3a" },
    { "x": 2, "y": 0, "state": "empty",  "project_id": null,   "color": null }
  ]
}
```

Cache TTL: 30 seconds.

---

## 5. API Design

### 5.0 Interaction Energy Values

| Type | Energy Granted | Time Granted |
|---|---|---|
| `click` | 5 | 300s (5 min) |
| `boost` | 25 | 1800s (30 min) |

`boost` requires spending accumulated `energy_contributed` points (cost: 20 points).

### 5.1 Endpoints

```
GET  /api/grid                    Public. Returns Redis snapshot.
GET  /api/projects/{id}           Public. Project detail + live timer.
POST /api/projects                Auth. Submit new project.
POST /api/interact/{project_id}   Auth. Inject energy. Body: { type }
POST /api/resurrect/{project_id}  Auth. Resurrect fossil project.
GET  /api/og/{project_id}         Public. Dynamic OG image (PNG).
GET  /api/share/{project_id}/sos-video   Public. Returns signed URL to SOS MP4.
```

### 5.2 Anti-Abuse Layers

| Layer | Mechanism | Limit |
|---|---|---|
| Rate limit | FastAPI middleware (slowapi) | 30 interact requests / IP / minute |
| Cooldown | Redis key `cd:{user_id}:{project_id}` | 60s TTL per user per project |
| Auth required | GitHub OAuth JWT | interact and resurrect endpoints |

### 5.3 Auth Strategy

GitHub OAuth only. No password accounts. On first login, a `users` row is created from the GitHub profile (handle, email, avatar). JWT stored in an httpOnly cookie.

---

## 6. Frontend Design

### 6.1 Grid Rendering

- Rendered on a single `<canvas>` element. `imageSmoothingEnabled = false` preserves pixel-art sharpness.
- Each cell is 12×12px with a 1px gap, giving a 720×720px total canvas.
- TanStack Query polls `/api/grid` every 15 seconds and triggers a full canvas repaint on new data.
- On hover, a floating card appears with project name, timer, energy bar, and an interact button.

### 6.2 Animation System

**Pixel Art + Developer Terminal aesthetic**, consistent with the Crow logo (pixel-art crow holding `{}`, speech bubble showing `</>`).

| Element | Animation | Implementation |
|---|---|---|
| Logo | Crow blinks + `</>` bubble types in | CSS `@keyframes` with `steps()` timing |
| Background | Falling `</>` `{}` `//` `=>` symbols | CSS animation + random `animation-delay` |
| Territory expansion | Pixel scan-line wipe on new cell | CSS `clip-path` animation |
| Energy bar | 8-bit pixel fill animation | CSS `@keyframes` width transition |
| Dying cells | Red pulse overlay on canvas | CSS `animation: pulse` on overlay element |
| Project name reveal | Typewriter character-by-character | CSS `steps()` + `width` animation |
| Interaction feedback | Pixel burst on click | Motion One (4KB) for JS-triggered sparks |

No GSAP or Framer Motion. CSS Animations handle the majority; Motion One is added only for click-triggered JS animations.

---

## 7. Celery Background Tasks

### 7.1 Beat Schedule (Periodic)

| Task | Interval | Action |
|---|---|---|
| `decay_check` | Every 1 minute | Transition alive→dying→dead; trigger media jobs |
| `refresh_grid_cache` | Every 30 seconds | Recompute grid from PostgreSQL → write to Redis |
| `snapshot_grid` | Every 1 hour | Write current grid state to `grid_snapshots` |

### 7.2 Worker Tasks (Event-Triggered)

| Task | Trigger | Action |
|---|---|---|
| `check_expansion` | POST /api/interact | If energy ≥ 100, claim adjacent cell |
| `generate_og_card` | Project created | Pillow PNG → store in object storage |
| `generate_sos_video` | Project enters dying | MoviePy 5s MP4 → store + return signed URL |
| `generate_timelapse` | Project dies | Stitch grid_snapshots into MP4/GIF |

### 7.3 Expansion Logic

```
on interact(project_id):
    project.energy += energy_granted
    project.expires_at += time_granted

    if project.energy >= 100:
        target = find_adjacent_cell(project, preference=['empty', 'fossil'])
        if target:
            target.project_id = project.id
            target.state = 'alive'
            project.energy = 0
            project.territory_size += 1
        invalidate_grid_cache()
```

Adjacent cell preference: `empty` first, then `fossil`. Never `alive`.

---

## 8. Crow Submit Skill

A Claude Code skill (`/crow-submit`) that allows any developer to submit their project to Crow directly from their terminal, with zero browser interaction required.

### 8.1 Skill Flow

```
Step 1 — Scan (Claude reads silently)
  ├── README.md / CLAUDE.md → project description
  ├── package.json / pyproject.toml / go.mod → tech_tags
  ├── git remote origin → GitHub URL
  └── repo or package name → project name

Step 2 — Preview (shown to user)
  ┌──────────────────────────────────────┐
  │ Ready to submit to Crow:             │
  │ Name:    My Awesome App              │
  │ Desc:    A tool that does X          │
  │ Stack:   Python, FastAPI, React      │
  │ Link:    github.com/you/repo         │
  │                                      │
  │ Submit? (y/n)                        │
  └──────────────────────────────────────┘

Step 3 — Push (on approval)
  → POST /api/projects with GitHub OAuth token
  → Response: "Submitted! Your territory: (x=23, y=41)"
  →           "Share: crow.gg/p/{slug}"
```

### 8.2 Payload (metadata only, no source code)

```json
{
  "name": "string",
  "description": "string",
  "url": "string (GitHub URL)",
  "tech_tags": ["string"],
  "github_handle": "string"
}
```

### 8.3 Growth Rationale

The skill is a viral distribution channel embedded inside Claude Code. Every developer building with Claude Code can submit without leaving their terminal. The skill is installed once and reusable across all projects.

---

## 9. MVP Scope (Phase 1)

In scope:
- 60×60 grid with pixel-art rendering
- Project submission, interaction (click/boost), and energy/timer mechanics
- Territory expansion logic
- Dying and dead/fossil states
- Dynamic OG card generation (Pillow)
- GitHub OAuth
- `/crow-submit` Claude Code skill
- Docker Compose local dev environment

Deferred to Phase 2:
- SOS video generation (MoviePy)
- Timelapse war report
- Resurrection mechanic
- Necromancer achievement cards
- Comments on projects
- Go migration (if Python becomes a bottleneck)

---

## 10. Open Questions

None. All major decisions were resolved during the design session.
