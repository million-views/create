#!/usr/bin/env node

import { resolve, sep, basename } from 'path';
import { getAuditLogger } from './security-audit-logger.mjs';

// Re-export ViolationError from the error domain for backward compatibility
// Keep the original name BoundaryViolationError as an alias
export { ViolationError as BoundaryViolationError } from './error/index.mts';

// Import ViolationError for use within this module
import { ViolationError as BoundaryViolationError } from './error/index.mts';

/**
 * Boundary Validator - Runtime enforcement of path boundaries
 *
 * Wraps all file operations to ensure they stay within allowed directories.
 *
 * Defense-in-Depth Layer 3: Runtime Boundary Enforcement
 *
 * @requires Node.js 22+
 */
export class BoundaryValidator {
  #allowedRoot;
  #auditLogger;

  constructor(allowedRoot, options = {}) {
    this.#allowedRoot = resolve(allowedRoot);
    this.#auditLogger = options.auditLogger || getAuditLogger();
  }

  /**
   * Validate path stays within allowed boundaries
   * MUST be called before ANY file operation
   *
   * @param {string} userPath - User-provided path (relative or absolute)
   * @param {string} operation - Operation name for audit logging
   * @returns {string} Validated absolute path
   * @throws {BoundaryViolationError} If path escapes boundaries
   */
  validatePath(userPath, operation = 'unknown') {
    // Validate input type
    if (typeof userPath !== 'string') {
      throw new BoundaryViolationError(
        'Path must be a string',
        { userPath, operation }
      );
    }

    // Check for null bytes (security risk)
    if (userPath.includes('\0')) {
      this.#logViolation(userPath, 'null_byte', operation);
      throw new BoundaryViolationError(
        'Path contains null bytes',
        { userPath, operation }
      );
    }

    // Resolve to absolute path (handles .. and . segments)
    const resolved = resolve(this.#allowedRoot, userPath);

    // Check boundary: resolved path must start with allowed root
    if (!resolved.startsWith(this.#allowedRoot + sep) && resolved !== this.#allowedRoot) {
      this.#logViolation(userPath, 'path_traversal', operation, resolved);
      throw new BoundaryViolationError(
        'Path escapes allowed directory boundaries',
        {
          userPath,
          resolvedPath: resolved,
          allowedRoot: this.#allowedRoot,
          operation
        }
      );
    }

    return resolved;
  }

  /**
   * Validate multiple paths at once
   *
   * @param {string[]} paths - Array of paths to validate
   * @param {string} operation - Operation name
   * @returns {string[]} Array of validated absolute paths
   */
  validatePaths(paths, operation = 'unknown') {
    return paths.map(p => this.validatePath(p, operation));
  }

  /**
   * Get base filename from path (safely)
   *
   * @param {string} userPath - Path to extract basename from
   * @returns {string} Base filename
   */
  getBasename(userPath) {
    // Validate first to prevent path traversal
    this.validatePath(userPath, 'basename');
    return basename(userPath);
  }

  /**
   * Check if path is within boundaries (boolean check, doesn't throw)
   *
   * @param {string} userPath - Path to check
   * @returns {boolean} True if path is within boundaries
   */
  isWithinBoundaries(userPath) {
    try {
      this.validatePath(userPath, 'boundary_check');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the allowed root directory
   */
  getAllowedRoot() {
    return this.#allowedRoot;
  }

  /**
   * Log boundary violation attempt
   */
  #logViolation(userPath, violationType, operation, resolvedPath = null) {
    this.#auditLogger.logBoundaryViolation({
      timestamp: new Date().toISOString(),
      operation,
      violationType,
      attemptedPath: userPath,
      resolvedPath,
      allowedRoot: this.#allowedRoot
    });
  }

  /**
   * Create a wrapped fs module with automatic boundary validation
   *
   * @param {Object} fs - fs/promises module
   * @returns {Proxy} Wrapped fs module with boundary validation
   */
  wrapFs(fs) {
    const validator = this;

    // List of fs operations that take paths as first argument
    const pathOps = new Set([
      'readFile', 'writeFile', 'appendFile',
      'readdir', 'mkdir', 'rmdir', 'rm',
      'stat', 'lstat', 'access',
      'unlink', 'copyFile', 'rename',
      'chmod', 'chown', 'readlink', 'symlink'
    ]);

    return new Proxy(fs, {
      get(target, prop) {
        const original = target[prop];

        // Wrap path operations with validation
        if (pathOps.has(prop) && typeof original === 'function') {
          return function wrappedFsOperation(...args) {
            // Validate first argument (path)
            if (args.length > 0) {
              args[0] = validator.validatePath(args[0], prop);
            }

            // For operations with two paths (rename, copyFile), validate both
            if ((prop === 'rename' || prop === 'copyFile') && args.length > 1) {
              args[1] = validator.validatePath(args[1], prop);
            }

            return original.apply(target, args);
          };
        }

        return original;
      }
    });
  }
}

/**
 * Create a boundary validator for a specific directory
 *
 * @param {string} allowedRoot - Root directory to enforce
 * @param {Object} options - Configuration options
 * @returns {BoundaryValidator} Validator instance
 */
export function createBoundaryValidator(allowedRoot, options) {
  return new BoundaryValidator(allowedRoot, options);
}
