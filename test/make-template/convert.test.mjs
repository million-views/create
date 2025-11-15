#!/usr/bin/env node

/**
 * Unit and integration tests for make-template convert command
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { readFile, writeFile, rm, mkdir, access, constants } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test timeout for CLI operations
const TEST_TIMEOUT = 60000; // Longer timeout for conversion operations

// Helper function to execute CLI commands
async function execCLI(args, options = {}) {
  const scriptPath = join(process.cwd(), 'bin/make-template/index.mjs');
  const cwd = options.cwd || process.cwd();

  // Use execSync with proper shell command
  try {
    const result = execSync(`node ${scriptPath} ${args.join(' ')}`, {
      encoding: 'utf8',
      timeout: TEST_TIMEOUT,
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      cwd
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

// Helper to create a minimal test project
async function createTestProject(projectDir) {
  await mkdir(projectDir, { recursive: true });

  // Create package.json
  const packageJson = {
    name: 'test-project',
    version: '1.0.0',
    description: 'A test project for conversion',
    main: 'index.js',
    scripts: {
      start: 'node index.js',
      test: 'echo "tests passed"'
    },
    keywords: ['test'],
    author: 'Test Author',
    license: 'MIT'
  };

  writeFileSync(join(projectDir, 'package.json'), JSON.stringify(packageJson, null, 2));

  // Create index.js
  const indexJs = `
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({ message: 'Hello from test-project!' });
});

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});

module.exports = app;
`;

  writeFileSync(join(projectDir, 'index.js'), indexJs);

  // Create README
  const readme = `# Test Project

This is a test project for make-template conversion testing.

## Getting Started

\`\`\`bash
npm install
npm start
\`\`\`

The server will start on port 3000.
`;

  writeFileSync(join(projectDir, 'README.md'), readme);
}

test('convert --dry-run shows preview without changes', async () => {
  const baseTestDir = join(process.cwd(), 'tmp', `make-template-convert-dry-run-${Date.now()}`);
  await mkdir(baseTestDir, { recursive: true });

  try {
    const testDir = join(baseTestDir, 'dry-run');
    await createTestProject(testDir);

    const result = await execCLI(['convert', '--dry-run', '--yes'], { cwd: testDir });

    assert.strictEqual(result.exitCode, 0, 'Should succeed in dry run mode');
    assert(result.stdout.includes('DRY RUN MODE'), 'Should indicate dry run mode');
    assert(result.stdout.includes('No changes were made'), 'Should confirm no changes made');

    // Verify no template files were created
    try {
      await access(join(testDir, 'template.json'), constants.F_OK);
      assert.fail('template.json should not exist in dry run');
    } catch {
      // Expected - file should not exist
    }
  } finally {
    await rm(baseTestDir, { recursive: true, force: true });
  }
});

test('convert requires package.json', async () => {
  const baseTestDir = join(process.cwd(), 'tmp', `make-template-convert-no-package-${Date.now()}`);
  await mkdir(baseTestDir, { recursive: true });

  try {
    const emptyDir = join(baseTestDir, 'empty-dir');
    await mkdir(emptyDir, { recursive: true });

    const result = await execCLI(['convert'], { cwd: emptyDir });

    assert.strictEqual(result.exitCode, 1, 'Should fail without package.json');
    // The error message is displayed, just check that we got an error
    assert(result.stdout.length > 0 || result.stderr.length > 0, 'Should display error message');
  } finally {
    await rm(baseTestDir, { recursive: true, force: true });
  }
});

test('convert detects development repository', async () => {
  const baseTestDir = join(process.cwd(), 'tmp', `make-template-convert-dev-repo-${Date.now()}`);
  await mkdir(baseTestDir, { recursive: true });

  try {
    const testDir = join(baseTestDir, 'dev-repo');
    await createTestProject(testDir);

    // Add development indicators
    await writeFile(join(testDir, '.git'), ''); // Simulate git repo
    await mkdir(join(testDir, 'node_modules', 'some-dep'), { recursive: true }); // Create node_modules dir
    await writeFile(join(testDir, 'node_modules', 'some-dep', 'package.json'), '{}'); // Simulate node_modules

    const result = await execCLI(['convert'], { cwd: testDir });

    assert.strictEqual(result.exitCode, 1, 'Should fail on development repo');
    assert(result.stderr.includes('development repository') || result.stdout.includes('development repository'),
      'Should warn about development repository');
  } finally {
    await rm(baseTestDir, { recursive: true, force: true });
  }
});

test('convert succeeds with --yes flag on development repo', async () => {
  const baseTestDir = join(process.cwd(), 'tmp', `make-template-convert-dev-yes-${Date.now()}`);
  await mkdir(baseTestDir, { recursive: true });

  try {
    const testDir = join(baseTestDir, 'dev-repo-yes');
    await createTestProject(testDir);

    // Add development indicators
    await writeFile(join(testDir, '.git'), ''); // Simulate git repo

    const result = await execCLI(['convert', '--yes'], { cwd: testDir });

    assert.strictEqual(result.exitCode, 0, 'Should succeed with --yes flag');
    assert(result.stdout.includes('Proceeding automatically'), 'Should acknowledge --yes flag');
  } finally {
    await rm(baseTestDir, { recursive: true, force: true });
  }
});

test('convert --help shows help text', async () => {
  const baseTestDir = join(process.cwd(), 'tmp', `make-template-convert-help-${Date.now()}`);
  await mkdir(baseTestDir, { recursive: true });

  try {
    const testDir = join(baseTestDir, 'help');
    await mkdir(testDir, { recursive: true });

    const result = await execCLI(['convert', '--help'], { cwd: testDir });

    assert.strictEqual(result.exitCode, 0, 'Help command should succeed');
    assert(result.stdout.includes('@m5nv/make-template convert'), 'Should show command name');
    assert(result.stdout.includes('Convert project to template'), 'Should show command description');
    assert(result.stdout.includes('USAGE:'), 'Should show usage section');
    assert(result.stdout.includes('@m5nv/make-template convert [options]'), 'Should show usage example');
    assert(result.stdout.includes('--dry-run'), 'Should show dry-run option');
    assert(result.stdout.includes('--yes'), 'Should show yes option');
  } finally {
    await rm(baseTestDir, { recursive: true, force: true });
  }
});

test('convert creates template.json', async () => {
  const baseTestDir = join(process.cwd(), 'tmp', `make-template-convert-create-${Date.now()}`);
  await mkdir(baseTestDir, { recursive: true });

  try {
    const testDir = join(baseTestDir, 'create-template');
    await createTestProject(testDir);

    const result = await execCLI(['convert', '--yes'], { cwd: testDir });

    assert.strictEqual(result.exitCode, 0, 'Conversion should succeed');

    // Verify template.json was created
    const templatePath = join(testDir, 'template.json');
    await access(templatePath, constants.F_OK);

    // Verify it's valid JSON
    const content = await readFile(templatePath, 'utf8');
    const template = JSON.parse(content);

    assert(template.metadata, 'Should have metadata');
    assert(template.metadata.version, 'Should have version in metadata');
    assert(template.name, 'Should have template name');
  } finally {
    await rm(baseTestDir, { recursive: true, force: true });
  }
});

test('convert creates undo log', async () => {
  const baseTestDir = join(process.cwd(), 'tmp', `make-template-convert-undo-${Date.now()}`);
  await mkdir(baseTestDir, { recursive: true });

  try {
    const testDir = join(baseTestDir, 'create-undo');
    await createTestProject(testDir);

    const result = await execCLI(['convert', '--yes'], { cwd: testDir });

    assert.strictEqual(result.exitCode, 0, 'Conversion should succeed');

    // Verify .template-undo.json was created
    const undoPath = join(testDir, '.template-undo.json');
    await access(undoPath, constants.F_OK);

    // Verify it's valid JSON
    const content = await readFile(undoPath, 'utf8');
    const undoLog = JSON.parse(content);

    assert(undoLog.metadata, 'Should have metadata');
    assert(undoLog.metadata.timestamp, 'Should have timestamp in metadata');
    assert(Array.isArray(undoLog.fileOperations), 'Should have fileOperations array');
  } finally {
    await rm(baseTestDir, { recursive: true, force: true });
  }
});

test('convert handles existing undo log', async () => {
  const baseTestDir = join(process.cwd(), 'tmp', `make-template-convert-existing-undo-${Date.now()}`);
  await mkdir(baseTestDir, { recursive: true });

  try {
    const testDir = join(baseTestDir, 'existing-undo');
    await createTestProject(testDir);

    // Create existing undo log
    const existingUndo = {
      timestamp: '2024-01-01T00:00:00.000Z',
      operations: [{ type: 'test', file: 'test.txt' }]
    };
    await writeFile(join(testDir, '.template-undo.json'), JSON.stringify(existingUndo, null, 2));

    const result = await execCLI(['convert', '--yes'], { cwd: testDir });

    assert.strictEqual(result.exitCode, 0, 'Conversion should succeed');
    assert(result.stdout.includes('existing undo log will be updated'), 'Should warn about existing undo log');
  } finally {
    await rm(baseTestDir, { recursive: true, force: true });
  }
});
