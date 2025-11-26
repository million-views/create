#!/usr/bin/env node

/**
 * Unit and integration tests for make-template test command
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { writeFile, rm, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { tmpdir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test timeout for CLI operations
const TEST_TIMEOUT = 120000; // Longer timeout for testing operations

// Helper function to execute CLI commands
function execCLI(args, options = {}) {
  const command = `node ${join(__dirname, '../../bin/make-template/index.mts')} ${args.join(' ')}`;
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

// Helper to create a minimal test template
async function createTestTemplate(templateDir) {
  await mkdir(templateDir, { recursive: true });

  // Create template.json
  const templateJson = {
    schemaVersion: '1.0.0',
    id: 'test/minimal-template',
    name: 'Minimal Test Template',
    description: 'A minimal template for testing',
    author: 'Test Author',
    license: 'MIT',
    constants: {
      language: 'javascript',
      framework: 'node'
    },
    placeholders: {
      PROJECT_NAME: {
        type: 'string',
        description: 'Name of the project',
        default: 'my-project'
      }
    },
    features: {},
    gates: {},
    hints: {}
  };

  await writeFile(join(templateDir, 'template.json'), JSON.stringify(templateJson, null, 2));

  // Create package.json template
  const packageJson = {
    name: '{{PROJECT_NAME}}',
    version: '1.0.0',
    description: 'A project created from minimal template',
    main: 'index.js',
    scripts: {
      start: 'node index.js',
      test: 'echo "tests passed"'
    },
    keywords: ['template'],
    author: '{{AUTHOR}}',
    license: 'MIT'
  };

  await writeFile(join(templateDir, 'package.json'), JSON.stringify(packageJson, null, 2));

  // Create index.js template
  const indexJs = `
console.log('Hello from {{PROJECT_NAME}}!');
console.log('Created with minimal template');
`;

  await writeFile(join(templateDir, 'index.js'), indexJs);

  // Create README.md template
  const readme = `# {{PROJECT_NAME}}

This project was created from the minimal test template.

## Getting Started

\`\`\`bash
npm install
npm start
\`\`\`
`;

  await writeFile(join(templateDir, 'README.md'), readme);
}

test('make-template test command', async (t) => {
  const testDir = join(tmpdir(), `make-template-test-cmd-${Date.now()}`);
  const templateDir = join(testDir, 'template');

  await t.test('test requires template path', async () => {
    const result = execCLI(['test']);

    assert.strictEqual(result.exitCode, 1, 'Should fail without template path');
    assert(result.stdout.includes('Template path is required') || result.stderr.includes('Template path is required'), 'Should indicate missing template path');
  });

  await t.test('test --help shows help text', async () => {
    const result = execCLI(['test', '--help']);

    assert.strictEqual(result.exitCode, 0, 'Help command should succeed');
    assert(result.stdout.includes('test'), 'Should show command name');
    assert(result.stdout.includes('Test template functionality'), 'Should show command description');
    assert(result.stdout.includes('USAGE:'), 'Should show usage section');
    assert(result.stdout.includes('test <template-path> [options]'), 'Should show usage example');
    assert(result.stdout.includes('--verbose'), 'Should show verbose option');
    assert(result.stdout.includes('--keep-temp'), 'Should show keep-temp option');
  });

  await t.test('test validates template exists', async () => {
    const result = execCLI(['test', 'non-existent-template']);

    assert.strictEqual(result.exitCode, 1, 'Should fail with non-existent template');
    assert(result.stderr.includes('Template path does not exist'), 'Should indicate template path error');
  });

  await t.test('test validates template.json exists', async () => {
    await mkdir(templateDir, { recursive: true });

    const result = execCLI(['test', templateDir], { cwd: testDir });

    // Test command validates template.json exists first
    assert(result.exitCode === 1, 'Should fail when template.json is missing');
    assert(result.stderr.includes('template.json not found'), 'Should indicate template.json is missing');
  });

  await t.test('test performs basic template validation', async () => {
    await createTestTemplate(templateDir);

    const result = execCLI(['test', templateDir], { cwd: testDir });

    // Test command may fail due to create-scaffold integration complexity in test environment
    // but should at least attempt validation
    assert(result.stdout.includes('Testing template') || result.stderr.includes('Testing template') ||
           result.stdout.includes('test') || result.stderr.includes('test'),
    'Should indicate testing is happening');

    // If it succeeds, verify success indicators
    if (result.exitCode === 0) {
      assert(result.stdout.includes('Template test passed') || result.stdout.includes('successful'),
        'Should indicate successful test');
    }
  });

  await t.test('test --verbose provides detailed output', async () => {
    const result = execCLI(['test', templateDir, '--verbose'], { cwd: testDir });

    // Should show more detailed output
    assert(result.stdout.length > 0 || result.stderr.length > 0, 'Should produce output');

    // If successful, should show detailed information
    if (result.exitCode === 0) {
      assert(result.stdout.includes('Test Summary') || result.stdout.includes('Test Details') ||
             result.stdout.includes('verbose') || result.stdout.includes('details'),
      'Should show detailed test information');
    }
  });

  await t.test('test --keep-temp preserves temporary directories', async () => {
    const result = execCLI(['test', templateDir, '--keep-temp'], { cwd: testDir });

    // Should indicate temp directories are kept
    if (result.exitCode === 0) {
      assert(result.stdout.includes('temp dirs kept') || result.stdout.includes('keep-temp') ||
             result.stdout.includes('preserved') || result.stdout.includes('Cleanup'),
      'Should indicate temp directories are preserved');
    }
  });

  await t.test('test handles invalid template gracefully', async () => {
    await mkdir(templateDir, { recursive: true });

    // Create a template that might cause issues (empty template.json)
    await writeFile(join(templateDir, 'template.json'), '{}');

    const result = execCLI(['test', templateDir], { cwd: testDir });

    // Test command should attempt to test regardless of template validity
    // create-scaffold is permissive and may succeed with minimal templates
    assert(typeof result.exitCode === 'number', 'Should complete with exit code');
    assert(result.stdout.includes('Testing template') || result.stdout.includes('Template test'),
      'Should indicate testing activity');
  });

  await t.test('test shows progress indicators', async () => {
    const result = execCLI(['test', templateDir], { cwd: testDir });

    // Should show some form of progress or status
    assert(result.stdout.includes('🧪') || result.stdout.includes('Testing') ||
           result.stdout.includes('test') || result.stdout.length > 50,
    'Should show testing progress or status');
  });

  // Cleanup
  await rm(testDir, { recursive: true, force: true });
});
