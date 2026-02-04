# HAITASK

Generate Jira issues from your latest Git commit using AI. Reads commit message and branch, produces a structured task (title, description, labels) via an AI provider, and creates the issue in Jira. Framework- and language-agnostic: works with any Git repo.

**Requirements:** Node.js >= 18

---

## Install

```bash
npm install -g haitask
```

Or run without installing:

```bash
npx haitask
```

From source (clone then link):

```bash
git clone https://github.com/HidayetHidayetov/haitask.git && cd haitask && npm install && npm link
```

---

## Quick start

1. **Per project (one-time)**  
   In the Git repo where you want to create Jira issues:
   ```bash
   cd /path/to/your/repo
   haitask init
   ```
   **Interactive setup:** you’ll be asked for Jira base URL, project key, issue type, AI provider (groq / deepseek / openai), allowed branches, and commit prefixes. A `.haitaskrc` file is created from your answers. You’ll then choose where to store API keys: **this project** (`.env` in the repo) or **global** (`~/.haitask/.env`, shared across projects). A template `.env` is created in the chosen place — add your own keys there (never commit real keys).

2. **Add your API keys**  
   Edit the `.env` that was created (project or `~/.haitask/.env`): set one AI key (`GROQ_API_KEY`, `DEEPSEEK_API_KEY`, or `OPENAI_API_KEY`) and Jira keys (`JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`). Optional: `JIRA_ACCOUNT_ID` to auto-assign issues.

3. **Create a Jira issue from the latest commit**  
   After committing:
   ```bash
   haitask run
   ```
   Pipeline: read latest commit → validate branch/prefix from `.haitaskrc` → call AI → create Jira issue.  
   To test without creating an issue: `haitask run --dry`.

---

## Commands

| Command | Description |
|--------|-------------|
| `haitask init` | Interactive setup: prompts for Jira/AI/rules → writes `.haitaskrc`, optional `.env` (project or ~/.haitask/.env). |
| `haitask run` | Run pipeline: Git → AI → Jira (create issue). |
| `haitask run --dry` | Same as above but skips the Jira API call. |

---

## Configuration

- **`.haitaskrc`** (project root): Jira `baseUrl`, `projectKey`, `issueType`; AI `provider` and `model`; `rules.allowedBranches` and `rules.commitPrefixes`. Single source of truth for behaviour.
- **`.env`**: API keys only. Loaded in order: **project** `.env` (current directory), then **global** `~/.haitask/.env`. So you can use one global `.env` for all projects or override per repo.

**AI providers** (set `ai.provider` in `.haitaskrc`): `groq` (default, free), `deepseek` (free), `openai` (paid). Set the corresponding key in `.env`.

**Rules:** If `allowedBranches` is non-empty, the current branch must be in the list. If `commitPrefixes` is non-empty, the commit message must start with one of them (e.g. `feat:`, `fix:`). Adjust to match your workflow.

**Jira assignee:** Optional. Set `JIRA_ACCOUNT_ID` in `.env` (Jira Cloud account ID). If the value contains a colon, use quotes: `JIRA_ACCOUNT_ID="id:uuid"`. The created issue will be assigned via a separate API call after create.

**Task title:** The AI is instructed not to include commit-type prefixes (e.g. `feat:`) in the Jira title; the code also strips them from the AI output so the issue summary stays clean.

---

## Usage patterns

- **Global install:** `npm install -g haitask` → in any repo: `haitask init` once, then `haitask run` after commits.
- **Per-project dev dependency:** `npm install haitask --save-dev` → `npx haitask run`.
- **CI / scripts:** Run `npx haitask run` (or `haitask run` if installed) from the repo root; ensure `.haitaskrc` and env vars are available in that environment.

No framework-specific setup (e.g. Laravel, React, etc.); the tool only depends on Git and the config files above.
