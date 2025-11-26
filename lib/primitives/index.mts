/**
 * Primitives Layer
 *
 * Pure, policy-free utility functions that can be safely reused
 * by any layer of the application or external scripts.
 *
 * @module lib/primitives
 */

// Text manipulation
export {
  normalizeTextInput,
  ensureLeadingNewline,
  ensureTrailingNewline,
  replaceBetween
} from './text.mts';

// Glob pattern matching
export {
  escapeRegExp,
  toPosix,
  globToRegExp
} from './glob.mts';

// Object utilities
export {
  deepMerge,
  deepEqual
} from './object.mts';
