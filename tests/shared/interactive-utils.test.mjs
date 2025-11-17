#!/usr/bin/env node

import { test } from 'node:test';
import assert from 'node:assert';

import { shouldEnterInteractive } from '../../bin/create-scaffold/modules/utils/interactive-utils.mjs';

test('Interactive Utils', async (t) => {
  await t.test('shouldEnterInteractive returns false for help flag', () => {
    const result = shouldEnterInteractive({
      args: { help: true },
      env: {},
      tty: { stdin: true, stdout: true }
    });

    assert.equal(result.enter, false, 'Should not enter interactive mode with help flag');
    assert.equal(result.reason, 'special_mode', 'Should have correct reason');
  });

  await t.test('shouldEnterInteractive returns false for listTemplates flag', () => {
    const result = shouldEnterInteractive({
      args: { listTemplates: true },
      env: {},
      tty: { stdin: true, stdout: true }
    });

    assert.equal(result.enter, false, 'Should not enter interactive mode with listTemplates flag');
    assert.equal(result.reason, 'special_mode', 'Should have correct reason');
  });

  await t.test('shouldEnterInteractive returns false for dryRun flag', () => {
    const result = shouldEnterInteractive({
      args: { dryRun: true },
      env: {},
      tty: { stdin: true, stdout: true }
    });

    assert.equal(result.enter, false, 'Should not enter interactive mode with dryRun flag');
    assert.equal(result.reason, 'special_mode', 'Should have correct reason');
  });

  await t.test('shouldEnterInteractive returns true when interactive flag is true', () => {
    const result = shouldEnterInteractive({
      args: { interactive: true },
      env: {},
      tty: { stdin: true, stdout: true }
    });

    assert.equal(result.enter, true, 'Should enter interactive mode when flag is true');
    assert.equal(result.reason, 'flag_force_on', 'Should have correct reason');
  });

  await t.test('shouldEnterInteractive returns false when interactive flag is false', () => {
    const result = shouldEnterInteractive({
      args: { interactive: false },
      env: {},
      tty: { stdin: true, stdout: true }
    });

    assert.equal(result.enter, false, 'Should not enter interactive mode when flag is false');
    assert.equal(result.reason, 'flag_force_off', 'Should have correct reason');
  });

  await t.test('shouldEnterInteractive returns false for noInteractive flag', () => {
    const result = shouldEnterInteractive({
      args: { noInteractive: true },
      env: {},
      tty: { stdin: true, stdout: true }
    });

    assert.equal(result.enter, false, 'Should not enter interactive mode with noInteractive flag');
    assert.equal(result.reason, 'flag_force_off', 'Should have correct reason');
  });

  await t.test('shouldEnterInteractive returns true for CREATE_SCAFFOLD_FORCE_INTERACTIVE env var', () => {
    const result = shouldEnterInteractive({
      args: {},
      env: { CREATE_SCAFFOLD_FORCE_INTERACTIVE: 'true' },
      tty: { stdin: true, stdout: true }
    });

    assert.equal(result.enter, true, 'Should enter interactive mode with env var');
    assert.equal(result.reason, 'env_force_on', 'Should have correct reason');
  });

  await t.test('shouldEnterInteractive returns false for CREATE_SCAFFOLD_NO_INTERACTIVE env var', () => {
    const result = shouldEnterInteractive({
      args: {},
      env: { CREATE_SCAFFOLD_NO_INTERACTIVE: '1' },
      tty: { stdin: true, stdout: true }
    });

    assert.equal(result.enter, false, 'Should not enter interactive mode with env var');
    assert.equal(result.reason, 'env_force_off', 'Should have correct reason');
  });

  await t.test('shouldEnterInteractive returns false for non-TTY', () => {
    const result = shouldEnterInteractive({
      args: {},
      env: {},
      tty: { stdin: false, stdout: true }
    });

    assert.equal(result.enter, false, 'Should not enter interactive mode without TTY');
    assert.equal(result.reason, 'non_tty', 'Should have correct reason');
  });

  await t.test('shouldEnterInteractive returns true when missing both projectDirectory and template', () => {
    const result = shouldEnterInteractive({
      args: {},
      env: {},
      tty: { stdin: true, stdout: true }
    });

    assert.equal(result.enter, true, 'Should enter interactive mode when missing inputs');
    assert.equal(result.reason, 'auto_missing_inputs', 'Should have correct reason');
  });

  await t.test('shouldEnterInteractive returns false by default when inputs provided', () => {
    const result = shouldEnterInteractive({
      args: { projectDirectory: 'test', template: 'template' },
      env: {},
      tty: { stdin: true, stdout: true }
    });

    assert.equal(result.enter, false, 'Should not enter interactive mode with inputs provided');
    assert.equal(result.reason, 'default_skip', 'Should have correct reason');
  });
});
