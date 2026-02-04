# HAITASK

**Hidayet AI Task** — Generate Jira tasks from Git commits using AI.

## Requirements

- Node.js >= 18

## Setup

```bash
npm install
cp .env.example .env
# Edit .env with your API keys
haitask init   # Creates .haitaskrc
haitask run    # Run pipeline (Git → AI → Jira)
haitask run --dry   # Dry run (no Jira API call)
```

## Commands

| Command | Description |
|--------|-------------|
| `haitask init` | Create `.haitaskrc`, validate environment |
| `haitask run` | Run full pipeline |
| `haitask run --dry` | Run pipeline without creating Jira issue |

## Configuration

See `.haitaskrc` (created by `haitask init`) and `Project_tech_doc.md` for full spec.
