/**
 * ValidationError class for validation-related errors
 *
 * Used throughout the lib/ and bin/ modules to indicate that input
 * validation has failed. Carries an optional field identifier to help
 * pinpoint which specific input caused the failure.
 *
 * @module lib/error/validation
 */

import type { ValidationErrorOptions } from '../types.mts';

/**
 * Custom error class for validation errors.
 *
 * @example
 * ```typescript
 * throw new ValidationError('Path must be non-empty', { field: 'path' });
 * ```
 */
export class ValidationError extends Error {
  /**
   * The name of the field that failed validation, if applicable.
   */
  readonly field: string | null;

  /**
   * The value that failed validation, if provided.
   */
  readonly value?: unknown;

  /**
   * Constraints that were violated, if any.
   */
  readonly constraints?: string[];

  /**
   * Creates a new ValidationError.
   *
   * @param message - Human-readable error message
   * @param options - Optional field name or options object
   */
  constructor(message: string, options?: string | ValidationErrorOptions) {
    super(message);
    this.name = 'ValidationError';

    // Support both legacy (string) and new (options object) signatures
    if (typeof options === 'string') {
      this.field = options;
      this.value = undefined;
      this.constraints = undefined;
    } else if (options) {
      this.field = options.field ?? null;
      this.value = options.value;
      this.constraints = options.constraints;
      if (options.cause) {
        this.cause = options.cause;
      }
    } else {
      this.field = null;
    }

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, ValidationError.prototype);
  }

  /**
   * Create a ValidationError from a cause error with additional context.
   *
   * @param message - Human-readable error message
   * @param cause - The underlying error that caused this validation failure
   * @param field - Optional field identifier
   */
  static fromCause(message: string, cause: Error, field?: string): ValidationError {
    return new ValidationError(message, { field, cause });
  }
}
