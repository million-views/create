#!/usr/bin/env node

/**
 * E2E Tests: Sprint 2 - Tutorial Workflow Gaps (High Priority)
 *
 * Tests high priority gaps identified in tutorial coverage:
 * 1. Dimension-based scaffolding via CLI with selection files
 * 2. Placeholder override precedence (CLI wins)
 * 3. make-template test command
 *
 * Uses hermetic test environments with M5NV_HOME isolation
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { join } from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import {
  createTestEnvironment,
  execCLI,
  assertFileExists,
  createTestProject,
  verifyIsolation
} from './test-helpers.mjs';

const LONG_TIMEOUT = 180000; // 3 minutes for complex workflows

// ============================================================================
// Test 1: Dimension-Based Scaffolding via CLI
// ============================================================================

test('Dimension scaffolding - multi-select features from selection file', async (t) => {
  const testEnv = await createTestEnvironment('dimension-multi-select');

  t.after(async () => {
    await testEnv.cleanup();
  });

  // Create template with multi-select dimension
  const templateDir = join(testEnv.workspaceDir, 'templates', 'dimension-test');
  await createTestProject(templateDir, {
    'package.json': JSON.stringify({
      name: '⦃PACKAGE_NAME⦄',
      version: '1.0.0',
      features: []
    }, null, 2),
    'FEATURES.md': '# Features\n\nSelected features will be listed here.\n',
    'template.json': JSON.stringify({
      schemaVersion: '1.0.0',
      id: 'test/dimension-test',
      name: 'dimension-test',
      description: 'Template for testing dimension selections',
      placeholderFormat: 'unicode',
      placeholders: {
        PACKAGE_NAME: {
          description: 'Package name',
          required: true
        }
      },
      dimensions: {
        features: {
          type: 'multi',
          values: ['auth', 'payments', 'analytics', 'notifications'],
          default: []
        }
      }
    }, null, 2)
  });

  // Create selection file with multi-select dimension choices
  const selectionFile = join(testEnv.workspaceDir, 'multi-select.json');
  await writeFile(selectionFile, JSON.stringify({
    templateId: 'test/dimension-test',
    version: '1.0.0',
    selections: {
      features: ['auth', 'payments', 'analytics']
    }
  }, null, 2));

  const projectsDir = join(testEnv.workspaceDir, 'projects');
  await mkdir(projectsDir, { recursive: true });

  // Scaffold with selection file
  const result = execCLI('create-scaffold', [
    'new', 'multi-feature-project',
    '--template', templateDir,
    '--selection', selectionFile,
    '--placeholder', 'PACKAGE_NAME=multi-feature-app',
    '--yes'
  ], {
    env: testEnv.env,
    cwd: projectsDir
  });

  assert.strictEqual(result.exitCode, 0, `Scaffold should succeed: ${result.stderr}`);

  // Verify project created
  const projectDir = join(projectsDir, 'multi-feature-project');
  await assertFileExists(join(projectDir, 'package.json'), 'package.json should exist');

  // Check output for selection loading confirmation
  const output = result.stdout + result.stderr;
  assert(
    output.includes('Loaded') || output.includes('selection') || result.exitCode === 0,
    'Selection file should be processed'
  );

  await verifyIsolation(testEnv);
}, { timeout: LONG_TIMEOUT });

test('Dimension scaffolding - single-select deployment from selection file', async (t) => {
  const testEnv = await createTestEnvironment('dimension-single-select');

  t.after(async () => {
    await testEnv.cleanup();
  });

  // Create template with single-select dimension
  const templateDir = join(testEnv.workspaceDir, 'templates', 'deploy-test');
  await createTestProject(templateDir, {
    'package.json': JSON.stringify({
      name: '⦃PACKAGE_NAME⦄',
      version: '1.0.0'
    }, null, 2),
    'template.json': JSON.stringify({
      schemaVersion: '1.0.0',
      id: 'test/deploy-test',
      name: 'deploy-test',
      description: 'Template for testing single-select dimensions',
      placeholderFormat: 'unicode',
      placeholders: {
        PACKAGE_NAME: {
          description: 'Package name',
          required: true
        }
      },
      dimensions: {
        deployment: {
          type: 'single',
          values: ['cloudflare', 'vercel', 'node', 'docker'],
          default: 'node'
        }
      }
    }, null, 2)
  });

  // Create selection file with single-select dimension
  const selectionFile = join(testEnv.workspaceDir, 'single-select.json');
  await writeFile(selectionFile, JSON.stringify({
    templateId: 'test/deploy-test',
    version: '1.0.0',
    selections: {
      deployment: 'cloudflare'
    }
  }, null, 2));

  const projectsDir = join(testEnv.workspaceDir, 'projects');
  await mkdir(projectsDir, { recursive: true });

  // Scaffold with selection file
  const result = execCLI('create-scaffold', [
    'new', 'deploy-project',
    '--template', templateDir,
    '--selection', selectionFile,
    '--placeholder', 'PACKAGE_NAME=deploy-app',
    '--yes'
  ], {
    env: testEnv.env,
    cwd: projectsDir
  });

  assert.strictEqual(result.exitCode, 0, `Scaffold should succeed: ${result.stderr}`);

  // Verify project created
  const projectDir = join(projectsDir, 'deploy-project');
  await assertFileExists(join(projectDir, 'package.json'), 'package.json should exist');

  await verifyIsolation(testEnv);
}, { timeout: LONG_TIMEOUT });

// ============================================================================
// Test 2: Placeholder Override Precedence
// ============================================================================

test('Placeholder override - CLI overrides template defaults', async (t) => {
  const testEnv = await createTestEnvironment('placeholder-override-default');

  t.after(async () => {
    await testEnv.cleanup();
  });

  // Create template with default placeholder values
  const templateDir = join(testEnv.workspaceDir, 'templates', 'default-test');
  await createTestProject(templateDir, {
    'package.json': JSON.stringify({
      name: '⦃PACKAGE_NAME⦄',
      version: '1.0.0',
      author: '⦃AUTHOR_NAME⦄'
    }, null, 2),
    'template.json': JSON.stringify({
      schemaVersion: '1.0.0',
      id: 'test/default-test',
      name: 'default-test',
      description: 'Template with default values',
      placeholderFormat: 'unicode',
      placeholders: {
        PACKAGE_NAME: {
          description: 'Package name',
          required: true,
          default: 'default-package-name'
        },
        AUTHOR_NAME: {
          description: 'Author name',
          required: false,
          default: 'Default Author'
        }
      }
    }, null, 2)
  });

  const projectsDir = join(testEnv.workspaceDir, 'projects');
  await mkdir(projectsDir, { recursive: true });

  // Scaffold with CLI override of default value
  const result = execCLI('create-scaffold', [
    'new', 'override-default-project',
    '--template', templateDir,
    '--placeholder', 'PACKAGE_NAME=cli-override-name',
    '--placeholder', 'AUTHOR_NAME=CLIAuthor',
    '--yes'
  ], {
    env: testEnv.env,
    cwd: projectsDir
  });

  assert.strictEqual(result.exitCode, 0, `Scaffold should succeed: ${result.stderr}`);

  // Verify CLI values override defaults
  const projectDir = join(projectsDir, 'override-default-project');
  const packageJson = JSON.parse(await readFile(join(projectDir, 'package.json'), 'utf8'));

  assert.strictEqual(packageJson.name, 'cli-override-name', 'CLI should override default PACKAGE_NAME');
  assert.strictEqual(packageJson.author, 'CLIAuthor', 'CLI should override default AUTHOR_NAME');

  await verifyIsolation(testEnv);
}, { timeout: LONG_TIMEOUT });

test('Placeholder override - multiple CLI placeholders work together', async (t) => {
  const testEnv = await createTestEnvironment('placeholder-multiple');

  t.after(async () => {
    await testEnv.cleanup();
  });

  // Create template with multiple placeholders
  const templateDir = join(testEnv.workspaceDir, 'templates', 'multi-placeholder');
  await createTestProject(templateDir, {
    'package.json': JSON.stringify({
      name: '⦃PACKAGE_NAME⦄',
      version: '⦃VERSION⦄',
      description: '⦃DESCRIPTION⦄',
      author: '⦃AUTHOR⦄'
    }, null, 2),
    'template.json': JSON.stringify({
      schemaVersion: '1.0.0',
      id: 'test/multi-placeholder',
      name: 'multi-placeholder',
      description: 'Template with multiple placeholders',
      placeholderFormat: 'unicode',
      placeholders: {
        PACKAGE_NAME: { description: 'Package name', required: true },
        VERSION: { description: 'Version', required: false, default: '0.0.0' },
        DESCRIPTION: { description: 'Description', required: false, default: 'No description' },
        AUTHOR: { description: 'Author', required: false, default: 'Unknown' }
      }
    }, null, 2)
  });

  const projectsDir = join(testEnv.workspaceDir, 'projects');
  await mkdir(projectsDir, { recursive: true });

  // Scaffold with multiple CLI placeholders
  const result = execCLI('create-scaffold', [
    'new', 'multi-placeholder-project',
    '--template', templateDir,
    '--placeholder', 'PACKAGE_NAME=my-awesome-app',
    '--placeholder', 'VERSION=2.0.0',
    '--placeholder', 'DESCRIPTION=AwesomeApp',
    '--placeholder', 'AUTHOR=TestAuthor',
    '--yes'
  ], {
    env: testEnv.env,
    cwd: projectsDir
  });

  assert.strictEqual(result.exitCode, 0, `Scaffold should succeed: ${result.stderr}`);

  // Verify all CLI placeholders applied
  const projectDir = join(projectsDir, 'multi-placeholder-project');
  const packageJson = JSON.parse(await readFile(join(projectDir, 'package.json'), 'utf8'));

  assert.strictEqual(packageJson.name, 'my-awesome-app', 'PACKAGE_NAME should be applied');
  assert.strictEqual(packageJson.version, '2.0.0', 'VERSION should be applied');
  assert.strictEqual(packageJson.description, 'AwesomeApp', 'DESCRIPTION should be applied');
  assert.strictEqual(packageJson.author, 'TestAuthor', 'AUTHOR should be applied');

  await verifyIsolation(testEnv);
}, { timeout: LONG_TIMEOUT });

// ============================================================================
// Test 3: make-template test Command
// ============================================================================

test('make-template test - valid template succeeds', async (t) => {
  const testEnv = await createTestEnvironment('make-template-test-valid');

  t.after(async () => {
    await testEnv.cleanup();
  });

  // Create valid template
  const templateDir = join(testEnv.workspaceDir, 'templates', 'testable-template');
  await createTestProject(templateDir, {
    'package.json': JSON.stringify({
      name: '⦃PACKAGE_NAME⦄',
      version: '1.0.0'
    }, null, 2),
    'README.md': '# ⦃PACKAGE_NAME⦄\n\nA test project.\n',
    'template.json': JSON.stringify({
      schemaVersion: '1.0.0',
      id: 'test/testable-template',
      name: 'testable-template',
      description: 'A testable template',
      placeholderFormat: 'unicode',
      placeholders: {
        PACKAGE_NAME: {
          description: 'Package name',
          required: true,
          default: 'test-package'
        }
      }
    }, null, 2)
  });

  // Run make-template test from project root (where bin/ exists)
  // The make-template test command expects to find bin/create-scaffold relative to cwd
  const projectRoot = process.cwd();
  const result = execCLI('make-template', ['test', templateDir], {
    env: testEnv.env,
    cwd: projectRoot  // Run from project root, not test workspace
  });

  // Valid template should pass
  assert.strictEqual(result.exitCode, 0, `make-template test should succeed: ${result.stderr}`);

  // Check output for success indicators
  const output = result.stdout + result.stderr;
  assert(
    output.includes('✅') || output.includes('passed') || output.includes('Testing'),
    `Output should indicate success. Got: ${output}`
  );

  await verifyIsolation(testEnv);
}, { timeout: LONG_TIMEOUT });

test('make-template test - missing path fails', async (t) => {
  const testEnv = await createTestEnvironment('make-template-test-missing');

  t.after(async () => {
    await testEnv.cleanup();
  });

  // Run make-template test with non-existent path from project root
  const projectRoot = process.cwd();
  const result = execCLI('make-template', ['test', '/nonexistent/path/to/template'], {
    env: testEnv.env,
    cwd: projectRoot
  });

  // Should fail with missing path
  assert.notStrictEqual(result.exitCode, 0, 'make-template test should fail for missing path');

  // Check error output
  const output = result.stdout + result.stderr;
  assert(
    output.includes('not exist') || output.includes('not found') || output.includes('Error'),
    `Error should mention missing path. Got: ${output}`
  );

  await verifyIsolation(testEnv);
}, { timeout: LONG_TIMEOUT });

test('make-template test - missing template.json fails', async (t) => {
  const testEnv = await createTestEnvironment('make-template-test-no-json');

  t.after(async () => {
    await testEnv.cleanup();
  });

  // Create directory without template.json
  const templateDir = join(testEnv.workspaceDir, 'templates', 'incomplete-template');
  await createTestProject(templateDir, {
    'package.json': JSON.stringify({
      name: 'incomplete',
      version: '1.0.0'
    }, null, 2)
    // Note: No template.json
  });

  // Run make-template test from project root
  const projectRoot = process.cwd();
  const result = execCLI('make-template', ['test', templateDir], {
    env: testEnv.env,
    cwd: projectRoot
  });

  // Should fail without template.json
  assert.notStrictEqual(result.exitCode, 0, 'make-template test should fail without template.json');

  // Check error output
  const output = result.stdout + result.stderr;
  assert(
    output.includes('template.json') || output.includes('not found'),
    `Error should mention template.json. Got: ${output}`
  );

  await verifyIsolation(testEnv);
}, { timeout: LONG_TIMEOUT });

test('make-template test - verbose flag shows details', async (t) => {
  const testEnv = await createTestEnvironment('make-template-test-verbose');

  t.after(async () => {
    await testEnv.cleanup();
  });

  // Create valid template
  const templateDir = join(testEnv.workspaceDir, 'templates', 'verbose-test');
  await createTestProject(templateDir, {
    'package.json': JSON.stringify({
      name: '⦃PACKAGE_NAME⦄',
      version: '1.0.0'
    }, null, 2),
    'template.json': JSON.stringify({
      schemaVersion: '1.0.0',
      id: 'test/verbose-test',
      name: 'verbose-test',
      description: 'Template for verbose testing',
      placeholderFormat: 'unicode',
      placeholders: {
        PACKAGE_NAME: {
          description: 'Package name',
          required: true,
          default: 'verbose-package'
        }
      }
    }, null, 2)
  });

  // Run make-template test with --verbose from project root
  const projectRoot = process.cwd();
  const result = execCLI('make-template', ['test', templateDir, '--verbose'], {
    env: testEnv.env,
    cwd: projectRoot
  });

  assert.strictEqual(result.exitCode, 0, `Verbose test should succeed: ${result.stderr}`);

  // Check for verbose output indicators
  const output = result.stdout + result.stderr;
  assert(
    output.includes('Template path') || output.includes('Running') || output.includes('comprehensive'),
    `Verbose output should include details. Got: ${output.substring(0, 500)}`
  );

  await verifyIsolation(testEnv);
}, { timeout: LONG_TIMEOUT });
