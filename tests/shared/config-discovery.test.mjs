#!/usr/bin/env node

/**
 * Tests for config discovery behavior
 *
 * CRITICAL SECURITY REQUIREMENT:
 * Config loader must NOT walk up the directory tree.
 * It should only check:
 * 1. Current working directory (cwd)
 * 2. User config directory (home)
 *
 * This prevents:
 * - Unintended config inheritance from parent directories
 * - Security issues where malicious configs in parent dirs are loaded
 * - Confusion about which config is actually being used
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'os';
import { loadConfig } from '../../bin/create-scaffold/modules/config-loader.mjs';

test('Config discovery does NOT walk up directory tree', async (t) => {
  const baseDir = join(tmpdir(), `config-discovery-test-${Date.now()}`);

  await t.test('does not load config from parent directory', async () => {
    // Setup: parent/.m5nvrc and parent/child/
    const parentDir = join(baseDir, 'parent');
    const childDir = join(parentDir, 'child');
    await mkdir(childDir, { recursive: true });

    // Create config in parent
    const parentConfig = { repo: 'https://github.com/parent/repo.git' };
    await writeFile(join(parentDir, '.m5nvrc'), JSON.stringify(parentConfig));

    // Load config from child (should NOT find parent config)
    const result = await loadConfig({ cwd: childDir });

    assert.strictEqual(result, null, 'Should not load config from parent directory');

    await rm(baseDir, { recursive: true, force: true });
  });

  await t.test('does not load config from grandparent directory', async () => {
    // Setup: grandparent/.m5nvrc and grandparent/parent/child/
    const grandparentDir = join(baseDir, 'grandparent');
    const parentDir = join(grandparentDir, 'parent');
    const childDir = join(parentDir, 'child');
    await mkdir(childDir, { recursive: true });

    // Create config in grandparent
    const grandparentConfig = { repo: 'https://github.com/grandparent/repo.git' };
    await writeFile(join(grandparentDir, '.m5nvrc'), JSON.stringify(grandparentConfig));

    // Load config from child (should NOT find grandparent config)
    const result = await loadConfig({ cwd: childDir });

    assert.strictEqual(result, null, 'Should not load config from grandparent directory');

    await rm(baseDir, { recursive: true, force: true });
  });

  await t.test('loads config ONLY from current directory', async () => {
    // Setup: parent/.m5nvrc and child/.m5nvrc
    const parentDir = join(baseDir, 'parent-only');
    const childDir = join(parentDir, 'child');
    await mkdir(childDir, { recursive: true });

    // Create different configs in parent and child
    const parentConfig = { repo: 'https://github.com/parent/repo.git' };
    const childConfig = { repo: 'https://github.com/child/repo.git' };
    await writeFile(join(parentDir, '.m5nvrc'), JSON.stringify(parentConfig));
    await writeFile(join(childDir, '.m5nvrc'), JSON.stringify(childConfig));

    // Load config from child (should load child config, NOT parent)
    const result = await loadConfig({ cwd: childDir });

    assert.notStrictEqual(result, null);
    assert.strictEqual(result.defaults.repo, 'https://github.com/child/repo.git');

    await rm(baseDir, { recursive: true, force: true });
  });

  await t.test('only checks cwd then user config (no intermediate paths)', async () => {
    // Setup: deep/nested/dir/structure/
    const deepDir = join(baseDir, 'deep', 'nested', 'dir', 'structure');
    await mkdir(deepDir, { recursive: true });

    // Create a fake M5NV_HOME that has no user config
    const fakeM5nvHome = join(baseDir, 'fake-m5nv-home');
    await mkdir(fakeM5nvHome, { recursive: true });

    // Create configs in various levels
    await writeFile(join(baseDir, 'deep', '.m5nvrc'), JSON.stringify({ level: 'deep' }));
    await writeFile(join(baseDir, 'deep', 'nested', '.m5nvrc'), JSON.stringify({ level: 'nested' }));
    await writeFile(join(baseDir, 'deep', 'nested', 'dir', '.m5nvrc'), JSON.stringify({ level: 'dir' }));

    // Load config from deepest directory with isolated M5NV_HOME
    // This ensures we don't accidentally pick up user config from other tests
    const result = await loadConfig({ cwd: deepDir, env: { M5NV_HOME: fakeM5nvHome } });

    assert.strictEqual(result, null, 'Should not load config from any parent directories');

    await rm(baseDir, { recursive: true, force: true });
  });
});

test('Config discovery search order', async (t) => {
  const baseDir = join(tmpdir(), `config-order-test-${Date.now()}`);

  await t.test('checks cwd/.m5nvrc first', async () => {
    const testDir = join(baseDir, 'cwd-first');
    await mkdir(testDir, { recursive: true });

    // Create config in cwd using a known property
    const cwdConfig = { repo: 'https://github.com/cwd/test.git' };
    await writeFile(join(testDir, '.m5nvrc'), JSON.stringify(cwdConfig));

    const result = await loadConfig({ cwd: testDir });

    assert.notStrictEqual(result, null);
    assert.strictEqual(result.defaults.repo, 'https://github.com/cwd/test.git');
    assert.strictEqual(result.path, join(testDir, '.m5nvrc'));

    await rm(baseDir, { recursive: true, force: true });
  });

  await t.test('falls back to user config when cwd config missing', async () => {
    const testDir = join(baseDir, 'user-fallback');
    const tempHome = join(baseDir, 'temp-home');
    const userConfigDir = join(tempHome, '.m5nv');
    const userConfigPath = join(userConfigDir, 'rc.json');

    await mkdir(testDir, { recursive: true });
    await mkdir(userConfigDir, { recursive: true });

    // Create user config using a known property
    const userConfig = { repo: 'https://github.com/user/test.git' };
    await writeFile(userConfigPath, JSON.stringify(userConfig));

    // Load config with custom M5NV_HOME
    const result = await loadConfig({
      cwd: testDir,
      env: { M5NV_HOME: join(tempHome, '.m5nv') }
    });

    assert.notStrictEqual(result, null);
    assert.strictEqual(result.defaults.repo, 'https://github.com/user/test.git');

    await rm(baseDir, { recursive: true, force: true });
  });
});

test('Config discovery documentation', async (t) => {
  await t.test('documented behavior: cwd then user config only', () => {
    // This test serves as executable documentation
    // Config loader should check in this exact order:
    const searchOrder = [
      '1. cwd/.m5nvrc (current working directory)',
      '2. ~/.m5nv/rc.json or $M5NV_HOME/rc.json (user config)'
    ];

    // It should NOT check:
    const notChecked = [
      '❌ ../m5nvrc (parent directory)',
      '❌ ../../.m5nvrc (grandparent directory)',
      '❌ Any intermediate directories between cwd and home'
    ];

    assert.strictEqual(searchOrder.length, 2, 'Should only check 2 locations');
    assert.strictEqual(notChecked.length, 3, 'Should document what is NOT checked');
  });
});
