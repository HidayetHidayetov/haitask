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

1. **Credentials (one-time)**  
   Create a `.env` (e.g. in your home dir or a shared config folder) with:
   - One AI provider key: `GROQ_API_KEY`, `DEEPSEEK_API_KEY`, or `OPENAI_API_KEY`
   - Jira: `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`  
   Copy from `.env.example` in the repo.

2. **Per project (one-time)**  
   In the Git repo where you want to create Jira issues:
   ```bash
   cd /path/to/your/repo
   haitask init
   ```
   This creates `.haitaskrc`. Edit it: set `jira.projectKey`, `jira.baseUrl`, and optionally `rules.allowedBranches` and `rules.commitPrefixes`.

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
| `haitask init` | Create `.haitaskrc` in cwd (no overwrite if present). Validates env. |
| `haitask run` | Run pipeline: Git → AI → Jira (create issue). |
| `haitask run --dry` | Same as above but skips the Jira API call. |

---

## Configuration

- **`.haitaskrc`** (project root): Jira `baseUrl`, `projectKey`, `issueType`; AI `provider` and `model`; `rules.allowedBranches` and `rules.commitPrefixes`. Single source of truth for behaviour.
- **`.env`**: API keys only. Prefer loading it from the directory where you run `haitask` (or the same folder as the cloned repo when using `npm link`).

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
