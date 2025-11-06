#!/usr/bin/env node

/**
 * Integration tests for new schema validation system in CLI workflows
 *
 * Tests template loading, selection validation, and end-to-end CLI integration
 * with the new v1.0.0 schema validation system.
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test timeout for CLI operations
const TEST_TIMEOUT = 30000;

// Helper function to execute CLI commands
function execCLI(args, options = {}) {
  const command = `node ${join(__dirname, '../../bin/create-scaffold/index.mjs')} ${args.join(' ')}`;
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

// Test fixtures
const validTemplateV1 = {
  schemaVersion: '1.0.0',
  id: 'test/valid-template',
  name: 'Valid Test Template',
  description: 'A template for testing validation',
  dimensions: {
    features: {
      values: ['auth', 'database', 'api'],
      default: []
    },
    deployment_target: {
      values: ['vercel', 'netlify'],
      default: 'vercel'
    }
  },
  handoff: [
    'npm install',
    'npm run build'
  ]
};

const invalidTemplateSchema = {
  schemaVersion: '1.0.0',
  id: 'test/invalid-template',
  // Missing required 'name' field
  description: 'Invalid template missing name'
};

test('New schema validation system CLI integration', async (t) => {
  const tempDir = join(__dirname, '../fixtures/temp-schema-validation-test');
  await mkdir(tempDir, { recursive: true });

  t.after(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  await t.test('CLI loads and validates new schema template successfully', async () => {
    // Create a mock repo with a valid v1.0.0 template
    const repoDir = join(tempDir, 'mock-repo');
    const templateDir = join(repoDir, 'test-template');
    await mkdir(templateDir, { recursive: true });

    // Create template.json with new schema
    await writeFile(join(templateDir, 'template.json'), JSON.stringify(validTemplateV1, null, 2));

    // Create basic package.json and README
    await writeFile(join(templateDir, 'package.json'), JSON.stringify({
      name: 'test-template',
      version: '1.0.0'
    }, null, 2));
    await writeFile(join(templateDir, 'README.md'), '# Test Template\n\nA test template.');

    // Initialize git repo
    execSync('git init', { cwd: repoDir });
    execSync('git config user.name "Test User"', { cwd: repoDir });
    execSync('git config user.email "test@example.com"', { cwd: repoDir });
    execSync('git add .', { cwd: repoDir });
    execSync('git commit -m "Initial commit"', { cwd: repoDir });

    // Test CLI validation
    const result = execCLI([
      'test-project',
      '--from-template', 'test-template',
      '--repo', repoDir,
      '--dry-run'
    ]);

    // Should succeed with dry run
    assert.equal(result.exitCode, 0, `Expected exit code 0, got ${result.exitCode}. Stderr: ${result.stderr}`);
    assert(!result.stderr.includes('❌'), 'Should not contain error messages');
    assert(result.stdout.includes('✅ Dry run completed'), 'Should show successful dry run completion');
  });

  await t.test('CLI rejects templates with invalid schema', async () => {
    // Create a mock repo with an invalid template
    const repoDir = join(tempDir, 'mock-repo-invalid');
    const templateDir = join(repoDir, 'invalid-template');
    await mkdir(templateDir, { recursive: true });

    // Create template.json with invalid schema (missing name)
    await writeFile(join(templateDir, 'template.json'), JSON.stringify(invalidTemplateSchema, null, 2));

    // Create basic package.json and README
    await writeFile(join(templateDir, 'package.json'), JSON.stringify({
      name: 'invalid-template',
      version: '1.0.0'
    }, null, 2));
    await writeFile(join(templateDir, 'README.md'), '# Invalid Template\n\nAn invalid template.');

    // Initialize git repo
    execSync('git init', { cwd: repoDir });
    execSync('git config user.name "Test User"', { cwd: repoDir });
    execSync('git config user.email "test@example.com"', { cwd: repoDir });
    execSync('git add .', { cwd: repoDir });
    execSync('git commit -m "Initial commit"', { cwd: repoDir });

    // Test CLI validation - should fail
    const result = execCLI([
      'test-project',
      '--from-template', 'invalid-template',
      '--repo', repoDir,
      '--dry-run'
    ]);

    assert.equal(result.exitCode, 1, `Expected exit code 1, got ${result.exitCode}`);
    assert(result.stderr.includes('Missing required field: name'), 'Should show schema validation error');
  });

  await t.test('CLI validates selections against template dimensions', async () => {
    // Create a mock repo with a template that has features dimension
    const repoDir = join(tempDir, 'mock-repo-selection');
    const templateDir = join(repoDir, 'selection-template');
    await mkdir(templateDir, { recursive: true });

    const templateWithFeatures = {
      ...validTemplateV1,
      dimensions: {
        features: {
          values: ['auth', 'database', 'api'],
          default: []
        }
      }
    };

    await writeFile(join(templateDir, 'template.json'), JSON.stringify(templateWithFeatures, null, 2));
    await writeFile(join(templateDir, 'package.json'), JSON.stringify({
      name: 'selection-template',
      version: '1.0.0'
    }, null, 2));
    await writeFile(join(templateDir, 'README.md'), '# Selection Template\n\nA template with features.');

    // Initialize git repo
    execSync('git init', { cwd: repoDir });
    execSync('git config user.name "Test User"', { cwd: repoDir });
    execSync('git config user.email "test@example.com"', { cwd: repoDir });
    execSync('git add .', { cwd: repoDir });
    execSync('git commit -m "Initial commit"', { cwd: repoDir });

    // Test with valid options
    const validResult = execCLI([
      'test-project',
      '--from-template', 'selection-template',
      '--repo', repoDir,
      '--options', 'auth,database',
      '--dry-run'
    ]);

    assert.equal(validResult.exitCode, 0, `Expected exit code 0 for valid options, got ${validResult.exitCode}`);
    assert(!validResult.stderr.includes('❌'), 'Valid options should not produce errors');

    // Test with invalid options
    const invalidResult = execCLI([
      'test-project',
      '--from-template', 'selection-template',
      '--repo', repoDir,
      '--options', 'invalid-feature',
      '--dry-run'
    ]);

    assert.equal(invalidResult.exitCode, 1, `Expected exit code 1 for invalid options, got ${invalidResult.exitCode}`);
    assert(invalidResult.stderr.includes('does not support'), 'Should show selection validation error');
  });

  await t.test('CLI handles backward compatibility with old schema templates', async () => {
    // Create a mock repo with an old schema template
    const repoDir = join(tempDir, 'mock-repo-old');
    const templateDir = join(repoDir, 'old-template');
    await mkdir(templateDir, { recursive: true });

    const oldTemplate = {
      name: 'old-template',
      description: 'An old schema template',
      setup: {
        supportedOptions: ['auth', 'database']
      },
      handoff: ['npm install']
    };

    await writeFile(join(templateDir, 'template.json'), JSON.stringify(oldTemplate, null, 2));
    await writeFile(join(templateDir, 'package.json'), JSON.stringify({
      name: 'old-template',
      version: '1.0.0'
    }, null, 2));
    await writeFile(join(templateDir, 'README.md'), '# Old Template\n\nAn old schema template.');

    // Initialize git repo
    execSync('git init', { cwd: repoDir });
    execSync('git config user.name "Test User"', { cwd: repoDir });
    execSync('git config user.email "test@example.com"', { cwd: repoDir });
    execSync('git add .', { cwd: repoDir });
    execSync('git commit -m "Initial commit"', { cwd: repoDir });

    // Test CLI with old schema - should still work
    const result = execCLI([
      'test-project',
      '--from-template', 'old-template',
      '--repo', repoDir,
      '--options', 'auth',
      '--dry-run'
    ]);

    assert.equal(result.exitCode, 0, `Expected exit code 0 for old schema, got ${result.exitCode}`);
    assert(!result.stderr.includes('❌'), 'Old schema should work without errors');
  });
});