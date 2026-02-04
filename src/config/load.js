/**
 * Load .haitaskrc (single source of truth).
 * No hardcoded defaults — file must exist and be valid.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const DEFAULT_CONFIG_PATH = '.haitaskrc';

const REQUIRED_KEYS = ['jira', 'ai', 'rules'];

/**
 * @param {string} [configPath] - Absolute or cwd-relative path to .haitaskrc
 * @returns {object} Parsed config
 * @throws {Error} If file missing, invalid JSON, or missing required sections
 */
export function loadConfig(configPath) {
  const path = configPath
    ? resolve(configPath)
    : resolve(process.cwd(), DEFAULT_CONFIG_PATH);

  if (!existsSync(path)) {
    throw new Error(`Config not found: ${path}. Run "haitask init" first.`);
  }

  let raw;
  try {
    raw = readFileSync(path, 'utf-8');
  } catch (err) {
    throw new Error(`Cannot read config: ${path}. ${err.message}`);
  }

  let config;
  try {
    config = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Invalid JSON in ${path}. ${err.message}`);
  }

  const missing = REQUIRED_KEYS.filter((key) => !config[key] || typeof config[key] !== 'object');
  if (missing.length > 0) {
    throw new Error(`Config missing required sections: ${missing.join(', ')}. Check .haitaskrc.`);
  }

  return config;
}
