/**
 * Short hints for API errors (401, 403, 404) to help users fix config.
 */

const HINTS = {
  jira: {
    401: 'Check JIRA_EMAIL and JIRA_API_TOKEN in .env.',
    403: 'Check project permissions and that the user is an assignable user.',
    404: 'Check JIRA_BASE_URL and jira.projectKey in .haitaskrc.',
  },
  trello: {
    401: 'Check TRELLO_API_KEY and TRELLO_TOKEN in .env. Get them at https://trello.com/app-key',
    403: 'Check board and list access (token may not have write permission).',
    404: 'Check trello.listId (list where cards go) or the card ID.',
  },
  linear: {
    401: 'Check LINEAR_API_KEY in .env. Get a key at https://linear.app/settings/api',
    403: 'Check team permissions and API key scope.',
    404: 'Check linear.teamId in .haitaskrc or the issue identifier.',
  },
};

/**
 * @param {string} target - 'jira' | 'trello' | 'linear'
 * @param {number} status - HTTP status
 * @returns {string} Hint to append to error message, or ''
 */
export function getHttpHint(target, status) {
  const s = Number(status);
  if (!s || s < 400) return '';
  const map = HINTS[target];
  if (!map) return '';
  return map[s] || '';
}
