/**
 * Unit tests: ai/utils.js parseTaskPayload, buildPrompt
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseTaskPayload, buildPrompt } from '../src/ai/utils.js';

describe('parseTaskPayload', () => {
  it('parses valid JSON and returns title, description, labels, priority', () => {
    const raw = JSON.stringify({
      title: 'Add login',
      description: 'User login flow',
      labels: ['auto', 'commit'],
      priority: 'High',
    });
    const out = parseTaskPayload(raw);
    assert.strictEqual(out.title, 'Add login');
    assert.strictEqual(out.description, 'User login flow');
    assert.deepStrictEqual(out.labels, ['auto', 'commit']);
    assert.strictEqual(out.priority, 'High');
  });

  it('strips conventional prefix from title', () => {
    const raw = JSON.stringify({
      title: 'feat: Add login',
      description: 'Desc',
      labels: [],
    });
    const out = parseTaskPayload(raw);
    assert.strictEqual(out.title, 'Add login');
  });

  it('defaults priority to Medium when missing or invalid', () => {
    const raw = JSON.stringify({ title: 'T', description: 'D', labels: [] });
    const out = parseTaskPayload(raw);
    assert.strictEqual(out.priority, 'Medium');
  });

  it('throws on invalid JSON', () => {
    assert.throws(() => parseTaskPayload('not json'), /not valid JSON/);
  });

  it('throws when title or description missing', () => {
    assert.throws(
      () => parseTaskPayload(JSON.stringify({ description: 'D', labels: [] })),
      /title\/description/
    );
    assert.throws(
      () => parseTaskPayload(JSON.stringify({ title: 'T', labels: [] })),
      /title\/description/
    );
  });

  it('throws when labels is not array', () => {
    assert.throws(
      () => parseTaskPayload(JSON.stringify({ title: 'T', description: 'D', labels: 'x' })),
      /labels must be an array/
    );
  });
});

describe('buildPrompt', () => {
  it('returns system and user with repo, branch, message', () => {
    const commitData = { message: 'feat: add x', branch: 'main', repoName: 'my-repo' };
    const { system, user } = buildPrompt(commitData);
    assert.ok(system.includes('JSON'));
    assert.ok(system.includes('Jira'));
    assert.ok(user.includes('my-repo'));
    assert.ok(user.includes('main'));
    assert.ok(user.includes('feat: add x'));
  });

  it('adapts system prompt by target', () => {
    const commitData = { message: 'fix: bug', branch: 'dev', repoName: 'repo' };
    const { system: linearSystem } = buildPrompt(commitData, 'linear');
    const { system: trelloSystem } = buildPrompt(commitData, 'trello');
    assert.ok(linearSystem.includes('Linear issue'));
    assert.ok(trelloSystem.includes('Trello card'));
  });
});
