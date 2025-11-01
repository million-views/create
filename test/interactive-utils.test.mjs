#!/usr/bin/env node

import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldEnterInteractive } from '../bin/utils/interactiveUtils.mjs';

const BASE_ARGS = {
  projectDirectory: undefined,
  template: undefined,
  listTemplates: false,
  dryRun: false,
  help: false,
  interactive: undefined,
  noInteractive: false
};

const TTY_ENV = { stdin: true, stdout: true };
const NON_TTY_ENV = { stdin: false, stdout: false };

function cloneArgs(overrides = {}) {
  return { ...BASE_ARGS, ...overrides };
}

function cloneEnv(overrides = {}) {
  return { ...process.env, ...overrides };
}

test('shouldEnterInteractive enters when explicitly forced by flag', () => {
  const decision = shouldEnterInteractive({
    args: cloneArgs({ interactive: true }),
    env: cloneEnv(),
    tty: TTY_ENV
  });

  assert.equal(decision.enter, true);
  assert.equal(decision.reason, 'flag_force_on');
});

test('shouldEnterInteractive honors interactive flag without TTY', () => {
  const decision = shouldEnterInteractive({
    args: cloneArgs({ interactive: true }),
    env: cloneEnv(),
    tty: NON_TTY_ENV
  });

  assert.equal(decision.enter, true);
  assert.equal(decision.reason, 'flag_force_on');
});

test('shouldEnterInteractive skips when no-interactive flag provided', () => {
  const decision = shouldEnterInteractive({
    args: cloneArgs({ interactive: false, noInteractive: true }),
    env: cloneEnv(),
    tty: TTY_ENV
  });

  assert.equal(decision.enter, false);
  assert.equal(decision.reason, 'flag_force_off');
});

test('shouldEnterInteractive respects force env variables', () => {
  const enterDecision = shouldEnterInteractive({
    args: cloneArgs(),
    env: cloneEnv({ CREATE_SCAFFOLD_FORCE_INTERACTIVE: '1' }),
    tty: TTY_ENV
  });

  assert.equal(enterDecision.enter, true);
  assert.equal(enterDecision.reason, 'env_force_on');

  const skipDecision = shouldEnterInteractive({
    args: cloneArgs(),
    env: cloneEnv({ CREATE_SCAFFOLD_NO_INTERACTIVE: 'true' }),
    tty: TTY_ENV
  });

  assert.equal(skipDecision.enter, false);
  assert.equal(skipDecision.reason, 'env_force_off');
});

test('shouldEnterInteractive skips when stdin/stdout not TTY', () => {
  const decision = shouldEnterInteractive({
    args: cloneArgs(),
    env: cloneEnv(),
    tty: NON_TTY_ENV
  });

  assert.equal(decision.enter, false);
  assert.equal(decision.reason, 'non_tty');
});

test('shouldEnterInteractive auto-enters when positional/template missing', () => {
  const decision = shouldEnterInteractive({
    args: cloneArgs(),
    env: cloneEnv(),
    tty: TTY_ENV
  });

  assert.equal(decision.enter, true);
  assert.equal(decision.reason, 'auto_missing_inputs');
});

test('shouldEnterInteractive skips in special modes', () => {
  const listDecision = shouldEnterInteractive({
    args: cloneArgs({ listTemplates: true }),
    env: cloneEnv(),
    tty: TTY_ENV
  });

  assert.equal(listDecision.enter, false);
  assert.equal(listDecision.reason, 'special_mode');

  const dryDecision = shouldEnterInteractive({
    args: cloneArgs({ dryRun: true }),
    env: cloneEnv(),
    tty: TTY_ENV
  });

  assert.equal(dryDecision.enter, false);
  assert.equal(dryDecision.reason, 'special_mode');
});
