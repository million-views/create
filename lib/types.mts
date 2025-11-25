/**
 * Shared type definitions for lib/ domain modules
 *
 * This file contains type definitions used across multiple domains.
 * Domain-specific types should be defined in their respective modules.
 *
 * @module lib/types
 */

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error context for categorization and appropriate handling.
 * Use union type instead of enum for type-strippable TypeScript.
 */
export type ErrorContext =
  | 'validation'
  | 'network'
  | 'filesystem'
  | 'template'
  | 'configuration'
  | 'runtime'
  | 'user_input'
  | 'security';

/**
 * Error severity levels for prioritization.
 * Use union type instead of enum for type-strippable TypeScript.
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'fatal';

/**
 * Options for constructing contextual errors.
 */
export interface ContextualErrorOptions {
  context?: ErrorContext;
  severity?: ErrorSeverity;
  suggestions?: string[];
  technicalDetails?: string;
  userFriendlyMessage?: string;
  cause?: Error;
}

/**
 * Options for constructing validation errors.
 */
export interface ValidationErrorOptions {
  field?: string;
  value?: unknown;
  constraints?: string[];
  cause?: Error;
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Result of a validation operation.
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

/**
 * A single validation issue (error or warning).
 */
export interface ValidationIssue {
  type: string;
  message: string;
  path: string[];
  severity?: 'error' | 'warning';
}

/**
 * Options for validation operations.
 */
export interface ValidateOptions {
  strict?: boolean;
  abortEarly?: boolean;
  context?: Record<string, unknown>;
}

// ============================================================================
// Template Types - Re-export from generated schema types
// ============================================================================

export type {
  TemplatePlaceholder,
  TemplateDimension,
  TemplateDimensions,
  TemplateManifest,
  TemplateMetadata,
  TemplateSetup,
  TemplateSingleSelectDimension,
  TemplateMultiSelectDimension,
  TemplateCanonicalVariable,
  TemplateCanonicalVariableOverrides,
  TemplateHints,
  TemplateHintFeature,
  TemplateFeatureSpec,
  TemplateConstants,
  TemplatePlaceholderPrimitive,
  TemplateDimensionValue,
  TemplateDimensionType,
  TemplateDimensionPolicy,
  TemplateDimensionRelation,
} from '../types/template-schema.ts';

// ============================================================================
// Selection Types - Re-export from generated schema types
// ============================================================================

export type {
  SelectionManifest,
  SelectionChoices,
  SelectionPlaceholders,
} from '../types/selection-schema.ts';

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Generic result type for operations that can fail.
 */
export type Result<T, E = Error> =
  | { success: true; value: T }
  | { success: false; error: E };

/**
 * Make all properties of T optional recursively.
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Extract the resolved type from a Promise.
 */
export type Awaited<T> = T extends Promise<infer U> ? U : T;
