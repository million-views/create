#!/usr/bin/env node

/**
 * Environment Utilities
 *
 * Shared utility functions used by tool implementations.
 * These are internal utilities - not part of the public API.
 *
 * @module lib/environment/utils
 * @internal
 */

import fs from 'fs/promises';
import path from 'path';
import { shouldIgnoreTemplateEntry } from '../template/index.mts';

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
 * Escape special regex characters in a string.
 * @param {string} value - String to escape
 * @returns {string}
 */
export function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Convert a path to POSIX format.
 * @param {string} relativePath - Path to convert
 * @returns {string}
 */
export function toPosix(relativePath) {
  return relativePath.split(path.sep).join('/');
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
 * Convert a glob pattern to a RegExp.
 * @param {string} pattern - Glob pattern
 * @returns {RegExp}
 */
export function globToRegExp(pattern) {
  const normalizedPattern = pattern.split(path.sep).join('/');
  let regex = '';
  let i = 0;

  while (i < normalizedPattern.length) {
    const char = normalizedPattern[i];

    if (char === '*') {
      if (normalizedPattern[i + 1] === '*') {
        if (normalizedPattern[i + 2] === '/') {
          regex += '(?:[^/]+/)*';
          i += 3;
          continue;
        }
        regex += '.*';
        i += 2;
        continue;
      }
      regex += '[^/]*';
      i++;
      continue;
    }

    if (char === '?') {
      regex += '[^/]';
      i++;
      continue;
    }

    if (char === '{') {
      const endBrace = normalizedPattern.indexOf('}', i);
      if (endBrace !== -1) {
        const alternatives = normalizedPattern.slice(i + 1, endBrace).split(',');
        regex += '(?:' + alternatives.map(escapeRegExp).join('|') + ')';
        i = endBrace + 1;
        continue;
      }
    }

    regex += escapeRegExp(char);
    i++;
  }

  return new RegExp(`^${regex}$`);
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

/**
 * Deep merge two objects.
 * @param {object} target - Target object
 * @param {object} source - Source object to merge
 * @returns {object} Merged object
 */
export function deepMerge(target, source) {
  if (typeof source !== 'object' || source === null || Array.isArray(source)) {
    return source;
  }

  const output = { ...target };

  for (const [key, value] of Object.entries(source)) {
    if (value === undefined) {
      continue;
    }

    if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      typeof output[key] === 'object' &&
      output[key] !== null &&
      !Array.isArray(output[key])
    ) {
      output[key] = deepMerge(output[key], value);
    } else {
      output[key] = value;
    }
  }

  return output;
}

/**
 * Deep equality check.
 * @param {unknown} a - First value
 * @param {unknown} b - Second value
 * @returns {boolean}
 */
export function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    return a.every((val, i) => deepEqual(val, b[i]));
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every(key => deepEqual(a[key], b[key]));
}

/**
 * Normalize text input (string or array) to a single string.
 * @param {string | string[]} input - Input to normalize
 * @param {string} label - Label for error messages
 * @returns {string}
 */
export function normalizeTextInput(input, label) {
  if (Array.isArray(input)) {
    for (const line of input) {
      if (typeof line !== 'string') {
        throw new SetupSandboxError(`${label} array entries must be strings`);
      }
    }
    return input.join('\n');
  }
  if (typeof input !== 'string') {
    throw new SetupSandboxError(`${label} must be a string or array of strings`);
  }
  return input;
}

/**
 * Ensure text has a leading newline.
 * @param {string} block - Text block
 * @returns {string}
 */
export function ensureLeadingNewline(block) {
  return block.startsWith('\n') ? block : `\n${block}`;
}

/**
 * Ensure text has a trailing newline.
 * @param {string} block - Text block
 * @returns {string}
 */
export function ensureTrailingNewline(block) {
  return block.endsWith('\n') ? block : `${block}\n`;
}
