/**
 * Integration tests: CLI run --json output contract.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execa } from 'execa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CLI_PATH = resolve(__dirname, '../src/index.js');

const VALID_RC = JSON.stringify({
  target: 'jira',
  jira: {
    baseUrl: 'https://example.atlassian.net',
    projectKey: 'PROJ',
    issueType: 'Task',
    transitionToStatus: 'Done',
  },
  ai: { provider: 'groq', model: 'llama-3.1-8b-instant' },
  rules: { allowedBranches: ['main'], commitPrefixes: ['feat', 'fix'] },
});

describe('haitask run --json (CLI)', () => {
  it('returns JSON config error when config is missing', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'haitask-cli-json-'));
    const { stdout, stderr, exitCode } = await execa(process.execPath, [CLI_PATH, 'run', '--json'], {
      cwd,
      reject: false,
    });

    assert.strictEqual(exitCode, 1);
    assert.strictEqual(stderr, '');
    const out = JSON.parse(stdout);
    assert.strictEqual(out.ok, false);
    assert.match(out.error, /^Config error:/);
  });

  it('returns JSON runtime error when git context is missing', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'haitask-cli-json-'));
    writeFileSync(join(cwd, '.haitaskrc'), VALID_RC, 'utf-8');

    const { stdout, stderr, exitCode } = await execa(process.execPath, [CLI_PATH, 'run', '--json', '--dry'], {
      cwd,
      reject: false,
    });

    assert.strictEqual(exitCode, 1);
    assert.strictEqual(stderr, '');
    const out = JSON.parse(stdout);
    assert.strictEqual(out.ok, false);
    assert.match(out.error, /^Error:/);
  });
});
