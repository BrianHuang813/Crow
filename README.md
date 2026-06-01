# Crow

A competitive platform where developer projects fight for survival and territory on a shared grid. Projects gain momentum from interactions and expand their territory — or die from inactivity.

→ [crow.gg](https://crow.gg)

## Crow Submit Skill

Submit your project to the grid without leaving your terminal:

```bash
# Install (one-time)
curl -fsSL -o ~/.claude/skills/crow-submit.md \
  https://raw.githubusercontent.com/brianhuang/crow/main/skill/crow-submit.md

# Submit from any project directory
/crow-submit
```

See [`skill/README.md`](skill/README.md) for details.

## Development

```bash
# Start the full stack
docker compose up db redis api -d

# Backend tests
cd backend && pytest tests/ -v

# Frontend dev
cd frontend && yarn dev
```
