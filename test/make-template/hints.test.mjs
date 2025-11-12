#!/usr/bin/env node

/**
 * Unit and integration tests for make-template hints command
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { tmpdir } from 'os';
import { mkdir } from 'node:fs/promises';

const __filename = new URL(import.meta.url).pathname;
const __dirname = new URL('.', import.meta.url).pathname;

// Test timeout for CLI operations
const TEST_TIMEOUT = 30000;

// Helper function to execute CLI commands
function execCLI(args, options = {}) {
  const command = `node ${join(__dirname, '../../bin/make-template/index.mjs')} ${args.join(' ')}`;
  try {
    const result = execSync(command, {
      encoding: 'utf8',
      timeout: TEST_TIMEOUT,
      cwd: options.cwd || process.cwd(),
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

test('make-template hints command', async (t) => {
  const testDir = join(tmpdir(), `make-template-hints-test-${Date.now()}`);
  await mkdir(testDir, { recursive: true });

  await t.test('hints displays catalog header', async () => {
    const result = execCLI(['hints'], { cwd: testDir });

    assert.strictEqual(result.exitCode, 0, 'Command should succeed');
    assert(result.stdout.includes('Available Hints Catalog for Template Authoring'), 'Should show catalog header');
    assert(result.stdout.includes('Feature Hints:'), 'Should show feature hints section');
  });

  await t.test('hints shows comprehensive feature list', async () => {
    const result = execCLI(['hints'], { cwd: testDir });

    // Check for key features that should be present
    const expectedFeatures = [
      'auth',
      'database',
      'api',
      'ui',
      'storage',
      'payments',
      'analytics',
      'email',
      'admin',
      'testing',
      'ci-cd',
      'monitoring',
      'security',
      'docs',
      'i18n'
    ];

    for (const feature of expectedFeatures) {
      assert(result.stdout.includes(feature), `Should include ${feature} feature hint`);
    }
  });

  await t.test('hints provides usage guidance', async () => {
    const result = execCLI(['hints'], { cwd: testDir });

    assert(result.stdout.includes('Use them in your template.json under hints.features'), 'Should show usage guidance');
    assert(result.stdout.includes('to help users understand'), 'Should explain purpose');
  });

  await t.test('hints --help shows help text', async () => {
    const result = execCLI(['hints', '--help'], { cwd: testDir });

    assert.strictEqual(result.exitCode, 0, 'Help command should succeed');
    assert(result.stdout.includes('make-template hints - Display available hints catalog'), 'Should show command description');
    assert(result.stdout.includes('Display the complete hints catalog'), 'Should show usage example');
  });

  await t.test('hints shows template authoring context', async () => {
    const result = execCLI(['hints'], { cwd: testDir });

    assert(result.stdout.includes('Available Hints Catalog for Template Authoring'), 'Should show template authoring title');
    assert(result.stdout.includes('Use them in your template.json'), 'Should show template.json usage');
  });

  await t.test('hints output is well-formatted', async () => {
    const result = execCLI(['hints'], { cwd: testDir });

    // Check for proper formatting elements
    assert(result.stdout.includes('💡'), 'Should include emoji for visual appeal');
    assert(result.stdout.includes('📋'), 'Should include section markers');
    assert(result.stdout.includes('================================================'), 'Should have separator line');
  });
});
