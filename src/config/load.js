/**
 * Load .haitaskrc (single source of truth).
 * No hardcoded defaults — file must exist and be valid.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const CONFIG_FILENAME = '.haitaskrc';
const REQUIRED_KEYS = ['jira', 'ai', 'rules'];

/**
 * Load and validate .haitaskrc.
 * @param {string} [configPath] - Absolute or cwd-relative path to .haitaskrc
 * @returns {object} Parsed config
 * @throws {Error} If file missing, invalid JSON, or missing required sections
 */
export function loadConfig(configPath) {
  const filePath = configPath
    ? resolve(configPath)
    : resolve(process.cwd(), CONFIG_FILENAME);

  if (!existsSync(filePath)) {
    throw new Error(`Config not found: ${filePath}. Run "haitask init" first.`);
  }

  let raw;
  try {
    raw = readFileSync(filePath, 'utf-8');
  } catch (err) {
    throw new Error(`Cannot read config: ${filePath}. ${err.message}`);
  }

  let config;
  try {
    config = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Invalid JSON in ${filePath}. ${err.message}`);
  }

  const missing = REQUIRED_KEYS.filter((key) => !config[key] || typeof config[key] !== 'object');
  if (missing.length > 0) {
    throw new Error(`Config missing required sections: ${missing.join(', ')}. Check .haitaskrc.`);
  }

  return config;
}
