/**
 * Sprint 3: Medium Priority E2E Test Gaps
 *
 * Tests edge cases, restore workflow, and error scenarios from tutorial documentation.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createTestEnvironment, execCLI } from './test-helpers.mjs';

describe('Sprint 3: Edge Cases and Error Scenarios', () => {
  let testEnv;
  const projectRoot = process.cwd();

  beforeEach(async () => {
    testEnv = await createTestEnvironment();
  });

  afterEach(async () => {
    await testEnv?.cleanup();
  });

  // ============================================================
  // Edge Case Tests
  // ============================================================

  it('Edge case - minimal template scaffolding succeeds', async () => {
    // Create a minimal template with just one file and one placeholder
    const templateDir = path.join(testEnv.workspaceDir, 'minimal-template');
    await fs.mkdir(templateDir, { recursive: true });

    // Create minimal template.json with schemaVersion and unicode placeholder format
    const templateJson = {
      schemaVersion: '1.0.0',
      id: 'test/minimal-template',
      name: 'minimal-template',
      description: 'A minimal template for testing',
      placeholderFormat: 'unicode',
      placeholders: {
        PROJECT_NAME: {
          description: 'Project name',
          required: true
        }
      }
    };
    await fs.writeFile(
      path.join(templateDir, 'template.json'),
      JSON.stringify(templateJson, null, 2)
    );

    // Create single source file with unicode placeholder
    await fs.writeFile(
      path.join(templateDir, 'README.md'),
      '# ⦃PROJECT_NAME⦄\n\nA minimal project.\n'
    );

    // Create output directory for scaffolding
    const outputDir = path.join(testEnv.workspaceDir, 'projects');
    await fs.mkdir(outputDir, { recursive: true });

    // Scaffold from minimal template - pass placeholder value explicitly
    const result = execCLI(
      'create-scaffold',
      ['new', 'minimal-output', '--template', templateDir, '--placeholder', 'PROJECT_NAME=my-project', '--yes'],
      { cwd: outputDir, env: testEnv.env }
    );

    assert.strictEqual(result.exitCode, 0, `Scaffolding failed: ${result.stderr}`);

    // Verify output - placeholder should be replaced
    const readme = await fs.readFile(path.join(outputDir, 'minimal-output', 'README.md'), 'utf-8');
    assert.ok(readme.includes('# my-project'), 'Placeholder should be replaced');
    assert.ok(!readme.includes('⦃PROJECT_NAME⦄'), 'Unicode placeholder should not remain');
  });

  it('Edge case - scaffolding to non-empty directory fails', async () => {
    // Create template
    const templateDir = path.join(testEnv.workspaceDir, 'test-template');
    await fs.mkdir(templateDir, { recursive: true });

    const templateJson = {
      schemaVersion: '1.0.0',
      id: 'test/test-template',
      name: 'test-template',
      description: 'Test template',
      placeholders: {}
    };
    await fs.writeFile(
      path.join(templateDir, 'template.json'),
      JSON.stringify(templateJson, null, 2)
    );
    await fs.writeFile(path.join(templateDir, 'index.html'), '<html></html>');

    // Create output parent directory
    const outputParent = path.join(testEnv.workspaceDir, 'projects');
    await fs.mkdir(outputParent, { recursive: true });

    // Create target directory with existing file
    const targetDir = path.join(outputParent, 'existing-dir');
    await fs.mkdir(targetDir, { recursive: true });
    await fs.writeFile(path.join(targetDir, 'existing-file.txt'), 'I exist!');

    // Try to scaffold - should fail
    const result = execCLI(
      'create-scaffold',
      ['new', 'existing-dir', '--template', templateDir, '--yes'],
      { cwd: outputParent, env: testEnv.env }
    );

    assert.strictEqual(result.exitCode, 1, 'Should fail when directory is not empty');
    assert.ok(
      result.stderr.includes('not empty') || result.stdout.includes('not empty'),
      'Should indicate directory is not empty'
    );
  });

  it('Edge case - scaffolding to empty existing directory succeeds', async () => {
    // Create template
    const templateDir = path.join(testEnv.workspaceDir, 'test-template');
    await fs.mkdir(templateDir, { recursive: true });

    const templateJson = {
      schemaVersion: '1.0.0',
      id: 'test/test-template',
      name: 'test-template',
      description: 'Test template',
      placeholderFormat: 'unicode',
      placeholders: {
        TITLE: { description: 'Page title', required: true }
      }
    };
    await fs.writeFile(
      path.join(templateDir, 'template.json'),
      JSON.stringify(templateJson, null, 2)
    );
    await fs.writeFile(path.join(templateDir, 'index.html'), '<h1>⦃TITLE⦄</h1>');

    // Create output parent directory
    const outputParent = path.join(testEnv.workspaceDir, 'projects');
    await fs.mkdir(outputParent, { recursive: true });

    // Create empty target directory
    const targetDir = path.join(outputParent, 'empty-dir');
    await fs.mkdir(targetDir, { recursive: true });

    // Scaffold - should succeed, pass placeholder explicitly
    const result = execCLI(
      'create-scaffold',
      ['new', 'empty-dir', '--template', templateDir, '--placeholder', 'TITLE=Hello', '--yes'],
      { cwd: outputParent, env: testEnv.env }
    );

    assert.strictEqual(result.exitCode, 0, `Scaffolding failed: ${result.stderr}`);

    // Verify output
    const indexHtml = await fs.readFile(path.join(targetDir, 'index.html'), 'utf-8');
    assert.ok(indexHtml.includes('<h1>Hello</h1>'), 'Placeholder should be replaced');
  });

  // ============================================================
  // Restore Workflow Tests
  // ============================================================

  it('Restore workflow - successful restore after conversion', async () => {
    // Create a simple project to convert
    const projectDir = path.join(testEnv.workspaceDir, 'restore-test');
    await fs.mkdir(projectDir, { recursive: true });

    // Create package.json (required by make-template)
    await fs.writeFile(
      path.join(projectDir, 'package.json'),
      JSON.stringify({ name: 'my-original-app', version: '1.0.0' }, null, 2)
    );

    // Create original file
    const originalContent = '<h1>My Original App</h1>';
    await fs.writeFile(path.join(projectDir, 'index.html'), originalContent);

    // Step 1: Initialize template configuration (required before convert)
    const initResult = execCLI(
      'make-template',
      ['init'],
      { cwd: projectDir, env: testEnv.env }
    );

    assert.strictEqual(initResult.exitCode, 0, `Init failed: ${initResult.stderr}`);

    // Step 2: Convert to template
    const convertResult = execCLI(
      'make-template',
      ['convert', '--yes'],
      { cwd: projectDir, env: testEnv.env }
    );

    assert.strictEqual(convertResult.exitCode, 0, `Conversion failed: ${convertResult.stderr}`);

    // Verify package.json was templatized (default autodetect uses PACKAGE_NAME)
    const templatedPackageJson = await fs.readFile(path.join(projectDir, 'package.json'), 'utf-8');
    assert.ok(templatedPackageJson.includes('⦃PACKAGE_NAME⦄'), 'Should have placeholder after conversion');

    // Verify undo log exists
    const undoLogPath = path.join(projectDir, '.template-undo.json');
    const undoLogExists = await fs.access(undoLogPath).then(() => true).catch(() => false);
    assert.ok(undoLogExists, 'Undo log should exist after conversion');

    // Step 3: Restore original files
    const restoreResult = execCLI(
      'make-template',
      ['restore'],
      { cwd: projectDir, env: testEnv.env }
    );

    assert.strictEqual(restoreResult.exitCode, 0, `Restore failed: ${restoreResult.stderr}`);

    // Verify original package.json restored
    const restoredPackageJson = await fs.readFile(path.join(projectDir, 'package.json'), 'utf-8');
    assert.ok(restoredPackageJson.includes('my-original-app'), 'Original name should be restored');
    assert.ok(!restoredPackageJson.includes('⦃PACKAGE_NAME⦄'), 'Placeholder should be removed');

    // Verify undo log cleaned up
    const undoLogCleanedUp = await fs.access(undoLogPath).then(() => false).catch(() => true);
    assert.ok(undoLogCleanedUp, 'Undo log should be removed after restore');
  });

  it('Restore workflow - fails gracefully without undo log', async () => {
    // Create a project without conversion
    const projectDir = path.join(testEnv.workspaceDir, 'no-undo-test');
    await fs.mkdir(projectDir, { recursive: true });
    await fs.writeFile(path.join(projectDir, 'index.html'), '<h1>Hello</h1>');

    // Try to restore - should fail gracefully
    const result = execCLI(
      'make-template',
      ['restore', projectDir],
      { cwd: projectRoot, env: testEnv.env }
    );

    assert.strictEqual(result.exitCode, 1, 'Should fail when no undo log exists');
    assert.ok(
      result.stderr.includes('undo') || result.stdout.includes('undo') ||
      result.stderr.includes('not found') || result.stdout.includes('not found'),
      'Should indicate undo log not found'
    );
  });

  // ============================================================
  // Error Scenario Tests
  // ============================================================

  it('Error scenario - invalid JSON in template.json', async () => {
    // Create template with invalid JSON
    const templateDir = path.join(testEnv.workspaceDir, 'invalid-json-template');
    await fs.mkdir(templateDir, { recursive: true });

    // Write malformed JSON
    await fs.writeFile(
      path.join(templateDir, 'template.json'),
      '{ "name": "test", "version": "1.0.0" ' // Missing closing brace
    );

    // Try to validate
    const result = execCLI(
      'create-scaffold',
      ['validate', templateDir],
      { cwd: projectRoot, env: testEnv.env }
    );

    assert.strictEqual(result.exitCode, 1, 'Should fail with invalid JSON');
    assert.ok(
      result.stderr.toLowerCase().includes('json') ||
      result.stdout.toLowerCase().includes('json') ||
      result.stderr.toLowerCase().includes('parse') ||
      result.stdout.toLowerCase().includes('parse'),
      'Should mention JSON parsing error'
    );
  });

  it('Error scenario - missing required name field in template.json', async () => {
    // Create template without name field
    const templateDir = path.join(testEnv.workspaceDir, 'missing-name-template');
    await fs.mkdir(templateDir, { recursive: true });

    const templateJson = {
      // name is missing
      version: '1.0.0',
      description: 'Template without name'
    };
    await fs.writeFile(
      path.join(templateDir, 'template.json'),
      JSON.stringify(templateJson, null, 2)
    );
    await fs.writeFile(path.join(templateDir, 'index.html'), '<html></html>');

    // Try to validate
    const result = execCLI(
      'create-scaffold',
      ['validate', templateDir],
      { cwd: projectRoot, env: testEnv.env }
    );

    assert.strictEqual(result.exitCode, 1, 'Should fail when name is missing');
    assert.ok(
      result.stderr.toLowerCase().includes('name') ||
      result.stdout.toLowerCase().includes('name') ||
      result.stderr.includes('required') ||
      result.stdout.includes('required'),
      'Should mention missing name field'
    );
  });

  it('Error scenario - missing template.json file', async () => {
    // Create template directory without template.json
    const templateDir = path.join(testEnv.workspaceDir, 'no-manifest-template');
    await fs.mkdir(templateDir, { recursive: true });
    await fs.writeFile(path.join(templateDir, 'index.html'), '<html></html>');

    // Try to validate
    const result = execCLI(
      'create-scaffold',
      ['validate', templateDir],
      { cwd: projectRoot, env: testEnv.env }
    );

    assert.strictEqual(result.exitCode, 1, 'Should fail when template.json is missing');
    assert.ok(
      result.stderr.includes('template.json') ||
      result.stdout.includes('template.json') ||
      result.stderr.includes('manifest') ||
      result.stdout.includes('manifest'),
      'Should mention missing template.json'
    );
  });
});
