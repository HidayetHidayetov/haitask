/**
 * Load .env: try cwd first, then ~/.haitask/.env (Option C — hybrid).
 * So users can have one global .env for all projects or override per repo.
 */

import { existsSync } from 'fs';
import { resolve } from 'path';
import { config as loadDotenv } from 'dotenv';

const CWD = process.cwd();
const HOME = process.env.HOME || process.env.USERPROFILE || '';

function loadEnv(path) {
  if (path && existsSync(path)) {
    loadDotenv({ path });
  }
}

/**
 * Load environment: first .env in current directory, then ~/.haitask/.env.
 * Call once at CLI entry (e.g. index.js).
 */
export function loadEnvFiles() {
  loadEnv(resolve(CWD, '.env'));
  if (HOME) {
    loadEnv(resolve(HOME, '.haitask', '.env'));
  }
}

/**
 * Paths we check for .env (for messaging).
 */
export function getEnvPaths() {
  const paths = [resolve(CWD, '.env')];
  if (HOME) paths.push(resolve(HOME, '.haitask', '.env'));
  return paths;
}
