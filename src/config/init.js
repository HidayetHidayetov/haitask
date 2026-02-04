/**
 * Config init: create default .haitaskrc, validate .env.
 * No I/O assumptions — caller can use for messaging.
 */

import { writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const DEFAULT_RC = {
  jira: {
    baseUrl: 'https://your-domain.atlassian.net',
    projectKey: 'PROJ',
    issueType: 'Task',
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

// Note: Only Jira keys are required. AI key depends on provider (DEEPSEEK_API_KEY or OPENAI_API_KEY)
const REQUIRED_ENV_KEYS = ['JIRA_BASE_URL', 'JIRA_EMAIL', 'JIRA_API_TOKEN'];

/**
 * Create .haitaskrc in dir if it does not exist.
 * @param {string} [dir] - Directory (default: process.cwd())
 * @returns {{ created: boolean }} created true if file was written, false if already existed
 */
export function createDefaultConfigFile(dir = process.cwd()) {
  const path = resolve(dir, '.haitaskrc');
  if (existsSync(path)) {
    return { created: false };
  }
  writeFileSync(path, JSON.stringify(DEFAULT_RC, null, 2), 'utf-8');
  return { created: true };
}

/**
 * Check required env keys (env is already loaded by loadEnvFiles at CLI entry).
 * If config is provided, also validates AI provider key.
 * @param {string} [dir] - Unused; kept for API compatibility
 * @param {object} [config] - Optional config to check AI provider key
 * @returns {{ valid: boolean, missing: string[] }}
 */
export function validateEnv(dir = process.cwd(), config = null) {
  const missing = [...REQUIRED_ENV_KEYS];

  // Check AI provider key if config provided
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
