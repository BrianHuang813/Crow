---
name: crow-submit
description: Submit your project to the Crow Digital Darwinism grid. Authenticates via GitHub Device Flow, detects project info automatically, and guides you through the full submission flow.
---

# /crow-submit — Submit to the Crow Grid

You are helping the user submit their current project to crow.gg.
Follow these steps **in exact order**. Do not skip steps.

## Setup

Run this first to set constants used throughout:

```bash
CROW_API="${CROW_API_URL:-https://api.crow.gg}"
TOKEN_FILE="$HOME/.crow/token"
```

## Step 1 — Authenticate

Check whether a saved token exists:

```bash
if [ -f "$TOKEN_FILE" ]; then
  TOKEN=$(python3 -c "import json; d=json.load(open('$HOME/.crow/token')); print(d['token'])")
  HANDLE=$(python3 -c "import json; d=json.load(open('$HOME/.crow/token')); print(d['handle'])")
  echo "  ✓ Logged in as @$HANDLE"
else
  echo "  No saved token — starting GitHub Device Flow."
  TOKEN=""
  HANDLE=""
fi
```

If `TOKEN` is empty (no token file), run the Device Flow:

```bash
# Request a device code
DC_JSON=$(curl -s -X POST "$CROW_API/api/auth/device/code" \
  -H "Content-Type: application/json")

DEVICE_CODE=$(echo "$DC_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['device_code'])")
USER_CODE=$(echo "$DC_JSON"   | python3 -c "import sys,json; print(json.load(sys.stdin)['user_code'])")
VERIFY_URI=$(echo "$DC_JSON"  | python3 -c "import sys,json; print(json.load(sys.stdin)['verification_uri'])")
INTERVAL=$(echo "$DC_JSON"    | python3 -c "import sys,json; print(json.load(sys.stdin).get('interval', 5))")
```

Display the authorization prompt to the user:

```bash
echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║  GitHub Authorization Required           ║"
echo "  ╠══════════════════════════════════════════╣"
printf "  ║  1. Open:  %-30s║\n" "$VERIFY_URI"
printf "  ║  2. Enter: %-30s║\n" "$USER_CODE"
echo "  ╚══════════════════════════════════════════╝"
echo ""
echo -n "  Waiting for authorization"
```

Poll until authorized:

```bash
POLL_FILE=$(mktemp -t crow_poll)
trap 'rm -f "$POLL_FILE"' EXIT

while true; do
  sleep "$INTERVAL"
  printf "."

  POLL_STATUS=$(curl -s -o "$POLL_FILE" -w "%{http_code}" \
    -X POST "$CROW_API/api/auth/device/token?device_code=$DEVICE_CODE")
  POLL_BODY=$(cat "$POLL_FILE")

  if [ "$POLL_STATUS" = "200" ]; then
    TOKEN=$(echo "$POLL_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
    HANDLE=$(echo "$POLL_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['handle'])")
    mkdir -p "$HOME/.crow"
    TOKEN="$TOKEN" HANDLE="$HANDLE" python3 -c "
import json, os
path = os.path.expanduser('~/.crow/token')
json.dump({'token': os.environ['TOKEN'], 'handle': os.environ['HANDLE']}, open(path, 'w'))
os.chmod(path, 0o600)
"
    echo ""
    echo "  ✓ Logged in as @$HANDLE"
    break
  else
    DETAIL=$(echo "$POLL_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('detail','unknown'))" 2>/dev/null)
    if [ "$DETAIL" = "slow_down" ]; then
      INTERVAL=$((INTERVAL + 5))
    elif [ "$DETAIL" != "authorization_pending" ]; then
      echo ""
      echo "  ✗ Auth failed: $DETAIL"
      exit 1
    fi
  fi
done
```

**Re-auth helper — use this if any API call later returns HTTP 401:**

```bash
echo "  ⟳ Token expired — re-authenticating..."
rm -f "$TOKEN_FILE"
TOKEN=""
HANDLE=""
```

Then re-run the Device Flow block above to get a fresh token, and retry the API call.

---

## Step 2 — Detect Project Info

Check which project definition files exist in the current directory:

```bash
ls package.json pyproject.toml Cargo.toml README.md 2>/dev/null
```

Read every file that exists. Then use your judgment to extract values for these four variables:

| Variable | Source | Rules |
|---|---|---|
| `PROJ_NAME` | `package.json → .name`, `pyproject.toml → [project].name or [tool.poetry].name`, `Cargo.toml → [package].name`, `README.md → first # heading` | Required. Use the exact string from the file. |
| `PROJ_DESC` | `package.json → .description`, `pyproject.toml → [project].description or [tool.poetry].description`, `Cargo.toml → [package].description`, `README.md → first paragraph after heading` | Optional. Truncate to 200 chars. Empty string if not found. |
| `PROJ_URL` | `package.json → .homepage`, `pyproject.toml → [project.urls].Homepage`, `Cargo.toml → [package].homepage`, `README.md → first demo/homepage URL` | Optional. Must start with `http://` or `https://`. Empty string if not found or invalid. |
| `PROJ_TAGS` | Derived from all files | Optional. At most 5 comma-separated tags. Prioritise: programming language, primary framework, key infrastructure. Skip dev-only tools (eslint, prettier, pytest, jest). Empty string if nothing meaningful found. |

**Examples of good tech_tags extraction:**
- `package.json` with react + express + pg → `"JavaScript,React,Express,PostgreSQL"`
- `pyproject.toml` with fastapi + sqlalchemy + redis → `"Python,FastAPI,SQLAlchemy,Redis"`
- `Cargo.toml` with tokio + axum → `"Rust,Tokio,Axum"`

After reading the files and deciding on values, substitute your detected values into this block, then run it. Use `""` for any value you couldn't determine:

```bash
PROJ_NAME=""   # required — e.g. "Crow"
PROJ_DESC=""   # optional, ≤200 chars
PROJ_URL=""    # optional, must be http(s):// or empty
PROJ_TAGS=""   # optional, ≤5 comma-separated, e.g. "Python,FastAPI,PostgreSQL"
```

Try sources in the order listed; use the first non-empty value found.

If no project files exist at all and `PROJ_NAME` is still empty, set it to empty string — Step 3 will prompt the user to fill it in.

---

## Step 3 — Confirm

Display the detected fields as a preview table:

```bash
# === STEP 3 LOOP TOP ===
echo ""
echo "  ┌──────────────────────────────────────────────────────────┐"
echo "  │  CROW SUBMIT — Preview                                   │"
echo "  ├──────────────┬───────────────────────────────────────────┤"
printf "  │ %-12s │ %-43s│\n" "name"        "${PROJ_NAME:-(none — required)}"
printf "  │ %-12s │ %-43s│\n" "description" "${PROJ_DESC:-(none)}"
printf "  │ %-12s │ %-43s│\n" "url"         "${PROJ_URL:-(none)}"
printf "  │ %-12s │ %-43s│\n" "tech_tags"   "${PROJ_TAGS:-(none)}"
echo "  └──────────────┴───────────────────────────────────────────┘"
echo ""
```

Now enter the edit-and-confirm loop. Ask the user:

```bash
echo "  Submit? (Y/n)  — or type a field name to edit:"
echo "  Fields: name / description / url / tech_tags"
echo ""
read -r CONFIRM_INPUT
```

Handle the input:

- **`y`, `Y`, or empty (Enter):**
  - If `PROJ_NAME` is empty: print `"  ✗ Name is required. Type 'name' to set it."` and return to **STEP 3 LOOP TOP** — re-run both the preview-table block and the prompt block.
  - Otherwise: proceed to Step 4.

- **`n`, `N`, `q`, or `quit`:**
  - Print `"  Cancelled."` and exit.

- **`name`:**
  ```bash
  echo "  New name:"
  read -r PROJ_NAME
  ```
  Return to **STEP 3 LOOP TOP** — re-run both the preview-table block and the prompt block.

- **`description`:**
  ```bash
  echo "  New description (max 200 chars):"
  read -r PROJ_DESC
  PROJ_DESC="${PROJ_DESC:0:200}"
  ```
  Return to **STEP 3 LOOP TOP** — re-run both the preview-table block and the prompt block.

- **`url`:**
  ```bash
  echo "  New URL (https://...):"
  read -r PROJ_URL
  if [ -n "$PROJ_URL" ] && [[ "$PROJ_URL" != http://* ]] && [[ "$PROJ_URL" != https://* ]]; then
    echo "  ✗ URL must start with https:// — cleared."
    PROJ_URL=""
  fi
  ```
  Return to **STEP 3 LOOP TOP** — re-run both the preview-table block and the prompt block.

- **`tech_tags`:**
  ```bash
  echo "  New tech tags (comma-separated, max 5 — e.g. Python,FastAPI,Redis):"
  read -r RAW_TAGS
  # Keep only the first 5 comma-separated values
  PROJ_TAGS=$(echo "$RAW_TAGS" | python3 -c "
import sys
tags = [t.strip() for t in sys.stdin.read().split(',') if t.strip()]
print(','.join(tags[:5]))
")
  ```
  Return to **STEP 3 LOOP TOP** — re-run both the preview-table block and the prompt block.

- **Any other input:** Print `"  Unknown field. Type name / description / url / tech_tags, or Y/n."` and return to **STEP 3 LOOP TOP** — re-run both the preview-table block and the prompt block.
