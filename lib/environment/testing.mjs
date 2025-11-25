#!/usr/bin/env node

/**
 * Environment Testing Utilities
 *
 * Provides factory functions for creating test fixtures with sensible defaults.
 * These utilities make it easy to create valid Environment, Context, and Tools
 * objects for testing without manually constructing all required properties.
 *
 * @module lib/environment/testing
 */

import path from 'path';
import os from 'os';
import { createContext, DEFAULT_AUTHOR_ASSETS_DIR, DEFAULT_AUTHORING_MODE } from './context.mjs';

/**
 * Default values for test environments.
 * These provide sensible defaults that work for most test scenarios.
 * @type {Readonly<{
 *   projectName: string,
 *   projectDirectory: string,
 *   authoring: 'wysiwyg' | 'composable',
 *   authorAssetsDir: string,
 *   placeholderFormat: string
 * }>}
 */
export const TEST_DEFAULTS = Object.freeze({
  projectName: 'test-project',
  projectDirectory: path.join(os.tmpdir(), 'test-project'),
  authoring: DEFAULT_AUTHORING_MODE,
  authorAssetsDir: DEFAULT_AUTHOR_ASSETS_DIR,
  placeholderFormat: 'unicode'
});

/**
 * Create a minimal valid Context for testing.
 *
 * This function provides sensible defaults so tests only need to specify
 * the properties they care about. The returned Context is fully frozen.
 *
 * @param {Object} [overrides] - Properties to override from defaults
 * @param {string} [overrides.projectName] - Project name (default: 'test-project')
 * @param {string} [overrides.projectDirectory] - Project directory path
 * @param {string} [overrides.cwd] - Current working directory
 * @param {'wysiwyg' | 'composable'} [overrides.authoring] - Authoring mode
 * @param {string} [overrides.authorAssetsDir] - Author assets directory name
 * @param {Record<string, string | number | boolean>} [overrides.inputs] - Placeholder inputs
 * @param {Record<string, unknown>} [overrides.constants] - Template constants
 * @param {Object} [overrides.options] - User options
 * @returns {import('./context.mjs').Context} A valid immutable Context
 *
 * @example
 * // Minimal usage - uses all defaults
 * const ctx = createTestContext();
 *
 * @example
 * // Override specific properties
 * const ctx = createTestContext({
 *   projectName: 'my-test-app',
 *   inputs: { AUTHOR: 'Test Author' }
 * });
 */
export function createTestContext(overrides = {}) {
  return createContext({
    projectName: overrides.projectName ?? TEST_DEFAULTS.projectName,
    projectDirectory: overrides.projectDirectory ?? TEST_DEFAULTS.projectDirectory,
    cwd: overrides.cwd,
    authoring: overrides.authoring ?? TEST_DEFAULTS.authoring,
    authorAssetsDir: overrides.authorAssetsDir ?? TEST_DEFAULTS.authorAssetsDir,
    inputs: overrides.inputs,
    constants: overrides.constants,
    options: overrides.options
  });
}

/**
 * Create a stub logger for testing that captures log calls.
 *
 * The returned logger records all calls to info() and warn() in arrays,
 * allowing tests to verify logging behavior.
 *
 * @returns {{
 *   info: (msg: string) => void,
 *   warn: (msg: string) => void,
 *   infoCalls: string[],
 *   warnCalls: string[]
 * }}
 *
 * @example
 * const logger = createTestLogger();
 * // ... use logger ...
 * assert.ok(logger.infoCalls.some(msg => msg.includes('expected message')));
 */
export function createTestLogger() {
  const infoCalls = [];
  const warnCalls = [];

  return {
    info(msg) {
      infoCalls.push(msg);
    },
    warn(msg) {
      warnCalls.push(msg);
    },
    infoCalls,
    warnCalls
  };
}

/**
 * Create a silent logger for testing (no-op).
 *
 * Use this when you don't care about log output and want to suppress it.
 *
 * @returns {{ info: () => void, warn: () => void }}
 */
export function createSilentLogger() {
  return {
    info() { },
    warn() { }
  };
}
