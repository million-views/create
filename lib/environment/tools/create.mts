#!/usr/bin/env node

/**
 * Environment Tools Factory
 *
 * Creates the tools object for template setup scripts.
 * All tool implementations are now in this module.
 *
 * @module lib/environment/tools
 */

import path from 'path';
import { buildPlaceholdersApi } from './placeholders.mts';
import { buildInputsApi } from './inputs.mts';
import { buildFilesApi } from './files.mts';
import { buildJsonApi } from './json.mts';
import { buildTemplatesApi } from './templates.mts';
import { buildTextApi } from './text.mts';
import { buildLoggerApi } from './logger.mts';
import { buildOptionsApi } from './options.mts';

/**
 * @typedef {Object} ToolsConfig
 * @property {string} projectDirectory - Absolute path to project directory
 * @property {string} projectName - Sanitized project name
 * @property {Object} [logger] - Logger with info/warn methods
 * @property {Record<string, string | number | boolean>} [inputs] - Placeholder values
 * @property {Record<string, unknown>} [constants] - Template constants
 * @property {string} [authorAssetsDir] - Author assets directory name
 * @property {string} [placeholderFormat] - Placeholder format (unicode/double-brace)
 * @property {'wysiwyg' | 'composable'} [authoring] - Template authoring mode
 * @property {Object} [dimensions] - Dimension definitions for options
 * @property {Object} [options] - User-selected options
 */

/**
 * Logger interface for tools
 */
interface ToolsLogger {
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
}

/**
 * Configuration for createTools function
 */
export interface ToolsConfig {
  projectDirectory: string;
  projectName: string;
  logger?: ToolsLogger;
  inputs?: Record<string, string | number | boolean>;
  constants?: Record<string, unknown>;
  authorAssetsDir?: string;
  placeholderFormat?: string;
  authoring?: 'wysiwyg' | 'composable';
  dimensions?: Record<string, unknown>;
  options?: {
    raw?: string[];
    byDimension?: Record<string, string | string[]>;
  };
}

/**
 * @typedef {Object} Tools
 * @property {Object} placeholders - Placeholder replacement API
 * @property {Object} inputs - Input values API
 * @property {Object} files - File operations API
 * @property {Object} json - JSON manipulation API
 * @property {Object} templates - Template copying API
 * @property {Object} text - Text manipulation API
 * @property {Object} logger - Logging API
 * @property {Object} options - User options API
 */

/**
 * Default silent logger for testing.
 * @type {Object}
 */
const SILENT_LOGGER = Object.freeze({
  info() { },
  warn() { }
});

/**
 * Create a Tools object for template setup scripts.
 *
 * @param {ToolsConfig} config - Tools configuration
 * @returns {Tools} The tools object (synchronous - no async needed)
 *
 * @example
 * const tools = createTools({
 *   projectDirectory: '/path/to/project',
 *   projectName: 'my-app',
 *   inputs: { AUTHOR: 'Jane' }
 * });
 */
export function createTools(config: ToolsConfig) {
  const {
    projectDirectory,
    projectName,
    logger = SILENT_LOGGER,
    inputs = {},
    authorAssetsDir = '__scaffold__',
    placeholderFormat = 'unicode',
    dimensions = {},
    options = { raw: [], byDimension: {} }
  } = config;

  const root = path.resolve(projectDirectory);

  const placeholderContext = {
    projectName,
    inputs,
    placeholderFormat
  };

  return Object.freeze({
    placeholders: buildPlaceholdersApi(root, placeholderContext),
    inputs: buildInputsApi(inputs),
    files: buildFilesApi(root),
    json: buildJsonApi(root),
    templates: buildTemplatesApi(root, authorAssetsDir, placeholderFormat),
    text: buildTextApi(root),
    logger: buildLoggerApi(logger),
    options: buildOptionsApi({ options, dimensions })
  });
}

/**
 * Check if a value is a valid Tools object.
 *
 * @param {unknown} value - Value to check
 * @returns {value is Tools} True if value has the Tools shape
 */
export function isTools(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const tools = value as Record<string, unknown>;

  return (
    typeof tools.placeholders === 'object' && tools.placeholders !== null &&
    typeof tools.inputs === 'object' && tools.inputs !== null &&
    typeof tools.files === 'object' && tools.files !== null &&
    typeof tools.json === 'object' && tools.json !== null &&
    typeof tools.templates === 'object' && tools.templates !== null &&
    typeof tools.text === 'object' && tools.text !== null &&
    typeof tools.logger === 'object' && tools.logger !== null &&
    typeof tools.options === 'object' && tools.options !== null
  );
}
