# Crow Submit Skill uses GitHub Device Flow for authentication

The `/crow-submit` Claude Code skill runs entirely in the terminal and needs to authenticate with the Crow API. Browser-based OAuth redirect flows don't work reliably in CLI environments (SSH sessions, containers, restricted firewalls). We chose GitHub Device Flow: the user sees a one-time code in the terminal, visits `github.com/login/device`, and authorizes once. The resulting token is stored at `~/.crow/token` and reused on all subsequent invocations.

## Considered Options

- **GitHub Device Flow** ✓ — works in any terminal environment, one-time setup, standard pattern used by GitHub CLI itself
- **Crow Personal Access Token** — requires visiting the web UI first, breaks the "never leave your terminal" promise of the skill
- **Localhost OAuth callback** — most seamless UX but fails behind firewalls and in remote environments
