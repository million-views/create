/**
 * Boundary Enforcement - Runtime path boundary validation
 *
 * Wraps all file operations to ensure they stay within allowed directories.
 *
 * Defense-in-Depth Layer 3: Runtime Boundary Enforcement
 *
 * @module lib/security/boundary
 */

import { resolve, sep, basename } from 'node:path';
import { ViolationError } from '../error/index.mts';
import { getAuditLogger } from './audit.mjs';

/**
 * Options for Boundary constructor.
 */
export interface BoundaryOptions {
  /**
   * Custom audit logger instance.
   */
  auditLogger?: ReturnType<typeof getAuditLogger>;
}

/**
 * Filesystem module interface (subset used by Boundary).
 */
export interface FsModule {
  readFile: (...args: unknown[]) => Promise<unknown>;
  writeFile: (...args: unknown[]) => Promise<unknown>;
  appendFile: (...args: unknown[]) => Promise<unknown>;
  readdir: (...args: unknown[]) => Promise<unknown>;
  mkdir: (...args: unknown[]) => Promise<unknown>;
  rmdir: (...args: unknown[]) => Promise<unknown>;
  rm: (...args: unknown[]) => Promise<unknown>;
  stat: (...args: unknown[]) => Promise<unknown>;
  lstat: (...args: unknown[]) => Promise<unknown>;
  access: (...args: unknown[]) => Promise<unknown>;
  unlink: (...args: unknown[]) => Promise<unknown>;
  copyFile: (...args: unknown[]) => Promise<unknown>;
  rename: (...args: unknown[]) => Promise<unknown>;
  chmod: (...args: unknown[]) => Promise<unknown>;
  chown: (...args: unknown[]) => Promise<unknown>;
  readlink: (...args: unknown[]) => Promise<unknown>;
  symlink: (...args: unknown[]) => Promise<unknown>;
  [key: string]: unknown;
}

/**
 * Boundary Validator - Runtime enforcement of path boundaries.
 *
 * Use this class to ensure all file operations stay within allowed directories.
 * This provides defense-in-depth against path traversal attacks.
 *
 * @example
 * ```typescript
 * const boundary = new Boundary('/safe/directory');
 *
 * // Validates and returns absolute path
 * const safePath = boundary.validatePath('subdir/file.txt', 'read');
 *
 * // Throws ViolationError for path traversal
 * boundary.validatePath('../escape.txt', 'read'); // throws
 * ```
 */
export class Boundary {
  #allowedRoot: string;
  #auditLogger: ReturnType<typeof getAuditLogger>;

  constructor(allowedRoot: string, options: BoundaryOptions = {}) {
    this.#allowedRoot = resolve(allowedRoot);
    this.#auditLogger = options.auditLogger ?? getAuditLogger();
  }

  /**
   * Validate path stays within allowed boundaries.
   * MUST be called before ANY file operation.
   *
   * @param userPath - User-provided path (relative or absolute)
   * @param operation - Operation name for audit logging
   * @returns Validated absolute path
   * @throws ViolationError if path escapes boundaries
   */
  validatePath(userPath: string, operation: string = 'unknown'): string {
    // Validate input type
    if (typeof userPath !== 'string') {
      throw new ViolationError(
        'Path must be a string',
        { userPath: String(userPath), operation }
      );
    }

    // Check for null bytes (security risk)
    if (userPath.includes('\0')) {
      this.#logViolation(userPath, 'null_byte', operation);
      throw new ViolationError(
        'Path contains null bytes',
        { userPath, operation }
      );
    }

    // Resolve to absolute path (handles .. and . segments)
    const resolved = resolve(this.#allowedRoot, userPath);

    // Check boundary: resolved path must start with allowed root
    if (!resolved.startsWith(this.#allowedRoot + sep) && resolved !== this.#allowedRoot) {
      this.#logViolation(userPath, 'path_traversal', operation, resolved);
      throw new ViolationError(
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
   * Validate multiple paths at once.
   *
   * @param paths - Array of paths to validate
   * @param operation - Operation name
   * @returns Array of validated absolute paths
   */
  validatePaths(paths: string[], operation: string = 'unknown'): string[] {
    return paths.map(p => this.validatePath(p, operation));
  }

  /**
   * Get base filename from path (safely).
   *
   * @param userPath - Path to extract basename from
   * @returns Base filename
   */
  getBasename(userPath: string): string {
    // Validate first to prevent path traversal
    this.validatePath(userPath, 'basename');
    return basename(userPath);
  }

  /**
   * Check if path is within boundaries (boolean check, doesn't throw).
   *
   * @param userPath - Path to check
   * @returns True if path is within boundaries
   */
  isWithinBoundaries(userPath: string): boolean {
    try {
      this.validatePath(userPath, 'boundary_check');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the allowed root directory.
   */
  getAllowedRoot(): string {
    return this.#allowedRoot;
  }

  /**
   * Log boundary violation attempt.
   */
  #logViolation(
    userPath: string,
    violationType: string,
    operation: string,
    resolvedPath: string | null = null
  ): void {
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
   * Create a wrapped fs module with automatic boundary validation.
   *
   * @param fs - fs/promises module
   * @returns Wrapped fs module with boundary validation
   */
  wrapFs<T extends FsModule>(fs: T): T {
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
      get(target: T, prop: string | symbol): unknown {
        const original = target[prop as keyof T];

        // Wrap path operations with validation
        if (typeof prop === 'string' && pathOps.has(prop) && typeof original === 'function') {
          return function wrappedFsOperation(...args: unknown[]): unknown {
            // Validate first argument (path)
            if (args.length > 0 && typeof args[0] === 'string') {
              args[0] = validator.validatePath(args[0], prop);
            }

            // For operations with two paths (rename, copyFile), validate both
            if ((prop === 'rename' || prop === 'copyFile') && args.length > 1 && typeof args[1] === 'string') {
              args[1] = validator.validatePath(args[1], prop);
            }

            return (original as (...args: unknown[]) => unknown).apply(target, args);
          };
        }

        return original;
      }
    }) as T;
  }
}

/**
 * Create a boundary validator for a specific directory.
 *
 * @param allowedRoot - Root directory to enforce
 * @param options - Configuration options
 * @returns Boundary instance
 */
export function createBoundary(
  allowedRoot: string,
  options?: BoundaryOptions
): Boundary {
  return new Boundary(allowedRoot, options);
}

// Legacy export names for backward compatibility
export { Boundary as BoundaryValidator };
export { createBoundary as createBoundaryValidator };
