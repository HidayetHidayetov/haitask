/**
 * Unit tests: core/pipeline.js validateRules
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateRules } from '../src/core/pipeline.js';

describe('validateRules', () => {
  it('passes when no allowedBranches', () => {
    const commitData = { message: 'fix: x', branch: 'any' };
    const config = { rules: { commitPrefixes: [] } };
    assert.doesNotThrow(() => validateRules(commitData, config));
  });

  it('passes when branch is in allowedBranches', () => {
    const commitData = { message: 'feat: x', branch: 'main' };
    const config = { rules: { allowedBranches: ['main', 'dev'], commitPrefixes: ['feat'] } };
    assert.doesNotThrow(() => validateRules(commitData, config));
  });

  it('throws when branch not in allowedBranches', () => {
    const commitData = { message: 'feat: x', branch: 'other' };
    const config = { rules: { allowedBranches: ['main'], commitPrefixes: [] } };
    assert.throws(() => validateRules(commitData, config), /Branch "other" is not allowed/);
  });

  it('passes when commit message has allowed prefix', () => {
    const commitData = { message: 'feat: add login', branch: 'main' };
    const config = { rules: { allowedBranches: ['main'], commitPrefixes: ['feat', 'fix'] } };
    assert.doesNotThrow(() => validateRules(commitData, config));
  });

  it('passes when message starts with prefix and space', () => {
    const commitData = { message: 'fix add bug', branch: 'main' };
    const config = { rules: { allowedBranches: ['main'], commitPrefixes: ['fix'] } };
    assert.doesNotThrow(() => validateRules(commitData, config));
  });

  it('throws when commit prefix not in list', () => {
    const commitData = { message: 'wip: something', branch: 'main' };
    const config = { rules: { allowedBranches: ['main'], commitPrefixes: ['feat', 'fix'] } };
    assert.throws(() => validateRules(commitData, config), /must start with one of/);
  });
});
