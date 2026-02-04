Project adı istədiyin kimi: **HAITASK**

> *Hidayet AI Task Automation CLI*

---

# 📘 TECHNICAL SPECIFICATION — HAITASK

## 1. Project Overview

**Project Name:** HAITASK
**Type:** Node.js CLI application
**Purpose:**
Automatically generate Jira tasks using AI based on Git commit messages.

HAITASK is a local-first, extensible CLI tool designed to:

* Read Git commit data
* Generate structured task content using AI
* Create Jira issues automatically
* Be easily extensible for future integrations without breaking existing structure

Initial usage is for a single developer (local machine), but architecture must support future team-wide distribution.

---

## 2. Core Principles (VERY IMPORTANT)

1. CLI must be thin — no business logic inside command handlers
2. Business logic must be isolated and composable
3. AI output must always be strict JSON
4. Configuration-driven behavior (no hardcoded logic beyond MVP)
5. Extensible architecture (new providers, new targets)
6. MVP first, polish later

---

## 3. Tech Stack

* **Runtime:** Node.js >= 18
* **Language:** JavaScript (ESM)
* **CLI Framework:** `commander`
* **HTTP Client:** `axios` or native `fetch`
* **Process execution:** `execa`
* **Config loading:** custom loader
* **Environment vars:** `.env`

No framework (no NestJS, no Express) for MVP.

---

## 4. Project Structure (MANDATORY)

```txt
haitask/
 ├─ src/
 │   ├─ index.js              # CLI entry point
 │   ├─ commands/             # CLI command handlers
 │   │   ├─ init.js
 │   │   └─ run.js
 │   ├─ core/
 │   │   └─ pipeline.js       # Orchestrates Git → AI → Jira
 │   ├─ git/
 │   │   └─ commit.js         # Git data extraction
 │   ├─ ai/
 │   │   └─ openai.js         # AI provider implementation
 │   ├─ jira/
 │   │   └─ client.js         # Jira REST client
 │   ├─ config/
 │   │   └─ load.js           # Loads .haitaskrc
 │   └─ utils/
 ├─ .haitaskrc                # Local config file
 ├─ .env                      # API keys
 ├─ package.json
 └─ README.md
```

This structure must not be violated.

---

## 5. CLI Commands

### 5.1 `haitask init`

Purpose:

* Create `.haitaskrc` in project root
* Validate environment (.env)

Behavior:

* If config exists → warn, do not overwrite
* Generate default config template

---

### 5.2 `haitask run`

Purpose:

* Execute full automation pipeline

Steps:

1. Load config
2. Read latest Git commit message
3. Validate rules (branch, commit prefix)
4. Generate AI task payload
5. Create Jira issue
6. Output result to terminal

Flags:

* `--dry` → do everything except Jira API call

---

## 6. Configuration System

### `.haitaskrc` (JSON)

```json
{
  "jira": {
    "baseUrl": "https://your-domain.atlassian.net",
    "projectKey": "PROJ",
    "issueType": "Task"
  },
  "ai": {
    "provider": "openai",
    "model": "gpt-4o-mini"
  },
  "rules": {
    "allowedBranches": ["main", "develop"],
    "commitPrefixes": ["feat", "fix", "chore"]
  }
}
```

This file is the single source of truth.

---

## 7. Git Integration

### Data to extract:

* Latest commit message
* Current branch name
* Repository name

Implementation:

* Use `git` CLI via `execa`
* No Git libraries

---

## 8. AI Integration

### Provider: OpenAI (initial)

Requirements:

* Send commit message + context
* Receive **STRICT JSON ONLY**

Expected AI response:

```json
{
  "title": "Short Jira task title",
  "description": "Detailed task description",
  "labels": ["auto", "commit"]
}
```

If response is not valid JSON → fail gracefully.

---

## 9. Jira Integration

Requirements:

* Create Jira issue using REST API
* Authentication via API token
* Fields:

  * project
  * summary
  * description
  * issueType
  * labels

Jira logic must be fully isolated from CLI and AI layers.

---

## 10. Core Pipeline

`pipeline.js` responsibilities:

* Coordinate Git → AI → Jira
* Handle dry-run
* Handle validation
* Return structured result

No direct I/O inside pipeline (no console.log).

---

## 11. Error Handling

* Human-readable CLI errors
* Fail fast on missing config or credentials
* Never crash silently

---

## 12. Future Extensibility (DO NOT IMPLEMENT YET)

Design must allow:

* Multiple AI providers
* Multiple issue trackers
* Backend service mode
* Team-wide configuration
* Git hooks & CI triggers

---

## 13. Definition of Done (MVP)

* `haitask init` works
* `haitask run` creates Jira task
* Dry-run works
* Clean separation of concerns
* No hardcoded business logic
* Codebase is readable and extendable

---

## 14. Naming & Branding

* Project name: **HAITASK**
* CLI command: `haitask`
* Meaning: **Hidayet AI Task**

---

## 15. Final Instruction to Cursor AI

> Implement this project step by step.
> Do not simplify architecture.
> Follow the folder structure strictly.
> Prioritize extensibility over shortcuts.
> Ask for clarification only if absolutely necessary.


