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

- **AI Providers:** Switch anytime in `.haitaskrc` with `ai.provider`: `"groq"` (free, default), `"deepseek"` (free), or `"openai"` (paid). Set the matching key in `.env`: `GROQ_API_KEY`, `DEEPSEEK_API_KEY`, or `OPENAI_API_KEY`. Free keys: [Groq](https://console.groq.com/keys), [Deepseek](https://platform.deepseek.com/).
- **Rules:** `allowedBranches` and `commitPrefixes` in `.haitaskrc` control when the pipeline runs. Add your branch (e.g. `master`) to `allowedBranches` if you get a branch validation error.
- **OpenAI 429:** "insufficient_quota" means your OpenAI account billing/quota limit; switch to `groq` or `deepseek` for free.
- **Jira:** Ensure `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN` in `.env` match your Jira Cloud site.
