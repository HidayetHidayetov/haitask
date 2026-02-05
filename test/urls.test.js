/**
 * Unit tests: utils/urls.js buildJiraUrl
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { buildJiraUrl } from '../src/utils/urls.js';

describe('buildJiraUrl', () => {
  it('builds URL from config.jira.baseUrl and key', () => {
    const config = { jira: { baseUrl: 'https://example.atlassian.net' } };
    assert.strictEqual(buildJiraUrl(config, 'PROJ-123'), 'https://example.atlassian.net/browse/PROJ-123');
  });

  it('strips trailing slash from baseUrl', () => {
    const config = { jira: { baseUrl: 'https://example.atlassian.net/' } };
    assert.strictEqual(buildJiraUrl(config, 'PROJ-1'), 'https://example.atlassian.net/browse/PROJ-1');
  });

  it('returns key only when no baseUrl', () => {
    assert.strictEqual(buildJiraUrl({}, 'PROJ-1'), 'PROJ-1');
    assert.strictEqual(buildJiraUrl({ jira: {} }, 'X'), 'X');
  });
});
