#!/usr/bin/env node

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLI_PATH = path.join(__dirname, '..', '..', 'bin', 'create-scaffold', 'index.mjs');

test('GuidedSetupWorkflow - selection.json generation integration', async (t) => {
  let tempDir;
  let originalCwd;

  t.beforeEach(async () => {
    // Create a temporary directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-selection-gen-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  t.afterEach(async () => {
    // Restore original working directory
    if (originalCwd) {
      process.chdir(originalCwd);
    }
    // Clean up temp directory
    if (tempDir) {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  await t.test('generates template-specific selection.json file in cwd', async () => {
    // Create a minimal template for testing
    const templateDir = path.join(tempDir, 'test-template');
    await fs.mkdir(templateDir, { recursive: true });

    // Create template.json
    const templateJson = {
      schemaVersion: '1.0.0',
      id: 'test-template',
      name: 'Test Template',
      description: 'A test template',
      placeholders: {
        PROJECT_NAME: { default: 'test-project', description: 'Project name' }
      }
    };
    await fs.writeFile(path.join(templateDir, 'template.json'), JSON.stringify(templateJson, null, 2));

    // Create _setup.mjs
    const setupScript = `
export default async function setup({ ctx, tools }) {
  await tools.files.ensureDirs('logs');
  await tools.files.write('logs/setup.txt', ctx.projectName ?? 'unknown');
  return { success: true };
}
`;
    await fs.writeFile(path.join(templateDir, '_setup.mjs'), setupScript);

    // Create a simple source file
    await fs.mkdir(path.join(templateDir, 'src'));
    await fs.writeFile(path.join(templateDir, 'src', 'index.js'), 'console.log("Hello World");');

    // Run create-scaffold with --yes to skip prompts
    const result = await new Promise((resolve) => {
      const child = spawn('node', [CLI_PATH, 'new', 'test-output', '--template', templateDir, '--yes'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: tempDir
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({
          exitCode: code,
          stdout,
          stderr
        });
      });
    });

    // Should succeed
    assert.equal(result.exitCode, 0, `CLI should succeed, but got stderr: ${result.stderr}`);

    // Check that selection.json was created with correct name
    const selectionPath = path.join(tempDir, 'test-template.selection.json');
    const exists = await fs.access(selectionPath).then(() => true).catch(() => false);
    assert(exists, 'selection.json should be created with template-specific name in cwd');

    // Verify the content structure
    const content = JSON.parse(await fs.readFile(selectionPath, 'utf8'));
    assert(content.templateId, 'should have templateId');
    assert(content.version, 'should have version');
    assert(content.selections, 'should have selections');
    assert(content.metadata, 'should have metadata');
    assert(content.metadata.createdAt, 'should have createdAt timestamp');
  });

  await t.test('selection.json filename includes template name', async () => {
    // Create another template with a different name
    const templateDir = path.join(tempDir, 'another-template');
    await fs.mkdir(templateDir, { recursive: true });

    const templateJson = {
      schemaVersion: '1.0.0',
      id: 'another-template',
      name: 'Another Template',
      description: 'Another test template',
      placeholders: {}
    };
    await fs.writeFile(path.join(templateDir, 'template.json'), JSON.stringify(templateJson, null, 2));

    const setupScript = `
export default async function setup({ ctx, tools }) {
  await tools.files.write('logs/setup.txt', ctx.projectName ?? 'unknown');
  return { success: true };
}
`;
    await fs.writeFile(path.join(templateDir, '_setup.mjs'), setupScript);
    await fs.mkdir(path.join(templateDir, 'src'));
    await fs.writeFile(path.join(templateDir, 'src', 'main.js'), 'console.log("Main");');

    // Run scaffolding
    const result = await new Promise((resolve) => {
      const child = spawn('node', [CLI_PATH, 'new', 'another-output', '--template', templateDir, '--yes'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: tempDir
      });

      child.on('close', (code) => {
        resolve({ exitCode: code });
      });
    });

    assert.equal(result.exitCode, 0, 'CLI should succeed');

    // Check that the correct filename was used
    const selectionPath = path.join(tempDir, 'another-template.selection.json');
    const exists = await fs.access(selectionPath).then(() => true).catch(() => false);
    assert(exists, 'should create another-template.selection.json');

    // Verify it contains the correct template reference
    const content = JSON.parse(await fs.readFile(selectionPath, 'utf8'));
    assert(content.templateId.includes('another-template'), 'should reference the correct template');
  });
});
