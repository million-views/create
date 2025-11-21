#!/usr/bin/env node

/**
 * Unit and integration tests for make-template init command
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { readFile, writeFile, rm, mkdir, access, constants } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { tmpdir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test timeout for CLI operations
const TEST_TIMEOUT = 30000;

// Helper function to execute CLI commands
function execCLI(args, options = {}) {
  const command = `node ${join(__dirname, '../../bin/make-template/index.mjs')} ${args.join(' ')}`;
  try {
    const result = execSync(command, {
      encoding: 'utf8',
      timeout: TEST_TIMEOUT,
      cwd: options.cwd || __dirname,
      env: { ...process.env, ...options.env },
      stdio: options.stdio || 'pipe'
    });
    return {
      exitCode: 0,
      stdout: result,
      stderr: ''
    };
  } catch (error) {
    return {
      exitCode: error.status || 1,
      stdout: error.stdout || '',
      stderr: error.stderr || ''
    };
  }
}

// Test fixtures
// const expectedSkeletonKeys = [
//   'schemaVersion',
//   'id',
//   'name',
//   'description',
//   'tags',
//   'author',
//   'license',
//   'constants',
//   'dimensions',
//   'placeholders',
//   'features',
//   'gates',
//   'hints'
// ];

test('make-template init command', async (t) => {
  const baseTestDir = join(tmpdir(), `make-template-init-test-${Date.now()}`);
  await mkdir(baseTestDir, { recursive: true });

  await t.test('init generates valid skeleton template.json', async () => {
    const testDir = join(baseTestDir, 'test1');
    await mkdir(testDir, { recursive: true });

    const result = execCLI(['init'], { cwd: testDir });

    assert.strictEqual(result.exitCode, 0, 'Command should succeed');
    assert(result.stdout.includes('Generating skeleton template.json'), 'Should show generation message');
    assert(result.stdout.includes('Skeleton template.json generated successfully'), 'Should show success message');

    // Verify file was created
    const templatePath = join(testDir, 'template.json');
    await access(templatePath, constants.F_OK);

    // Verify content is valid JSON
    const content = await readFile(templatePath, 'utf8');
    const template = JSON.parse(content);

    // Verify required keys exist
    const requiredKeys = ['schemaVersion', 'id', 'name', 'description', 'placeholders'];
    for (const key of requiredKeys) {
      assert(template.hasOwnProperty(key), `Template should have ${key} property`);
    }

    // Verify schema version
    assert.strictEqual(template.schemaVersion, '1.0.0', 'Should use correct schema version');

    // Verify id format
    assert.strictEqual(template.id, 'my-org/my-template', 'Should have default id');

    // Verify placeholders structure
    assert(template.placeholders, 'Should have placeholders section');
    assert(template.placeholders.PACKAGE_NAME, 'Should have PACKAGE_NAME placeholder');
    assert.strictEqual(template.placeholders.PACKAGE_NAME.default, 'my-awesome-project', 'Should have correct default');
    assert.strictEqual(template.placeholders.PACKAGE_NAME.description, 'Package name (used in package.json)', 'Should have correct description');
  });

  await t.test('init with custom filename works', async () => {
    const testDir = join(baseTestDir, 'test2');
    const customFile = 'my-template.json';
    await mkdir(testDir, { recursive: true });

    const result = execCLI(['init', '--file', customFile], { cwd: testDir });

    assert.strictEqual(result.exitCode, 0, 'Command should succeed');
    assert(result.stdout.includes(`Generating skeleton template.json at ${customFile}`), 'Should show custom filename');

    // Verify custom file was created
    const templatePath = join(testDir, customFile);
    await access(templatePath, constants.F_OK);

    const content = await readFile(templatePath, 'utf8');
    const template = JSON.parse(content);
    assert.strictEqual(template.schemaVersion, '1.0.0', 'Custom file should have correct schema');
  });

  await t.test('init fails when file already exists', async () => {
    const testDir = join(baseTestDir, 'test3');
    const templatePath = join(testDir, 'template.json');
    await mkdir(testDir, { recursive: true });

    // Create existing file
    await writeFile(templatePath, '{"existing": "content"}');

    const result = execCLI(['init'], { cwd: testDir });

    assert.strictEqual(result.exitCode, 1, 'Command should fail');
    assert(result.stderr.includes('already exists. Cannot proceed with template initialization.'), 'Should show file exists error');

    // Verify existing file wasn't overwritten
    const content = await readFile(templatePath, 'utf8');
    assert.strictEqual(content, '{"existing": "content"}', 'Existing file should not be overwritten');
  });

  await t.test('init --help shows help text', async () => {
    const testDir = join(baseTestDir, 'test4');
    await mkdir(testDir, { recursive: true });

    const result = execCLI(['init', '--help'], { cwd: testDir });

    assert.strictEqual(result.exitCode, 0, 'Help command should succeed');
    assert(result.stdout.includes('Initialize template configuration files'), 'Should show command description');
    assert(result.stdout.includes('USAGE:'), 'Should show usage section');
    assert(result.stdout.includes('init [project-path] [options]'), 'Should show usage example with optional path');
  });

  await t.test('init provides next steps guidance', async () => {
    const testDir = join(baseTestDir, 'test5');
    await mkdir(testDir, { recursive: true });

    const result = execCLI(['init'], { cwd: testDir });

    assert(result.stdout.includes('Next steps'), 'Should show next steps');
    assert(result.stdout.includes('Edit template.json'), 'Should show editing step');
    assert(result.stdout.includes('make-template validate'), 'Should mention validation');
  });

  // Cleanup - more robust
  try {
    await rm(baseTestDir, { recursive: true, force: true });
  } catch (_error) {
    // Ignore cleanup errors in tests
  }
});
