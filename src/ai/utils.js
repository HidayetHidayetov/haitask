/**
 * Shared AI utilities: prompt building and response parsing.
 */

/**
 * Build system + user prompt from commit data.
 * @param {{ message: string, branch: string, repoName: string }} commitData
 * @returns {{ system: string, user: string }}
 */
export function buildPrompt(commitData) {
  const { message, branch, repoName } = commitData;
  const system = `You generate a Jira task from a Git commit. Reply with a single JSON object only, no markdown or extra text.
Keys: "title" (short Jira task title, plain language — do NOT include prefixes like feat:, fix:, chore: in the title), "description" (detailed description, string), "labels" (array of strings, e.g. ["auto", "commit"]).`;
  const user = `Repo: ${repoName}\nBranch: ${branch}\nCommit message:\n${message}\n\nGenerate the JSON object.`;
  return { system, user };
}

/**
 * Parse and validate AI response. Expects { title, description, labels }.
 * @param {string} raw
 * @returns {{ title: string, description: string, labels: string[] }}
 * @throws {Error} If invalid JSON or missing/ wrong types
 */
export function parseTaskPayload(raw) {
  let obj;
  try {
    obj = JSON.parse(raw);
  } catch (err) {
    throw new Error(`AI response is not valid JSON: ${err.message}`);
  }
  if (typeof obj.title !== 'string' || typeof obj.description !== 'string') {
    throw new Error('AI response missing or invalid title/description (must be strings).');
  }
  if (!Array.isArray(obj.labels)) {
    throw new Error('AI response labels must be an array of strings.');
  }
  const labels = obj.labels.filter((l) => typeof l === 'string');
  // Strip conventional commit prefix from title so Jira gets a plain task title
  const rawTitle = (obj.title || '').trim();
  const title = rawTitle.replace(/^(feat|fix|chore|docs|style|refactor|test|build|ci):\s*/i, '').trim() || rawTitle;
  return { title, description: obj.description.trim(), labels };
}
