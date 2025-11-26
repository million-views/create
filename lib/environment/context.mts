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
 * Context options for user selections
 */
export interface ContextOptions {
  raw: readonly string[];
  byDimension: Readonly<Record<string, string | readonly string[]>>;
}

/**
 * Context object passed to template setup scripts
 */
export interface Context {
  projectName: string;
  projectDir: string;
  cwd: string;
  authoring: 'wysiwyg' | 'composable';
  authorAssetsDir: string;
  inputs: Readonly<Record<string, string | number | boolean>>;
  constants: Readonly<Record<string, unknown>>;
  options: ContextOptions;
}

/**
 * Options for createContext function
 */
export interface CreateContextOptions {
  projectName: string;
  projectDirectory: string;
  cwd?: string;
  authoring?: 'wysiwyg' | 'composable';
  authorAssetsDir?: string;
  inputs?: Record<string, string | number | boolean>;
  constants?: Record<string, unknown>;
  options?: {
    raw?: string[];
    byDimension?: Record<string, string | string[]>;
  };
}

/**
 * Validation error for context construction
 */
export class ContextValidationError extends Error {
  field: string;

  constructor(message: string, field: string) {
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
export function createContext(options: CreateContextOptions) {
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
export function isContext(value: unknown): value is Context {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const ctx = value as Record<string, unknown>;

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
    Array.isArray((ctx.options as ContextOptions).raw) &&
    typeof (ctx.options as ContextOptions).byDimension === 'object'
  );
}
