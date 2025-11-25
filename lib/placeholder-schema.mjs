/**
 * Placeholder Schema - Re-export shim for backward compatibility
 *
 * This file re-exports from the placeholder domain.
 * New code should import from lib/placeholder/index.mts.
 *
 * @deprecated Import from './placeholder/index.mts' instead
 * @module lib/placeholder-schema
 */

export {
  normalizePlaceholders,
  normalize,
  supportedPlaceholderTypes
} from './placeholder/index.mts';
