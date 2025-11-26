#!/usr/bin/env node

/**
 * Centralized temp directory management for tests
 *
 * All test artifacts should be created under the project's tmp/ folder,
 * NOT in the system's /tmp directory. This ensures:
 * 1. Test artifacts are contained within the project
 * 2. They are covered by .gitignore
 * 3. Easy cleanup and inspection during development
 *
 * PATTERN: Use join(process.cwd(), 'tmp', ...) for test directories
 * This is the same pattern used by E2E tests (see tests/e2e/test-helpers.mjs)
 */

import fs from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Create a unique temp directory for a test
 *
 * @param {string} prefix - Prefix for the temp directory name
 * @param {string} [category='tests'] - Category subfolder (e.g., 'e2e-tests', 'unit-tests')
 * @returns {Promise<string>} Path to the created temp directory
 */
export async function createTempDir(prefix, category = 'tests') {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  const dirName = `${prefix}-${timestamp}-${random}`;
  const tempDir = join(process.cwd(), 'tmp', category, dirName);

  await fs.mkdir(tempDir, { recursive: true });
  return tempDir;
}

/**
 * Create a temp directory that auto-cleans up after the test
 *
 * @param {object} t - Node.js test context (with t.after)
 * @param {string} prefix - Prefix for the temp directory name
 * @param {string} [category='tests'] - Category subfolder
 * @returns {Promise<string>} Path to the created temp directory
 */
export async function createTempDirWithCleanup(t, prefix, category = 'tests') {
  const tempDir = await createTempDir(prefix, category);

  if (t?.after) {
    t.after(async () => {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    });
  }

  return tempDir;
}
