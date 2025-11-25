/**
 * ContextualError class for errors with rich context and suggestions
 *
 * Enhanced error class that carries additional metadata for better
 * error handling, user-facing messages, and debugging.
 *
 * @module lib/error/contextual
 */

import type { ContextualErrorOptions, ErrorContext, ErrorSeverity } from '../types.mts';

// Re-export the types for consumers who need them
export type { ErrorContext, ErrorSeverity } from '../types.mts';

/**
 * Default error context value.
 */
const DEFAULT_CONTEXT: ErrorContext = 'runtime';

/**
 * Default error severity value.
 */
const DEFAULT_SEVERITY: ErrorSeverity = 'medium';

/**
 * Enhanced error class with context, severity, and suggestions.
 *
 * Use this class when you need to provide rich error information
 * for user-facing error messages or debugging.
 *
 * @example
 * ```typescript
 * throw new ContextualError('Template not found', {
 *   context: 'template',
 *   severity: 'high',
 *   suggestions: [
 *     'Check that the template path is correct',
 *     'Verify the template exists in the registry'
 *   ],
 *   technicalDetails: `Path: ${templatePath}`
 * });
 * ```
 */
export class ContextualError extends Error {
  /**
   * The context category for this error.
   */
  readonly context: ErrorContext;

  /**
   * The severity level of this error.
   */
  readonly severity: ErrorSeverity;

  /**
   * Suggested actions to resolve the error.
   */
  readonly suggestions: string[];

  /**
   * Technical details for debugging (not shown to end users by default).
   */
  readonly technicalDetails?: string;

  /**
   * User-friendly message suitable for display.
   */
  readonly userFriendlyMessage: string;

  /**
   * Creates a new ContextualError.
   *
   * @param message - Human-readable error message
   * @param options - Error options for context, severity, and suggestions
   */
  constructor(message: string, options: ContextualErrorOptions = {}) {
    super(message);
    this.name = 'ContextualError';
    this.context = options.context ?? DEFAULT_CONTEXT;
    this.severity = options.severity ?? DEFAULT_SEVERITY;
    this.suggestions = options.suggestions ?? [];
    this.technicalDetails = options.technicalDetails;
    this.userFriendlyMessage = options.userFriendlyMessage ?? message;

    if (options.cause) {
      this.cause = options.cause;
    }

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, ContextualError.prototype);
  }

  /**
   * Create a ContextualError from an existing error with additional context.
   *
   * @param error - The underlying error
   * @param context - The error context category
   * @param suggestions - Optional suggestions for resolving the error
   */
  static fromError(
    error: Error,
    context: ErrorContext,
    suggestions?: string[]
  ): ContextualError {
    return new ContextualError(error.message, {
      context,
      suggestions,
      technicalDetails: error.stack,
      cause: error,
    });
  }

  /**
   * Create a validation-context error.
   */
  static validation(
    message: string,
    options?: Omit<ContextualErrorOptions, 'context'>
  ): ContextualError {
    return new ContextualError(message, { ...options, context: 'validation' });
  }

  /**
   * Create a filesystem-context error.
   */
  static filesystem(
    message: string,
    options?: Omit<ContextualErrorOptions, 'context'>
  ): ContextualError {
    return new ContextualError(message, { ...options, context: 'filesystem' });
  }

  /**
   * Create a network-context error.
   */
  static network(
    message: string,
    options?: Omit<ContextualErrorOptions, 'context'>
  ): ContextualError {
    return new ContextualError(message, { ...options, context: 'network' });
  }

  /**
   * Create a template-context error.
   */
  static template(
    message: string,
    options?: Omit<ContextualErrorOptions, 'context'>
  ): ContextualError {
    return new ContextualError(message, { ...options, context: 'template' });
  }

  /**
   * Create a security-context error.
   */
  static security(
    message: string,
    options?: Omit<ContextualErrorOptions, 'context'>
  ): ContextualError {
    return new ContextualError(message, {
      ...options,
      context: 'security',
      severity: options?.severity ?? 'high',
    });
  }
}
