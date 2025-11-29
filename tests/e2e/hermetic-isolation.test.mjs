#!/usr/bin/env node

/**
 * E2E Tests: Hermetic Isolation Validation
 * Tests that M5NV_HOME environment variable provides complete isolation
 * and that tests don't pollute the user's environment
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { join } from 'node:path';
import { readdir, access, constants } from 'node:fs/promises';
import { homedir } from 'node:os';
import {
  createTestEnvironment,
  execCLI,
  createTestProject,
  verifyIsolation
} from './test-helpers.mjs';

const LONG_TIMEOUT = 120000;

test('M5NV_HOME isolation - create template uses isolated environment', async (t) => {
  const testEnv = await createTestEnvironment('isolation-template');

  t.after(async () => {
    await testEnv.cleanup();
  });

  const projectDir = join(testEnv.workspaceDir, 'test-project');
  await createTestProject(projectDir, {
    'package.json': JSON.stringify({ name: 'test-project', version: '1.0.0' }, null, 2)
  });

  // Run create template init
  const initResult = execCLI('template', ['init'], {
    env: testEnv.env,
    cwd: projectDir
  });

  assert.strictEqual(initResult.exitCode, 0, 'Init should succeed');

  // Verify isolation
  await verifyIsolation(testEnv);

  // Verify no pollution of user's home directory
  const userHome = homedir();
  const userM5nv = join(userHome, '.m5nv');

  try {
    await access(userM5nv, constants.F_OK);
    // If .m5nv exists in user home, verify our test ID isn't there
    const cacheDir = join(userM5nv, 'cache');
    try {
      const cacheContents = await readdir(cacheDir);
      const hasTestData = cacheContents.some(name => name.includes(testEnv.testId));
      assert.strictEqual(hasTestData, false, 'Test data should not leak to user cache');
    } catch (err) {
      // Cache dir doesn't exist - that's fine
      if (err.code !== 'ENOENT') throw err;
    }
  } catch (err) {
    // User .m5nv doesn't exist - perfect isolation
    if (err.code !== 'ENOENT') throw err;
  }
}, { timeout: LONG_TIMEOUT });

test('M5NV_HOME isolation - create scaffold uses isolated environment', async (t) => {
  const testEnv = await createTestEnvironment('isolation-scaffold');

  t.after(async () => {
    await testEnv.cleanup();
  });

  const templateDir = join(testEnv.workspaceDir, 'template');
  await createTestProject(templateDir, {
    'package.json': JSON.stringify({ name: '⦃PACKAGE_NAME⦄' }, null, 2),
    'template.json': JSON.stringify({
      schemaVersion: '1.0.0',
      id: 'test/test-template',
      name: 'test-template',
      description: 'Test template for hermetic isolation',
      placeholders: { PACKAGE_NAME: { description: 'Package name', required: false, default: 'my-app' } }
    }, null, 2)
  });

  // Run create scaffold with --help to test environment loading
  const helpResult = execCLI('scaffold', ['--help'], {
    env: testEnv.env,
    cwd: testEnv.workspaceDir
  });

  assert.strictEqual(helpResult.exitCode, 0, 'Help should succeed');

  // Verify isolation
  await verifyIsolation(testEnv);
}, { timeout: LONG_TIMEOUT });

test('Multiple test environments are isolated from each other', async (t) => {
  const testEnv1 = await createTestEnvironment('multi-env-1');
  const testEnv2 = await createTestEnvironment('multi-env-2');

  t.after(async () => {
    await testEnv1.cleanup();
    await testEnv2.cleanup();
  });

  // Verify different base directories
  assert.notStrictEqual(testEnv1.baseDir, testEnv2.baseDir, 'Base dirs should be different');
  assert.notStrictEqual(testEnv1.m5nvHome, testEnv2.m5nvHome, 'M5NV_HOME should be different');

  // Run operations in both environments
  const proj1Dir = join(testEnv1.workspaceDir, 'project1');
  await createTestProject(proj1Dir, {
    'package.json': JSON.stringify({ name: 'project1' }, null, 2)
  });

  const proj2Dir = join(testEnv2.workspaceDir, 'project2');
  await createTestProject(proj2Dir, {
    'package.json': JSON.stringify({ name: 'project2' }, null, 2)
  });

  const init1 = execCLI('template', ['init'], {
    env: testEnv1.env,
    cwd: proj1Dir
  });

  const init2 = execCLI('template', ['init'], {
    env: testEnv2.env,
    cwd: proj2Dir
  });

  assert.strictEqual(init1.exitCode, 0, 'Init in env1 should succeed');
  assert.strictEqual(init2.exitCode, 0, 'Init in env2 should succeed');

  // Verify both environments are isolated
  await verifyIsolation(testEnv1);
  await verifyIsolation(testEnv2);
}, { timeout: LONG_TIMEOUT });

test('Test artifacts are confined to tmp/ directory', async (t) => {
  const testEnv = await createTestEnvironment('tmp-confinement');

  t.after(async () => {
    await testEnv.cleanup();
  });

  // Verify all test artifacts are under project tmp/
  const projectRoot = process.cwd();
  const tmpDir = join(projectRoot, 'tmp');

  assert(testEnv.baseDir.startsWith(tmpDir), 'Test environment should be in project tmp/');
  assert(testEnv.m5nvHome.startsWith(tmpDir), 'M5NV_HOME should be in project tmp/');
  assert(testEnv.workspaceDir.startsWith(tmpDir), 'Workspace should be in project tmp/');

  // Verify NOT in system /tmp
  const { tmpdir } = await import('node:os');
  const systemTmp = tmpdir();
  assert(!testEnv.baseDir.startsWith(systemTmp), 'Should NOT use system /tmp');
}, { timeout: LONG_TIMEOUT });

test('Cleanup removes all test artifacts', async () => {
  const testEnv = await createTestEnvironment('cleanup-test');
  const baseDirPath = testEnv.baseDir;

  // Create some files
  const projectDir = join(testEnv.workspaceDir, 'test-project');
  await createTestProject(projectDir, {
    'package.json': JSON.stringify({ name: 'test' }, null, 2),
    'file1.txt': 'content',
    'dir/file2.txt': 'more content'
  });

  // Verify files exist
  await access(baseDirPath, constants.F_OK);
  await access(projectDir, constants.F_OK);

  // Cleanup
  await testEnv.cleanup();

  // Verify everything is removed
  try {
    await access(baseDirPath, constants.F_OK);
    assert.fail('Base directory should be removed');
  } catch (err) {
    assert.strictEqual(err.code, 'ENOENT', 'Base directory should not exist after cleanup');
  }
}, { timeout: LONG_TIMEOUT });
