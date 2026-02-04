# Config setup — 3 options

You never edit anything inside `node_modules`. Config and secrets live in your project directory or in a global config directory.

---

## Option A — Per-project only (current behavior)

**Where:** In each repo where you use haitask, you have:
- `.haitaskrc` — project key, rules, AI provider (created by `haitask init`)
- `.env` — API keys (you create it; add to `.gitignore`)

**Flow:** `cd your-repo` → create/copy `.env` → `haitask init` → `haitask run`

**Pros:** Simple, explicit. Each repo can use different Jira projects or keys.  
**Cons:** You copy or recreate `.env` in every repo (or symlink it yourself).

**Best for:** Different keys per project, or you’re fine with one `.env` per repo.

---

## Option B — Global secrets, per-project config

**Where:**
- **Secrets once:** `~/.haitask/.env` (or `~/.config/haitask/.env`) — one file for all projects
- **Per repo:** `.haitaskrc` only (Jira project key, rules, etc.; no secrets)

**Flow:** Once: create `~/.haitask/.env` with keys. In each repo: `haitask init` (creates `.haitaskrc`) → `haitask run`. No `.env` in the repo.

**Pros:** One place for API keys; same keys for all your repos. No `.env` in every project.  
**Cons:** Code change: haitask must load `.env` from home if not in cwd.

**Best for:** One user, one Jira/AI account, many repos.

---

## Option C — Hybrid (cwd first, then global)

**Where:**
- **Secrets:** haitask looks for `.env` in **current directory** first; if not found, uses `~/.haitask/.env`
- **Per repo:** `.haitaskrc` in project root only

**Flow:** Either put `.env` in the repo (per-project keys) or rely on `~/.haitask/.env` (shared keys). Same commands: `haitask init` → `haitask run`.

**Pros:** Flexible. Per-repo override when needed; otherwise one global `.env`.  
**Cons:** Slightly more logic; behavior depends on “which .env exists”.

**Best for:** Mostly same keys, but sometimes different keys per project.

---

## Summary

| Option | .env location        | .haitaskrc  | Change in haitask?     |
|--------|----------------------|-------------|------------------------|
| A      | Project root only    | Project     | None (current)         |
| B      | ~/.haitask/ only     | Project     | Yes (load from home)   |
| C      | Project, then ~/.haitask/ | Project | Yes (try cwd, then home) |

Recommendation: **A** if you want zero code change and clear “everything in repo root”. **B** or **C** if you want one global `.env` for many projects (then we add the loader).

Say which option you want (A, B, or C) and we’ll align code and README.
