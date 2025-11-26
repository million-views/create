#!/usr/bin/env node

/**
 * L1 Tests for path resolution utilities
 *
 * These are L1 (Low-Level Wrappers) tests - they test thin wrappers around
 * Node.js os and path APIs. Per testing.md, L1 tests MAY use L0 (raw Node.js
 * APIs) for test setup/teardown/verification.
 *
 * The SUT (resolveHomeDirectory, etc.) calls os.homedir() internally,
 * so we need os.homedir() to verify fallback behavior.
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { join } from 'node:path';
import { homedir } from 'node:os';
import {
  resolveHomeDirectory,
  resolveM5nvBase,
  resolveCacheDirectory,
  resolveTemplateCacheDirectory,
  resolveUserConfigPath
} from '@m5nv/create-scaffold/lib/util/path.mts';

test('resolveHomeDirectory', async (t) => {
  await t.test('returns HOME from environment', () => {
    const env = { HOME: '/custom/home' };
    assert.strictEqual(resolveHomeDirectory(env), '/custom/home');
  });

  await t.test('returns USERPROFILE on Windows', () => {
    const env = { USERPROFILE: 'C:\\Users\\TestUser' };
    assert.strictEqual(resolveHomeDirectory(env), 'C:\\Users\\TestUser');
  });

  await t.test('prioritizes HOME over USERPROFILE', () => {
    const env = { HOME: '/home/user', USERPROFILE: 'C:\\Users\\TestUser' };
    assert.strictEqual(resolveHomeDirectory(env), '/home/user');
  });

  await t.test('falls back to homedir()', () => {
    const env = {};
    assert.strictEqual(resolveHomeDirectory(env), homedir());
  });
});

test('resolveM5nvBase', async (t) => {
  await t.test('returns M5NV_HOME when set', () => {
    const env = { M5NV_HOME: '/custom/m5nv' };
    assert.strictEqual(resolveM5nvBase(env), '/custom/m5nv');
  });

  await t.test('returns ~/.m5nv when M5NV_HOME not set', () => {
    const env = { HOME: '/home/testuser' };
    assert.strictEqual(resolveM5nvBase(env), '/home/testuser/.m5nv');
  });

  await t.test('prioritizes M5NV_HOME over HOME', () => {
    const env = { M5NV_HOME: '/opt/m5nv', HOME: '/home/user' };
    assert.strictEqual(resolveM5nvBase(env), '/opt/m5nv');
  });

  await t.test('uses default home directory when no env vars set', () => {
    const env = {};
    const expected = join(homedir(), '.m5nv');
    assert.strictEqual(resolveM5nvBase(env), expected);
  });
});

test('resolveCacheDirectory', async (t) => {
  await t.test('returns M5NV_HOME/cache when M5NV_HOME set', () => {
    const env = { M5NV_HOME: '/custom/m5nv' };
    assert.strictEqual(resolveCacheDirectory(env), '/custom/m5nv/cache');
  });

  await t.test('returns ~/.m5nv/cache when M5NV_HOME not set', () => {
    const env = { HOME: '/home/testuser' };
    assert.strictEqual(resolveCacheDirectory(env), '/home/testuser/.m5nv/cache');
  });
});

test('resolveTemplateCacheDirectory', async (t) => {
  await t.test('returns M5NV_HOME/cache/templates when M5NV_HOME set', () => {
    const env = { M5NV_HOME: '/custom/m5nv' };
    assert.strictEqual(resolveTemplateCacheDirectory(env), '/custom/m5nv/cache/templates');
  });

  await t.test('returns ~/.m5nv/cache/templates when M5NV_HOME not set', () => {
    const env = { HOME: '/home/testuser' };
    assert.strictEqual(resolveTemplateCacheDirectory(env), '/home/testuser/.m5nv/cache/templates');
  });
});

test('resolveUserConfigPath', async (t) => {
  await t.test('returns M5NV_HOME/rc.json when M5NV_HOME set', () => {
    const env = { M5NV_HOME: '/custom/m5nv' };
    assert.strictEqual(resolveUserConfigPath(env), '/custom/m5nv/rc.json');
  });

  await t.test('returns ~/.m5nv/rc.json when M5NV_HOME not set', () => {
    const env = { HOME: '/home/testuser' };
    assert.strictEqual(resolveUserConfigPath(env), '/home/testuser/.m5nv/rc.json');
  });
});

test('M5NV_HOME integration', async (t) => {
  await t.test('all paths consistently use M5NV_HOME', () => {
    const env = { M5NV_HOME: '/test/m5nv' };

    assert.strictEqual(resolveM5nvBase(env), '/test/m5nv');
    assert.strictEqual(resolveCacheDirectory(env), '/test/m5nv/cache');
    assert.strictEqual(resolveTemplateCacheDirectory(env), '/test/m5nv/cache/templates');
    assert.strictEqual(resolveUserConfigPath(env), '/test/m5nv/rc.json');
  });

  await t.test('all paths consistently use default ~/.m5nv', () => {
    const env = { HOME: '/home/testuser' };

    assert.strictEqual(resolveM5nvBase(env), '/home/testuser/.m5nv');
    assert.strictEqual(resolveCacheDirectory(env), '/home/testuser/.m5nv/cache');
    assert.strictEqual(resolveTemplateCacheDirectory(env), '/home/testuser/.m5nv/cache/templates');
    assert.strictEqual(resolveUserConfigPath(env), '/home/testuser/.m5nv/rc.json');
  });
});
