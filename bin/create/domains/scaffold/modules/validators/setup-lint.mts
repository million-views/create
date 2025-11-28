#!/usr/bin/env node
// @ts-nocheck

import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import * as sanitize from '@m5nv/create/lib/security/sanitize.mts';

const NAME = 'setupScript';
const SETUP_FILENAME = '_setup.mjs';
const STATIC_IMPORT_PATTERN = /(^|\s)import\s+[^('"`]/m;
const DYNAMIC_IMPORT_PATTERN = /\bimport\s*\(/;
const REQUIRE_PATTERN = /\brequire\s*\(/;
const FUNCTION_CTOR_PATTERN = /\bFunction\s*\(/;
const EVAL_PATTERN = /\beval\s*\(/;

const execFileAsync = promisify(execFile);

export async function validateSetupScript({ targetPath }) {
  const setupPath = path.join(targetPath, SETUP_FILENAME);
  let stats;
  try {
    stats = await fs.stat(setupPath);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return createResult('warn', ['Optional setup script not found. Add _setup.mjs if personalization is required.']);
    }
    const message = sanitize.error(error?.message ?? String(error));
    return createResult('fail', [`Unable to inspect _setup.mjs: ${message}`]);
  }

  if (!stats.isFile()) {
    return createResult('fail', ['_setup.mjs exists but is not a file. Ensure it points to a valid script.']);
  }

  let source;
  try {
    source = await fs.readFile(setupPath, 'utf8');
  } catch (error) {
    const message = sanitize.error(error?.message ?? String(error));
    return createResult('fail', [`Unable to read _setup.mjs: ${message}`]);
  }

  const trimmed = source.trim();
  const warnings = [];
  const errors = [];

  if (trimmed.length === 0) {
    warnings.push('Setup script is empty. Remove the file or implement template personalization.');
  }

  if (!/export\s+default\s+/m.test(source)) {
    errors.push('Setup script must export a default async function.');
  } else if (!/export\s+default\s+async\b/m.test(source)) {
    errors.push('Setup script default export must be declared async.');
  }

  if (STATIC_IMPORT_PATTERN.test(source) || DYNAMIC_IMPORT_PATTERN.test(source)) {
    errors.push('Setup script uses import statements. Use provided tools instead of importing modules.');
  }

  if (REQUIRE_PATTERN.test(source)) {
    errors.push('Setup script references require(). Use provided tools instead of requiring modules.');
  }

  if (FUNCTION_CTOR_PATTERN.test(source)) {
    errors.push('Setup script uses Function constructor. This is forbidden in sandboxed execution.');
  }

  if (EVAL_PATTERN.test(source)) {
    errors.push('Setup script uses eval(). This is forbidden in sandboxed execution.');
  }

  try {
    await execFileAsync(process.execPath, ['--check', setupPath], {
      env: {
        ...process.env,
        NODE_NO_WARNINGS: '1'
      }
    });
  } catch (error) {
    const raw = typeof error?.stderr === 'string'
      ? error.stderr
      : error?.stderr?.toString?.('utf8');
    const sanitized = sanitize.error(raw?.trim() || error?.message || String(error));
    errors.push(`Setup script contains syntax errors: ${sanitized}`);
  }

  if (errors.length > 0) {
    return createResult('fail', errors);
  }

  if (warnings.length > 0) {
    return createResult('warn', warnings);
  }

  return createResult('pass');
}

function createResult(status, issues = []) {
  return {
    name: NAME,
    status,
    issues
  };
}
