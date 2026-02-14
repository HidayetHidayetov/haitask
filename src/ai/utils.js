/**
 * Shared AI utilities: prompt building and response parsing.
 */

const CONVENTIONAL_PREFIXES = /^(feat|fix|chore|docs|style|refactor|test|build|ci):\s*/i;

/**
 * Build system + user prompt from commit data.
 * @param {{ message: string, branch: string, repoName: string }} commitData
 * @param {string} [target='jira']
 * @returns {{ system: string, user: string }}
 */
const BATCH_SEP = '\n\n---\n\n';

const TARGET_META = {
  jira: { displayName: 'Jira', workItem: 'issue', priorityField: true },
  trello: { displayName: 'Trello', workItem: 'card', priorityField: false },
  linear: { displayName: 'Linear', workItem: 'issue', priorityField: true },
};

export function buildPrompt(commitData, target = 'jira') {
  const { message, branch, repoName } = commitData;
  const isBatch = message.includes(BATCH_SEP);
  const normalizedTarget = (target || 'jira').toLowerCase();
  const meta = TARGET_META[normalizedTarget] || TARGET_META.jira;
  const batchHint = isBatch
    ? ' The user input may contain multiple commits separated by "---"; produce one task that summarizes all of them.\n\n'
    : '';
  const priorityRule = meta.priorityField
    ? '- "priority": One of: "Highest", "High", "Medium", "Low", "Lowest". Infer from commit message (e.g. "urgent", "critical", "hotfix" → High; "minor", "tweak" → Low; unclear → "Medium"). Default to "Medium" if unsure.'
    : '- "priority": Still provide one of "Highest", "High", "Medium", "Low", "Lowest". Some targets may not have a native priority field; it can be used for description context.';
  const system = `You generate a ${meta.displayName} ${meta.workItem} from a Git commit. Reply with a single JSON object only, no markdown or extra text.
${batchHint}Keys:
- "title": Short, formal ${meta.displayName} ${meta.workItem} summary (professional wording). Do NOT copy the commit message verbatim. Rewrite as a clear, formal title. Do NOT include prefixes like feat:, fix:, chore: in the title.
- "description": Detailed description in plain language, suitable for ${meta.displayName}. Expand and formalize the intent of the commit; do not just paste the commit message.
- "labels": Array of strings, e.g. ["auto", "commit"].
${priorityRule}`;
  const user = `Repo: ${repoName}\nBranch: ${branch}\nCommit message:\n${message}\n\nGenerate the JSON object.`;
  return { system, user };
}

const VALID_PRIORITIES = new Set(['Highest', 'High', 'Medium', 'Low', 'Lowest']);

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
    throw new TypeError('AI response missing or invalid title/description (must be strings).');
  }
  if (!Array.isArray(obj.labels)) {
    throw new TypeError('AI response labels must be an array of strings.');
  }
  const labels = obj.labels.filter((l) => typeof l === 'string');
  const rawTitle = (obj.title || '').trim();
  const title = rawTitle.replace(CONVENTIONAL_PREFIXES, '').trim() || rawTitle;
  const rawPriority = (obj.priority || 'Medium').trim();
  const priority = VALID_PRIORITIES.has(rawPriority) ? rawPriority : 'Medium';
  return { title, description: obj.description.trim(), labels, priority };
}
