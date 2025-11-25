#!/usr/bin/env node

/**
 * Environment Context Module
 *
 * Defines and constructs the immutable `ctx` object passed to template setup scripts.
 * This is part of the Environment contract between the CLI and template authors.
 *
 * @module lib/environment/context
 */

import path from 'path';

/**
 * Default directory name for template author assets
 * @type {string}
 */
export const DEFAULT_AUTHOR_ASSETS_DIR = '__scaffold__';

/**
 * Default template authoring mode
 * @type {'wysiwyg' | 'composable'}
 */
export const DEFAULT_AUTHORING_MODE = 'wysiwyg';

/**
 * @typedef {Object} ContextOptions
 * @property {readonly string[]} raw - Raw option strings as provided by user
 * @property {Readonly<Record<string, string | readonly string[]>>} byDimension - Options organized by dimension name
 */

/**
 * @typedef {Object} Context
 * @property {string} projectName - Sanitized project name (letters, numbers, hyphen, underscore)
 * @property {string} projectDir - Absolute path to the project directory
 * @property {string} cwd - Directory where the CLI command was executed
 * @property {'wysiwyg' | 'composable'} authoring - Template authoring mode from template.json
 * @property {string} authorAssetsDir - Directory name for template assets (default: '__scaffold__')
 * @property {Readonly<Record<string, string | number | boolean>>} inputs - Placeholder values
 * @property {Readonly<Record<string, unknown>>} constants - Template-defined constants
 * @property {ContextOptions} options - Normalized user selections with defaults applied
 */

/**
 * @typedef {Object} CreateContextOptions
 * @property {string} projectName - Sanitized project name
 * @property {string} projectDirectory - Path to project directory (will be resolved to absolute)
 * @property {string} [cwd] - Current working directory (default: process.cwd())
 * @property {'wysiwyg' | 'composable'} [authoring] - Template authoring mode (default: 'wysiwyg')
 * @property {string} [authorAssetsDir] - Assets directory name (default: '__scaffold__')
 * @property {Record<string, string | number | boolean>} [inputs] - Placeholder values
 * @property {Record<string, unknown>} [constants] - Template constants
 * @property {Object} [options] - User selections
 * @property {string[]} [options.raw] - Raw option strings
 * @property {Record<string, string | string[]>} [options.byDimension] - Options by dimension
 */

/**
 * Validation error for context construction
 */
export class ContextValidationError extends Error {
  /**
   * @param {string} message
   * @param {string} field
   */
  constructor(message, field) {
    super(message);
    this.name = 'ContextValidationError';
    this.field = field;
  }
}

/**
 * Create an immutable Context object.
 *
 * The Context provides read-only information about the project being scaffolded.
 * All properties are deeply frozen to prevent accidental mutation by setup scripts.
 *
 * @param {CreateContextOptions} options - Context construction options
 * @returns {Context} Immutable context object
 * @throws {ContextValidationError} If required options are missing or invalid
 *
 * @example
 * const ctx = createContext({
 *   projectName: 'my-app',
 *   projectDirectory: '/path/to/my-app',
 *   inputs: { AUTHOR: 'Jane Doe' }
 * });
 */
export function createContext(options) {
  const {
    projectName,
    projectDirectory,
    cwd = process.cwd(),
    authoring = DEFAULT_AUTHORING_MODE,
    authorAssetsDir = DEFAULT_AUTHOR_ASSETS_DIR,
    inputs = {},
    constants = {},
    options: userOptions = { raw: [], byDimension: {} }
  } = options ?? {};

  // Validation
  if (!projectName || typeof projectName !== 'string') {
    throw new ContextValidationError(
      'projectName is required and must be a non-empty string',
      'projectName'
    );
  }

  if (!projectDirectory || typeof projectDirectory !== 'string') {
    throw new ContextValidationError(
      'projectDirectory is required and must be a non-empty string',
      'projectDirectory'
    );
  }

  if (authoring !== 'wysiwyg' && authoring !== 'composable') {
    throw new ContextValidationError(
      `authoring must be 'wysiwyg' or 'composable', got: ${authoring}`,
      'authoring'
    );
  }

  const resolvedDir = path.resolve(projectDirectory);

  // Deep freeze the options object
  const frozenOptions = Object.freeze({
    raw: Object.freeze([...(userOptions.raw || [])]),
    byDimension: Object.freeze(
      Object.fromEntries(
        Object.entries(userOptions.byDimension || {}).map(([k, v]) => [
          k,
          Array.isArray(v) ? Object.freeze([...v]) : v
        ])
      )
    )
  });

  return Object.freeze({
    projectName,
    projectDir: resolvedDir,
    cwd,
    authoring,
    authorAssetsDir,
    inputs: Object.freeze({ ...inputs }),
    constants: Object.freeze({ ...constants }),
    options: frozenOptions
  });
}

/**
 * Check if a value is a valid Context object.
 *
 * @param {unknown} value - Value to check
 * @returns {value is Context} True if value is a valid Context
 */
export function isContext(value) {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const ctx = /** @type {Record<string, unknown>} */ (value);

  return (
    typeof ctx.projectName === 'string' &&
    typeof ctx.projectDir === 'string' &&
    typeof ctx.cwd === 'string' &&
    (ctx.authoring === 'wysiwyg' || ctx.authoring === 'composable') &&
    typeof ctx.authorAssetsDir === 'string' &&
    typeof ctx.inputs === 'object' &&
    ctx.inputs !== null &&
    typeof ctx.constants === 'object' &&
    ctx.constants !== null &&
    typeof ctx.options === 'object' &&
    ctx.options !== null &&
    Array.isArray(ctx.options.raw) &&
    typeof ctx.options.byDimension === 'object'
  );
}
