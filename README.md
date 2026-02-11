# HAITASK

> Turn a Git commit into a task in Jira, Trello, or Linear — one command.

HAITASK reads your latest commit message and branch, uses AI to shape a clear title and description, and creates the issue or card in the tool you use. No framework lock-in: works in any Git repo.

**Requires:** Node.js 18+

---

## Install

```bash
npm install -g haitask
```

Run without installing:

```bash
npx haitask
```

---

## Quick start

**1. Configure (once)**  
In your project root:

```bash
haitask init
```

Pick a target (1 = Jira, 2 = Trello, 3 = Linear) and answer the prompts. You get a `.haitaskrc` and an optional `.env` template.  
**Quick mode:** `haitask init --quick` — fewer questions, sensible defaults.

**2. Add API keys**  
In the generated `.env`, set the keys for your target and AI provider:

| Target  | Keys |
|---------|------|
| **Jira**  | `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN` — [Atlassian API tokens](https://id.atlassian.com/manage-profile/security/api-tokens) |
| **Trello** | `TRELLO_API_KEY`, `TRELLO_TOKEN` — [trello.com/app-key](https://trello.com/app-key) |
| **Linear** | `LINEAR_API_KEY` — [linear.app/settings/api](https://linear.app/settings/api) |

For AI, set one of: `GROQ_API_KEY`, `DEEPSEEK_API_KEY`, or `OPENAI_API_KEY` (default is Groq).

**3. Create a task**  
After you commit:

```bash
haitask run
```

To try without creating a task: `haitask run --dry`.

---

## Commands

| Command | Description |
|---------|-------------|
| `haitask init` | Interactive setup: target, AI, rules → writes `.haitaskrc` and optional `.env` |
| `haitask init --quick` | Minimal prompts: target + required fields only; defaults for AI, branches, prefixes |
| `haitask check` | Validate `.haitaskrc` + required env keys without running the pipeline |
| `haitask run` | Creates a task from the latest commit (Jira / Trello / Linear) |
| `haitask run --dry` | Same flow, but does not create a task |
| `haitask run --commits N` | Combine the last N commits into one task (e.g. `--commits 3`) |
| `haitask run --type <type>` | (Jira only) Override issue type for this run (Task, Bug, Story) |
| `haitask run --status <status>` | (Jira only) Override status after create (Done, "To Do", etc.) |

---

## Configuration

- **`.haitaskrc`** — `target` (jira / trello / linear), target-specific options, `ai` (provider, model), `rules` (allowedBranches, commitPrefixes).
- **`.env`** — API keys only. Load order: project `.env` then `~/.haitask/.env`.

**Security:** Keys live only in `.env` (do not commit it). They are sent only to the services you use: your target (Jira/Trello/Linear) and your chosen AI provider.

**Jira:** `jira.baseUrl`, `jira.projectKey`, `jira.issueType`, `jira.transitionToStatus`. Optional assignee: `JIRA_ACCOUNT_ID` in `.env`.

**Trello:** `trello.listId` (required — the list where new cards go). To get the list ID: open the board → **⋯** on the list header → “Copy list link” → the 24-character ID is in the URL. From the haitask repo you can run `node scripts/get-trello-list.js` (with Trello keys in `.env`) to print the first list ID.

**Linear:** `linear.teamId` (required). In Linear: Team → Settings → copy Team ID.

**AI:** `groq` (free), `deepseek` (free), `openai` (paid). Set the matching key in `.env`.

**Rules:** If `allowedBranches` or `commitPrefixes` are set, the current branch and commit message are checked. If the commit message contains an issue key (e.g. `PROJ-123`, `ENG-42`), haitask adds a comment to that issue instead of creating a new task; set `rules.linkToExistingIssue: false` in `.haitaskrc` to always create new tasks.

---

## Usage

- **Global:** `npm install -g haitask` → run `haitask init` once per repo, then `haitask run` after commits.
- **Per project:** `npm install haitask --save-dev` → `npx haitask run`.
- **CI / scripts:** Run `npx haitask run` from the repo root; ensure `.haitaskrc` and env vars are available.

---

## GitHub Actions Integration

Add this workflow to `.github/workflows/haitask.yml` for automatic task creation:

```yaml
name: Create Task from Commit

on:
  push:
    branches: [ main, develop ]

jobs:
  create-task:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
      with:
        fetch-depth: 0
        
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        
    - name: Install HAITASK
      run: npm install -g haitask
      
    - name: Create task from latest commit
      env:
        GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
        # Add your target-specific keys:
        # JIRA_API_TOKEN: ${{ secrets.JIRA_API_TOKEN }}
        # TRELLO_TOKEN: ${{ secrets.TRELLO_TOKEN }}
        # LINEAR_API_KEY: ${{ secrets.LINEAR_API_KEY }}
      run: |
        if [ -f ".haitaskrc" ]; then
          haitask run
        fi
```

**Setup:**
1. Copy the workflow to your repo
2. Add required secrets to GitHub repo settings
3. Configure `.haitaskrc` in your project root

---

## Roadmap

- ✅ **Batch** — `haitask run --commits N`
- ✅ **Link to existing issue** — commit message with issue key (e.g. PROJ-123) → comment on that issue
- ✅ **Linear** — target `linear`, `linear.teamId`, `LINEAR_API_KEY`
- 🔜 More targets (same adapter pattern)

---

## Troubleshooting

**Jira — assignee not set**  
The user in `JIRA_ACCOUNT_ID` must be an assignable user in that project. In Jira: Project → Space settings → People, or assign manually.

**Trello — list ID**  
You need the 24-character hex list ID. Open the board → **⋯** on the list → “Copy list link” → use the ID from the URL as `trello.listId`. Or run `node scripts/get-trello-list.js` from the haitask repo (Trello keys in `.env`).

**Linear — team ID or API key**  
Copy Team ID from Linear → Team → Settings. Create an API key at [linear.app/settings/api](https://linear.app/settings/api) and set `LINEAR_API_KEY` in `.env`.
