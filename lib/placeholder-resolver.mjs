/**
 * Placeholder Resolver - Re-export shim for backward compatibility
 *
 * This file re-exports from the placeholder domain.
 * New code should import from lib/placeholder/index.mts.
 *
 * @deprecated Import from './placeholder/index.mts' instead
 * @module lib/placeholder-resolver
 */

export {
  resolvePlaceholders,
  resolve,
  PlaceholderResolutionError
} from './placeholder/index.mts';
