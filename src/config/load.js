/**
 * Load .haitaskrc (single source of truth).
 * No hardcoded defaults — file must exist and be valid.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const CONFIG_FILENAME = '.haitaskrc';
const REQUIRED_KEYS = ['ai', 'rules'];
const VALID_TARGETS = ['jira', 'trello'];

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

  config.target = (config.target || 'jira').toLowerCase();
  if (!VALID_TARGETS.includes(config.target)) {
    throw new Error(`Invalid target: "${config.target}". Allowed: ${VALID_TARGETS.join(', ')}.`);
  }
  const targetSection = config[config.target];
  if (!targetSection || typeof targetSection !== 'object') {
    throw new Error(`Config missing section for target "${config.target}". Add a "${config.target}" object in .haitaskrc.`);
  }
  return config;
}
