#!/usr/bin/env node
// @ts-nocheck

/**
 * Environment Utilities
 *
 * Policy-bound utility functions for the environment layer.
 * Pure primitives are imported from lib/primitives and wrapped
 * with policy-specific error handling where needed.
 *
 * @module lib/environment/utils
 * @internal
 */

import fs from 'fs/promises';
import path from 'path';
import { shouldIgnoreTemplateEntry } from '../template/ignore.mts';

// Re-export pure primitives for convenience
export {
  escapeRegExp,
  toPosix,
  globToRegExp
} from '../primitives/glob.mts';
export {
  deepMerge,
  deepEqual
} from '../primitives/object.mts';
export {
  ensureLeadingNewline,
  ensureTrailingNewline
} from '../primitives/text.mts';

// Import primitives for internal use
import { normalizeTextInput as primitiveNormalizeTextInput } from '../primitives/text.mts';
import { escapeRegExp, globToRegExp, toPosix } from '../primitives/glob.mts';

export const UTF8 = 'utf8';
export const DEFAULT_SELECTOR = '**/*';

/**
 * Error thrown when setup script sandbox operations fail.
 */
export class SetupSandboxError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SetupSandboxError';
  }
}

/**
 * Normalize text input with policy-specific error messages.
 * Wraps the primitive with SetupSandboxError for consistent error handling.
 * @param {string | string[]} input - Input to normalize
 * @param {string} label - Label for error messages
 * @returns {string}
 */
export function normalizeTextInput(input, label) {
  try {
    return primitiveNormalizeTextInput(input);
  } catch (error) {
    throw new SetupSandboxError(`${label}: ${error.message}`);
  }
}

/**
 * Check if a template entry should be included during copy operations.
 * @param {string} source - Source path
 * @returns {boolean}
 */
export function includeTemplateCopyEntry(source) {
  const name = path.basename(source);
  if (!name) {
    return true;
  }
  return !shouldIgnoreTemplateEntry(name);
}

/**
 * Resolve and validate a path within the project directory.
 * @param {string} root - Project root directory
 * @param {string} relative - Relative path
 * @param {string} [label='path'] - Label for error messages
 * @returns {string} Resolved absolute path
 * @throws {SetupSandboxError} If path escapes project directory
 */
export function resolveProjectPath(root, relative, label = 'path') {
  if (typeof relative !== 'string' || !relative.trim()) {
    throw new SetupSandboxError(`${label} must be a non-empty string`);
  }

  const normalizedRoot = path.resolve(root);
  const target = path.resolve(normalizedRoot, relative);

  if (target !== normalizedRoot && !target.startsWith(normalizedRoot + path.sep)) {
    throw new SetupSandboxError(`${label} must stay within the project directory`);
  }

  return target;
}

/**
 * Ensure parent directory exists for a file path.
 * @param {string} filePath - File path
 */
export async function ensureParentDirectory(filePath) {
  const parent = path.dirname(filePath);
  await fs.mkdir(parent, { recursive: true, mode: 0o755 });
}

/**
 * Walk files in a directory recursively.
 * @param {string} root - Root directory
 * @param {string} directory - Current directory
 * @param {Array<{absolute: string, relative: string}>} collector - Results array
 */
export async function walkFiles(root, directory, collector) {
  const entries = await fs.readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (!includeTemplateCopyEntry(absolute)) {
      continue;
    }

    if (entry.isDirectory()) {
      await walkFiles(root, absolute, collector);
    } else if (entry.isFile()) {
      collector.push({
        absolute,
        relative: toPosix(path.relative(root, absolute))
      });
    }
  }
}

/**
 * Find files matching a selector pattern.
 * @param {string} root - Root directory
 * @param {string | string[]} selector - Glob pattern(s)
 * @returns {Promise<Array<{absolute: string, relative: string}>>}
 */
export async function findMatchingFiles(root, selector) {
  const patterns = Array.isArray(selector) ? selector : [selector || DEFAULT_SELECTOR];
  const matchers = patterns.map(globToRegExp);
  const files = [];
  await walkFiles(root, root, files);
  return files.filter(file => matchers.some(matcher => matcher.test(file.relative)));
}

/**
 * Validate replacements object.
 * @param {Record<string, string>} replacements - Replacements map
 * @throws {SetupSandboxError} If invalid
 */
export function validateReplacements(replacements) {
  if (typeof replacements !== 'object' || replacements === null || Array.isArray(replacements)) {
    throw new SetupSandboxError('Replacements must be provided as an object map');
  }

  for (const [key, value] of Object.entries(replacements)) {
    if (typeof value !== 'string') {
      throw new SetupSandboxError(`Replacement value for "${key}" must be a string`);
    }
  }
}
