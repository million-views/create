/**
 * Placeholder Domain Validator
 *
 * Validates placeholder definitions in template metadata.
 * Re-exports from the existing placeholder-schema.mjs for backward compatibility.
 *
 * @module lib/validation/domain/placeholder
 */

// Re-export from existing placeholder-schema module
export { normalizePlaceholders as validate } from '../../placeholder-schema.mjs';
export { normalizePlaceholders } from '../../placeholder-schema.mjs';
