/**
 * Git data extraction via execa (git CLI).
 * Returns: { message, branch, repoName } or throws.
 */

import { execa } from 'execa';
import { basename } from 'path';

const CWD = process.cwd();

/**
 * Get latest commit message, current branch, and repo (root folder) name.
 * @returns {Promise<{ message: string, branch: string, repoName: string }>}
 * @throws {Error} If not a git repo or git command fails
 */
export async function getLatestCommitData() {
  const [messageResult, branchResult, rootResult] = await Promise.all([
    execa('git', ['log', '-1', '--pretty=%B'], { cwd: CWD }),
    execa('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: CWD }),
    execa('git', ['rev-parse', '--show-toplevel'], { cwd: CWD }),
  ]);

  const message = (messageResult.stdout || '').trim();
  const branch = (branchResult.stdout || '').trim();
  const repoRoot = (rootResult.stdout || '').trim();
  const repoName = repoRoot ? basename(repoRoot) : '';

  return { message, branch, repoName };
}
