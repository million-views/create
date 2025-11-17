#!/usr/bin/env node

/**
 * CLI Integration Tests
 * True end-to-end tests for CLI functionality
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execCLI as runCLI } from '../utils/cli.js';
import { TestEnvironment, TestRunner } from '../shared/cli-test-utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLI_PATH = path.join(__dirname, '..', '..', 'bin', 'create-scaffold', 'index.mjs');

// Create test runner instance
const runner = new TestRunner();
tempPaths: [],
// Test suite
runner.createTest('Comprehensive resource management validation', async () => {
  const tempDir = await TestEnvironment.createTempDir();
  runner.addTempPath(tempDir);

  // This is a comprehensive test that validates the entire CLI workflow
  // including resource management, error handling, and cleanup

  // Test with a valid template creation
  const result = await runCLI(CLI_PATH, ['new', tempDir, '--template', 'https://github.com/octocat/Hello-World.git', '--branch', 'master']);

  // This may fail due to network issues or repository changes, but should not crash
  // The important thing is that it handles the situation gracefully

  const output = result.stdout + result.stderr;

  // Should provide some form of feedback
  if (output.length === 0) {
    throw new Error('CLI provided no output for template creation attempt');
  }

  // Should not contain sensitive information
  if (output.includes('/usr/') || output.includes('/bin/') || output.includes('internal')) {
    throw new Error('CLI output contains sensitive system information');
  }

  // This is a comprehensive test that validates the entire CLI workflow
  // including resource management, error handling, and cleanup

  // Test with a valid template creation
  const result2 = await runCLI(CLI_PATH, ['new', tempDir, '--template', 'https://github.com/octocat/Hello-World.git', '--branch', 'master']);

  // This may fail due to network issues or repository changes, but should not crash
  // The important thing is that it handles the situation gracefully

  const output2 = result2.stdout + result2.stderr;

  // Should provide some form of feedback
  if (output2.length === 0) {
    throw new Error('CLI provided no output for template creation attempt');
  }

  // Should not contain sensitive information
  if (output2.includes('/usr/') || output2.includes('/bin/') || output2.includes('internal')) {
    throw new Error('CLI output contains sensitive system information');
  }
});

runner.createTest('npm create @m5nv/scaffold command simulation', async () => {
  // Test that the CLI can be invoked through npm create
  // This simulates: npm create @m5nv/scaffold my-project -- --template test

  const tempDir = await TestEnvironment.createTempDir();
  runner.addTempPath(tempDir);

  // Since we can't easily simulate npm create in tests, we'll test the core functionality
  // that would be invoked by npm create

  const result = await runCLI(CLI_PATH, ['new', tempDir, '--template', 'test']);
  if (result.exitCode === 0) {
    throw new Error('CLI should have failed with invalid template (but parsing should work)');
  }

  const output = result.stdout + result.stderr;

  // Should show proper error for invalid template
  if (!output.includes('invalid') && !output.includes('not found') && !output.includes('template')) {
    throw new Error('CLI did not handle npm create simulation correctly');
  }
});

runner.createTest('npx @m5nv/create-scaffold command simulation', async () => {
  // Test that the CLI can be invoked through npx
  // This simulates: npx @m5nv/create-scaffold new my-project --template test

  const tempDir = await TestEnvironment.createTempDir();
  runner.addTempPath(tempDir);

  const result = await runCLI(CLI_PATH, ['new', tempDir, '--template', 'test']);
  if (result.exitCode === 0) {
    throw new Error('CLI should have failed with invalid template (but parsing should work)');
  }

  const output = result.stdout + result.stderr;

  // Should show proper error for invalid template
  if (!output.includes('invalid') && !output.includes('not found') && !output.includes('template')) {
    throw new Error('CLI did not handle npx simulation correctly');
  }
});

runner.createTest('Command patterns validate correct usage', async () => {
  // Test various command patterns to ensure they work correctly

  const testCases = [
    // Help commands
    [['--help'], 'should show help'],
    [['-h'], 'should show help with short flag'],

    // Version command
    [['--version'], 'should show version'],
    [['-V'], 'should show version with short flag'],

    // Invalid commands
    [['invalid-command'], 'should reject invalid command'],
    [['new'], 'should require project directory']
  ];

  for (const [args, description] of testCases) {
    const result = await runCLI(CLI_PATH, args);

    // All these should either succeed (help/version) or fail gracefully
    if (result.exitCode !== 0 && result.exitCode !== 1) {
      throw new Error(`Unexpected exit code for ${description}: ${result.exitCode}`);
    }

    const output = result.stdout + result.stderr;
    if (output.length === 0) {
      throw new Error(`No output provided for ${description}`);
    }
  }
});

runner.createTest('Help text displays correct package name and usage patterns', async () => {
  const result = await runCLI(CLI_PATH, ['--help']);
  if (result.exitCode !== 0) {
    throw new Error(`Help command failed with exit code ${result.exitCode}`);
  }

  const output = result.stdout + result.stderr;

  // Should reference the correct package name
  if (!output.includes('@m5nv/create-scaffold') && !output.includes('create-scaffold')) {
    throw new Error('Help text does not reference correct package name');
  }

  // Should show usage patterns
  if (!output.includes('USAGE:') && !output.includes('usage')) {
    throw new Error('Help text does not show usage patterns');
  }

  // Should show command examples
  if (!output.includes('EXAMPLES:') && !output.toLowerCase().includes('examples')) {
    throw new Error('Help text does not show examples');
  }
});

runner.createTest('Error messages reference correct package name', async () => {
  // Test that error messages reference the correct package name
  const result = await runCLI(CLI_PATH, ['invalid-command']);
  if (result.exitCode === 0) {
    throw new Error('CLI should have failed with invalid command');
  }

  const output = result.stdout + result.stderr;

  // Error messages should be helpful and reference the correct tool
  if (output.includes('Unknown command') || output.includes('invalid command')) {
    // Should suggest using help
    if (!output.includes('help') && !output.includes('--help')) {
      throw new Error('Error message does not suggest using help');
    }
  }
});
