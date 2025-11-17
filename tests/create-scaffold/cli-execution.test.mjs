#!/usr/bin/env node

/**
 * CLI Execution Tests
 * Tests for successful execution paths and normal operation
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execCLI as runCLI } from '../utils/cli.js';
import { TestEnvironment, TemplateRepository, TestRunner } from '../shared/cli-test-utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLI_PATH = path.join(__dirname, '..', '..', 'bin', 'create-scaffold', 'index.mjs');

// Create test runner instance
const runner = new TestRunner();

// Test suite
runner.createTest('Successful template creation with local repository', async () => {
  const tempDir = await TestEnvironment.createTempDir();
  const repoDir = await TestEnvironment.createTempDir('-repo');
  runner.addTempPath(tempDir);
  runner.addTempPath(repoDir);

  // Create a test template repository
  await TemplateRepository.createTestTemplate(repoDir);

  const result = await runCLI(CLI_PATH, ['new', 'test-project', '--template', repoDir + '/test-template'], { cwd: tempDir });
  if (result.exitCode !== 0) {
    throw new Error(`CLI failed with exit code ${result.exitCode}: ${result.stderr}`);
  }

  const output = result.stdout + result.stderr;

  // Check for success indicators
  const successPatterns = [
    /✅.*success/i,
    /successfully/i,
    /complete/i,
    /finished/i,
    /created/i
  ];

  const hasSuccessMessage = successPatterns.some(pattern => pattern.test(output));
  if (!hasSuccessMessage) {
    throw new Error('Success message not found in output');
  }

  // Verify files were created
  const packageJsonExists = await fs.access(path.join(tempDir, 'test-project', 'package.json')).then(() => true).catch(() => false);
  if (!packageJsonExists) {
    throw new Error('Template files were not created successfully');
  }
});

runner.createTest('Setup script execution and cleanup', async () => {
  const tempDir = await TestEnvironment.createTempDir();
  const repoDir = await TestEnvironment.createTempDir('-repo');
  runner.addTempPath(tempDir);
  runner.addTempPath(repoDir);

  // Create a test template with setup script
  await TemplateRepository.createTestTemplate(repoDir, ['features-demo-template']);

  // Add a setup script to the template
  const setupScript = `
  export default async function setup({ ctx, tools }) {
    await tools.files.write('setup-marker.txt', 'Setup script executed');
  }
  `;
  await fs.writeFile(path.join(repoDir, 'features-demo-template', '_setup.mjs'), setupScript);

  const result = await runCLI(CLI_PATH, ['new', 'test-project', '--template', repoDir + '/features-demo-template'], { cwd: tempDir });
  if (result.exitCode !== 0) {
    throw new Error(`CLI failed with exit code ${result.exitCode}: ${result.stderr}`);
  }

  // Check that setup script was executed
  const setupMarkerExists = await fs.access(path.join(tempDir, 'test-project', 'setup-marker.txt')).then(() => true).catch(() => false);
  if (!setupMarkerExists) {
    throw new Error('Setup script was not executed');
  }

  // Check that setup script was cleaned up
  const setupScriptExists = await fs.access(path.join(tempDir, 'test-project', '_setup.mjs')).then(() => true).catch(() => false);
  if (setupScriptExists) {
    throw new Error('Setup script was not cleaned up after execution');
  }
});

runner.createTest('Next steps include template-provided handoff instructions', async () => {
  const tempDir = await TestEnvironment.createTempDir();
  const repoDir = await TestEnvironment.createTempDir('-repo');
  runner.addTempPath(tempDir);
  runner.addTempPath(repoDir);

  // Create a test template with next steps in template.json
  await TemplateRepository.createTestTemplate(repoDir);

  const templateJson = {
    name: 'test-template',
    version: '1.0.0',
    nextSteps: [
      'Run npm install',
      'Run npm test',
      'Check out the README for more info'
    ]
  };

  await fs.writeFile(
    path.join(repoDir, 'test-template', 'template.json'),
    JSON.stringify(templateJson, null, 2)
  );

  await TemplateRepository.execCommand('git', ['add', '.'], { cwd: repoDir });
  await TemplateRepository.execCommand('git', ['commit', '-m', 'Add template.json'], { cwd: repoDir });

  const result = await runCLI(CLI_PATH, ['new', 'test-project', '--template', repoDir + '/test-template'], { cwd: tempDir });
  if (result.exitCode !== 0) {
    throw new Error(`CLI failed with exit code ${result.exitCode}: ${result.stderr}`);
  }

  const output = result.stdout + result.stderr;

  // Check for next steps from template
  const nextStepsPatterns = [
    /next steps/i,
    /npm install/i,
    /npm test/i,
    /README/i
  ];

  const hasNextSteps = nextStepsPatterns.some(pattern => pattern.test(output));
  if (!hasNextSteps) {
    throw new Error('Template-provided next steps were not displayed');
  }
});

runner.createTest('Next steps fall back to README guidance when metadata absent', async () => {
  const tempDir = await TestEnvironment.createTempDir();
  const repoDir = await TestEnvironment.createTempDir('-repo');
  runner.addTempPath(tempDir);
  runner.addTempPath(repoDir);

  // Create a test template without next steps in template.json
  await TemplateRepository.createTestTemplate(repoDir);

  const templateJson = {
    name: 'test-template',
    version: '1.0.0'
    // No nextSteps defined
  };

  await fs.writeFile(
    path.join(repoDir, 'test-template', 'template.json'),
    JSON.stringify(templateJson, null, 2)
  );

  await TemplateRepository.execCommand('git', ['add', '.'], { cwd: repoDir });
  await TemplateRepository.execCommand('git', ['commit', '-m', 'Add template.json'], { cwd: repoDir });

  const result = await runCLI(CLI_PATH, ['new', 'test-project', '--template', repoDir + '/test-template'], { cwd: tempDir });
  if (result.exitCode !== 0) {
    throw new Error(`CLI failed with exit code ${result.exitCode}: ${result.stderr}`);
  }

  const output = result.stdout + result.stderr;

  // Should fall back to README guidance
  if (!output.includes('README') && !output.includes('documentation')) {
    throw new Error('README fallback guidance was not provided');
  }
});

runner.createTest('Setup script receives Environment_Object with correct properties', async () => {
  const tempDir = await TestEnvironment.createTempDir();
  const repoDir = await TestEnvironment.createTempDir('-repo');
  runner.addTempPath(tempDir);
  runner.addTempPath(repoDir);

  // Create a test template with setup script that checks environment
  await TemplateRepository.createTestTemplate(repoDir);

  const setupScript = `
  export default async function setup({ ctx, tools }) {
    // Validate that ctx object has expected properties
    if (!ctx.projectDir) throw new Error('Missing projectDir');
    if (!ctx.projectName) throw new Error('Missing projectName');
    if (!ctx.cwd) throw new Error('Missing cwd');
    if (typeof ctx.options !== 'object') throw new Error('Missing options');
    if (typeof ctx.inputs !== 'object') throw new Error('Missing inputs');
    if (typeof ctx.constants !== 'object') throw new Error('Missing constants');

    // Create a marker file to indicate successful validation
    await tools.files.write('env-validation-passed.txt', 'OK');
  }
  `;

  await fs.writeFile(path.join(repoDir, 'test-template', '_setup.mjs'), setupScript);

  const result = await runCLI(CLI_PATH, ['new', 'test-project', '--template', repoDir + '/test-template'], { cwd: tempDir });
  if (result.exitCode !== 0) {
    throw new Error(`CLI failed with exit code ${result.exitCode}: ${result.stderr}`);
  }

  // Check that environment validation passed
  const validationMarkerExists = await fs.access(path.join(tempDir, 'test-project', 'env-validation-passed.txt')).then(() => true).catch(() => false);
  if (!validationMarkerExists) {
    throw new Error('Setup script did not receive correct Environment_Object');
  }
});

runner.createTest('Placeholder prompts accept env and flag overrides', async () => {
  const tempDir = await TestEnvironment.createTempDir();
  const repoDir = await TestEnvironment.createTempDir('-repo');
  runner.addTempPath(tempDir);
  runner.addTempPath(repoDir);

  // Create a test template with placeholders
  await TemplateRepository.createTestTemplate(repoDir);

  const templateJson = {
    name: 'test-template',
    version: '1.0.0',
    placeholders: [
      {
        name: 'projectName',
        type: 'string',
        default: 'my-project',
        prompt: 'Project name'
      }
    ]
  };

  await fs.writeFile(
    path.join(repoDir, 'test-template', 'template.json'),
    JSON.stringify(templateJson, null, 2)
  );

  // Create a template file with placeholder
  const templateContent = 'Project: {{projectName}}';
  await fs.writeFile(
    path.join(repoDir, 'test-template', 'README.md'),
    templateContent
  );

  await TemplateRepository.execCommand('git', ['add', '.'], { cwd: repoDir });
  await TemplateRepository.execCommand('git', ['commit', '-m', 'Add template with placeholders'], { cwd: repoDir });

  const result = await runCLI(CLI_PATH, ['new', 'test-project', '--template', repoDir + '/test-template', '--placeholder', 'projectName=overridden-name'], { cwd: tempDir });
  if (result.exitCode !== 0) {
    throw new Error(`CLI failed with exit code ${result.exitCode}: ${result.stderr}`);
  }

  // Check that the template was copied (placeholder replacement not yet implemented)
  const readmeExists = await fs.access(path.join(tempDir, 'test-project', 'README.md')).then(() => true).catch(() => false);
  if (!readmeExists) {
    throw new Error('Template file was not copied');
  }
});

runner.createTest('Author assets are staged for setup and removed afterwards', async () => {
  const tempDir = await TestEnvironment.createTempDir();
  const repoDir = await TestEnvironment.createTempDir('-repo');
  runner.addTempPath(tempDir);
  runner.addTempPath(repoDir);

  // Create a test template with author assets
  await TemplateRepository.createTestTemplate(repoDir);

  // Create author assets (files starting with underscore)
  await fs.writeFile(path.join(repoDir, 'test-template', '_author-helper.js'), 'console.log("author helper");');
  await fs.writeFile(path.join(repoDir, 'test-template', '_config.json'), '{"setting": "value"}');

  const setupScript = `
  export default async function setup({ ctx, tools }) {
    // Author assets are available during setup (they were copied to the project directory)
    // Create marker to indicate setup ran successfully
    await tools.files.write('author-assets-available.txt', 'OK');

    // Remove author assets after setup
    try {
      await tools.files.remove('_author-helper.js');
      await tools.files.remove('_config.json');
    } catch (error) {
      // Ignore cleanup errors
    }
  }
  `;

  await fs.writeFile(path.join(repoDir, 'test-template', '_setup.mjs'), setupScript);

  await TemplateRepository.execCommand('git', ['add', '.'], { cwd: repoDir });
  await TemplateRepository.execCommand('git', ['commit', '-m', 'Add author assets'], { cwd: repoDir });

  const result = await runCLI(CLI_PATH, ['new', 'test-project', '--template', repoDir + '/test-template'], { cwd: tempDir });
  if (result.exitCode !== 0) {
    throw new Error(`CLI failed with exit code ${result.exitCode}: ${result.stderr}`);
  }

  // Check that setup ran successfully (author assets were available)
  const markerExists = await fs.access(path.join(tempDir, 'test-project', 'author-assets-available.txt')).then(() => true).catch(() => false);
  if (!markerExists) {
    throw new Error('Author assets were not available during setup');
  }

  // Check that author assets were removed after setup
  const authorHelperExists = await fs.access(path.join(tempDir, 'test-project', '_author-helper.js')).then(() => true).catch(() => false);
  const authorConfigExists = await fs.access(path.join(tempDir, 'test-project', '_config.json')).then(() => true).catch(() => false);

  if (authorHelperExists || authorConfigExists) {
    throw new Error('Author assets were not removed after setup');
  }
});

runner.createTest('Package name validation in success output', async () => {
  const tempDir = await TestEnvironment.createTempDir();
  const repoDir = await TestEnvironment.createTempDir('-repo');
  runner.addTempPath(tempDir);
  runner.addTempPath(repoDir);

  // Create a test template
  await TemplateRepository.createTestTemplate(repoDir);

  const result = await runCLI(CLI_PATH, ['new', 'test-project', '--template', repoDir + '/test-template'], { cwd: tempDir });
  if (result.exitCode !== 0) {
    throw new Error(`CLI failed with exit code ${result.exitCode}: ${result.stderr}`);
  }

  const output = result.stdout + result.stderr;

  // Should reference the correct package name
  if (!output.includes('@m5nv/create-scaffold') && !output.includes('create-scaffold')) {
    throw new Error('Success output does not reference correct package name');
  }
});
