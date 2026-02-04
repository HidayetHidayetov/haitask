/**
 * URL helpers for task targets. Single place for Jira/Trello link building.
 */

/**
 * Build Jira issue URL from config and issue key.
 * @param {object} config - .haitaskrc (jira.baseUrl) or env JIRA_BASE_URL
 * @param {string} key - Issue key (e.g. PROJ-123)
 * @returns {string}
 */
export function buildJiraUrl(config, key) {
  const baseUrl = (config?.jira?.baseUrl || process.env.JIRA_BASE_URL || '').replace(/\/$/, '');
  return baseUrl ? `${baseUrl}/browse/${key}` : key;
}
