/**
 * haitask init — Create .haitaskrc, validate .env
 * Thin handler: delegates to config layer, handles CLI output only.
 */

import { createDefaultConfigFile, validateEnv } from '../config/init.js';
import { loadConfig } from '../config/load.js';

export async function runInit() {
  const { created } = createDefaultConfigFile();

  if (!created) {
    console.warn('haitask init: .haitaskrc already exists. Not overwriting.');
    process.exitCode = 1;
    return;
  }

  console.log('Created .haitaskrc');

  // Load config to check AI provider key
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    // Config just created, might not be readable yet, skip AI key check
    config = null;
  }

  const { valid, missing } = validateEnv(process.cwd(), config);
  if (!valid) {
    console.warn('Add these to .env before running "haitask run":', missing.join(', '));
    const provider = config?.ai?.provider?.toLowerCase();
    if (provider === 'groq') console.log('Get free Groq API key at: https://console.groq.com/keys');
    if (provider === 'deepseek') console.log('Get free Deepseek API key at: https://platform.deepseek.com/');
    process.exitCode = 1;
    return;
  }

  console.log('Environment (.env) looks good.');
}
