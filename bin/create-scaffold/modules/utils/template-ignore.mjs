#!/usr/bin/env node

/**
 * Canonical list of filesystem entries that should never ship with generated
 * projects. Consumers can extend the list (e.g. to exclude author asset
 * directories) without mutating the base configuration.
 */
const BASE_TEMPLATE_ARTIFACTS = Object.freeze([
  '.git',
  '.template-undo.json'
]);

const DEFAULT_IGNORE_SET = new Set(BASE_TEMPLATE_ARTIFACTS);

/**
 * Build a Set of entries that should be ignored during copy or preview
 * operations. Additional names are trimmed and validated to avoid accidental
 * directory traversal or empty strings.
 * @param {Object} options
 * @param {string} [options.authorAssetsDir]
 * @param {string[]} [options.extra]
 * @returns {Set<string>}
 */
export function createTemplateIgnoreSet(options = {}) {
  const additions = [];

  if (options.authorAssetsDir && typeof options.authorAssetsDir === 'string') {
    const trimmed = options.authorAssetsDir.trim();
    if (trimmed) {
      additions.push(trimmed);
    }
  }

  if (Array.isArray(options.extra)) {
    for (const entry of options.extra) {
      if (typeof entry === 'string') {
        const trimmed = entry.trim();
        if (trimmed) {
          additions.push(trimmed);
        }
      }
    }
  }

  if (additions.length === 0) {
    return DEFAULT_IGNORE_SET;
  }

  const combined = new Set(DEFAULT_IGNORE_SET);
  for (const name of additions) {
    combined.add(name);
  }
  return combined;
}

/**
 * Determine whether a template entry (file or directory) should be ignored.
 * @param {string} entryName
 * @param {Set<string>} [ignoreSet]
 * @returns {boolean}
 */
export function shouldIgnoreTemplateEntry(entryName, ignoreSet = DEFAULT_IGNORE_SET) {
  if (typeof entryName !== 'string') {
    return false;
  }
  return ignoreSet.has(entryName);
}

/**
 * Remove ignored artifact entries from tree-style text output.
 * @param {string} treeText
 * @param {Set<string>} [ignoreSet]
 * @returns {string}
 */
export function stripIgnoredFromTree(treeText, ignoreSet = DEFAULT_IGNORE_SET) {
  if (typeof treeText !== 'string' || treeText.length === 0) {
    return treeText;
  }

  const ignored = Array.from(ignoreSet);
  return treeText
    .split('\n')
    .filter((line) => {
      const normalized = line.trim();
      return !ignored.some((name) => {
        if (!name) {
          return false;
        }
        if (normalized === name) {
          return true;
        }
        // Handle entries rendered as "└── filename" or with path separators
        return normalized.endsWith(` ${name}`) ||
          normalized.endsWith(`/${name}`) ||
          normalized.endsWith(`\\${name}`);
      });
    })
    .join('\n')
    .trim();
}
