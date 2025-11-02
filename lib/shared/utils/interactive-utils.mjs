#!/usr/bin/env node

const TRUTHY_VALUES = new Set(['1', 'true', 'yes', 'on', 'y']);

function isTruthy(value) {
  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  if (normalized.length === 0) {
    return false;
  }
  return TRUTHY_VALUES.has(normalized);
}

export function shouldEnterInteractive({ args, env = process.env, tty = {} }) {
  const safeArgs = args || {};
  const environment = env || process.env;
  const ttyState = {
    stdin: Boolean(tty.stdin),
    stdout: Boolean(tty.stdout)
  };

  if (safeArgs.help || safeArgs.listTemplates || safeArgs.dryRun) {
    return { enter: false, reason: 'special_mode' };
  }

  if (typeof safeArgs.interactive === 'boolean') {
    return safeArgs.interactive
      ? { enter: true, reason: 'flag_force_on' }
      : { enter: false, reason: 'flag_force_off' };
  }

  if (safeArgs.noInteractive) {
    return { enter: false, reason: 'flag_force_off' };
  }

  if (isTruthy(environment.CREATE_SCAFFOLD_FORCE_INTERACTIVE)) {
    return { enter: true, reason: 'env_force_on' };
  }

  if (isTruthy(environment.CREATE_SCAFFOLD_NO_INTERACTIVE)) {
    return { enter: false, reason: 'env_force_off' };
  }

  if (!ttyState.stdin || !ttyState.stdout) {
    return { enter: false, reason: 'non_tty' };
  }

  const hasProjectDirectory = Boolean(safeArgs.projectDirectory);
  const hasTemplate = Boolean(safeArgs.template);

  if (!hasProjectDirectory && !hasTemplate) {
    return { enter: true, reason: 'auto_missing_inputs' };
  }

  return { enter: false, reason: 'default_skip' };
}
