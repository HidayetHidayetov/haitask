# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.2.0]: https://github.com/HidayetHidayetov/haitask/compare/v0.1.6...v0.2.0
[0.1.x]: https://github.com/HidayetHidayetov/haitask/releases
