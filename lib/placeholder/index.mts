/**
 * Placeholder Domain Facade
 *
 * Exports all placeholder-related modules for resolving, formatting,
 * canonicalizing, and normalizing placeholder values.
 *
 * @module lib/placeholder
 */

// Placeholder resolution
export { resolvePlaceholders as resolve, PlaceholderResolutionError } from './resolve.mts';

// Placeholder formats
export * as format from './format.mts';

// Canonical variables
export { normalizeCanonicalVariables as canonicalize, CANONICAL_VARIABLES } from './canonical.mts';

// Placeholder schema normalization
export { normalizePlaceholders as normalize, supportedPlaceholderTypes } from './schema.mts';

// Legacy re-exports for backward compatibility
export { resolvePlaceholders } from './resolve.mts';
export { normalizeCanonicalVariables } from './canonical.mts';
export { normalizePlaceholders } from './schema.mts';
