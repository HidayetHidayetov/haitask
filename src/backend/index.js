/**
 * Backend abstraction: one createTask(payload, config) for all targets (Jira, Trello, …).
 * Dispatches to the right adapter based on config.target.
 */

import { createIssue } from '../jira/client.js';
import { VALID_TARGETS } from '../config/constants.js';
import { buildJiraUrl } from '../utils/urls.js';

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

  if (target === 'jira') {
    const { key } = await createIssue(payload, config);
    return { key, url: buildJiraUrl(config, key) };
  }

  if (target === 'trello') {
    const { createTask: createTrelloTask } = await import('../trello/client.js');
    return createTrelloTask(payload, config);
  }

  throw new Error(`Target "${target}" has no adapter.`);
}
