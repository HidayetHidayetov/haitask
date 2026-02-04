/**
 * Pipeline: Git → AI → Jira
 * Orchestrates steps. No direct I/O (no console.log).
 * Returns structured result for CLI to display.
 */

import { getLatestCommitData } from '../git/commit.js';
import { generateTaskPayload } from '../ai/index.js';
import { createIssue } from '../jira/client.js';

/**
 * Validate branch and commit prefix from config.rules.
 * @param {{ message: string, branch: string }} commitData
 * @param {{ rules?: { allowedBranches?: string[], commitPrefixes?: string[] } }} config
 * @throws {Error} If validation fails
 */
function validateRules(commitData, config) {
  const { message, branch } = commitData;
  const rules = config?.rules || {};
  const allowedBranches = rules.allowedBranches;
  const commitPrefixes = rules.commitPrefixes;

  if (Array.isArray(allowedBranches) && allowedBranches.length > 0) {
    if (!allowedBranches.includes(branch)) {
      throw new Error(
        `Branch "${branch}" is not allowed. Allowed: ${allowedBranches.join(', ')}. Update .haitaskrc rules.allowedBranches.`
      );
    }
  }

  if (Array.isArray(commitPrefixes) && commitPrefixes.length > 0) {
    const trimmed = (message || '').trim();
    const hasPrefix = commitPrefixes.some(
      (p) => trimmed.startsWith(p + ':') || trimmed.startsWith(p + ' ')
    );
    if (!hasPrefix) {
      throw new Error(
        `Commit message must start with one of: ${commitPrefixes.map((p) => p + ':').join(', ')}. Update .haitaskrc rules.commitPrefixes or change the commit message.`
      );
    }
  }
}

/**
 * Run full pipeline: Git → validate → AI → Jira (unless dry).
 * @param {object} config - Loaded .haitaskrc
 * @param {{ dry?: boolean }} options - dry: skip Jira API call
 * @returns {Promise<{ ok: boolean, dry?: boolean, key?: string, payload?: object, commitData?: object, error?: string }>}
 */
export async function runPipeline(config, options = {}) {
  const { dry = false } = options;

  const commitData = await getLatestCommitData();
  validateRules(commitData, config);

  const payload = await generateTaskPayload(commitData, config);

  if (dry) {
    return { ok: true, dry: true, payload, commitData };
  }

  const { key } = await createIssue(payload, config);
  return { ok: true, key, payload, commitData };
}
