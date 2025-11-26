#!/usr/bin/env node

/**
 * Placeholders API for template setup scripts.
 *
 * @module lib/environment/tools/placeholders
 */

import fs from 'fs/promises';
import {
  SetupSandboxError,
  UTF8,
  DEFAULT_SELECTOR,
  findMatchingFiles,
  resolveProjectPath,
  validateReplacements
} from '../utils.mjs';
import { createTokenPattern } from '../../placeholder/format.mjs';

/**
 * Apply replacements to content.
 * @param {string} content - Original content
 * @param {Record<string, string>} replacements - Replacements map
 * @param {string} placeholderFormat - Placeholder format
 * @returns {string}
 */
function applyReplacements(content, replacements, placeholderFormat = 'unicode') {
  let result = content;
  for (const [token, replacement] of Object.entries(replacements)) {
    const pattern = createTokenPattern(token, placeholderFormat);
    result = result.replace(pattern, replacement);
  }
  return result;
}

/**
 * Replace placeholders in a single file.
 * @param {string} root - Project root
 * @param {string} file - File path
 * @param {Record<string, string>} replacements - Replacements map
 * @param {string} placeholderFormat - Placeholder format
 */
async function replaceInFile(root, file, replacements, placeholderFormat = 'unicode') {
  const absolute = resolveProjectPath(root, file, 'file path');
  const original = await fs.readFile(absolute, UTF8);
  const updated = applyReplacements(original, replacements, placeholderFormat);

  if (updated !== original) {
    await fs.writeFile(absolute, updated, UTF8);
  }
}

/**
 * Replace placeholders in all matching files.
 * @param {string} root - Project root
 * @param {Record<string, string>} replacements - Replacements map
 * @param {string | string[]} selector - File pattern(s)
 * @param {string} placeholderFormat - Placeholder format
 */
async function replaceAll(root, replacements, selector, placeholderFormat = 'unicode') {
  const matches = await findMatchingFiles(root, selector);

  for (const match of matches) {
    const original = await fs.readFile(match.absolute, UTF8);
    const updated = applyReplacements(original, replacements, placeholderFormat);
    if (original !== updated) {
      await fs.writeFile(match.absolute, updated, UTF8);
    }
  }
}

/**
 * Stringify a replacement value.
 * @param {unknown} value - Value to stringify
 * @returns {string}
 */
function stringifyReplacementValue(value) {
  if (typeof value === 'string') {
    return value;
  }

  if (value === null || value === undefined) {
    throw new SetupSandboxError('Placeholder replacement values cannot be null or undefined');
  }

  return String(value);
}

/**
 * Build replacements from inputs and extras.
 * @param {Object} placeholderContext - Placeholder context
 * @param {Record<string, unknown>} extra - Extra replacements
 * @returns {Record<string, string>}
 */
function buildInputReplacements(placeholderContext, extra) {
  const result = {};
  const sourceInputs = placeholderContext?.inputs ?? {};

  for (const [token, value] of Object.entries(sourceInputs)) {
    if (value === undefined || value === null) {
      continue;
    }
    result[token] = stringifyReplacementValue(value);
  }

  if (!Object.prototype.hasOwnProperty.call(result, 'PACKAGE_NAME') && placeholderContext?.projectName) {
    result.PACKAGE_NAME = String(placeholderContext.projectName);
  }

  for (const [token, value] of Object.entries(extra)) {
    if (value === undefined || value === null) {
      continue;
    }
    if (typeof token !== 'string' || token.trim() === '') {
      throw new SetupSandboxError('tools.placeholders.applyInputs extras must use string tokens');
    }
    result[token] = stringifyReplacementValue(value);
  }

  return result;
}

/**
 * Create a placeholders API for setup scripts.
 *
 * @param {string} root - Project root directory
 * @param {Object} placeholderContext - Placeholder context
 * @param {string} [placeholderContext.placeholderFormat] - Placeholder format
 * @param {Record<string, unknown>} [placeholderContext.inputs] - Input values
 * @param {string} [placeholderContext.projectName] - Project name
 * @returns {Object} Frozen placeholders API
 */
export function buildPlaceholdersApi(root, placeholderContext) {
  const placeholderFormat = placeholderContext?.placeholderFormat || 'unicode';

  return Object.freeze({
    /**
     * Replace placeholders in files.
     * @param {Record<string, string>} replacements - Replacements map
     * @param {string | string[]} [selector] - File pattern(s)
     */
    async replaceAll(replacements, selector = DEFAULT_SELECTOR) {
      validateReplacements(replacements);
      await replaceAll(root, replacements, selector, placeholderFormat);
    },

    /**
     * Replace placeholders in a single file.
     * @param {string} file - File path
     * @param {Record<string, string>} replacements - Replacements map
     */
    async replaceInFile(file, replacements) {
      validateReplacements(replacements);
      await replaceInFile(root, file, replacements, placeholderFormat);
    },

    /**
     * Apply input values to files.
     * @param {string | string[]} [selector] - File pattern(s)
     * @param {Record<string, unknown>} [extra] - Extra replacements
     */
    async applyInputs(selector = DEFAULT_SELECTOR, extra = {}) {
      if (extra === null || typeof extra !== 'object' || Array.isArray(extra)) {
        throw new SetupSandboxError('tools.placeholders.applyInputs extras must be provided as an object');
      }

      const replacements = buildInputReplacements(placeholderContext, extra);
      if (Object.keys(replacements).length === 0) {
        return;
      }

      validateReplacements(replacements);
      await replaceAll(root, replacements, selector, placeholderFormat);
    }
  });
}

// Export applyReplacements for use by templates API
export { applyReplacements };
