#!/usr/bin/env node
// @ts-nocheck

/**
 * Setup Runtime - Template Setup Script Execution
 *
 * This module provides the secure sandbox for executing template setup scripts (_setup.mjs).
 * It handles:
 * - L3: Sandbox execution with VM isolation
 * - L2: Tools factory (delegated to lib/environment)
 *
 * @module bin/create-scaffold/modules/setup-runtime
 */

import fs from 'fs/promises';
import vm from 'vm';
import { createTools } from '@m5nv/create-scaffold/lib/environment/tools/create.mts';
import { SetupSandboxError } from '@m5nv/create-scaffold/lib/environment/utils.mts';

// Re-export for backward compatibility
export { SetupSandboxError };

const UTF8 = 'utf8';

/**
 * Transform ES module source to CommonJS for VM execution.
 * @param {string} source - Original source code
 * @returns {string} Transformed source
 */
function transformModuleSource(source) {
  if (/(^|\s)import\s+[^(']/m.test(source)) {
    throw new SetupSandboxError('Import is disabled inside setup scripts. Use provided tools instead.');
  }

  if (!/export\s+default\s+/m.test(source)) {
    throw new SetupSandboxError('Setup scripts must export a default async function that receives the Environment object ({ ctx, tools }).');
  }

  return source.replace(/export\s+default\s+/g, 'module.exports.default = ');
}

/**
 * Create a sandboxed VM context for setup script execution.
 * @returns {vm.Context} Sandboxed context
 */
function createSandboxContext() {
  const context = vm.createContext({}, {
    name: 'SetupSandbox',
    codeGeneration: { strings: false, wasm: false }
  });

  const forbidden = (name) => () => {
    throw new SetupSandboxError(`${name} is disabled inside setup scripts. Use provided tools instead.`);
  };

  context.console = console;
  context.global = context;
  context.globalThis = context;
  if (typeof structuredClone === 'function') {
    context.structuredClone = structuredClone;
  }
  context.setTimeout = setTimeout;
  context.clearTimeout = clearTimeout;
  context.setInterval = setInterval;
  context.clearInterval = clearInterval;
  context.process = { env: process.env };
  context.eval = forbidden('eval');
  context.Function = forbidden('Function');
  context.require = forbidden('require');
  context.import = forbidden('import');
  context.module = { exports: {} };
  context.exports = context.module.exports;

  return context;
}

/**
 * Load and execute a setup script in a secure sandbox.
 *
 * @param {string} setupPath - Absolute path to _setup.mjs
 * @param {Object} ctx - Context object
 * @param {Object} tools - Tools object
 * @param {Object} [_logger] - Logger (unused, kept for API compatibility)
 * @returns {Promise<unknown>} Result from setup script
 */
export async function loadSetupScript(setupPath, ctx, tools, _logger = null) {
  const scriptSource = await fs.readFile(setupPath, UTF8);
  const transformedSource = transformModuleSource(scriptSource);
  const context = createSandboxContext();

  try {
    const script = new vm.Script(transformedSource, {
      filename: setupPath,
      displayErrors: true
    });
    script.runInContext(context, { displayErrors: true });
  } catch (error) {
    throw new SetupSandboxError(error.message);
  }

  const entry = context.module?.exports?.default ?? context.exports?.default;

  if (typeof entry !== 'function') {
    throw new SetupSandboxError(
      'Setup scripts must export a default async function that receives the Environment object ({ ctx, tools }).'
    );
  }

  if (entry.length >= 2) {
    throw new SetupSandboxError(
      'Setup scripts must accept a single Environment object. Use `export default async function setup({ ctx, tools })`.'
    );
  }

  const environment = Object.freeze({ ctx, tools });
  try {
    return await entry(environment);
  } catch (error) {
    throw new SetupSandboxError(`Setup script execution failed: ${error.message}`);
  }
}

/**
 * Create tools for setup scripts.
 *
 * This is a compatibility wrapper that delegates to lib/environment.
 *
 * @param {Object} options - Configuration options
 * @param {string} options.projectDirectory - Absolute path to project directory
 * @param {string} options.projectName - Sanitized project name
 * @param {Object} options.logger - Logger with info/warn methods
 * @param {Object} [options.templateContext] - Template context
 * @param {Object} [options.dimensions] - Dimension definitions
 * @param {Object} [options.options] - User-selected options
 * @returns {Object} Tools object
 */
export function createSetupTools(options) {
  const {
    projectDirectory,
    projectName,
    logger,
    templateContext,
    dimensions = {},
    options: userOptions = { raw: [], byDimension: {} }
  } = options;

  const silentLogger = { info() {}, warn() {} };

  return createTools({
    projectDirectory,
    projectName,
    logger: logger ?? silentLogger,
    inputs: templateContext?.inputs ?? {},
    constants: templateContext?.constants ?? {},
    authorAssetsDir: templateContext?.authorAssetsDir ?? '__scaffold__',
    placeholderFormat: templateContext?.placeholderFormat ?? 'unicode',
    authoring: templateContext?.authoring ?? 'wysiwyg',
    dimensions,
    options: userOptions
  });
}
