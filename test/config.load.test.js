/**
 * Unit tests: config/load.js loadConfig
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../src/config/load.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(__dirname, 'fixtures');

describe('loadConfig', () => {
  it('loads valid jira config and defaults target to jira', () => {
    const config = loadConfig(resolve(fixturesDir, 'valid.haitaskrc'));
    assert.strictEqual(config.target, 'jira');
    assert.ok(config.jira);
    assert.strictEqual(config.jira.projectKey, 'PROJ');
    assert.ok(config.ai);
    assert.ok(config.rules);
  });

  it('loads valid trello config', () => {
    const config = loadConfig(resolve(fixturesDir, 'valid-trello.haitaskrc'));
    assert.strictEqual(config.target, 'trello');
    assert.ok(config.trello);
    assert.strictEqual(config.trello.listId, '67ea669c15fe66d95d2a7bbe');
  });

  it('throws when file does not exist', () => {
    assert.throws(
      () => loadConfig(resolve(fixturesDir, 'nonexistent.rc')),
      /Config not found/
    );
  });

  it('throws when JSON is invalid', () => {
    assert.throws(
      () => loadConfig(resolve(fixturesDir, 'invalid-json.haitaskrc')),
      /Invalid JSON/
    );
  });
});
