/**
 * Placeholder Domain Facade
 *
 * Exports all placeholder-related modules for resolving, formatting,
 * canonicalizing, and normalizing placeholder values.
 *
 * @module lib/placeholder
 */

// Placeholder resolution
export { resolvePlaceholders as resolve, PlaceholderResolutionError } from './resolve.mjs';

// Placeholder formats
export * as format from './format.mjs';

// Canonical variables
export { normalizeCanonicalVariables as canonicalize, CANONICAL_VARIABLES } from './canonical.mjs';

// Placeholder schema normalization
export { normalizePlaceholders as normalize, supportedPlaceholderTypes } from './schema.mjs';

// Legacy re-exports for backward compatibility
export { resolvePlaceholders } from './resolve.mjs';
export { normalizeCanonicalVariables } from './canonical.mjs';
export { normalizePlaceholders } from './schema.mjs';
