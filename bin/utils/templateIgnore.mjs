#!/usr/bin/env node

/**
 * Centralized ignore list for template artifacts that should never reach
 * generated projects or user-facing previews.
 */
export const IGNORED_TEMPLATE_ARTIFACTS = Object.freeze(new Set([
  '.git',
  '.template-undo.json'
]));

/**
 * Determine whether a template entry (file or directory) should be ignored.
 * @param {string} entryName
 * @returns {boolean}
 */
export function shouldIgnoreTemplateEntry(entryName) {
  if (typeof entryName !== 'string') {
    return false;
  }
  return IGNORED_TEMPLATE_ARTIFACTS.has(entryName);
}

/**
 * Remove ignored artifact entries from tree-style text output.
 * @param {string} treeText
 * @returns {string}
 */
export function stripIgnoredFromTree(treeText) {
  if (typeof treeText !== 'string' || treeText.length === 0) {
    return treeText;
  }

  const ignored = Array.from(IGNORED_TEMPLATE_ARTIFACTS);
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
