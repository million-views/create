/**
 * GateError class for security gate validation failures
 *
 * Thrown when validation fails at an architectural security boundary.
 * Used by the Gate class (security domain) to report validation
 * failures at entry points.
 *
 * @module lib/error/gate
 */

/**
 * Options for constructing a GateError.
 */
export interface GateErrorOptions {
  /**
   * The context in which the validation failed (e.g., command name).
   */
  context?: string;

  /**
   * The original error that caused the gate failure.
   */
  originalError?: Error;

  /**
   * Array of specific validation errors that occurred.
   */
  validationErrors?: string[];

  /**
   * The underlying cause error, if any.
   */
  cause?: Error;
}

/**
 * Error thrown when validation fails at an architectural security boundary.
 *
 * This error is part of the defense-in-depth security model:
 * - Layer 1: Input Validation Gate
 *
 * ALL entry points MUST go through the security gate before processing inputs.
 * This ensures no code path can bypass security validation.
 *
 * @example
 * ```typescript
 * throw new GateError('Validation failed at entry point', {
 *   context: 'create-scaffold new',
 *   validationErrors: [
 *     'Template path contains path traversal',
 *     'Project name contains invalid characters'
 *   ]
 * });
 * ```
 */
export class GateError extends Error {
  /**
   * The context in which the validation failed.
   */
  readonly context?: string;

  /**
   * The original error that triggered the gate failure.
   */
  readonly originalError?: Error;

  /**
   * Specific validation errors that occurred.
   */
  readonly validationErrors?: string[];

  /**
   * Creates a new GateError.
   *
   * @param message - Human-readable error message
   * @param options - Additional context about the security gate failure
   */
  constructor(message: string, options: GateErrorOptions = {}) {
    super(message);
    this.name = 'SecurityGateError'; // Keep original name for backward compatibility
    this.context = options.context;
    this.originalError = options.originalError;
    this.validationErrors = options.validationErrors;

    if (options.cause ?? options.originalError) {
      this.cause = options.cause ?? options.originalError;
    }

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, GateError.prototype);
  }

  /**
   * Create a GateError from a validation error with context.
   */
  static fromValidationError(
    error: Error,
    context: string
  ): GateError {
    return new GateError(`Security validation failed: ${error.message}`, {
      context,
      originalError: error,
      validationErrors: [error.message],
    });
  }

  /**
   * Create a GateError for missing required fields.
   */
  static missingRequired(
    fields: string[],
    context?: string
  ): GateError {
    const fieldList = fields.join(', ');
    return new GateError(`Missing required fields: ${fieldList}`, {
      context,
      validationErrors: fields.map(f => `Missing required field: ${f}`),
    });
  }

  /**
   * Create a GateError for multiple validation failures.
   */
  static multipleFailures(
    errors: string[],
    context?: string
  ): GateError {
    return new GateError(`Multiple validation failures occurred`, {
      context,
      validationErrors: errors,
    });
  }
}
