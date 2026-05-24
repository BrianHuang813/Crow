# Crow

A competitive platform where developer projects fight for survival and territory on a shared grid. No algorithm — a project's lifespan and territory are determined entirely by user interactions.

## Language

**Project**:
A developer's work submitted to Crow for display and competition on the Grid.
_Avoid_: App, product, entry, submission

**Grid**:
The 60×60 shared canvas where all Projects occupy cells and compete for territory.
_Avoid_: Map, board, arena

**Cell**:
A single tile on the Grid. Always in one of four states: Empty, Alive, Dying, or Fossil. The Dying state is carried directly in the Cell (not computed by the frontend) to ensure a single source of truth.
_Avoid_: Tile, square, slot

**Momentum**:
A per-Project meter (0–100) that fills from interactions and resets to 0 when a Project expands into a new Cell. Reaching 100 triggers one expansion.
_Avoid_: Energy (project-level), fuel, charge

**Credits**:
A per-User accumulator earned by interacting with Projects. Spent on Boosts and Resurrections.
_Avoid_: Energy (user-level), points, tokens

**Interaction**:
A user action that adds Momentum to a Project and earns the user Credits.
_Avoid_: Vote, engagement, reaction

**Dying**:
A Project state triggered when remaining lifespan drops below 6 hours. Mechanically identical to Alive — interactions, Momentum accumulation, and expansion all continue unchanged. Affects only visual presentation and triggers SOS video generation.
_Avoid_: Fading, expiring, critical

**Fossil**:
A Cell previously owned by a dead Project. Can be claimed by an expanding alive Project; once claimed, it does not return to the dead Project upon Resurrection.
_Avoid_: Ghost cell, graveyard tile

**Resurrection**:
A User action that spends 200 Credits to restart a dead Project's timer (24h) and Momentum. Restores only unclaimed Fossil Cells — eaten Cells are permanently lost. Cost and lifespan are tunable constants.
_Avoid_: Revive, restore, fork

## Relationships

- A **Project** occupies one or more **Cells** on the **Grid**
- An **Interaction** adds **Momentum** to a **Project** and **Credits** to the acting **User**
- When a **Project**'s **Momentum** reaches 100, it expands into one adjacent **Cell** and **Momentum** resets to 0
- When a **Project**'s **Momentum** reaches 100, it expands into one randomly selected adjacent eligible **Cell** (Empty preferred over Fossil); claimed **Fossil** Cells are not returned on **Resurrection**
- Each **User** may have at most 1 alive or dying **Project** on the **Grid** at any time; submitting a new one requires Abandoning the existing one first (Skill handles this interactively)
- A **User** may spend **Credits** to **Boost** their own **Project**, but cannot earn **Credits** from interacting with their own **Project**
- When the **Grid** is full (no empty or fossil cells available), new submissions return `503` — deferred to a larger grid size when the platform scales
- **Resurrection** restores a dead **Project** with only its surviving unclaimed **Fossil** Cells, at 24h initial lifespan (vs 48h for new Projects — tunable constants, not hardcoded)

**Abandon**:
A voluntary action by a Project owner that immediately transitions their Project to dead state, converting all its Cells to Fossil. Frees the owner's one-Project slot for a new submission.
_Avoid_: Delete, remove, cancel, kill

**Skill Submission**:
The terminal-based flow for submitting a Project via `/crow-submit`. Claude reads available project files to auto-fill fields; any missing required fields (name, description) trigger interactive prompts within the terminal. URL and tech_tags are optional.
_Avoid_: Upload, publish, deploy

**OG Card**:
A static PNG image (1200×630) generated at Project submission time, showing Project name, tech tags, and territory size at that moment. Does not show live countdown — Twitter/X and Discord cache OG images for hours regardless of Cache-Control headers. The live timer and real-time state exist only on the Project landing page.
_Avoid_: Live card, dynamic card

**Territory Color**:
A hex color automatically assigned to a Project from a system-curated palette of 20 visually distinct colors at submission time. Cannot be changed by the user.
_Avoid_: Brand color, user color, theme

**Boost**:
A high-value Interaction that costs 20 Credits and grants 25 Momentum and 1800s to the target Project. Requires the acting User to have sufficient Credits.
_Avoid_: Power-up, amplify, supercharge

**Click**:
A low-friction Interaction that grants 5 Momentum and 300s to the target Project and earns the acting User 5 Credits — only when the acting User is not the Project owner. Subject to 60s cooldown per User per Project.
_Avoid_: Vote, like, tap

## Flagged ambiguities

- "energy" was used to mean both **Momentum** (project-level) and **Credits** (user-level) — resolved: these are distinct concepts with distinct names.
- "comment" appeared in the interaction schema but was removed from MVP scope — resolved: comments require sentiment analysis and moderation infrastructure that is out of scope. Deferred to Phase 2.
- Platform is open to any developer project — no technical enforcement of "Claude Code only." The Crow Submit Skill naturally attracts AI-native builders without requiring gatekeeping.
