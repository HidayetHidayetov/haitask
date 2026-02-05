/**
 * Pipeline: Git → AI → target (Jira, Trello, …).
 * Orchestrates steps. No direct I/O (no console.log).
 * Returns structured result for CLI to display.
 */

import { getLatestCommitData, getLatestCommitsData } from '../git/commit.js';
import { generateTaskPayload } from '../ai/index.js';
import { createTask } from '../backend/index.js';

const BATCH_SEP = '\n\n---\n\n';

/**
 * Validate branch and commit prefix from config.rules.
 * For batch (message contains BATCH_SEP), prefix is checked on the latest (first) commit only.
 * @param {{ message: string, branch: string }} commitData
 * @param {{ rules?: { allowedBranches?: string[], commitPrefixes?: string[] } }} config
 * @throws {Error} If validation fails
 */
export function validateRules(commitData, config) {
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
    const toCheck = message.includes(BATCH_SEP) ? message.split(BATCH_SEP)[0] : message;
    const trimmed = (toCheck || '').trim();
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
 * Run full pipeline: Git → validate → AI → target (unless dry).
 * @param {object} config - Loaded .haitaskrc
 * @param {{ dry?: boolean, issueType?: string, transitionToStatus?: string, commits?: number }} options
 * @returns {Promise<{ ok: boolean, dry?: boolean, key?: string, url?: string, payload?: object, commitData?: object, error?: string }>}
 */
export async function runPipeline(config, options = {}) {
  const { dry = false, issueType: typeOverride, transitionToStatus: statusOverride, commits: commitsOpt } = options;
  const numCommits = Math.max(1, Number(commitsOpt) || 1);

  const commitData = numCommits > 1 ? await getLatestCommitsData(numCommits) : await getLatestCommitData();
  validateRules(commitData, config);

  const payload = await generateTaskPayload(commitData, config);

  if (dry) {
    return { ok: true, dry: true, payload, commitData };
  }

  const target = (config?.target || 'jira').toLowerCase();
  const mergedConfig =
    target === 'jira'
      ? mergeJiraOverrides(config, { issueType: typeOverride, transitionToStatus: statusOverride })
      : config;

  const { key, url } = await createTask(payload, mergedConfig);
  return { ok: true, key, url, payload, commitData };
}

/**
 * Merge run-time overrides into config.jira. Returns config unchanged if no overrides.
 */
function mergeJiraOverrides(config, overrides) {
  const { issueType, transitionToStatus } = overrides;
  if (issueType == null && transitionToStatus == null) return config;
  return {
    ...config,
    jira: {
      ...config.jira,
      ...(issueType != null && { issueType }),
      ...(transitionToStatus != null && { transitionToStatus }),
    },
  };
}
