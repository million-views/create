/**
 * ViolationError class for boundary violation errors
 *
 * Thrown when a path escapes allowed directory boundaries.
 * Used by the Boundary class (security domain) to report
 * path traversal and boundary escape attempts.
 *
 * @module lib/error/boundary
 */

/**
 * Options for constructing a ViolationError.
 */
export interface ViolationErrorOptions {
  /**
   * The original user-provided path.
   */
  userPath?: string;

  /**
   * The resolved absolute path.
   */
  resolvedPath?: string;

  /**
   * The allowed root directory.
   */
  allowedRoot?: string;

  /**
   * The operation being attempted (e.g., 'read', 'write', 'delete').
   */
  operation?: string;

  /**
   * The underlying cause error, if any.
   */
  cause?: Error;
}

/**
 * Error thrown when a path escapes allowed directory boundaries.
 *
 * This error is part of the defense-in-depth security model:
 * - Layer 3: Runtime Boundary Enforcement
 *
 * @example
 * ```typescript
 * throw new ViolationError('Path escapes allowed directory', {
 *   userPath: '../../../etc/passwd',
 *   resolvedPath: '/etc/passwd',
 *   allowedRoot: '/home/user/project',
 *   operation: 'read'
 * });
 * ```
 */
export class ViolationError extends Error {
  /**
   * The original user-provided path that caused the violation.
   */
  readonly userPath?: string;

  /**
   * The resolved absolute path that was detected as a violation.
   */
  readonly resolvedPath?: string;

  /**
   * The allowed root directory that was escaped.
   */
  readonly allowedRoot?: string;

  /**
   * The operation that was being attempted.
   */
  readonly operation?: string;

  /**
   * Creates a new ViolationError.
   *
   * @param message - Human-readable error message
   * @param options - Additional context about the boundary violation
   */
  constructor(message: string, options: ViolationErrorOptions = {}) {
    super(message);
    this.name = 'BoundaryViolationError'; // Keep original name for backward compatibility
    this.userPath = options.userPath;
    this.resolvedPath = options.resolvedPath;
    this.allowedRoot = options.allowedRoot;
    this.operation = options.operation;

    if (options.cause) {
      this.cause = options.cause;
    }

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, ViolationError.prototype);
  }

  /**
   * Create a ViolationError for a path traversal attempt.
   */
  static pathTraversal(
    userPath: string,
    resolvedPath: string,
    allowedRoot: string,
    operation?: string
  ): ViolationError {
    return new ViolationError('Path escapes allowed directory boundaries', {
      userPath,
      resolvedPath,
      allowedRoot,
      operation,
    });
  }

  /**
   * Create a ViolationError for null byte injection.
   */
  static nullByte(userPath: string, operation?: string): ViolationError {
    return new ViolationError('Path contains null bytes', {
      userPath,
      operation,
    });
  }

  /**
   * Create a ViolationError for invalid path type.
   */
  static invalidType(userPath: unknown, operation?: string): ViolationError {
    return new ViolationError('Path must be a string', {
      userPath: String(userPath),
      operation,
    });
  }
}
