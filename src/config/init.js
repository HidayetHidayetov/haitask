/**
 * Config init: create default .haitaskrc, validate .env.
 * No I/O assumptions — caller can use for messaging.
 */

import { writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const DEFAULT_RC = {
  target: 'jira',
  jira: {
    baseUrl: 'https://your-domain.atlassian.net',
    projectKey: 'PROJ',
    issueType: 'Task',
    transitionToStatus: 'Done',
  },
  ai: {
    provider: 'groq',
    model: 'llama-3.1-8b-instant',
  },
  rules: {
    allowedBranches: ['main', 'develop', 'master'],
    commitPrefixes: ['feat', 'fix', 'chore'],
  },
};

const JIRA_REQUIRED = ['JIRA_BASE_URL', 'JIRA_EMAIL', 'JIRA_API_TOKEN'];
const TRELLO_REQUIRED = ['TRELLO_API_KEY', 'TRELLO_TOKEN'];
const LINEAR_REQUIRED = ['LINEAR_API_KEY'];

function getRequiredKeysForTarget(target) {
  const t = (target || 'jira').toLowerCase();
  if (t === 'trello') return [...TRELLO_REQUIRED];
  if (t === 'linear') return [...LINEAR_REQUIRED];
  return [...JIRA_REQUIRED];
}

/**
 * Create .haitaskrc in dir if it does not exist.
 * @param {string} [dir] - Directory (default: process.cwd())
 * @returns {{ created: boolean }}
 */
export function createDefaultConfigFile(dir = process.cwd()) {
  const rcPath = resolve(dir, '.haitaskrc');
  if (existsSync(rcPath)) return { created: false };
  writeFileSync(rcPath, JSON.stringify(DEFAULT_RC, null, 2), 'utf-8');
  return { created: true };
}

/**
 * Check required env keys (env is already loaded by loadEnvFiles at CLI entry).
 * Target (jira vs trello) and AI provider determine which keys are required.
 * @param {string} [dir] - Unused; kept for API compatibility
 * @param {object} [config] - Optional config (target, ai.provider)
 * @returns {{ valid: boolean, missing: string[] }}
 */
export function validateEnv(dir = process.cwd(), config = null) {
  const missing = getRequiredKeysForTarget(config?.target);

  if (config?.ai?.provider) {
    const provider = config.ai.provider.toLowerCase();
    const aiKeys = {
      openai: 'OPENAI_API_KEY',
      deepseek: 'DEEPSEEK_API_KEY',
      groq: 'GROQ_API_KEY',
    };
    const aiKey = aiKeys[provider];
    if (aiKey && !process.env[aiKey]?.trim()) {
      missing.push(aiKey);
    }
  }

  const filtered = missing.filter((key) => !process.env[key]?.trim());
  return { valid: filtered.length === 0, missing: filtered };
}
