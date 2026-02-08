/**
 * Backend abstraction: one createTask(payload, config) for all targets (Jira, Trello, …).
 * Dispatches to the right adapter based on config.target. Wraps adapter calls with retry (5xx, 429, network).
 */

import { createIssue, addComment as jiraAddComment } from '../jira/client.js';
import { VALID_TARGETS } from '../config/constants.js';
import { buildJiraUrl } from '../utils/urls.js';
import { withRetry } from '../utils/retry.js';

/**
 * Add a comment to an existing issue/card (link-to-existing feature).
 * @param {string} message - Comment text (e.g. commit message)
 * @param {string} issueKey - Issue key (Jira: PROJ-123, Trello: shortLink or id)
 * @param {object} config - .haitaskrc (target, jira | trello)
 * @returns {Promise<{ key: string, url: string }>}
 */
export async function addComment(message, issueKey, config) {
  const target = (config?.target || 'jira').toLowerCase();
  if (!VALID_TARGETS.includes(target)) {
    throw new Error(`Unknown target: "${target}". Supported: ${VALID_TARGETS.join(', ')}.`);
  }
  const run = () => {
    if (target === 'jira') return jiraAddComment(issueKey, message, config);
    if (target === 'trello') return import('../trello/client.js').then((m) => m.addComment(issueKey, message, config));
    if (target === 'linear') return import('../linear/client.js').then((m) => m.addComment(issueKey, message, config));
    throw new Error(`Target "${target}" has no addComment adapter.`);
  };
  return withRetry(run);
}

/**
 * Create a task in the configured target (Jira, Trello, …).
 * @param {object} payload - { title, description, labels, priority } from AI
 * @param {object} config - .haitaskrc (target, jira | trello, …)
 * @returns {Promise<{ key: string, url?: string }>}
 */
export async function createTask(payload, config) {
  const target = (config?.target || 'jira').toLowerCase();

  if (!VALID_TARGETS.includes(target)) {
    throw new Error(`Unknown target: "${target}". Supported: ${VALID_TARGETS.join(', ')}.`);
  }

  const run = async () => {
    if (target === 'jira') {
      const { key } = await createIssue(payload, config);
      return { key, url: buildJiraUrl(config, key) };
    }
    if (target === 'trello') {
      const { createTask: createTrelloTask } = await import('../trello/client.js');
      return createTrelloTask(payload, config);
    }
    if (target === 'linear') {
      const { createTask: createLinearTask } = await import('../linear/client.js');
      return createLinearTask(payload, config);
    }
    throw new Error(`Target "${target}" has no adapter.`);
  };
  return withRetry(run);
}
