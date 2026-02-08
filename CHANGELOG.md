# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.2] - 2025-02-04

### Added

- **Retry:** `createTask` and `addComment` are wrapped with `withRetry` (2 retries, exponential backoff). Retries on 5xx, 429, and network errors; no retry on 4xx (except 429). Adapters attach `err.status` so backend can decide.
- **Idempotency:** State stored in `.git/haitask-state.json` (commit hash → task key/url). If the same commit is run again, create is skipped and "Already created for this commit: KEY" is shown. Git data now includes `commitHash` and `repoRoot`.
- **HTTP error hints:** Jira, Trello, and Linear API errors (401, 403, 404) now append a short hint (e.g. "Check JIRA_EMAIL and JIRA_API_TOKEN in .env.") via `utils/http-hints.js`.

### Changed

- **Backend:** Uses `withRetry` from `utils/retry.js` for all adapter calls.
- **Pipeline:** Reads/writes idempotency state before/after create; returns `skipped: true` when commit was already processed.
- **run.js:** Displays "Already created for this commit:" when `result.skipped`.

---

## [0.3.1] - 2025-02-04

### Added

- **Init quick mode:** `haitask init --quick` — minimal questions: target (1/2/3) + required target field only; defaults for AI (groq), branches, prefixes. Trello quick: only list ID (with hint in prompt).

### Changed

- **Trello list ID errors:** "List ID missing" and "must be 24-character hex" now include hint: "Get it from list URL (list ⋯ → Copy link) or run: node scripts/get-trello-list.js".
- **README (Trello):** Step-by-step for list ID shortened; "Quick way" with `node scripts/get-trello-list.js` in one line.

---

## [0.3.0] - 2025-02-04

### Added

- **Linear support:** Create Linear issues from commits. Set `target: "linear"` in `.haitaskrc` and configure `linear.teamId`. Env: `LINEAR_API_KEY`. API key: https://linear.app/settings/api.
- **Init:** `haitask init` offers target 3 = Linear; asks for Linear team ID and writes env template with `LINEAR_API_KEY`.
- **Link to existing Linear issue:** Commit message containing a Linear issue identifier (e.g. `ENG-123`) triggers `addComment` on that issue instead of creating a new one (same behaviour as Jira/Trello).

### Changed

- **Backend:** Dispatcher supports `target === 'linear'` for `createTask` and `addComment`.
- **Constants:** `VALID_TARGETS` includes `linear`. Config loader accepts `linear` section.
- **Env validation:** `getRequiredKeysForTarget('linear')` returns `LINEAR_API_KEY`.

---

## [0.2.0] - 2025-02-04

### Added

- **Trello support:** Create Trello cards from commits. Set `target: "trello"` in `.haitaskrc` and configure `trello.listId` (and optional `labelIds`, `memberId`). Env: `TRELLO_API_KEY`, `TRELLO_TOKEN`, optional `TRELLO_MEMBER_ID`.
- **Backend abstraction:** Single `createTask(payload, config)` interface; Jira and Trello are adapters. New targets (e.g. Linear) can be added without changing the pipeline.
- **Config target:** `.haitaskrc` now has `target` (`jira` | `trello`). Loader validates the matching section (`jira` or `trello`).
- **Init:** `haitask init` asks for target (1 = Jira, 2 = Trello) and then target-specific options. Env template includes Jira or Trello vars depending on target.
- **Unit tests:** Node 18 test runner for `loadConfig`, `validateRules`, `parseTaskPayload`, `buildJiraUrl`, `buildPrompt`. Run with `npm test`.
- **CI:** GitHub Actions workflow runs `npm ci` and `npm test` on push/PR to `main`, `master`, `dev`.
- **Trello list ID validation:** 24-char hex check with clear error message. Member ID must be 24-char hex (username is ignored to avoid API 400).
- **Script:** `scripts/get-trello-list.js` — one-off helper to fetch first board/list ID from Trello API (requires `.env` with Trello keys).

### Changed

- **Pipeline:** Uses backend `createTask` instead of calling Jira client directly. Jira overrides (`--type`, `--status`) apply only when `target === "jira"`.
- **Run output:** Target-agnostic messages (“Created task”, “Dry run — no task created”). URL comes from adapter (Jira browse URL or Trello card URL).
- **Env validation:** Required keys depend on `target` (Jira vs Trello). `validateEnv` uses `config.target`.
- **Constants:** `src/config/constants.js` for `VALID_TARGETS` and `TRELLO_ID_REGEX`. Shared by config, backend, Trello client.
- **URLs:** `src/utils/urls.js` with `buildJiraUrl`; used by backend and run command.
- **Init refactor:** `askJiraConfig`, `askTrelloConfig`, `writeEnvFile`, `printEnvHints` extracted; `node:fs` / `node:path` / `node:readline` used.

### Fixed

- Trello API 400 “Invalid objectId” when `TRELLO_MEMBER_ID` was set to username instead of 24-char member ID — now only 24-char hex is sent as `idMembers`.

---

## [0.1.x]

- Jira-only support: create Jira issues from latest Git commit via AI (Groq, Deepseek, OpenAI).
- `haitask init`, `haitask run`, `haitask run --dry`, `--type`, `--status`.
- Rules: `allowedBranches`, `commitPrefixes`.

[0.3.2]: https://github.com/HidayetHidayetov/haitask/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/HidayetHidayetov/haitask/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/HidayetHidayetov/haitask/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/HidayetHidayetov/haitask/compare/v0.1.6...v0.2.0
[0.1.x]: https://github.com/HidayetHidayetov/haitask/releases
