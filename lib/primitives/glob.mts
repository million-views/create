/**
 * Glob Primitives
 *
 * Pure glob pattern matching utilities with no policy dependencies.
 * These can be safely reused by any layer of the application.
 *
 * @module lib/primitives/glob
 */

import path from 'node:path';

/**
 * Escape special regex characters in a string.
 * @param value - String to escape
 * @returns Escaped string safe for use in RegExp
 */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Convert a path to POSIX format (forward slashes).
 * @param relativePath - Path to convert
 * @returns POSIX-formatted path
 */
export function toPosix(relativePath: string): string {
  return relativePath.split(path.sep).join('/');
}

/**
 * Convert a glob pattern to a RegExp.
 * Supports: *, **, ?, {a,b,c}
 * @param pattern - Glob pattern
 * @returns Compiled RegExp
 */
export function globToRegExp(pattern: string): RegExp {
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
