/**
 * Config init: create default .haitaskrc, validate .env.
 * No I/O assumptions — caller can use for messaging.
 */

import { writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { config as loadEnv } from 'dotenv';

const DEFAULT_RC = {
  jira: {
    baseUrl: 'https://your-domain.atlassian.net',
    projectKey: 'PROJ',
    issueType: 'Task',
  },
  ai: {
    provider: 'openai',
    model: 'gpt-4o-mini',
  },
  rules: {
    allowedBranches: ['main', 'develop'],
    commitPrefixes: ['feat', 'fix', 'chore'],
  },
};

const REQUIRED_ENV_KEYS = ['OPENAI_API_KEY', 'JIRA_BASE_URL', 'JIRA_EMAIL', 'JIRA_API_TOKEN'];

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
 * Load .env from dir and check required keys.
 * @param {string} [dir] - Directory (default: process.cwd())
 * @returns {{ valid: boolean, missing: string[] }}
 */
export function validateEnv(dir = process.cwd()) {
  const envPath = resolve(dir, '.env');
  loadEnv({ path: envPath });
  const missing = REQUIRED_ENV_KEYS.filter((key) => !process.env[key]?.trim());
  return { valid: missing.length === 0, missing };
}
