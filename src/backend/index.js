/**
 * Backend abstraction: one createTask(payload, config) for all targets (Jira, Trello, …).
 * Dispatches to the right adapter based on config.target.
 */

import { createIssue } from '../jira/client.js';

const SUPPORTED_TARGETS = ['jira', 'trello'];

function buildJiraUrl(config, key) {
  const baseUrl = (config?.jira?.baseUrl || process.env.JIRA_BASE_URL || '').replace(/\/$/, '');
  return baseUrl ? `${baseUrl}/browse/${key}` : key;
}

/**
 * Create a task in the configured target (Jira, Trello, …).
 * @param {object} payload - { title, description, labels, priority } from AI
 * @param {object} config - .haitaskrc (target, jira | trello, …)
 * @returns {Promise<{ key: string, url?: string }>}
 */
export async function createTask(payload, config) {
  const target = (config?.target || 'jira').toLowerCase();

  if (!SUPPORTED_TARGETS.includes(target)) {
    throw new Error(`Unknown target: "${target}". Supported: ${SUPPORTED_TARGETS.join(', ')}.`);
  }

  if (target === 'jira') {
    const { key } = await createIssue(payload, config);
    return { key, url: buildJiraUrl(config, key) };
  }

  if (target === 'trello') {
    throw new Error('Trello adapter not implemented yet. Use target: "jira" for now.');
  }

  throw new Error(`Target "${target}" has no adapter.`);
}
