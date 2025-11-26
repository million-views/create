/**
 * Additional Error Classes
 *
 * Error classes for specific failure scenarios.
 *
 * @module lib/error/classes
 */

/**
 * Options for ArgumentError
 */
export interface ArgumentErrorOptions {
  /** The field/argument that caused the error */
  field?: string;
  /** Suggestions for fixing the error */
  suggestions?: string[];
}

/**
 * Base argument error class for CLI argument parsing errors
 */
export class ArgumentError extends Error {
  name = 'ArgumentError' as const;
  field?: string;
  suggestions: string[];

  constructor(message: string, options: ArgumentErrorOptions = {}) {
    super(message);
    this.field = options.field;
    this.suggestions = options.suggestions || [];
  }
}

/**
 * Custom error class for preflight check failures
 */
export class PreflightError extends Error {
  name = 'PreflightError' as const;
  code: string | number | null;

  constructor(message: string, code: string | number | null = null) {
    super(message);
    this.code = code;
  }
}
