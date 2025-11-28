#!/usr/bin/env node

/**
 * CLI Error Handling Tests
 * Tests for error scenarios and cleanup behavior
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execCLI as runCLI } from '../utils/cli.js';
import { getResourceSnapshot as snapshotResources } from '../utils/resources.js';
import { TestEnvironment, TemplateRepository, TestRunner, ResourceMonitor } from '../helpers/cli-test-utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLI_PATH = path.join(__dirname, '..', '..', 'bin', 'create', 'index.mts');

// Create test runner instance
const runner = new TestRunner();

// Test suite
runner.createTest('Temporary directories are cleaned up on failure', async () => {
  const beforeSnapshot = await snapshotResources();

  const tempDir = await TestEnvironment.createTempDir();
  runner.addTempPath(tempDir);

  // This should fail because the template doesn't exist
  const result = await runCLI(CLI_PATH, ['scaffold', 'new', tempDir, '--template', '/definitely/does/not/exist']);
  if (result.exitCode === 0) {
    throw new Error('CLI should have failed with nonexistent template');
  }

  const afterSnapshot = await ResourceMonitor.getResourceSnapshot();

  // Check for resource leaks
  const leaks = await ResourceMonitor.detectResourceLeaks(beforeSnapshot, afterSnapshot, 'template failure cleanup');
  if (leaks.length > 0) {
    throw new Error(`Resource leaks detected: ${leaks.join(', ')}`);
  }
});

runner.createTest('Temp directory cleanup on verifyTemplate() failure', async () => {
  const beforeSnapshot = await ResourceMonitor.getResourceSnapshot();

  const tempDir = await TestEnvironment.createTempDir();
  runner.addTempPath(tempDir);

  // Create a template that will fail during verification
  const repoDir = await TestEnvironment.createTempDir('-repo');
  runner.addTempPath(repoDir);

  await TemplateRepository.createTestTemplate(repoDir, ['features-demo-template']);

  // Remove template.json to cause verification failure
  await fs.unlink(path.join(repoDir, 'features-demo-template', 'template.json'));

  await TemplateRepository.execCommand('git', ['add', '.'], { cwd: repoDir });
  await TemplateRepository.execCommand('git', ['commit', '-m', 'Remove template.json'], { cwd: repoDir });

  const result = await runCLI(CLI_PATH, ['scaffold', 'new', tempDir, '--template', repoDir + '/features-demo-template']);
  if (result.exitCode === 0) {
    throw new Error('CLI should have failed template verification');
  }

  const afterSnapshot = await snapshotResources();

  // Check for resource leaks
  const leaks = await ResourceMonitor.detectResourceLeaks(beforeSnapshot, afterSnapshot, 'template verification failure cleanup');
  if (leaks.length > 0) {
    throw new Error(`Resource leaks detected: ${leaks.join(', ')}`);
  }
});

runner.createTest('Temp directory cleanup on copyTemplate() failure', async () => {
  const beforeSnapshot = await snapshotResources();

  const tempDir = await TestEnvironment.createTempDir();
  runner.addTempPath(tempDir);

  // Create a template that will fail during copying (simulate permission issue)
  const repoDir = await TestEnvironment.createTempDir('-repo');
  runner.addTempPath(repoDir);

  await TemplateRepository.createTestTemplate(repoDir, ['features-demo-template']);

  // Make the destination read-only to cause copy failure
  await fs.chmod(tempDir, 0o444); // Read-only

  const result = await runCLI(CLI_PATH, ['scaffold', 'new', tempDir, '--template', repoDir + '/test-template']);
  if (result.exitCode === 0) {
    throw new Error('CLI should have failed during template copying');
  }

  // Restore permissions for cleanup
  await fs.chmod(tempDir, 0o755).catch(() => { });

  const afterSnapshot = await ResourceMonitor.getResourceSnapshot();

  // Check for resource leaks
  const leaks = await ResourceMonitor.detectResourceLeaks(beforeSnapshot, afterSnapshot, 'template copy failure cleanup');
  if (leaks.length > 0) {
    throw new Error(`Resource leaks detected: ${leaks.join(', ')}`);
  }
});

runner.createTest('Temp directory cleanup on executeSetupScript() failure', async () => {
  const beforeSnapshot = await ResourceMonitor.getResourceSnapshot();

  const tempDir = await TestEnvironment.createTempDir();
  runner.addTempPath(tempDir);

  const repoDir = await TestEnvironment.createTempDir('-repo');
  runner.addTempPath(repoDir);

  await TemplateRepository.createTestTemplate(repoDir, ['features-demo-template']);

  // Create a setup script that fails
  const setupScript = `
  export default async function setup() {
    throw new Error('Setup script intentionally failed');
  }
  `;

  await fs.writeFile(path.join(repoDir, 'features-demo-template', '_setup.mjs'), setupScript);

  await TemplateRepository.execCommand('git', ['add', '.'], { cwd: repoDir });
  await TemplateRepository.execCommand('git', ['commit', '-m', 'Add failing setup script'], { cwd: repoDir });

  const result = await runCLI(CLI_PATH, ['scaffold', 'new', tempDir, '--template', repoDir + '/features-demo-template']);
  if (result.exitCode === 0) {
    throw new Error('CLI should have failed during setup script execution');
  }

  const afterSnapshot = await ResourceMonitor.getResourceSnapshot();

  // Check for resource leaks
  const leaks = await ResourceMonitor.detectResourceLeaks(beforeSnapshot, afterSnapshot, 'setup script failure cleanup');
  if (leaks.length > 0) {
    throw new Error(`Resource leaks detected: ${leaks.join(', ')}`);
  }
});

runner.createTest('Project directory cleanup when setup script fails after copy', async () => {
  const tempDir = await TestEnvironment.createTempDir();
  runner.addTempPath(tempDir);

  const repoDir = await TestEnvironment.createTempDir('-repo');
  runner.addTempPath(repoDir);

  await TemplateRepository.createTestTemplate(repoDir, ['features-demo-template']);

  // Create a setup script that fails after some files have been copied
  const setupScript = `
  export default async function setup({ environment }) {
    // Create a marker file to show setup started
    const fs = await import('fs/promises');
    const path = await import('path');
    await fs.writeFile(path.join(environment.projectDirectory, 'setup-started.txt'), 'started');

    // Then fail
    throw new Error('Setup script failed after partial execution');
  }
  `;

  await fs.writeFile(path.join(repoDir, 'features-demo-template', '_setup.mjs'), setupScript);

  await TemplateRepository.execCommand('git', ['add', '.'], { cwd: repoDir });
  await TemplateRepository.execCommand('git', ['commit', '-m', 'Add failing setup script'], { cwd: repoDir });

  const result = await runCLI(CLI_PATH, ['scaffold', 'new', tempDir, '--template', repoDir + '/features-demo-template']);
  if (result.exitCode === 0) {
    throw new Error('CLI should have failed during setup script execution');
  }

  // The project directory should be cleaned up
  const packageJsonExists = await fs.access(path.join(tempDir, 'package.json')).then(() => true).catch(() => false);
  const setupMarkerExists = await fs.access(path.join(tempDir, 'setup-started.txt')).then(() => true).catch(() => false);

  if (packageJsonExists || setupMarkerExists) {
    throw new Error('Project directory was not cleaned up after setup script failure');
  }
});

runner.createTest('Setup script file cleanup on execution failure', async () => {
  const tempDir = await TestEnvironment.createTempDir();
  runner.addTempPath(tempDir);

  const repoDir = await TestEnvironment.createTempDir('-repo');
  runner.addTempPath(repoDir);

  await TemplateRepository.createTestTemplate(repoDir, ['features-demo-template']);

  // Create a setup script that fails
  const setupScript = `
  export default async function setup() {
    throw new Error('Setup script failed');
  }
  `;

  await fs.writeFile(path.join(repoDir, 'features-demo-template', '_setup.mjs'), setupScript);

  await TemplateRepository.execCommand('git', ['add', '.'], { cwd: repoDir });
  await TemplateRepository.execCommand('git', ['commit', '-m', 'Add failing setup script'], { cwd: repoDir });

  const result = await runCLI(CLI_PATH, ['scaffold', 'new', tempDir, '--template', repoDir + '/features-demo-template']);
  if (result.exitCode === 0) {
    throw new Error('CLI should have failed during setup script execution');
  }

  // The setup script file should be cleaned up from the project directory
  const setupScriptExists = await fs.access(path.join(tempDir, '_setup.mjs')).then(() => true).catch(() => false);
  if (setupScriptExists) {
    throw new Error('Setup script file was not cleaned up after execution failure');
  }
});

runner.createTest('Git process timeout and cleanup behavior', async () => {
  const beforeSnapshot = await ResourceMonitor.getResourceSnapshot();

  const tempDir = await TestEnvironment.createTempDir();
  runner.addTempPath(tempDir);

  // Use a URL that will timeout (non-routable address)
  const result = await runCLI(CLI_PATH, ['scaffold', 'new', tempDir, '--template', 'https://192.0.2.1/nonexistent-repo.git'], { timeout: 5000 });

  // Should either timeout or fail gracefully
  if (result.exitCode === 0) {
    throw new Error('CLI should have failed or timed out with unreachable repository');
  }

  const afterSnapshot = await ResourceMonitor.getResourceSnapshot();

  // Check for resource leaks
  const leaks = await ResourceMonitor.detectResourceLeaks(beforeSnapshot, afterSnapshot, 'git timeout cleanup');
  if (leaks.length > 0) {
    throw new Error(`Resource leaks detected: ${leaks.join(', ')}`);
  }
});

runner.createTest('Resource leak detection across multiple failure modes', async () => {
  const beforeSnapshot = await ResourceMonitor.getResourceSnapshot();

  // Test multiple failure scenarios in sequence
  const testCases = [
    ['new', 'test-project', '--template', '/nonexistent'],
    ['new', '../../../etc', '--template', 'test'],
    ['new', 'test<>project', '--template', 'test']
  ];

  for (const args of testCases) {
    const result = await runCLI(CLI_PATH, args);
    if (result.exitCode === 0) {
      throw new Error(`CLI should have failed for args: ${args.join(' ')}`);
    }
  }

  const afterSnapshot = await ResourceMonitor.getResourceSnapshot();

  // Check for resource leaks across all failure modes
  const leaks = await ResourceMonitor.detectResourceLeaks(beforeSnapshot, afterSnapshot, 'multiple failure modes cleanup');
  if (leaks.length > 0) {
    throw new Error(`Resource leaks detected across multiple failures: ${leaks.join(', ')}`);
  }
});

runner.createTest('Resource cleanup on process interruption', async () => {
  // This test is harder to implement reliably in a test environment
  // as it requires sending actual signals to processes

  // For now, we'll test that the cleanup utilities work correctly
  const tempDir1 = await TestEnvironment.createTempDir('-test1');
  const tempDir2 = await TestEnvironment.createTempDir('-test2');

  // Manually clean up to verify cleanup works
  await TestEnvironment.cleanup([tempDir1, tempDir2]);

  // Verify cleanup worked
  const dir1Exists = await fs.access(tempDir1).then(() => true).catch(() => false);
  const dir2Exists = await fs.access(tempDir2).then(() => true).catch(() => false);

  if (dir1Exists || dir2Exists) {
    throw new Error('Manual cleanup did not work correctly');
  }
});

runner.createTest('Setup script error handling with malformed setup scripts', async () => {
  const tempDir = await TestEnvironment.createTempDir();
  runner.addTempPath(tempDir);

  const repoDir = await TestEnvironment.createTempDir('-repo');
  runner.addTempPath(repoDir);

  await TemplateRepository.createTestTemplate(repoDir, ['features-demo-template']);

  // Create a malformed setup script (syntax error)
  const setupScript = `
  export default async function setup() {
    // Missing closing brace - syntax error
    console.log("This will fail to parse"
  `;

  await fs.writeFile(path.join(repoDir, 'features-demo-template', '_setup.mjs'), setupScript);

  await TemplateRepository.execCommand('git', ['add', '.'], { cwd: repoDir });
  await TemplateRepository.execCommand('git', ['commit', '-m', 'Add malformed setup script'], { cwd: repoDir });

  const result = await runCLI(CLI_PATH, ['scaffold', 'new', 'test-malformed-setup', '--template', repoDir + '/features-demo-template'], { cwd: tempDir });

  const output = result.stdout + result.stderr;

  // The workflow should succeed gracefully even with malformed setup scripts
  // (setup scripts are optional and failures shouldn't brick scaffolding)
  if (result.exitCode !== 0) {
    throw new Error('CLI should have succeeded gracefully despite malformed setup script');
  }

  // Should provide warning about setup script failure
  const hasWarning = output.toLowerCase().includes('warning') || output.toLowerCase().includes('failed');
  const hasSetup = output.toLowerCase().includes('setup');

  if (!hasWarning || !hasSetup) {
    throw new Error('Setup script error should be logged as warning');
  }
});

runner.createTest('Placeholder prompts fail when required values missing with --yes', async () => {
  const tempDir = await TestEnvironment.createTempDir();
  runner.addTempPath(tempDir);

  const repoDir = await TestEnvironment.createTempDir('-repo');
  runner.addTempPath(repoDir);

  await TemplateRepository.createTestTemplate(repoDir, ['features-demo-template']);

  const templateJson = {
    name: 'test-template',
    version: '1.0.0',
    placeholders: [
      {
        name: 'requiredField',
        type: 'string',
        prompt: 'This is required',
        required: true
      }
    ]
  };

  await fs.writeFile(
    path.join(repoDir, 'features-demo-template', 'template.json'),
    JSON.stringify(templateJson, null, 2)
  );

  await TemplateRepository.execCommand('git', ['add', '.'], { cwd: repoDir });
  await TemplateRepository.execCommand('git', ['commit', '-m', 'Add template with required placeholder'], { cwd: repoDir });

  const result = await runCLI(CLI_PATH, ['scaffold', 'new', tempDir, '--template', repoDir + '/features-demo-template', '--yes']);
  if (result.exitCode === 0) {
    throw new Error('CLI should have failed with missing required placeholder and --yes');
  }

  const output = result.stdout + result.stderr;

  // Should indicate that required placeholder is missing
  if (!output.includes('required') && !output.includes('placeholder') && !output.includes('missing')) {
    throw new Error('Required placeholder validation did not work with --yes');
  }
});
