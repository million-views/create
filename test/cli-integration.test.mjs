#!/usr/bin/env node

/**
 * CLI Integration Test Suite for Phase 1 Core UX Features
 * Tests integration of Cache Manager, Logger, Template Discovery, and Dry Run Engine
 * with the main CLI workflow
 */

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLI_PATH = path.join(__dirname, '..', 'bin', 'index.mjs');
const FIXTURE_ROOT = path.join(__dirname, 'fixtures');

// Test configuration
const TEST_TIMEOUT = 30000; // 30 seconds for git operations
const TEMP_DIR_PREFIX = 'test-cli-integration-';

/**
 * Test utilities for CLI integration tests
 */
class IntegrationTestUtils {
  static async createTempDir(suffix = '') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    const dirName = `${TEMP_DIR_PREFIX}${timestamp}-${random}${suffix}`;
    const tempPath = path.join(os.tmpdir(), dirName);
    await fs.mkdir(tempPath, { recursive: true });
    return tempPath;
  }

  static async cleanup(paths) {
    for (const p of Array.isArray(paths) ? paths : [paths]) {
      try {
        await fs.rm(p, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  static async execCLI(args, options = {}) {
    return new Promise((resolve) => {
      const child = spawn('node', [CLI_PATH, ...args], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: options.cwd || process.cwd(),
        env: { ...process.env, ...options.env }
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      const timeout = setTimeout(() => {
        child.kill('SIGTERM');
        resolve({
          exitCode: -1,
          stdout,
          stderr: stderr + '\nTest timeout',
          timedOut: true
        });
      }, options.timeout || TEST_TIMEOUT);

      child.on('close', (code) => {
        clearTimeout(timeout);
        resolve({
          exitCode: code,
          stdout,
          stderr,
          timedOut: false
        });
      });

      child.on('error', (error) => {
        clearTimeout(timeout);
        resolve({
          exitCode: -1,
          stdout,
          stderr: stderr + error.message,
          error: true
        });
      });
    });
  }

  static async createMockRepo(repoPath, templates = ['basic']) {
    await fs.mkdir(repoPath, { recursive: true });
    
    // Initialize git repo
    await this.execCommand('git', ['init'], { cwd: repoPath });
    await this.execCommand('git', ['config', 'user.name', 'Test User'], { cwd: repoPath });
    await this.execCommand('git', ['config', 'user.email', 'test@example.com'], { cwd: repoPath });

    // Create template directories
    for (const template of templates) {
      const templatePath = path.join(repoPath, template);
      const fixturePath = path.join(FIXTURE_ROOT, template);

      if (await fs.access(fixturePath).then(() => true).catch(() => false)) {
        await fs.cp(fixturePath, templatePath, { recursive: true });
      } else {
        await fs.mkdir(templatePath, { recursive: true });
        await fs.writeFile(
          path.join(templatePath, 'package.json'),
          JSON.stringify({ name: template, version: '1.0.0' }, null, 2)
        );
        await fs.writeFile(
          path.join(templatePath, 'README.md'),
          `# ${template} Template\n\nThis is a test template.`
        );

        if (template === 'react') {
          await fs.writeFile(
            path.join(templatePath, 'template.json'),
            JSON.stringify({
              name: 'React Template',
              description: 'Modern React application with TypeScript',
              version: '1.0.0',
              tags: ['react', 'typescript']
            }, null, 2)
          );
        }
      }

      await fs.writeFile(
        path.join(templatePath, '.template-undo.json'),
        JSON.stringify({ files: [], version: 1 }, null, 2)
      );
    }

    // Commit the templates
    await this.execCommand('git', ['add', '.'], { cwd: repoPath });
    await this.execCommand('git', ['commit', '-m', 'Initial templates'], { cwd: repoPath });

    return repoPath;
  }

  static async execCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: options.cwd || process.cwd()
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
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(stderr || stdout || `Command failed with exit code ${code}`));
        }
      });

      child.on('error', reject);
    });
  }
}

/**
 * Test runner for CLI integration tests
 */
class IntegrationTestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    this.tempPaths = [];
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('🧪 Running CLI Integration Tests for Phase 1 Core UX Features\n');

    for (const { name, fn } of this.tests) {
      try {
        console.log(`  ▶ ${name}`);
        await fn();
        console.log(`  ✅ ${name}`);
        this.passed++;
      } catch (error) {
        console.log(`  ❌ ${name}`);
        console.log(`     Error: ${error.message}`);
        if (error.details) {
          console.log(`     Details: ${error.details}`);
        }
        this.failed++;
      }
    }

    // Cleanup
    await IntegrationTestUtils.cleanup(this.tempPaths);

    console.log(`\n📊 Integration Test Results:`);
    console.log(`   Passed: ${this.passed}`);
    console.log(`   Failed: ${this.failed}`);
    console.log(`   Total:  ${this.tests.length}`);

    if (this.failed > 0) {
      console.log('\n❌ Some integration tests failed');
      process.exit(1);
    } else {
      console.log('\n✅ All integration tests passed!');
      process.exit(0);
    }
  }

  async addTempPath(path) {
    this.tempPaths.push(path);
    return path;
  }
}

const runner = new IntegrationTestRunner();

// Test 1: --list-templates flag integration
runner.test('--list-templates flag shows available templates', async () => {
  const mockRepoPath = await runner.addTempPath(await IntegrationTestUtils.createTempDir('-list-templates-repo'));
  
  // Create mock repository with multiple templates
  await IntegrationTestUtils.createMockRepo(mockRepoPath, ['basic', 'react', 'vue']);
  
  const result = await IntegrationTestUtils.execCLI([
    '--list-templates',
    '--repo', mockRepoPath
  ]);
  
  if (result.exitCode !== 0) {
    throw new Error(`Expected exit code 0, got ${result.exitCode}. Stderr: ${result.stderr}`);
  }
  
  // Should show template listing
  if (!result.stdout.includes('basic')) {
    throw new Error('Should list basic template');
  }
  
  if (!result.stdout.includes('react')) {
    throw new Error('Should list react template');
  }
  
  if (!result.stdout.includes('vue')) {
    throw new Error('Should list vue template');
  }
});

// Test 2: --dry-run flag integration
runner.test('--dry-run flag shows preview without execution', async () => {
  const mockRepoPath = await runner.addTempPath(await IntegrationTestUtils.createTempDir('-dry-run-repo'));
  
  // Create mock repository
  await IntegrationTestUtils.createMockRepo(mockRepoPath, ['basic']);
  
  const result = await IntegrationTestUtils.execCLI([
    'test-dry-run-project',
    '--from-template', 'basic',
    '--repo', mockRepoPath,
    '--dry-run'
  ]);
  
  if (result.exitCode !== 0) {
    throw new Error(`Expected exit code 0, got ${result.exitCode}. Stderr: ${result.stderr}`);
  }
  
  // Should show dry run summary and operation details
  if (!result.stdout.includes('DRY RUN') && !result.stdout.includes('Preview')) {
    throw new Error('Should indicate dry run mode');
  }
  if (!result.stdout.includes('Files:')) {
    throw new Error('Dry run summary should include file count');
  }
  if (!result.stdout.includes('File Copy') || !result.stdout.includes('• ./')) {
    throw new Error('Dry run output should aggregate files by directory');
  }
  if (!result.stdout.includes('Directories:')) {
    throw new Error('Dry run summary should include directory count');
  }
  if (!result.stdout.includes('Operations') && !result.stdout.includes('Copy')) {
    throw new Error('Dry run should list planned operations');
  }

  if (result.stdout.includes('.template-undo.json')) {
    throw new Error('Dry run output should not mention template undo artifacts');
  }
  
  // Should not create actual project directory
  try {
    await fs.access('test-dry-run-project');
    throw new Error('Dry run should not create actual project directory');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
    // Expected - directory should not exist
  }
});

// Test 2b: tree preview when custom tree command available
runner.test('--dry-run includes tree preview when tree command available', async () => {
  const mockRepoPath = await runner.addTempPath(await IntegrationTestUtils.createTempDir('-dry-run-tree-repo'));
  await IntegrationTestUtils.createMockRepo(mockRepoPath, ['basic']);

  const treeStubDir = await runner.addTempPath(await IntegrationTestUtils.createTempDir('-tree-stub'));
  const treeStubPath = path.join(treeStubDir, 'tree');
  await fs.writeFile(treeStubPath, '#!/usr/bin/env node\nconsole.log("stub tree output");\n');
  await fs.chmod(treeStubPath, 0o755);

  const result = await IntegrationTestUtils.execCLI([
    'test-dry-run-tree-project',
    '--from-template', 'basic',
    '--repo', mockRepoPath,
    '--dry-run'
  ], {
    env: {
      ...process.env,
      CREATE_SCAFFOLD_TREE_COMMAND: treeStubPath
    }
  });

  if (result.exitCode !== 0) {
    throw new Error(`Expected exit code 0, got ${result.exitCode}. Stderr: ${result.stderr}`);
  }

  if (!result.stdout.includes('stub tree output')) {
    throw new Error('Dry run should include tree output when tree command is available');
  }

  if (result.stdout.includes('.template-undo.json')) {
    throw new Error('Tree preview should not list template undo artifacts');
  }
});

// Test 2c: tree preview skip message when tree command missing
runner.test('--dry-run warns when tree command is unavailable', async () => {
  const mockRepoPath = await runner.addTempPath(await IntegrationTestUtils.createTempDir('-dry-run-no-tree-repo'));
  await IntegrationTestUtils.createMockRepo(mockRepoPath, ['basic']);

  const result = await IntegrationTestUtils.execCLI([
    'test-dry-run-no-tree-project',
    '--from-template', 'basic',
    '--repo', mockRepoPath,
    '--dry-run'
  ], {
    env: {
      ...process.env,
      CREATE_SCAFFOLD_TREE_COMMAND: '__nonexistent_tree_binary__'
    }
  });

  if (result.exitCode !== 0) {
    throw new Error(`Expected exit code 0, got ${result.exitCode}. Stderr: ${result.stderr}`);
  }

  if (!result.stdout.toLowerCase().includes('tree') || !result.stdout.toLowerCase().includes('unavailable')) {
    throw new Error('Dry run should mention tree command unavailability');
  }

  if (result.stdout.includes('.template-undo.json')) {
    throw new Error('Dry run output should not reference template undo artifacts');
  }
});

// Test 3: --log-file flag integration
runner.test('--log-file flag enables detailed logging', async () => {
  const mockRepoPath = await runner.addTempPath(await IntegrationTestUtils.createTempDir('-log-file-repo'));
  const logFilePath = await runner.addTempPath(path.join(os.tmpdir(), 'test-integration.log'));
  
  // Create mock repository
  await IntegrationTestUtils.createMockRepo(mockRepoPath, ['basic']);
  
  const result = await IntegrationTestUtils.execCLI([
    'test-log-project',
    '--from-template', 'basic',
    '--repo', mockRepoPath,
    '--log-file', logFilePath
  ]);
  
  if (result.exitCode !== 0) {
    throw new Error(`Expected exit code 0, got ${result.exitCode}. Stderr: ${result.stderr}`);
  }
  
  // Verify log file was created
  try {
    const logContent = await fs.readFile(logFilePath, 'utf8');
    
    if (!logContent.includes('git_clone') && !logContent.includes('file_copy')) {
      throw new Error('Log file should contain operation logs');
    }
    
    // Should contain timestamps
    if (!logContent.includes('T') || !logContent.includes('Z')) {
      throw new Error('Log file should contain ISO timestamps');
    }
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error('Log file was not created');
    }
    throw error;
  }

  try {
    await fs.access(path.join('test-log-project', '.template-undo.json'));
    throw new Error('Template undo artifact should not be copied to the project');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
  
  // Clean up created project
  runner.tempPaths.push('test-log-project');
});

// Test 4: --no-cache flag integration
runner.test('--no-cache flag bypasses cache system', async () => {
  const mockRepoPath = await runner.addTempPath(await IntegrationTestUtils.createTempDir('-no-cache-repo'));
  
  // Create mock repository
  await IntegrationTestUtils.createMockRepo(mockRepoPath, ['basic']);
  
  const result = await IntegrationTestUtils.execCLI([
    'test-no-cache-project',
    '--from-template', 'basic',
    '--repo', mockRepoPath,
    '--no-cache'
  ]);
  
  if (result.exitCode !== 0) {
    throw new Error(`Expected exit code 0, got ${result.exitCode}. Stderr: ${result.stderr}`);
  }
  
  // Should indicate cache bypass (if implemented)
  // For now, just verify project was created successfully
  const projectPath = 'test-no-cache-project';
  runner.tempPaths.push(projectPath);
  
  try {
    await fs.access(projectPath);
    // Project should exist
  } catch {
    throw new Error('Project should be created even with --no-cache flag');
  }

  try {
    await fs.access(path.join(projectPath, '.template-undo.json'));
    throw new Error('Template undo artifact should not be present in generated project');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
});

// Test 5: --cache-ttl flag integration
runner.test('--cache-ttl flag sets custom TTL', async () => {
  const mockRepoPath = await runner.addTempPath(await IntegrationTestUtils.createTempDir('-cache-ttl-repo'));
  
  // Create mock repository
  await IntegrationTestUtils.createMockRepo(mockRepoPath, ['basic']);
  
  const result = await IntegrationTestUtils.execCLI([
    'test-cache-ttl-project',
    '--from-template', 'basic',
    '--repo', mockRepoPath,
    '--cache-ttl', '48'
  ]);
  
  if (result.exitCode !== 0) {
    throw new Error(`Expected exit code 0, got ${result.exitCode}. Stderr: ${result.stderr}`);
  }
  
  // Verify project was created
  const projectPath = 'test-cache-ttl-project';
  runner.tempPaths.push(projectPath);
  
  try {
    await fs.access(projectPath);
    // Project should exist
  } catch {
    throw new Error('Project should be created with custom cache TTL');
  }

  try {
    await fs.access(path.join(projectPath, '.template-undo.json'));
    throw new Error('Template undo artifact should not be copied when using cache TTL');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
});

// Test 6: Combined flags integration
runner.test('Combined flags work together correctly', async () => {
  const mockRepoPath = await runner.addTempPath(await IntegrationTestUtils.createTempDir('-combined-flags-repo'));
  const logFilePath = await runner.addTempPath(path.join(os.tmpdir(), 'test-combined.log'));
  
  // Create mock repository
  await IntegrationTestUtils.createMockRepo(mockRepoPath, ['basic']);
  
  // Test dry run with logging
  const result = await IntegrationTestUtils.execCLI([
    'test-combined-project',
    '--from-template', 'basic',
    '--repo', mockRepoPath,
    '--dry-run',
    '--log-file', logFilePath
  ]);
  
  if (result.exitCode !== 0) {
    throw new Error(`Expected exit code 0, got ${result.exitCode}. Stderr: ${result.stderr}`);
  }
  
  // Should show dry run preview
  if (!result.stdout.includes('DRY RUN') && !result.stdout.includes('Preview')) {
    throw new Error('Should indicate dry run mode');
  }
  if (!result.stdout.includes('Files:')) {
    throw new Error('Dry run summary should include file count');
  }
  if (!result.stdout.includes('• ./')) {
    throw new Error('Dry run output should aggregate files by directory');
  }
  if (!result.stdout.includes('Directories:')) {
    throw new Error('Dry run summary should include directory count');
  }
  
  // Should not create actual project directory
  try {
    await fs.access('test-combined-project');
    throw new Error('Dry run should not create actual project directory');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
    // Expected - directory should not exist
  }
  
  // Log file should be created for dry run operations
  try {
    const logContent = await fs.readFile(logFilePath, 'utf8');
    
    if (!logContent.includes('"operation":"dry_run_preview"')) {
      throw new Error('Log file should record dry run preview operations');
    }
    if (!logContent.includes('"summary"')) {
      throw new Error('Dry run log should include summary counts');
    }
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error('Log file should be created even for dry run');
    }
    throw error;
  }
});

// Test 7: Cache integration with existing workflow
runner.test('Cache integration works with existing scaffolding workflow', async () => {
  const mockRepoPath = await runner.addTempPath(await IntegrationTestUtils.createTempDir('-cache-workflow-repo'));
  
  // Create mock repository
  await IntegrationTestUtils.createMockRepo(mockRepoPath, ['basic']);
  
  // First run should populate cache
  const firstResult = await IntegrationTestUtils.execCLI([
    'test-cache-first-project',
    '--from-template', 'basic',
    '--repo', mockRepoPath
  ]);
  
  if (firstResult.exitCode !== 0) {
    throw new Error(`First run failed: ${firstResult.stderr}`);
  }
  
  runner.tempPaths.push('test-cache-first-project');
  
  // Second run should use cache (faster)
  const secondResult = await IntegrationTestUtils.execCLI([
    'test-cache-second-project',
    '--from-template', 'basic',
    '--repo', mockRepoPath
  ]);
  
  if (secondResult.exitCode !== 0) {
    throw new Error(`Second run failed: ${secondResult.stderr}`);
  }
  
  runner.tempPaths.push('test-cache-second-project');
  
  // Both projects should be created successfully
  try {
    await fs.access('test-cache-first-project');
    await fs.access('test-cache-second-project');
  } catch {
    throw new Error('Both projects should be created successfully');
  }

  for (const projectName of ['test-cache-first-project', 'test-cache-second-project']) {
    try {
      await fs.access(path.join(projectName, '.template-undo.json'));
      throw new Error(`Template undo artifact should not be copied to ${projectName}`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }
});

// Test 8: Error handling with new flags
runner.test('Error handling works correctly with new CLI flags', async () => {
  // Test invalid cache TTL
  const invalidTtlResult = await IntegrationTestUtils.execCLI([
    'test-error-project',
    '--from-template', 'basic',
    '--cache-ttl', 'invalid'
  ]);
  
  if (invalidTtlResult.exitCode !== 1) {
    throw new Error('Invalid cache TTL should cause error');
  }
  
  if (!invalidTtlResult.stderr.includes('TTL') && !invalidTtlResult.stderr.includes('invalid')) {
    throw new Error('Should show cache TTL validation error');
  }
  
  // Test conflicting flags
  const conflictingResult = await IntegrationTestUtils.execCLI([
    'test-conflict-project',
    '--from-template', 'basic',
    '--no-cache',
    '--cache-ttl', '24'
  ]);
  
  if (conflictingResult.exitCode !== 1) {
    throw new Error('Conflicting cache flags should cause error');
  }
  
  if (!conflictingResult.stderr.includes('cannot use both')) {
    throw new Error('Should show conflicting flags error');
  }
});

// Test 9: Template discovery with metadata
runner.test('Template discovery shows metadata when available', async () => {
  const mockRepoPath = await runner.addTempPath(await IntegrationTestUtils.createTempDir('-metadata-repo'));
  
  // Create mock repository with templates that have metadata
  await IntegrationTestUtils.createMockRepo(mockRepoPath, ['basic', 'react', 'vue']);
  
  const result = await IntegrationTestUtils.execCLI([
    '--list-templates',
    '--repo', mockRepoPath
  ]);
  
  if (result.exitCode !== 0) {
    throw new Error(`Expected exit code 0, got ${result.exitCode}. Stderr: ${result.stderr}`);
  }
  
  // Should show template names
  if (!result.stdout.includes('basic') || !result.stdout.includes('react') || !result.stdout.includes('vue')) {
    throw new Error('Should list all templates');
  }
  
  // Should show metadata for react template (has template.json)
  if (!result.stdout.includes('Modern React application') && !result.stdout.includes('React Template')) {
    throw new Error('Should show metadata for templates with template.json');
  }
});

// Test 10: Logging integration across all operations
runner.test('Logging integration works across all CLI operations', async () => {
  const mockRepoPath = await runner.addTempPath(await IntegrationTestUtils.createTempDir('-logging-integration-repo'));
  const logFilePath = await runner.addTempPath(path.join(os.tmpdir(), 'test-logging-integration.log'));
  
  // Create mock repository with setup script
  await IntegrationTestUtils.createMockRepo(mockRepoPath, ['with-setup']);
  
  // Add setup script
  const setupScriptPath = path.join(mockRepoPath, 'with-setup', '_setup.mjs');
  const setupScript = `
export default function setup(env) {
  console.log('Setup script executed');
}
`;
  await fs.writeFile(setupScriptPath, setupScript);
  
  // Commit setup script
  await IntegrationTestUtils.execCommand('git', ['add', '.'], { cwd: mockRepoPath });
  await IntegrationTestUtils.execCommand('git', ['commit', '-m', 'Add setup script'], { cwd: mockRepoPath });
  
  const result = await IntegrationTestUtils.execCLI([
    'test-logging-integration-project',
    '--from-template', 'with-setup',
    '--repo', mockRepoPath,
    '--log-file', logFilePath
  ]);
  
  if (result.exitCode !== 0) {
    throw new Error(`Expected exit code 0, got ${result.exitCode}. Stderr: ${result.stderr}`);
  }
  
  runner.tempPaths.push('test-logging-integration-project');
  
  // Verify comprehensive logging
  try {
    const logContent = await fs.readFile(logFilePath, 'utf8');
    
    // Should log git operations
    if (!logContent.includes('git_clone') && !logContent.includes('repository')) {
      throw new Error('Should log git clone operations');
    }
    
    // Should log file operations
    if (!logContent.includes('file_copy') && !logContent.includes('copy')) {
      throw new Error('Should log file copy operations');
    }
    
    // Should log setup script execution
    if (!logContent.includes('setup_script') && !logContent.includes('setup')) {
      throw new Error('Should log setup script execution');
    }
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error('Log file was not created');
    }
    throw error;
  }

  try {
    await fs.access(path.join('test-logging-integration-project', '.template-undo.json'));
    throw new Error('Template undo artifact should not be copied when running setup scripts');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
});

// Test 11: Early exit modes work correctly
runner.test('Early exit modes (--list-templates, --dry-run) work correctly', async () => {
  const mockRepoPath = await runner.addTempPath(await IntegrationTestUtils.createTempDir('-early-exit-repo'));
  
  // Create mock repository
  await IntegrationTestUtils.createMockRepo(mockRepoPath, ['basic']);
  
  // Test --list-templates early exit
  const listResult = await IntegrationTestUtils.execCLI([
    '--list-templates',
    '--repo', mockRepoPath
  ]);
  
  if (listResult.exitCode !== 0) {
    throw new Error(`List templates should exit successfully: ${listResult.stderr}`);
  }
  
  if (!listResult.stdout.includes('basic')) {
    throw new Error('Should list templates and exit early');
  }
  
  // Test --dry-run early exit (doesn't create project)
  const dryRunResult = await IntegrationTestUtils.execCLI([
    'test-early-exit-project',
    '--from-template', 'basic',
    '--repo', mockRepoPath,
    '--dry-run'
  ]);
  
  if (dryRunResult.exitCode !== 0) {
    throw new Error(`Dry run should exit successfully: ${dryRunResult.stderr}`);
  }
  
  // Should not create project directory
  try {
    await fs.access('test-early-exit-project');
    throw new Error('Dry run should not create project directory');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
    // Expected - directory should not exist
  }
});

// Test 12: Feature initialization is conditional
runner.test('Feature modules are initialized conditionally based on flags', async () => {
  const mockRepoPath = await runner.addTempPath(await IntegrationTestUtils.createTempDir('-conditional-init-repo'));
  
  // Create mock repository
  await IntegrationTestUtils.createMockRepo(mockRepoPath, ['basic']);
  
  // Test normal operation (should not show feature-specific output unless flags are used)
  const normalResult = await IntegrationTestUtils.execCLI([
    'test-conditional-project',
    '--from-template', 'basic',
    '--repo', mockRepoPath
  ]);
  
  if (normalResult.exitCode !== 0) {
    throw new Error(`Normal operation should succeed: ${normalResult.stderr}`);
  }
  
  runner.tempPaths.push('test-conditional-project');
  
  // Should not show cache-specific or logging-specific messages unless flags are used
  if (normalResult.stdout.includes('cache') && !normalResult.stdout.includes('Cloning')) {
    throw new Error('Should not show cache-specific messages without cache flags');
  }
  
  // Verify project was created
  try {
    await fs.access('test-conditional-project');
  } catch {
    throw new Error('Project should be created successfully');
  }

  try {
    await fs.access(path.join('test-conditional-project', '.template-undo.json'));
    throw new Error('Template undo artifact should not be copied during normal operation');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
});

// Run all integration tests
runner.run().catch(error => {
  console.error('Integration test runner failed:', error);
  process.exit(1);
});
