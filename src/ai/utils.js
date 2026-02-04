/**
 * Shared AI utilities: prompt building and response parsing.
 */

const CONVENTIONAL_PREFIXES = /^(feat|fix|chore|docs|style|refactor|test|build|ci):\s*/i;

/**
 * Build system + user prompt from commit data.
 * @param {{ message: string, branch: string, repoName: string }} commitData
 * @returns {{ system: string, user: string }}
 */
export function buildPrompt(commitData) {
  const { message, branch, repoName } = commitData;
  const system = `You generate a Jira task from a Git commit. Reply with a single JSON object only, no markdown or extra text.

Keys:
- "title": Short, formal Jira task summary (professional wording). Do NOT copy the commit message verbatim. Rewrite as a clear, formal task title suitable for Jira (e.g. "Add user login validation" not "test login stuff"). Do NOT include prefixes like feat:, fix:, chore: in the title.
- "description": Detailed description in plain language, suitable for Jira. Expand and formalize the intent of the commit; do not just paste the commit message.
- "labels": Array of strings, e.g. ["auto", "commit"].
- "priority": One of: "Highest", "High", "Medium", "Low", "Lowest". Infer from commit message (e.g. "urgent", "critical", "hotfix" → High; "minor", "tweak" → Low; unclear → "Medium"). Default to "Medium" if unsure.`;
  const user = `Repo: ${repoName}\nBranch: ${branch}\nCommit message:\n${message}\n\nGenerate the JSON object.`;
  return { system, user };
}

const VALID_PRIORITIES = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];

/**
 * Parse and validate AI response. Expects { title, description, labels, priority? }.
 * @param {string} raw
 * @returns {{ title: string, description: string, labels: string[], priority: string }}
 * @throws {Error} If invalid JSON or missing/wrong types
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
  const rawTitle = (obj.title || '').trim();
  const title = rawTitle.replace(CONVENTIONAL_PREFIXES, '').trim() || rawTitle;
  const rawPriority = (obj.priority || 'Medium').trim();
  const priority = VALID_PRIORITIES.includes(rawPriority) ? rawPriority : 'Medium';
  return { title, description: obj.description.trim(), labels, priority };
}
