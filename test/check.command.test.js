/**
 * Unit tests: commands/check.js runCheck
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runCheck } from '../src/commands/check.js';

const JIRA_RC = JSON.stringify({
  target: 'jira',
  jira: { baseUrl: 'https://example.atlassian.net', projectKey: 'PROJ', issueType: 'Task', transitionToStatus: 'Done' },
  ai: { provider: 'groq', model: 'llama-3.1-8b-instant' },
  rules: { allowedBranches: ['main'], commitPrefixes: ['feat', 'fix'] },
});

function withTempCwd(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'haitask-test-'));
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

describe('runCheck', () => {
  const envKeys = ['JIRA_BASE_URL', 'JIRA_EMAIL', 'JIRA_API_TOKEN', 'GROQ_API_KEY'];
  let prevEnv = {};
  let prevExitCode;

  beforeEach(() => {
    prevExitCode = process.exitCode;
    process.exitCode = undefined;
    prevEnv = {};
    for (const k of envKeys) prevEnv[k] = process.env[k];
  });

  afterEach(() => {
    for (const k of envKeys) {
      if (prevEnv[k] === undefined) delete process.env[k];
      else process.env[k] = prevEnv[k];
    }
    process.exitCode = prevExitCode;
  });

  it('sets exitCode when config is missing', () => {
    const capture = captureConsole();
    try {
      withTempCwd(() => {
        runCheck();
      });
    } finally {
      capture.restore();
    }
    assert.strictEqual(process.exitCode, 1);
    assert.ok(capture.errors.some((m) => m.includes('Config error')));
  });

  it('reports env missing keys', () => {
    const capture = captureConsole();
    try {
      withTempCwd((dir) => {
        writeFileSync(join(dir, '.haitaskrc'), JIRA_RC, 'utf-8');
        delete process.env.JIRA_BASE_URL;
        delete process.env.JIRA_EMAIL;
        delete process.env.JIRA_API_TOKEN;
        delete process.env.GROQ_API_KEY;
        runCheck();
      });
    } finally {
      capture.restore();
    }
    assert.strictEqual(process.exitCode, 1);
    assert.ok(capture.errors.some((m) => m.includes('Missing env keys')));
  });

  it('prints OK when config and env are valid', () => {
    const capture = captureConsole();
    try {
      withTempCwd((dir) => {
        writeFileSync(join(dir, '.haitaskrc'), JIRA_RC, 'utf-8');
        process.env.JIRA_BASE_URL = 'https://example.atlassian.net';
        process.env.JIRA_EMAIL = 'a@example.com';
        process.env.JIRA_API_TOKEN = 'token';
        process.env.GROQ_API_KEY = 'groq';
        runCheck();
      });
    } finally {
      capture.restore();
    }
    assert.ok(capture.logs.some((m) => m.includes('Config OK.')));
    assert.ok(capture.logs.some((m) => m.includes('Env OK.')));
    assert.notStrictEqual(process.exitCode, 1);
  });
});
