#!/usr/bin/env node

/**
 * E2E Test Helpers
 * Hermetic test infrastructure using M5NV_HOME for complete isolation
 */

import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { mkdir, rm, access, constants } from 'node:fs/promises';

const CLI_PATH = join(process.cwd(), 'bin', 'create', 'index.mts');
const TEST_TIMEOUT = 120000; // 2 minutes per command

/**
 * Create isolated test environment with dedicated M5NV_HOME
 * All cache and config operations stay within this directory
 */
export async function createTestEnvironment(testName) {
  const timestamp = Date.now();
  const testId = `${testName}-${timestamp}`;

  // All test artifacts go in tmp/ (not system /tmp)
  const baseDir = join(process.cwd(), 'tmp', 'e2e-tests', testId);
  const m5nvHome = join(baseDir, '.m5nv');
  const workspaceDir = join(baseDir, 'workspace');

  await mkdir(m5nvHome, { recursive: true });
  await mkdir(workspaceDir, { recursive: true });

  return {
    testId,
    baseDir,
    m5nvHome,
    workspaceDir,
    env: {
      M5NV_HOME: m5nvHome,
      // Isolate from user's environment
      HOME: baseDir,
      USERPROFILE: baseDir,
      // Prevent git from interfering with tests
      GIT_CONFIG_GLOBAL: join(baseDir, '.gitconfig'),
      GIT_CONFIG_SYSTEM: '/dev/null',
      // Ensure clean npm environment
      npm_config_cache: join(baseDir, '.npm-cache'),
      npm_config_userconfig: join(baseDir, '.npmrc')
    },

    async cleanup() {
      await rm(baseDir, { recursive: true, force: true });
    }
  };
}

/**
 * Execute CLI command in isolated environment
 */
export function execCLI(tool, args, options = {}) {
  const { env, cwd = process.cwd() } = options;
  const command = `node ${CLI_PATH} ${tool} ${args.join(' ')}`;

  try {
    const result = execSync(command, {
      encoding: 'utf8',
      timeout: options.timeout || TEST_TIMEOUT,
      cwd,
      env: { ...process.env, ...env },
      stdio: 'pipe'
    });

    return {
      exitCode: 0,
      stdout: result,
      stderr: '',
      success: true
    };
  } catch (error) {
    return {
      exitCode: error.status || 1,
      stdout: error.stdout || '',
      stderr: error.stderr || '',
      success: false,
      error
    };
  }
}

/**
 * Execute shell command in isolated environment
 */
export function execCommand(command, options = {}) {
  const { env, cwd = process.cwd() } = options;

  try {
    const result = execSync(command, {
      encoding: 'utf8',
      timeout: options.timeout || TEST_TIMEOUT,
      cwd,
      env: { ...process.env, ...env },
      stdio: 'pipe'
    });

    return {
      exitCode: 0,
      stdout: result,
      stderr: '',
      success: true
    };
  } catch (error) {
    return {
      exitCode: error.status || 1,
      stdout: error.stdout || '',
      stderr: error.stderr || '',
      success: false,
      error
    };
  }
}

/**
 * Verify file exists in test environment
 */
export async function assertFileExists(filePath, message) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    throw new Error(`${message}: ${filePath} does not exist`);
  }
}

/**
 * Verify directory exists and is not empty
 */
export async function assertDirectoryNotEmpty(dirPath, message) {
  try {
    await access(dirPath, constants.F_OK);
    const { readdirSync } = await import('node:fs');
    const files = readdirSync(dirPath);
    if (files.length === 0) {
      throw new Error(`${message}: ${dirPath} is empty`);
    }
    return true;
  } catch (error) {
    throw new Error(`${message}: ${error.message}`);
  }
}

/**
 * Create a basic Vite React project for template testing
 */
export async function createViteProject(projectDir, env) {
  // Use npm create vite with immediate flag for non-interactive setup
  const result = execCommand(
    `npm create vite@latest . -- --template react --no-interactive --immediate`,
    { cwd: projectDir, env }
  );

  if (!result.success) {
    throw new Error(`Failed to create Vite project: ${result.stderr}`);
  }

  return result;
}

/**
 * Create a minimal test project with specific content
 */
export async function createTestProject(projectDir, files) {
  const { writeFile } = await import('node:fs/promises');

  await mkdir(projectDir, { recursive: true });

  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = join(projectDir, filePath);
    const dir = join(fullPath, '..');
    await mkdir(dir, { recursive: true });
    await writeFile(fullPath, content, 'utf8');
  }
}

/**
 * Verify M5NV_HOME isolation - ensure no artifacts outside test directory
 */
export async function verifyIsolation(testEnv) {
  const { homedir } = await import('node:os');
  const userHome = homedir();
  const userM5nv = join(userHome, '.m5nv');

  // Check that test didn't pollute user's home directory
  try {
    await access(join(userM5nv, 'cache'), constants.F_OK);
    // If this exists, it's okay - user might have real usage
    // But let's check if our test data leaked
    const { readdirSync } = await import('node:fs');
    const cacheContents = readdirSync(join(userM5nv, 'cache'));

    // Test data should be in test environment, not user home
    const testDataInUserCache = cacheContents.some(name =>
      name.includes(testEnv.testId)
    );

    if (testDataInUserCache) {
      throw new Error(`Test data leaked to user cache: ${testEnv.testId}`);
    }
  } catch (error) {
    // User .m5nv doesn't exist or no cache directory - that's fine
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  return true;
}
