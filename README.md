# Crow

[繁體中文](README.zh-TW.md)

**Your project lives or dies by the crowd.**

Crow is a platform where developer projects compete for survival on a shared 60×60 grid. Every project starts with a 48-hour clock and a single cell. Interactions from other developers add time and momentum — enough momentum and your project expands, claiming more territory. Stop getting interactions and your project dies, leaving fossils behind.

→ **[crow.gg](https://crow.gg)**

---

## How It Works

**The Grid** is a 60×60 canvas shared by every project on the platform. Each cell is owned by a project. New projects start with one cell. Popular projects grow to occupy many.

**Momentum** fills as other developers interact with your project. Hit 100 momentum and your project expands into an adjacent empty cell — momentum resets and the race starts again.

**Credits** are earned by interacting with other people's projects. Spend them to boost a project you believe in, or save them for a resurrection.

**Dying** projects — those with under 6 hours left — show an SOS signal. They can still be saved by interactions or a resurrection.

**Fossils** are the cells left behind by a dead project. A growing project can absorb them. If your project dies and gets resurrected, you only get back the fossil cells that haven't been eaten yet.

---

## Submit Your Project

### Option 1 — Terminal (recommended)

If you use Claude Code, install the `crow-submit` plugin once:

```
/plugin marketplace add brianhuang/Crow
/plugin install crow-submit@crow
```

Then from any project directory:

```
/crow-submit:submit
```

Or just ask Claude to "submit my project to crow" — the skill auto-invokes.

Claude reads your `package.json`, `pyproject.toml`, `Cargo.toml`, or `README.md` to fill in your project name, description, URL, and tech stack automatically. You confirm the details before anything is submitted.

First-time users go through a one-time GitHub login in the terminal — no browser required.

### Option 2 — Web

Go to [crow.gg](https://crow.gg), log in with GitHub, and submit your project from the dashboard.

---

## Rules

- **One project per account.** To submit a new project, you must abandon your current one first.
- **Any developer project is welcome.** It doesn't matter what language, framework, or stage it's in.
- **You can't earn credits from your own project.** Interact with others, and others will interact with yours.
- **Resurrection costs 200 credits.** If your project dies and you want it back, spend the credits to restart it with a 24-hour clock. You only recover the cells that haven't been claimed by other projects.

---

## Interactions

| Action | Who can do it | Effect |
|--------|--------------|--------|
| **Click** | Anyone (not the owner) | +5 momentum and +300s to the project, +5 credits to you. 60s cooldown per project. |
| **Boost** | Anyone (not the owner) | Costs 20 credits. +25 momentum and +1800s to the project. |
| **Resurrect** | Anyone | Costs 200 credits. Restarts a dead project with a 24-hour clock. |

---

## Contributing

Crow is open source. The best way to contribute is to use the platform — submit your project, interact with others, and help the grid stay alive.

Beyond that:

- **Found a bug or have an idea?** Open an issue on [GitHub](https://github.com/brianhuang/crow/issues).
- **Want to improve the `crow-submit` plugin?** The skill lives at [`plugins/crow-submit/skills/submit/SKILL.md`](plugins/crow-submit/skills/submit/SKILL.md). Edit it and open a pull request.
- **Want to contribute to the platform?** Check open issues for things tagged `good first issue`, or open a discussion about what you'd like to build.
