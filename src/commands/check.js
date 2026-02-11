/**
 * haitask check — Validate config + env only (no pipeline).
 */

import { loadConfig } from '../config/load.js';
import { validateEnv } from '../config/init.js';
import { getEnvPaths } from '../config/env-loader.js';

export function runCheck() {
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    console.error('Config error:', err.message);
    process.exitCode = 1;
    return;
  }

  const { valid, missing } = validateEnv(process.cwd(), config);
  if (!valid) {
    console.error('Missing env keys:', missing.join(', '));
    console.log('Env is read from:', getEnvPaths().join(', '));
    process.exitCode = 1;
    return;
  }

  const target = (config?.target || 'jira').toLowerCase();
  const provider = (config?.ai?.provider || 'groq').toLowerCase();
  console.log(`Config OK. Target: ${target}. AI: ${provider}.`);
  console.log('Env OK.');
}
