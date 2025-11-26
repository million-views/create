#!/usr/bin/env node

/**
 * Environment Module - Main Entry Point
 *
 * The Environment module provides the execution context for template setup scripts.
 * It exports factory functions for creating Context, Tools, and testing utilities.
 *
 * The Environment object `{ ctx, tools }` is passed to template setup.mjs scripts
 * to provide access to project information and tool APIs.
 *
 * @module lib/environment
 *
 * @example
 * // Creating a Context for production use
 * import { createContext } from './lib/environment/index.mts';
 *
 * const ctx = createContext({
 *   projectName: 'my-app',
 *   projectDirectory: '/path/to/my-app',
 *   authoring: 'wysiwyg'
 * });
 *
 * @example
 * // Creating test fixtures
 * import {
 *   createTestContext,
 *   createTestTools,
 *   createTestEnvironment,
 *   createTestLogger
 * } from './lib/environment/index.mts';
 *
 * const ctx = createTestContext({ projectName: 'test-app' });
 * const tools = await createTestTools({ projectDirectory: tempDir });
 * const { ctx, tools } = await createTestEnvironment({ projectDirectory: tempDir });
 */

// Context exports
export {
  createContext,
  isContext,
  ContextValidationError,
  DEFAULT_AUTHOR_ASSETS_DIR,
  DEFAULT_AUTHORING_MODE
} from './context.mts';

// Tools exports
export {
  createTools,
  isTools
} from './tools/index.mts';

// Utility exports
export { SetupSandboxError } from './utils.mts';

// Testing utilities
export {
  createTestContext,
  createTestTools,
  createTestEnvironment,
  createTestLogger,
  createSilentLogger,
  TEST_DEFAULTS
} from './testing.mts';

/**
 * @typedef {import('./context.mts').Context} Context
 * @typedef {import('./context.mts').ContextInput} ContextInput
 * @typedef {import('./tools/index.mts').Tools} Tools
 * @typedef {import('./tools/index.mts').ToolsConfig} ToolsConfig
 */
