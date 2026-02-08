/**
 * Idempotency: remember last created task per commit hash so we don't create duplicates.
 * State file: .git/haitask-state.json (inside repo, not committed).
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const STATE_FILENAME = 'haitask-state.json';

function statePath(repoRoot) {
  return join(repoRoot || '', '.git', STATE_FILENAME);
}

/**
 * Read last stored result for idempotency check.
 * @param {string} repoRoot - Git repo root path (e.g. from git rev-parse --show-toplevel)
 * @returns {{ commitHash?: string, taskKey?: string, taskUrl?: string } | null}
 */
export function readState(repoRoot) {
  if (!repoRoot?.trim()) return null;
  const path = statePath(repoRoot);
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, 'utf-8');
    const data = JSON.parse(raw);
    return data && typeof data === 'object' ? data : null;
  } catch {
    return null;
  }
}

/**
 * Write state after successfully creating a task (so next run with same commit skips).
 * @param {string} repoRoot - Git repo root path
 * @param {{ commitHash: string, taskKey: string, taskUrl?: string }} state
 */
export function writeState(repoRoot, state) {
  if (!repoRoot?.trim() || !state?.commitHash || !state?.taskKey) return;
  const path = statePath(repoRoot);
  try {
    writeFileSync(path, JSON.stringify(state, null, 0), 'utf-8');
  } catch {
    // ignore write errors (e.g. read-only .git)
  }
}
