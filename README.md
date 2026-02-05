# HAITASK

**Write a commit → one command creates a task in Jira or Trello.**

Generate tasks from your latest Git commit using AI. Reads commit message and branch, produces a structured task (title, description, labels) via an AI provider, and creates the issue/card in your chosen target. Framework- and language-agnostic: works with any Git repo.

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
   In the Git repo where you want to create tasks:
   ```bash
   cd /path/to/your/repo
   haitask init
   ```
   **Interactive setup:** choose **target** (1 = Jira, 2 = Trello), then target-specific options (Jira: base URL, project key, issue type, status; Trello: list ID, optional label IDs, member ID). You’ll also set AI provider (groq / deepseek / openai), allowed branches, and commit prefixes. A `.haitaskrc` file is created. Choose where to store API keys: **this project** (`.env`) or **global** (`~/.haitask/.env`). A template `.env` is created — add your keys there (never commit real keys).

2. **Add your API keys**  
   Edit the `.env` that was created:
   - **AI:** one of `GROQ_API_KEY`, `DEEPSEEK_API_KEY`, `OPENAI_API_KEY`.
   - **Jira** (when target is jira): `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`. Optional: `JIRA_ACCOUNT_ID`.
   - **Trello** (when target is trello): `TRELLO_API_KEY`, `TRELLO_TOKEN`. Optional: `TRELLO_MEMBER_ID`. Get key + token at https://trello.com/app-key.

3. **Create a task from the latest commit**  
   After committing:
   ```bash
   haitask run
   ```
   Pipeline: read latest commit → validate branch/prefix → call AI → create task in Jira or Trello.  
   To test without creating: `haitask run --dry`.

---

## Commands

| Command | Description |
|--------|-------------|
| `haitask init` | Interactive setup: target (Jira/Trello), then target + AI + rules → writes `.haitaskrc`, optional `.env`. |
| `haitask run` | Run pipeline: Git → AI → target (create Jira issue or Trello card). |
| `haitask run --dry` | Same as above but skips creating the task. |
| `haitask run --commits <n>` | Combine last N commits into one task (default: 1). Example: `--commits 3`. |
| `haitask run --type <type>` | (Jira only) Override issue type for this run (e.g. `Task`, `Bug`, `Story`). |
| `haitask run --status <status>` | (Jira only) Override transition-to status after create (e.g. `Done`, `To Do`, `In Progress`). |

---

## Configuration

- **`.haitaskrc`** (project root): **`target`** (`jira` or `trello`); target-specific section (`jira` or `trello`); **`ai`** (`provider`, `model`); **`rules`** (`allowedBranches`, `commitPrefixes`). Single source of truth.
- **`.env`**: API keys only. Loaded: **project** `.env`, then **global** `~/.haitask/.env`.

**Security:** API keys stay in your `.env` file (never commit it). They are sent only to the services you use: Jira or Trello for creating tasks, and your chosen AI provider (Groq, Deepseek, or OpenAI) for generating the task text. No other servers receive your keys.

**Target: Jira** — `jira.baseUrl`, `jira.projectKey`, `jira.issueType`, `jira.transitionToStatus`. Override issue type/status for one run: `haitask run --type Bug`, `haitask run --status "To Do"`. Optional assignee: `JIRA_ACCOUNT_ID` in `.env` (Jira Cloud account ID; use quotes if value contains `:`).

**Target: Trello** — `trello.listId` (required: the list where new cards go; get from board URL or API). Optional: `trello.labelIds` (array of label IDs), `trello.memberId` or `TRELLO_MEMBER_ID` in `.env` for assignee. Get API key + token at https://trello.com/app-key.

**AI providers** (`ai.provider`): `groq` (default, free), `deepseek` (free), `openai` (paid). Set the matching key in `.env`.

**Rules:** If `allowedBranches` is non-empty, the current branch must be in the list. If `commitPrefixes` is non-empty, the commit message must start with one of them (e.g. `feat:`, `fix:`). **Link to existing:** If `rules.linkToExistingIssue` is not `false` and the commit message contains an issue key (Jira: `PROJ-123`, Trello: URL or 8-char shortLink), haitask adds the commit as a comment to that issue/card instead of creating a new task. Set `rules.linkToExistingIssue: false` in `.haitaskrc` to always create new tasks.

**Task title:** The AI is instructed not to include commit-type prefixes (e.g. `feat:`) in the task title; the code strips them so the summary stays clean.

---

## Usage patterns

- **Global install:** `npm install -g haitask` → in any repo: `haitask init` once, then `haitask run` after commits.
- **Per-project dev dependency:** `npm install haitask --save-dev` → `npx haitask run`.
- **CI / scripts:** Run `npx haitask run` (or `haitask run` if installed) from the repo root; ensure `.haitaskrc` and env vars are available in that environment.

No framework-specific setup (e.g. Laravel, React, etc.); the tool only depends on Git and the config files above.

---

## What's next (roadmap)

- **Batch:** ✅ Implemented — use `haitask run --commits N` to create one task from the last N commits.
- **Link to existing issue:** ✅ Implemented — if the commit message contains an issue key (Jira: `PROJ-123`, Trello: URL or shortLink), haitask adds the commit as a comment to that issue/card. Disable with `rules.linkToExistingIssue: false`.
- **More targets:** Linear, Asana, or others (same adapter pattern).

---

## Troubleshooting

**Jira — assignee not set / still unassigned**  
In Jira Cloud, the user in `JIRA_ACCOUNT_ID` must be an **Assignable user** in that project. Fix: **Project → Space settings → People** — add yourself (team-managed). For company-managed projects, ensure the permission scheme grants **Assignable user**. You can still assign manually in Jira.

**Trello — list ID**  
The list ID is the 24-character hex ID of the list (column) where new cards are created. In Trello: open the board, click the list menu (⋯), “Copy list link” or “Copy link” — the URL contains the list ID. Or use the API: `GET https://api.trello.com/1/boards/{boardId}/lists?key=...&token=...` to list all list IDs. **Step-by-step:** Open board → list ⋯ menu → Copy list link → URL has the 24-char ID; use it as `trello.listId`. **Or** run `node scripts/get-trello-list.js` from the repo (Trello keys in `.env`) to print the first list ID.
