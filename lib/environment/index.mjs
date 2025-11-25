#!/usr/bin/env node

/**
 * Environment Module - Main Entry Point
 *
 * The Environment module provides the execution context for template setup scripts.
 * It exports factory functions for creating Context and testing utilities.
 *
 * The Environment object `{ ctx, tools }` is passed to template setup.mjs scripts
 * to provide access to project information and tool APIs.
 *
 * @module lib/environment
 *
 * @example
 * // Creating a Context for production use
 * import { createContext } from './lib/environment/index.mjs';
 *
 * const ctx = createContext({
 *   projectName: 'my-app',
 *   projectDirectory: '/path/to/my-app',
 *   authoring: 'wysiwyg'
 * });
 *
 * @example
 * // Creating test fixtures
 * import { createTestContext, createTestLogger } from './lib/environment/index.mjs';
 *
 * const ctx = createTestContext({ projectName: 'test-app' });
 * const logger = createTestLogger();
 */

// Context exports
export {
  createContext,
  isContext,
  ContextValidationError,
  DEFAULT_AUTHOR_ASSETS_DIR,
  DEFAULT_AUTHORING_MODE
} from './context.mjs';

// Testing utilities
export {
  createTestContext,
  createTestLogger,
  createSilentLogger,
  TEST_DEFAULTS
} from './testing.mjs';

/**
 * @typedef {import('./context.mjs').Context} Context
 * @typedef {import('./context.mjs').ContextInput} ContextInput
 */
