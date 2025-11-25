#!/usr/bin/env node

/**
 * Environment Tools Factory
 *
 * Creates the tools object for template setup scripts.
 * This module delegates to setup-runtime.mjs but provides a cleaner API
 * that aligns with the Environment module design.
 *
 * Note: This is a transitional module. Future work should migrate the actual
 * tool implementations from setup-runtime.mjs into this module.
 *
 * @module lib/environment/tools
 */

import { createSetupTools } from '../../../bin/create-scaffold/modules/setup-runtime.mjs';

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
 * This factory wraps the setup-runtime.mjs createSetupTools function
 * with a cleaner, more explicit API.
 *
 * @param {ToolsConfig} config - Tools configuration
 * @returns {Promise<Tools>} The tools object
 *
 * @example
 * const tools = await createTools({
 *   projectDirectory: '/path/to/project',
 *   projectName: 'my-app',
 *   inputs: { AUTHOR: 'Jane' }
 * });
 */
export async function createTools(config) {
  const {
    projectDirectory,
    projectName,
    logger = SILENT_LOGGER,
    inputs = {},
    constants = {},
    authorAssetsDir = '__scaffold__',
    placeholderFormat = 'unicode',
    authoring = 'wysiwyg',
    dimensions = {},
    options = { raw: [], byDimension: {} }
  } = config;

  // Delegate to setup-runtime.mjs for now
  // Future: implement tools directly here
  return createSetupTools({
    projectDirectory,
    projectName,
    logger,
    templateContext: {
      inputs,
      constants,
      authorAssetsDir,
      placeholderFormat,
      authoring
    },
    dimensions,
    options
  });
}

/**
 * Check if a value is a valid Tools object.
 *
 * @param {unknown} value - Value to check
 * @returns {value is Tools} True if value has the Tools shape
 */
export function isTools(value) {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const tools = /** @type {Record<string, unknown>} */ (value);

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
