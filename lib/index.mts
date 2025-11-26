/**
 * @m5nv/create Public API
 *
 * This is the main entry point for the library. All public exports
 * are exposed through namespaces to reduce API surface and improve
 * discoverability.
 *
 * @example
 * ```typescript
 * import { error, security, validation, placeholder, templatize, template, util } from '@m5nv/create';
 *
 * // Error handling
 * throw new error.ValidationError('Invalid input');
 *
 * // Security validation
 * const sanitized = security.sanitize.input(userInput);
 *
 * // Template validation
 * const result = validation.schema.validateManifest(manifest);
 *
 * // Placeholder resolution
 * const resolved = placeholder.resolve(template, values);
 *
 * // File templatization
 * const changes = templatize.json(content, config);
 *
 * // Template discovery
 * const templates = template.Discover.list(cachePath);
 *
 * // File utilities
 * await util.File.read(path);
 * ```
 *
 * @module @m5nv/create
 */

// ============================================================
// Domain Namespaces
// ============================================================

/**
 * Error domain - Error classes for different failure contexts
 */
export * as error from './error/index.mts';

/**
 * Security domain - Input sanitization, gates, and boundary validation
 */
export * as security from './security/index.mts';

/**
 * Validation domain - Schema, domain, and CLI validators
 */
export * as validation from './validation/index.mts';

/**
 * Placeholder domain - Placeholder resolution, formatting, and schema
 */
export * as placeholder from './placeholder/index.mts';

/**
 * Templatize domain - File-type specific templatization strategies
 */
export * as templatize from './templatize/index.mts';

/**
 * Template domain - Template discovery and ignore utilities
 */
export * as template from './template/index.mts';

/**
 * Util domain - File, shell, and text utilities
 */
export * as util from './util/index.mts';

// ============================================================
// Type Exports
// ============================================================

export type * from './types.mts';

// ============================================================
// Direct Exports (for backward compatibility during migration)
// ============================================================

// Error classes - commonly used directly
export {
  ValidationError,
  ContextualError,
  ViolationError,
  GateError
} from './error/index.mts';

// Security classes - commonly used directly
export {
  Gate,
  SecurityGate,
  Boundary,
  BoundaryValidator
} from './security/index.mts';
