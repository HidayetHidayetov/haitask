/**
 * haitask init — Create .haitaskrc, validate .env
 * Thin handler: delegates to config layer, handles CLI output only.
 */

import { createDefaultConfigFile, validateEnv } from '../config/init.js';

export async function runInit() {
  const { created } = createDefaultConfigFile();

  if (!created) {
    console.warn('haitask init: .haitaskrc already exists. Not overwriting.');
    process.exitCode = 1;
    return;
  }

  console.log('Created .haitaskrc');

  const { valid, missing } = validateEnv();
  if (!valid) {
    console.warn('Add these to .env before running "haitask run":', missing.join(', '));
    process.exitCode = 1;
    return;
  }

  console.log('Environment (.env) looks good.');
}
