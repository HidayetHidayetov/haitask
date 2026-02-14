/**
 * Unit tests: commands/run.js runRun --json behavior
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runRun } from '../src/commands/run.js';

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

function withTempCwd(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'haitask-run-test-'));
  const prev = process.cwd();
  process.chdir(dir);
  try {
    return fn(dir);
  } finally {
    process.chdir(prev);
  }
}

function captureConsole() {
  const logs = [];
  const errors = [];
  const origLog = console.log;
  const origError = console.error;
  console.log = (...args) => logs.push(args.join(' '));
  console.error = (...args) => errors.push(args.join(' '));
  return {
    logs,
    errors,
    restore() {
      console.log = origLog;
      console.error = origError;
    },
  };
}

describe('runRun --json', () => {
  let prevExitCode;

  beforeEach(() => {
    prevExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = prevExitCode;
  });

  it('prints JSON config error when .haitaskrc is missing', async () => {
    const capture = captureConsole();
    try {
      await withTempCwd(async () => {
        await runRun({ json: true });
      });
    } finally {
      capture.restore();
    }

    assert.strictEqual(process.exitCode, 1);
    assert.strictEqual(capture.errors.length, 0);
    assert.ok(capture.logs.length >= 1);

    const out = JSON.parse(capture.logs[0]);
    assert.strictEqual(out.ok, false);
    assert.match(out.error, /^Config error:/);
  });

  it('prints JSON runtime error when pipeline fails', async () => {
    const capture = captureConsole();
    try {
      await withTempCwd(async (dir) => {
        writeFileSync(join(dir, '.haitaskrc'), VALID_RC, 'utf-8');
        await runRun({ json: true, dry: true });
      });
    } finally {
      capture.restore();
    }

    assert.strictEqual(process.exitCode, 1);
    assert.strictEqual(capture.errors.length, 0);
    assert.ok(capture.logs.length >= 1);

    const out = JSON.parse(capture.logs[0]);
    assert.strictEqual(out.ok, false);
    assert.strictEqual(typeof out.error, 'string');
    assert.ok(out.error.length > 0);
  });
});
