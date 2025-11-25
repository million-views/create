#!/usr/bin/env node

/**
 * JSON API for template setup scripts.
 *
 * @module lib/environment/tools/json
 */

import fs from 'fs/promises';
import {
  SetupSandboxError,
  UTF8,
  resolveProjectPath,
  ensureParentDirectory,
  deepMerge,
  deepEqual
} from '../utils.mjs';

/**
 * Read and parse a JSON file.
 * @param {string} root - Project root
 * @param {string} relativePath - File path
 * @returns {Promise<unknown>}
 */
async function readJson(root, relativePath) {
  const absolute = resolveProjectPath(root, relativePath, 'JSON path');
  try {
    const raw = await fs.readFile(absolute, UTF8);
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new SetupSandboxError(`JSON file not found: ${relativePath}`);
    }
    throw new SetupSandboxError(`Failed to read JSON (${relativePath}): ${error.message}`);
  }
}

/**
 * Write JSON to a file with proper formatting.
 * @param {string} root - Project root
 * @param {string} relativePath - File path
 * @param {unknown} data - Data to write
 */
async function writeJson(root, relativePath, data) {
  const absolute = resolveProjectPath(root, relativePath, 'JSON path');
  const content = JSON.stringify(data, null, 2) + '\n';
  await ensureParentDirectory(absolute);
  await fs.writeFile(absolute, content, UTF8);
}

/**
 * Merge data into a JSON file.
 * @param {string} root - Project root
 * @param {string} relativePath - File path
 * @param {object} patch - Data to merge
 */
async function mergeJson(root, relativePath, patch) {
  const absolute = resolveProjectPath(root, relativePath, 'JSON path');
  let existing;
  try {
    const raw = await fs.readFile(absolute, UTF8);
    existing = JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') {
      existing = {};
    } else {
      throw new SetupSandboxError(`Failed to read JSON (${relativePath}): ${error.message}`);
    }
  }
  const merged = deepMerge(existing, patch);
  await writeJson(root, relativePath, merged);
  return merged;
}

/**
 * Update a JSON file with a function.
 * @param {string} root - Project root
 * @param {string} relativePath - File path
 * @param {Function} updater - Update function
 */
async function updateJson(root, relativePath, updater) {
  const absolute = resolveProjectPath(root, relativePath, 'JSON path');
  let data;
  try {
    const raw = await fs.readFile(absolute, UTF8);
    data = JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new SetupSandboxError(`JSON file not found: ${relativePath}`);
    }
    throw new SetupSandboxError(`Failed to read JSON (${relativePath}): ${error.message}`);
  }
  const draft = structuredClone(data);
  const result = updater(draft);
  const updated = result !== undefined ? result : draft;
  await writeJson(root, relativePath, updated);
  return updated;
}

/**
 * Parse a dot-path expression into segments.
 * Supports both dot notation (obj.prop) and array notation (arr[0].prop).
 * @param {string} pathExpression - Path expression
 * @returns {Array<string | number>} Segments (strings for object keys, numbers for array indices)
 */
function parseJsonPath(pathExpression) {
  if (typeof pathExpression !== 'string' || !pathExpression.trim()) {
    throw new SetupSandboxError('JSON path must be a non-empty string');
  }

  const segments = [];
  const parts = pathExpression.split('.');
  const tokenRegex = /([^\[\]]+)|\[(\d+)\]/g;

  for (const part of parts) {
    const matches = Array.from(part.matchAll(tokenRegex));
    if (matches.length === 0) {
      throw new SetupSandboxError(`Invalid JSON path segment "${part}" in "${pathExpression}"`);
    }
    for (const match of matches) {
      if (match[1]) {
        segments.push(match[1]);
      } else if (match[2]) {
        segments.push(Number(match[2]));
      }
    }
  }

  if (segments.length === 0 || typeof segments[0] === 'number') {
    throw new SetupSandboxError(`JSON path must start with an object property: "${pathExpression}"`);
  }
  return segments;
}

/**
 * Ensure array has at least `index + 1` elements.
 * @param {unknown[]} array - Array to extend
 * @param {number} index - Required index
 */
function ensureArraySize(array, index) {
  while (array.length <= index) {
    array.push(undefined);
  }
}

/**
 * Resolve parent object for a path, optionally creating intermediate objects/arrays.
 * @param {object} target - Root object
 * @param {Array<string | number>} segments - Path segments
 * @param {Object} [options] - Options
 * @param {boolean} [options.createMissing=false] - Create missing intermediate objects/arrays
 * @returns {{parent: object, key: string | number} | null}
 */
function resolveParentForPath(target, segments, { createMissing = false } = {}) {
  let current = target;
  for (let i = 0; i < segments.length - 1; i++) {
    const key = segments[i];
    const nextKey = segments[i + 1];

    if (typeof key === 'number') {
      if (!Array.isArray(current)) {
        throw new SetupSandboxError('JSON path expected an array segment but found non-array value');
      }
      ensureArraySize(current, key);
      let next = current[key];
      if (next === undefined || next === null || typeof next !== 'object') {
        if (!createMissing) {
          return null;
        }
        next = typeof nextKey === 'number' ? [] : {};
        current[key] = next;
      }
      current = next;
    } else {
      if (current[key] === undefined || current[key] === null || typeof current[key] !== 'object') {
        if (!createMissing) {
          return null;
        }
        current[key] = typeof nextKey === 'number' ? [] : {};
      } else if (typeof nextKey === 'number' && !Array.isArray(current[key])) {
        if (!createMissing) {
          throw new SetupSandboxError('JSON path expected an array segment but found non-array value');
        }
        current[key] = [];
      }
      current = current[key];
    }
  }

  return { parent: current, key: segments[segments.length - 1] };
}

/**
 * Set a value at a JSON path.
 * @param {object} target - Root object
 * @param {Array<string | number>} segments - Path segments
 * @param {unknown} value - Value to set
 */
function setAtPath(target, segments, value) {
  const resolved = resolveParentForPath(target, segments, { createMissing: true });
  const { parent, key } = resolved;
  if (typeof key === 'number' && Array.isArray(parent)) {
    ensureArraySize(parent, key);
  }
  parent[key] = value;
}

/**
 * Remove a value at a JSON path.
 * @param {object} target - Root object
 * @param {string[]} segments - Path segments
 */
function removeAtPath(target, segments) {
  try {
    const resolved = resolveParentForPath(target, segments, { createMissing: false });
    delete resolved.parent[resolved.key];
  } catch {
    // Path doesn't exist, nothing to remove
  }
}

/**
 * Add value(s) to an array at a JSON path.
 * If value is an array, all items are added (spread).
 * @param {object} target - Root object
 * @param {string[]} segments - Path segments
 * @param {unknown} value - Value or array of values to add
 * @param {boolean} unique - Only add if not already present
 */
function addToArrayAtPath(target, segments, value, unique) {
  const resolved = resolveParentForPath(target, segments, { createMissing: true });
  const { parent, key } = resolved;
  if (parent[key] === undefined) {
    parent[key] = [];
  }
  if (!Array.isArray(parent[key])) {
    throw new SetupSandboxError('JSON path expected an array but found an object');
  }

  // If value is an array, add each item; otherwise add the single value
  const itemsToAdd = Array.isArray(value) ? value : [value];
  for (const item of itemsToAdd) {
    if (unique && parent[key].some(existing => deepEqual(existing, item))) {
      continue;
    }
    parent[key].push(item);
  }
}

/**
 * Merge values into an array at a JSON path.
 * If mergeKey is provided, items are merged/updated by that key (upsert behavior).
 * Otherwise, items are appended (with optional uniqueness check).
 * @param {object} target - Root object
 * @param {string[]} segments - Path segments
 * @param {unknown[]} items - Items to merge
 * @param {Object} [options] - Options
 * @param {boolean} [options.unique] - Only add unique items (when no mergeKey)
 * @param {string} [options.mergeKey] - Key field for upsert behavior
 */
function mergeArrayAtPath(target, segments, items, { unique = false, mergeKey = null } = {}) {
  if (!Array.isArray(items)) {
    throw new SetupSandboxError('JSON mergeArray requires an array of items');
  }
  const resolved = resolveParentForPath(target, segments, { createMissing: true });
  const { parent, key } = resolved;
  if (parent[key] === undefined) {
    parent[key] = [];
  }
  if (!Array.isArray(parent[key])) {
    throw new SetupSandboxError('JSON path expected an array but found an object');
  }

  if (mergeKey) {
    // Upsert behavior: merge by key field
    for (const item of items) {
      const existingIndex = parent[key].findIndex(
        existing => existing && existing[mergeKey] === item[mergeKey]
      );
      if (existingIndex >= 0) {
        // Update existing item
        parent[key][existingIndex] = { ...parent[key][existingIndex], ...item };
      } else {
        // Add new item
        parent[key].push(item);
      }
    }
  } else {
    // Append behavior with optional uniqueness
    for (const item of items) {
      if (unique && parent[key].some(existing => deepEqual(existing, item))) {
        continue;
      }
      parent[key].push(item);
    }
  }
}

/**
 * Edit a JSON file with a mutation function.
 * @param {string} root - Project root
 * @param {string} relativePath - File path
 * @param {Function} mutator - Mutation function
 * @param {Object} [options] - Options
 * @param {boolean} [options.allowCreate=true] - Allow creating file if missing
 */
async function editJsonFile(root, relativePath, mutator, { allowCreate = true } = {}) {
  const absolute = resolveProjectPath(root, relativePath, 'JSON path');
  let data;
  try {
    const raw = await fs.readFile(absolute, UTF8);
    data = JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT' && allowCreate) {
      data = {};
    } else if (error.code === 'ENOENT') {
      throw new SetupSandboxError(`JSON file not found: ${relativePath}`);
    } else {
      throw new SetupSandboxError(`Failed to read JSON (${relativePath}): ${error.message}`);
    }
  }
  const draft = structuredClone(data);
  mutator(draft);
  await writeJson(root, relativePath, draft);
  return draft;
}

/**
 * Create a JSON API for setup scripts.
 *
 * @param {string} root - Project root directory
 * @returns {Object} Frozen JSON API
 */
export function buildJsonApi(root) {
  return Object.freeze({
    /**
     * Read and parse a JSON file.
     * @param {string} relativePath - File path
     * @returns {Promise<unknown>}
     */
    async read(relativePath) {
      return await readJson(root, relativePath);
    },

    /**
     * Write data to a JSON file with proper formatting.
     * Creates parent directories if needed.
     * @param {string} relativePath - File path
     * @param {unknown} data - Data to write
     */
    async write(relativePath, data) {
      return await writeJson(root, relativePath, data);
    },

    /**
     * Deep-merge data into a JSON file.
     * @param {string} relativePath - File path
     * @param {object} patch - Data to merge
     */
    async merge(relativePath, patch) {
      return await mergeJson(root, relativePath, patch);
    },

    /**
     * Update JSON with a function.
     * @param {string} relativePath - File path
     * @param {Function} updater - Update function
     */
    async update(relativePath, updater) {
      return await updateJson(root, relativePath, updater);
    },

    /**
     * Set value at a dot-path.
     * @param {string} relativePath - File path
     * @param {string} pathExpression - Dot-separated path
     * @param {unknown} value - Value to set
     */
    async set(relativePath, pathExpression, value) {
      const segments = parseJsonPath(pathExpression);
      return await editJsonFile(root, relativePath, (draft) => {
        setAtPath(draft, segments, value);
      });
    },

    /**
     * Remove property at a dot-path.
     * @param {string} relativePath - File path
     * @param {string} pathExpression - Dot-separated path
     */
    async remove(relativePath, pathExpression) {
      const segments = parseJsonPath(pathExpression);
      return await editJsonFile(root, relativePath, (draft) => {
        removeAtPath(draft, segments);
      }, { allowCreate: false });
    },

    /**
     * Add value to array at dot-path.
     * @param {string} relativePath - File path
     * @param {string} pathExpression - Dot-separated path
     * @param {unknown} value - Value to add
     * @param {Object} [options] - Options
     */
    async addToArray(relativePath, pathExpression, value, options = {}) {
      const segments = parseJsonPath(pathExpression);
      return await editJsonFile(root, relativePath, (draft) => {
        addToArrayAtPath(draft, segments, value, options.unique === true);
      });
    },

    /**
     * Merge values into array at dot-path.
     * If mergeKey is provided, existing items are updated by that key (upsert).
     * @param {string} relativePath - File path
     * @param {string} pathExpression - Dot-separated path
     * @param {unknown[]} items - Items to merge
     * @param {string|Object} [keyOrOptions] - Merge key string or options object
     */
    async mergeArray(relativePath, pathExpression, items, keyOrOptions = {}) {
      const segments = parseJsonPath(pathExpression);
      // Support both mergeArray(file, path, items, 'key') and mergeArray(file, path, items, { mergeKey, unique })
      const options = typeof keyOrOptions === 'string'
        ? { mergeKey: keyOrOptions }
        : { unique: keyOrOptions.unique === true, mergeKey: keyOrOptions.mergeKey || null };
      return await editJsonFile(root, relativePath, (draft) => {
        mergeArrayAtPath(draft, segments, items, options);
      });
    }
  });
}
