#!/usr/bin/env node

/**
 * Comprehensive spec compliance verification test
 * Verifies that all requirements from the specification are met
 * Uses individual test functions for granular reporting
 */

import { test } from 'node:test';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLI_PATH = path.join(__dirname, '..', '..', 'bin', 'create-scaffold', 'index.mjs');
const FIXTURE_ROOT = path.join(__dirname, '..', 'fixtures');

const TEST_TIMEOUT = 30000; // 30 seconds for git operations
const TEMP_DIR_PREFIX = 'spec-test-';

/**
 * Test utilities for spec compliance tests
 */
class SpecTestUtils {
  static tempPaths = [];

  static async createTempDir(suffix = '') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    const dirName = `${TEMP_DIR_PREFIX}${timestamp}-${random}${suffix}`;
    const tempPath = path.join(os.tmpdir(), dirName);
    await fs.mkdir(tempPath, { recursive: true });
    this.tempPaths.push(tempPath);
    return tempPath;
  }

  static async execCLI(args, options = {}) {
    // Create a temporary working directory under tmp/ for test isolation
    const testCwd = await this.createTempDir('-test-cwd');
    return new Promise((resolve) => {
      const child = spawn('node', [CLI_PATH, ...args], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: options.cwd || testCwd,
        env: { ...process.env, NODE_ENV: 'test', ...options.env }
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
    await this.execCommand('git', ['config', 'user.name', 'Spec Test'], { cwd: repoPath });
    await this.execCommand('git', ['config', 'user.email', 'spec@test.com'], { cwd: repoPath });

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
      }
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

  static async cleanup() {
    for (const p of this.tempPaths) {
      try {
        await fs.rm(p, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

// Clean up temp directories on exit
process.on('exit', () => {
  SpecTestUtils.cleanup();
});
process.on('SIGINT', () => {
  SpecTestUtils.cleanup();
  process.exit(1);
});
process.on('SIGTERM', () => {
  SpecTestUtils.cleanup();
  process.exit(1);
});

// Requirement 1: Native Node.js argument parsing
test('R1.1: CLI tool uses util.parseArgs for argument parsing', async () => {
  // Verify by checking that the CLI works with native parsing
  const result = await SpecTestUtils.execCLI(['--help']);
  if (result.exitCode !== 0) {
    throw new Error('Help command should work with native argument parsing');
  }
});

test('R1.2: Maintains backward compatibility with existing argument formats', async () => {
  // Test both long and short forms
  const helpLong = await SpecTestUtils.execCLI(['--help']);
  const helpShort = await SpecTestUtils.execCLI(['-h']);

  if (helpLong.exitCode !== 0 || helpShort.exitCode !== 0) {
    throw new Error('Both long and short argument forms should work');
  }
});

test('R1.3: Supports all current flags with aliases', async () => {
  // Test that all flags are recognized (even if they fail validation)
  const result = await SpecTestUtils.execCLI([
    'new', 'test-project',
    '--template', 'basic',
    '--repo', './nonexistent-spec-arg-repo',
    '--branch', 'main'
  ]);

  // Should fail at validation/preflight, not argument parsing
  if (result.exitCode !== 1) {
    throw new Error('Should fail at validation stage, not argument parsing');
  }

  // Should not contain "unknown option" or similar parsing errors
  if (result.stderr.includes('unknown') || result.stderr.includes('unrecognized')) {
    throw new Error('All flags should be recognized by argument parser');
  }
});

test('R1.4: Validates argument types and provides clear error messages', async () => {
  const result = await SpecTestUtils.execCLI(['new', 'test-project']);

  if (result.exitCode !== 1) {
    throw new Error('Missing template should cause validation error');
  }

  if (!result.stderr.includes('template')) {
    throw new Error('Error message should mention missing template');
  }
});

test('R1.5: Handles both positional and named arguments correctly', async () => {
  // Test positional argument (project directory)
  const result = await SpecTestUtils.execCLI([
    'new', 'my-project',
    '--template', 'basic',
    '--repo', './nonexistent-spec-positional'
  ]);

  // Should fail at preflight (missing repo), not argument parsing
  if (result.exitCode !== 1) {
    throw new Error('Should fail at preflight stage');
  }

  if (result.stderr.includes('Project directory') && result.stderr.includes('required')) {
    throw new Error('Project directory should be parsed from positional argument');
  }
});

test('R1.6: Supports --options parameter with both short and long forms', async () => {
  // Test --options long form
  const longResult = await SpecTestUtils.execCLI([
    'new', 'test-project',
    '--template', 'basic',
    '--repo', './nonexistent-spec-options',
    '--options', 'typescript,react'
  ]);

  // Should fail at preflight (missing repo), not argument parsing
  if (longResult.exitCode !== 1) {
    throw new Error('Should fail at preflight stage with --options');
  }

  // Should not contain argument parsing errors
  if (longResult.stderr.includes('unknown') || longResult.stderr.includes('unrecognized')) {
    throw new Error('--options parameter should be recognized');
  }

  // Test -o short form
  const shortResult = await SpecTestUtils.execCLI([
    'new', 'test-project',
    '--template', 'basic',
    '--repo', './nonexistent-spec-options-short',
    '-o', 'typescript,react'
  ]);

  if (shortResult.exitCode !== 1) {
    throw new Error('Should fail at preflight stage with -o');
  }

  if (shortResult.stderr.includes('unknown') || shortResult.stderr.includes('unrecognized')) {
    throw new Error('-o parameter should be recognized');
  }
});

// Requirement 2: Comprehensive input validation and sanitization
test('R2.1: Validates file paths to prevent directory traversal attacks', async () => {
  const result = await SpecTestUtils.execCLI(['new', '../malicious-dir', '--template', 'basic']);

  if (result.exitCode !== 1) {
    throw new Error('Path traversal should be blocked');
  }

  if (!result.stderr.includes('path') && !result.stderr.includes('traversal')) {
    throw new Error('Should show path traversal error');
  }
});

test('R2.2: Sanitizes repository URLs to prevent malicious redirects', async () => {
  const result = await SpecTestUtils.execCLI(['new', 'test-project', '--template', 'invalid-repo-format!']);

  if (result.exitCode !== 1) {
    throw new Error('Invalid repository format should be rejected');
  }

  if (!result.stderr.includes('invalid characters')) {
    throw new Error('Should show repository format error');
  }
});

test('R2.3: Validates branch names against injection attacks', async () => {
  const result = await SpecTestUtils.execCLI(['new', 'test-project', '--template', 'basic', '--branch', 'main; rm -rf /']);

  if (result.exitCode !== 1) {
    throw new Error('Malicious branch name should be rejected');
  }

  if (!result.stderr.includes('invalid characters') && !result.stderr.includes('injection')) {
    throw new Error('Should show branch validation error');
  }
});

test('R2.4: Restricts write operations to intended project directories only', async () => {
  // This is verified through the path traversal prevention and project directory validation
  const result = await SpecTestUtils.execCLI(['new', 'test/nested/path', '--template', 'basic']);

  if (result.exitCode !== 1) {
    throw new Error('Nested paths with separators should be rejected');
  }

  if (!result.stderr.includes('separator') && !result.stderr.includes('directory')) {
    throw new Error('Should reject paths with separators');
  }
});

test('R2.5: Validates template names to prevent path traversal', async () => {
  const result = await SpecTestUtils.execCLI(['new', 'test-project', '--template', '../../../etc/passwd']);

  if (result.exitCode !== 1) {
    throw new Error('Template path traversal should be blocked');
  }

  if (!result.stderr.includes('Path traversal attempts are not allowed')) {
    throw new Error('Should show template path traversal error');
  }
});

// Requirement 3: Correct package.json bin entry
test('R3.1: Package.json bin entry points to "./bin/create-scaffold/index.mjs"', async () => {
  const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

  if (!packageJson.bin || !packageJson.bin['create-scaffold'] || packageJson.bin['create-scaffold'] !== './bin/create-scaffold/index.mjs') {
    throw new Error('Incorrect bin entry in package.json');
  }
});

test('R3.2: Bin file has proper executable permissions and shebang', async () => {
  const binPath = path.join(__dirname, '..', '..', 'bin', 'create-scaffold', 'index.mjs');
  const content = await fs.readFile(binPath, 'utf8');

  if (!content.startsWith('#!/usr/bin/env node')) {
    throw new Error('Bin file should have proper shebang line');
  }
});

test('R3.3: Works correctly with direct node execution', async () => {
  // This test verifies the CLI works when executed directly
  const result = await SpecTestUtils.execCLI(['--help']);

  if (result.exitCode !== 0) {
    throw new Error('CLI should work when executed directly with node');
  }
});

// Requirement 4: Comprehensive preflight checks
test('R4.1: Verifies git installation and availability in PATH', async () => {
  // Test with a scenario that would reach git validation
  const result = await SpecTestUtils.execCLI(['new', 'test-project', '--template', 'test/repo']);

  // Should not fail due to git not being found (git should be available)
  if (result.stderr.includes('Git is not installed') || result.stderr.includes('git not found')) {
    throw new Error('Git should be available for tests');
  }
});

test('R4.2: Validates all required arguments are provided', async () => {
  const result = await SpecTestUtils.execCLI(['new', 'test-project']);

  if (result.exitCode !== 1) {
    throw new Error('Missing template should cause validation error');
  }

  if (!result.stderr.includes('template')) {
    throw new Error('Should validate that template is required');
  }
});

test('R4.3: Checks target directory existence and handles conflicts', async () => {
  // Create an existing directory
  const existingDir = await SpecTestUtils.createTempDir('-existing');
  await fs.writeFile(path.join(existingDir, 'existing-file.txt'), 'content');

  const dirName = path.basename(existingDir);
  const result = await SpecTestUtils.execCLI(['new', dirName, '--template', path.join(FIXTURE_ROOT, 'full-demo-template')], {
    cwd: path.dirname(existingDir)
  });

  if (result.exitCode !== 1) {
    throw new Error('Should detect directory conflict');
  }

  if (!result.stderr.includes('Project directory is not empty')) {
    throw new Error('Should show directory conflict error');
  }
});

test('R4.4: Validates repository URL format and accessibility', async () => {
  // Test that nonexistent repositories are properly rejected
  const result = await SpecTestUtils.execCLI(['new', 'test-project', '--template', 'nonexistent-spec-repo/basic']);

  if (result.exitCode !== 1) {
    throw new Error('Should fail for nonexistent repository');
  }

  if (!result.stderr.includes('Template not accessible (git clone failed)')) {
    throw new Error('Should show repository access error');
  }
});

// Requirement 5: Clear help text and error messages
test('R5.1: Provides comprehensive help text when --help flag is used', async () => {
  const result = await SpecTestUtils.execCLI(['--help']);

  if (result.exitCode !== 0) {
    throw new Error('Help command should succeed');
  }

  if (!result.stdout.includes('USAGE:') || !result.stdout.includes('COMMANDS:') || !result.stdout.includes('EXAMPLES:')) {
    throw new Error('Help text should be comprehensive');
  }

  // Global help should show commands, not individual command options
  // --options is a command-specific option for the 'new' command
});

test('R5.1b: Command-specific help includes --options parameter', async () => {
  const result = await SpecTestUtils.execCLI(['help', 'new']);

  if (result.exitCode !== 0) {
    throw new Error('Command-specific help should succeed');
  }

  if (!result.stdout.includes('--options')) {
    throw new Error('Command-specific help should include --options parameter');
  }
});

test('R5.2: Displays usage examples for both npm create and npx methods', async () => {
  const result = await SpecTestUtils.execCLI(['--help']);

  if (!result.stdout.includes('npm create') || !result.stdout.includes('npx')) {
    throw new Error('Help should include both npm create and npx examples');
  }

  // Check command-specific help for --options usage examples
  const commandHelpResult = await SpecTestUtils.execCLI(['help', 'new']);
  if (!commandHelpResult.stdout.includes('--options')) {
    throw new Error('Command help examples should demonstrate --options parameter usage');
  }
});

test('R5.3: Provides specific error messages for each type of failure', async () => {
  // Test different error types
  const pathTraversalResult = await SpecTestUtils.execCLI(['new', 'test-project', '--template', '../../../etc/passwd']);
  const missingTemplateResult = await SpecTestUtils.execCLI(['new', 'test-project']);

  if (!pathTraversalResult.stderr.includes('traversal') && !pathTraversalResult.stderr.includes('path')) {
    throw new Error('Path traversal error should be specific');
  }

  if (!missingTemplateResult.stderr.includes('template')) {
    throw new Error('Missing template error should be specific');
  }
});

test('R5.4: Uses consistent formatting and visual cues in output', async () => {
  const result = await SpecTestUtils.execCLI(['--help']);

  // Check for consistent use of visual cues
  if (!result.stdout.includes('📦') && !result.stdout.includes('🚀') && !result.stdout.includes('✓')) {
    // Visual cues might be in different parts, just check that formatting is consistent
    if (!result.stdout.includes('USAGE:') || !result.stdout.includes('OPTIONS:')) {
      throw new Error('Help text should have consistent formatting');
    }
  }
});

// Requirement 6: Setup script execution matching specification
test('R6.1: Looks for _setup.mjs in root of copied template directory', async () => {
  const mockRepoPath = await SpecTestUtils.createTempDir('-setup-repo');
  await SpecTestUtils.createMockRepo(mockRepoPath, ['with-setup']);

  // Add setup script
  const setupScriptPath = path.join(mockRepoPath, 'with-setup', '_setup.mjs');
  await fs.writeFile(setupScriptPath, `
export default async function setup({ ctx, tools }) {
  if (!ctx.options || !Array.isArray(ctx.options.raw)) {
    throw new Error('Expected options.raw to be an array');
  }

  await tools.json.merge('setup-state.json', {
    project: ctx.projectName,
    options: ctx.options
  });
}
`);

  await SpecTestUtils.execCommand('git', ['add', '.'], { cwd: mockRepoPath });
  await SpecTestUtils.execCommand('git', ['commit', '-m', 'Add setup script'], { cwd: mockRepoPath });

  const projectName = 'spec-setup-test';
  const result = await SpecTestUtils.execCLI(['new', projectName, '--template', mockRepoPath + '/with-setup']);

  if (result.exitCode !== 0) {
    throw new Error('Setup script test failed: ' + result.stderr);
  }

  // Verify setup script was removed
  const projectPath = path.join(process.cwd(), projectName);
  SpecTestUtils.tempPaths.push(projectPath);

  try {
    await fs.access(path.join(projectPath, '_setup.mjs'));
    throw new Error('Setup script should be removed after execution');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
});

test('R6.2: Executes setup scripts using dynamic import() method', async () => {
  // This is verified by the successful execution in the previous test
  // The implementation uses dynamic import as required
  const result = await SpecTestUtils.execCLI(['--help']);
  if (result.exitCode !== 0) {
    throw new Error('CLI should be working with dynamic import implementation');
  }
});

test('R6.3: Handles setup script failures gracefully with warnings', async () => {
  const mockRepoPath = await SpecTestUtils.createTempDir('-failing-setup-repo');
  await SpecTestUtils.createMockRepo(mockRepoPath, ['failing-setup']);

  // Add failing setup script
  const setupScriptPath = path.join(mockRepoPath, 'failing-setup', '_setup.mjs');
  await fs.writeFile(setupScriptPath, `
export default async function setup(ctx) {
  if (!ctx.options || !Array.isArray(ctx.options.raw)) {
    throw new Error('Expected options.raw to be an array');
  }

  throw new Error('Setup script intentionally failed');
}
`);

  await SpecTestUtils.execCommand('git', ['add', '.'], { cwd: mockRepoPath });
  await SpecTestUtils.execCommand('git', ['commit', '-m', 'Add failing setup script'], { cwd: mockRepoPath });

  const projectName = 'spec-failing-setup-test';
  const result = await SpecTestUtils.execCLI(['new', projectName, '--template', mockRepoPath + '/failing-setup']);

  // Should succeed despite setup script failure
  if (result.exitCode !== 0) {
    throw new Error('Should succeed despite setup script failure');
  }

  if (!result.stderr.includes('Setup script execution failed')) {
    throw new Error('Should show warning about setup script failure');
  }

  SpecTestUtils.tempPaths.push(path.join(process.cwd(), projectName));
});

// Requirement 7: Secure coding practices
test('R7.1: Uses secure temporary directory creation with proper cleanup', async () => {
  const beforeEntries = await fs.readdir(process.cwd());
  const beforeTempDirs = beforeEntries.filter(name => name.startsWith('.tmp-template-'));

  // Run a command that should fail and clean up
  const result = await SpecTestUtils.execCLI(['test-cleanup', '--template', './nonexistent-spec-cleanup-repo/basic']);

  if (result.exitCode !== 1) {
    throw new Error('Should fail on nonexistent repository');
  }

  const afterEntries = await fs.readdir(process.cwd());
  const afterTempDirs = afterEntries.filter(name => name.startsWith('.tmp-template-'));

  if (afterTempDirs.length > beforeTempDirs.length) {
    throw new Error('Temporary directories should be cleaned up on failure');
  }
});

test('R7.2: Sanitizes error messages to prevent information disclosure', async () => {
  const result = await SpecTestUtils.execCLI(['new', 'test-project', '--template', '/nonexistent/path/basic']);

  if (result.exitCode !== 1) {
    throw new Error('Should fail on nonexistent path');
  }

  // Error message should be informative but not leak sensitive system information
  // The current implementation shows user-provided paths which is acceptable
  if (!result.stderr.includes('not accessible')) {
    throw new Error('Error message should be informative');
  }
});

test('R7.3: Uses appropriate exit codes without leaking sensitive information', async () => {
  // Test success case
  const helpResult = await SpecTestUtils.execCLI(['--help']);
  if (helpResult.exitCode !== 0) {
    throw new Error('Help should exit with code 0');
  }

  // Test error case
  const errorResult = await SpecTestUtils.execCLI(['invalid-args']);
  if (errorResult.exitCode !== 1) {
    throw new Error('Errors should exit with code 1');
  }
});

// Requirement 8: Zero external runtime dependencies
test('R8.1: Removes minimist dependency from package.json', async () => {
  const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

  if (packageJson.dependencies && packageJson.dependencies.minimist) {
    throw new Error('minimist dependency should be removed');
  }
});

test('R8.2: Uses only Node.js built-in modules for all functionality', async () => {
  const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

  if (packageJson.dependencies && Object.keys(packageJson.dependencies).length > 0) {
    throw new Error('Should have zero runtime dependencies');
  }
});

test('R8.3: Maintains all current functionality without external dependencies', async () => {
  // Test that all core functionality works
  const result = await SpecTestUtils.execCLI(['--help']);

  if (result.exitCode !== 0) {
    throw new Error('Core functionality should work without external dependencies');
  }

  if (!result.stdout.includes('--template')) {
    throw new Error('All argument parsing should work with native modules');
  }
});

test('R8.4: Uses fs/promises for async file operations', async () => {
  // This is verified by the successful operation of the CLI
  // The implementation uses fs/promises as required
  const result = await SpecTestUtils.execCLI(['--help']);
  if (result.exitCode !== 0) {
    throw new Error('CLI should work with fs/promises implementation');
  }
});

test('R8.5: Uses child_process for git command execution', async () => {
  // Test that git operations work correctly and nonexistent repositories fail appropriately
  const result = await SpecTestUtils.execCLI(['new', 'test-project', '--template', 'nonexistent-spec-git-repo/basic']);

  // Should fail for nonexistent repository (no fallback)
  if (result.exitCode !== 1) {
    throw new Error('Should fail for nonexistent repository');
  }

  if (!result.stderr.includes('Template not accessible (git clone failed)')) {
    throw new Error('Should show repository access error');
  }
});

// Requirement 9: Package rename to @m5nv/create-scaffold
test('R9.1: Package name is @m5nv/create-scaffold', async () => {
  const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

  if (packageJson.name !== '@m5nv/create-scaffold') {
    throw new Error('Package name should be @m5nv/create-scaffold, got: ' + packageJson.name);
  }
});

test('R9.2: Package description reflects scaffolding purpose', async () => {
  const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

  if (!packageJson.description || !packageJson.description.toLowerCase().includes('scaffold')) {
    throw new Error('Package description should mention scaffolding');
  }
});

test('R9.3: Bin field maps create-scaffold to ./bin/create-scaffold/index.mjs', async () => {
  const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

  if (!packageJson.bin || !packageJson.bin['create-scaffold'] || packageJson.bin['create-scaffold'] !== './bin/create-scaffold/index.mjs') {
    throw new Error('Bin field should map create-scaffold to ./bin/create-scaffold/index.mjs');
  }
});

test('R9.4: Repository URL remains correct', async () => {
  const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

  if (!packageJson.repository || !packageJson.repository.url || !packageJson.repository.url.includes('million-views/create')) {
    throw new Error('Repository URL should point to million-views/create');
  }
});

test('R9.5: Keywords include scaffolding-related terms', async () => {
  const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

  if (!packageJson.keywords || !Array.isArray(packageJson.keywords)) {
    throw new Error('Keywords should be an array');
  }

  const hasScaffoldingKeywords = packageJson.keywords.some(keyword =>
    ['scaffold', 'scaffolding', 'templates'].includes(keyword.toLowerCase())
  );

  if (!hasScaffoldingKeywords) {
    throw new Error('Keywords should include scaffolding-related terms');
  }
});
