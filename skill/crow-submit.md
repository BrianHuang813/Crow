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
while true; do
  sleep "$INTERVAL"
  printf "."

  POLL_STATUS=$(curl -s -o /tmp/.crow_poll -w "%{http_code}" \
    -X POST "$CROW_API/api/auth/device/token?device_code=$DEVICE_CODE")
  POLL_BODY=$(cat /tmp/.crow_poll)

  if [ "$POLL_STATUS" = "200" ]; then
    TOKEN=$(echo "$POLL_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
    HANDLE=$(echo "$POLL_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['handle'])")
    mkdir -p "$HOME/.crow"
    python3 -c "
import json, sys
json.dump({'token': '$TOKEN', 'handle': '$HANDLE'}, open('$HOME/.crow/token', 'w'))
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
