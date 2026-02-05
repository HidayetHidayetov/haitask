/**
 * Extract issue/card key from commit message for "link to existing" feature.
 */

/** Jira issue key: PROJECTKEY-NUMBER (e.g. PROJ-123, EM-1). */
const JIRA_KEY_REGEX = /\b([A-Z][A-Z0-9]+-\d+)\b/g;

/** Trello card URL: trello.com/c/SHORTLINK or shortLink (8 alphanumeric). */
const TRELLO_URL_REGEX = /trello\.com\/c\/([a-zA-Z0-9]+)/;
const TRELLO_SHORTLINK_REGEX = /\b([a-zA-Z0-9]{8})\b/;

/**
 * Extract first issue key from message for the given target.
 * @param {string} message - Commit message
 * @param {string} target - 'jira' | 'trello'
 * @param {object} [config] - Optional: jira.projectKey to prefer matching project
 * @returns {string|null} Issue key or null
 */
export function extractIssueKey(message, target, config = {}) {
  const text = (message || '').trim();
  if (!text) return null;

  const t = (target || 'jira').toLowerCase();

  if (t === 'jira') {
    const projectKey = (config?.jira?.projectKey || '').trim().toUpperCase();
    const match = [...text.matchAll(JIRA_KEY_REGEX)].find(
      (m) => !projectKey || m[1].toUpperCase().startsWith(projectKey + '-')
    );
    return match ? match[1] : null;
  }

  if (t === 'trello') {
    const urlMatch = text.match(TRELLO_URL_REGEX);
    if (urlMatch) return urlMatch[1];
    const shortMatch = text.match(TRELLO_SHORTLINK_REGEX);
    return shortMatch ? shortMatch[1] : null;
  }

  if (t === 'linear') {
    const match = text.match(JIRA_KEY_REGEX);
    return match ? match[1] : null;
  }

  return null;
}
