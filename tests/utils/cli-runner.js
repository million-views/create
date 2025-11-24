/**
 * CLI Router Test Runner
 *
 * Provides consistent test environment for CLI command testing (L4 layer)
 * - Isolated temp directories per test
 * - Environment variable management
 * - Output capture with ANSI stripping
 * - Cache directory isolation
 * - Cleanup hooks
 *
 * Usage:
 *   const result = await runCLI('create-scaffold', ['new', 'my-template'], {
 *     cwd: '/path/to/test/dir',
 *     env: { M5NV_DEBUG: '1' }
 *   });
 *
 *   assert.strictEqual(result.exitCode, 0);
 *   assertOutputContains(result.stdout, ['✅', 'Success']);
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { tmpdir } from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../..');

/**
 * CLI entry point paths
 */
const CLI_PATHS = {
  'create-scaffold': path.join(PROJECT_ROOT, 'bin/create-scaffold/index.mjs'),
  'make-template': path.join(PROJECT_ROOT, 'bin/make-template/index.mjs')
};

/**
 * Execute CLI command in isolated test environment
 *
 * @param {string} command - CLI command name ('create-scaffold' or 'make-template')
 * @param {string[]} argv - Command arguments (e.g., ['new', 'template-name'])
 * @param {object} options - Test options
 * @param {string} [options.cwd] - Working directory (defaults to temp dir)
 * @param {object} [options.env] - Additional environment variables
 * @param {number} [options.timeout=30000] - Timeout in milliseconds
 * @param {boolean} [options.isolateCache=true] - Use isolated cache directory
 * @param {string} [options.stdin] - Input to send to stdin (for non-interactive tests)
 * @param {boolean} [options.debug=false] - Enable debug logging
 * @returns {Promise<CLIResult>}
 */
export async function runCLI(command, argv = [], options = {}) {
  const {
    cwd,
    env = {},
    timeout = 30000,
    isolateCache = true,
    stdin = null,
    debug = false
  } = options;

  // Resolve CLI path
  const cliPath = CLI_PATHS[command];
  if (!cliPath) {
    throw new Error(`Unknown CLI command: ${command}. Use 'create-scaffold' or 'make-template'`);
  }

  // Create isolated temp directory if cwd not provided
  // Default to project root to allow access to test fixtures
  const tempDir = cwd || PROJECT_ROOT;
  const cleanupTempDir = false;

  // Create isolated cache directory
  let cacheDir = null;
  if (isolateCache) {
    cacheDir = await fs.mkdtemp(path.join(tmpdir(), 'cli-test-cache-'));
  }

  // Build test environment
  const testEnv = {
    ...process.env,
    // Disable interactive prompts
    CI: 'true',
    // Disable color output for consistent assertions
    NO_COLOR: '1',
    FORCE_COLOR: '0',
    // Isolated cache
    ...(cacheDir ? { M5NV_CACHE_DIR: cacheDir } : {}),
    // User-provided env vars (can override above)
    ...env
  };

  if (debug) {
    console.log(`[cli-runner] Executing: ${command} ${argv.join(' ')}`);
    console.log(`[cli-runner] CWD: ${tempDir}`);
    console.log(`[cli-runner] Cache: ${cacheDir || 'default'}`);
  }

  // Execute CLI
  const result = await executeCLI(cliPath, argv, {
    cwd: tempDir,
    env: testEnv,
    timeout,
    stdin,
    debug
  });

  // Add test metadata to result
  result.tempDir = tempDir;
  result.cacheDir = cacheDir;
  result.cleanupTempDir = cleanupTempDir;

  return result;
}

/**
 * Execute CLI command and capture output
 *
 * @private
 * @param {string} cliPath - Path to CLI entry point
 * @param {string[]} argv - Command arguments
 * @param {object} options - Execution options
 * @returns {Promise<object>}
 */
function executeCLI(cliPath, argv, options) {
  const { cwd, env, timeout, stdin, debug } = options;

  return new Promise((resolve, reject) => {
    const child = spawn('node', [cliPath, ...argv], {
      cwd,
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    // Capture stdout
    child.stdout.on('data', (data) => {
      const chunk = data.toString();
      stdout += chunk;
      if (debug) {
        process.stdout.write(`[stdout] ${chunk}`);
      }
    });

    // Capture stderr
    child.stderr.on('data', (data) => {
      const chunk = data.toString();
      stderr += chunk;
      if (debug) {
        process.stderr.write(`[stderr] ${chunk}`);
      }
    });

    // Send stdin if provided
    if (stdin) {
      child.stdin.write(stdin);
      child.stdin.end();
    }

    // Handle timeout
    const timeoutId = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeout);

    // Handle process exit
    child.on('close', (exitCode) => {
      clearTimeout(timeoutId);

      resolve({
        exitCode: exitCode ?? -1,
        stdout,
        stderr,
        timedOut,
        // Provide stripped versions for easier assertions
        stdoutStripped: stripAnsi(stdout),
        stderrStripped: stripAnsi(stderr)
      });
    });

    // Handle spawn errors
    child.on('error', (error) => {
      clearTimeout(timeoutId);
      reject(new Error(`Failed to spawn CLI process: ${error.message}`));
    });
  });
}

/**
 * Cleanup test resources (temp directories, cache)
 *
 * @param {CLIResult} result - Result from runCLI()
 * @returns {Promise<void>}
 */
export async function cleanup(result) {
  const paths = [];

  if (result.cleanupTempDir && result.tempDir) {
    paths.push(result.tempDir);
  }

  if (result.cacheDir) {
    paths.push(result.cacheDir);
  }

  await Promise.all(
    paths.map(p => fs.rm(p, { recursive: true, force: true }).catch(() => { }))
  );
}

/**
 * Strip ANSI escape codes from string
 *
 * @param {string} str - String with ANSI codes
 * @returns {string} Cleaned string
 */
export function stripAnsi(str) {
  return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
}

/**
 * Assert that output contains all expected phrases (case-insensitive)
 *
 * @param {string} output - CLI output (stdout or stderr)
 * @param {string[]} phrases - Expected phrases
 * @param {object} options - Assertion options
 * @param {boolean} [options.stripAnsi=true] - Strip ANSI codes before matching
 * @param {boolean} [options.caseSensitive=false] - Case-sensitive matching
 * @throws {AssertionError} If any phrase not found
 */
export function assertOutputContains(output, phrases, options = {}) {
  const {
    stripAnsi: shouldStrip = true,
    caseSensitive = false
  } = options;

  let searchText = shouldStrip ? stripAnsi(output) : output;
  if (!caseSensitive) {
    searchText = searchText.toLowerCase();
  }

  const missing = [];
  for (const phrase of phrases) {
    const searchPhrase = caseSensitive ? phrase : phrase.toLowerCase();
    if (!searchText.includes(searchPhrase)) {
      missing.push(phrase);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Expected output to contain phrases:\n` +
      `  Missing: ${missing.join(', ')}\n` +
      `  Output: ${searchText.slice(0, 500)}...`
    );
  }
}

/**
 * Assert that output does NOT contain any of the given phrases
 *
 * @param {string} output - CLI output
 * @param {string[]} phrases - Phrases that should not appear
 * @param {object} options - Assertion options
 * @throws {AssertionError} If any phrase found
 */
export function assertOutputExcludes(output, phrases, options = {}) {
  const {
    stripAnsi: shouldStrip = true,
    caseSensitive = false
  } = options;

  let searchText = shouldStrip ? stripAnsi(output) : output;
  if (!caseSensitive) {
    searchText = searchText.toLowerCase();
  }

  const found = [];
  for (const phrase of phrases) {
    const searchPhrase = caseSensitive ? phrase : phrase.toLowerCase();
    if (searchText.includes(searchPhrase)) {
      found.push(phrase);
    }
  }

  if (found.length > 0) {
    throw new Error(
      `Expected output to NOT contain phrases:\n` +
      `  Found: ${found.join(', ')}\n` +
      `  Output: ${searchText.slice(0, 500)}...`
    );
  }
}

// Alias for consistency with positive assertion naming
export const assertOutputDoesNotContain = assertOutputExcludes;

/**
 * Create a temporary test directory with optional initial content
 *
 * @param {string} prefix - Directory name prefix
 * @param {object} initialFiles - Map of relative paths to file contents
 * @returns {Promise<string>} Path to created directory
 */
export async function createTestDir(prefix = 'test-', initialFiles = {}) {
  const tempDir = await fs.mkdtemp(path.join(tmpdir(), prefix));

  for (const [relPath, content] of Object.entries(initialFiles)) {
    const fullPath = path.join(tempDir, relPath);
    const dir = path.dirname(fullPath);

    // Create parent directories
    await fs.mkdir(dir, { recursive: true });

    // Write file
    await fs.writeFile(fullPath, content, 'utf8');
  }

  return tempDir;
}

/**
 * Copy fixture directory to temp location for test mutation
 *
 * @param {string} fixturePath - Path to fixture directory
 * @param {string} [prefix='fixture-'] - Temp directory prefix
 * @returns {Promise<string>} Path to temp copy
 */
export async function copyFixture(fixturePath, prefix = 'fixture-') {
  const tempDir = await fs.mkdtemp(path.join(tmpdir(), prefix));

  // Recursive copy
  await copyRecursive(fixturePath, tempDir);

  return tempDir;
}

/**
 * Recursively copy directory contents
 *
 * @private
 * @param {string} src - Source directory
 * @param {string} dest - Destination directory
 */
async function copyRecursive(src, dest) {
  await fs.mkdir(dest, { recursive: true });

  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyRecursive(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

/**
 * Check if CLI command succeeded
 *
 * @param {CLIResult} result - Result from runCLI()
 * @returns {boolean}
 */
export function isSuccess(result) {
  return result.exitCode === 0 && !result.timedOut;
}

/**
 * Check if CLI command failed
 *
 * @param {CLIResult} result - Result from runCLI()
 * @returns {boolean}
 */
export function isFailure(result) {
  return result.exitCode !== 0 || result.timedOut;
}

/**
 * @typedef {object} CLIResult
 * @property {number} exitCode - Process exit code
 * @property {string} stdout - Raw stdout
 * @property {string} stderr - Raw stderr
 * @property {string} stdoutStripped - Stdout with ANSI codes removed
 * @property {string} stderrStripped - Stderr with ANSI codes removed
 * @property {boolean} timedOut - Whether process was killed due to timeout
 * @property {string} tempDir - Temporary working directory used
 * @property {string|null} cacheDir - Isolated cache directory (if enabled)
 * @property {boolean} cleanupTempDir - Whether tempDir should be cleaned up
 */
