/**
 * Git data extraction via execa (git CLI).
 * Returns: { message, branch, repoName } or throws.
 */

import { execa } from 'execa';
import { basename } from 'node:path';

const CWD = process.cwd();
const BATCH_SEP = '\n\n---\n\n';

/**
 * Get latest commit message, current branch, and repo (root folder) name.
 * @returns {Promise<{ message: string, branch: string, repoName: string }>}
 * @throws {Error} If not a git repo or git command fails
 */
export async function getLatestCommitData() {
  return getLatestCommitsData(1);
}

/**
 * Get last N commit messages combined, current branch, and repo name.
 * @param {number} n - Number of commits (>= 1)
 * @returns {Promise<{ message: string, branch: string, repoName: string, count: number }>}
 */
export async function getLatestCommitsData(n = 1) {
  const num = Math.max(1, Number(n) || 1);
  const [logResult, branchResult, rootResult] = await Promise.all([
    execa('git', ['log', `-${num}`, '--pretty=format:%B%x00'], { cwd: CWD }),
    execa('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: CWD }),
    execa('git', ['rev-parse', '--show-toplevel'], { cwd: CWD }),
  ]);

  const raw = logResult.stdout || '';
  const branch = (branchResult.stdout || '').trim();
  const repoRoot = (rootResult.stdout || '').trim();
  const repoName = repoRoot ? basename(repoRoot) : '';

  const parts = raw.split('\0').map((s) => s.trim()).filter(Boolean).slice(0, num);
  const message = parts.length > 1 ? parts.join(BATCH_SEP) : (parts[0] || raw.trim());
  return { message, branch, repoName, count: parts.length };
}
