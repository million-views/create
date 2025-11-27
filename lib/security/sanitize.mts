/**
 * Sanitization functions for security-sensitive inputs
 *
 * Provides sanitization for paths, branch names, error messages,
 * and other user inputs that could be used in injection attacks.
 *
 * @module lib/security/sanitize
 */

import nodePath from 'node:path';
import os from 'node:os';
import { ValidationError } from '../error/validation.mts';

/**
 * Options for path sanitization.
 */
export interface PathOptions {
  /**
   * Base directory that operations should be restricted to.
   * Defaults to process.cwd().
   */
  allowedBase?: string;
}

/**
 * Sanitize and validate file paths to prevent directory traversal attacks.
 *
 * @param inputPath - User-provided path
 * @param options - Sanitization options or allowed base directory
 * @returns Sanitized and validated path
 * @throws ValidationError if path is invalid or contains traversal attempts
 *
 * @example
 * ```typescript
 * import { path } from './security/sanitize.mts';
 *
 * const safePath = path('subdir/file.txt');
 * const safePath2 = path('file.txt', { allowedBase: '/app/data' });
 * ```
 */
export function path(inputPath: string, options?: string | PathOptions): string {
  const allowedBase = typeof options === 'string'
    ? options
    : options?.allowedBase ?? process.cwd();

  if (!inputPath || typeof inputPath !== 'string') {
    throw new ValidationError('Path must be a non-empty string', 'path');
  }

  // Remove any null bytes (security measure)
  if (inputPath.includes('\0')) {
    throw new ValidationError('Path contains null bytes', 'path');
  }

  // Normalize the path to resolve any relative components
  const normalizedPath = nodePath.normalize(inputPath);

  // Check for path traversal attempts
  if (normalizedPath.includes('..')) {
    throw new ValidationError('Path traversal attempts are not allowed', 'path');
  }

  // Prevent absolute paths that could escape the working directory
  if (nodePath.isAbsolute(normalizedPath)) {
    throw new ValidationError('Absolute paths are not allowed', 'path');
  }

  // Resolve the full path relative to the allowed base
  const resolvedPath = nodePath.resolve(allowedBase, normalizedPath);
  const resolvedBase = nodePath.resolve(allowedBase);

  // Ensure the resolved path is within the allowed base directory
  if (!resolvedPath.startsWith(resolvedBase + nodePath.sep) && resolvedPath !== resolvedBase) {
    throw new ValidationError('Path escapes allowed directory boundaries', 'path');
  }

  return normalizedPath;
}

/**
 * Sanitize and validate branch names to prevent injection attacks.
 *
 * @param branchName - Git branch name to sanitize
 * @returns Sanitized branch name
 * @throws ValidationError if branch name is invalid or contains injection attempts
 *
 * @example
 * ```typescript
 * import { branch } from './security/sanitize.mts';
 *
 * const safeBranch = branch('feature/new-feature');
 * ```
 */
export function branch(branchName: string): string {
  if (!branchName || typeof branchName !== 'string') {
    throw new ValidationError('Branch name must be a non-empty string', 'branch');
  }

  // Remove any null bytes
  if (branchName.includes('\0')) {
    throw new ValidationError('Branch name contains null bytes', 'branch');
  }

  const trimmedBranch = branchName.trim();

  // Check length limits (git has a 255 character limit for ref names)
  if (trimmedBranch.length > 255) {
    throw new ValidationError('Branch name is too long (maximum 255 characters)', 'branch');
  }

  // Git branch name validation rules
  // Prevent control characters, spaces, and special git characters
  const invalidChars = /[\s\x00-\x1f\x7f~^:?*[\]\\]/;
  if (invalidChars.test(trimmedBranch)) {
    throw new ValidationError(
      'Branch name contains invalid characters (spaces, control characters, or git special characters)',
      'branch'
    );
  }

  // Prevent path traversal in branch names
  if (trimmedBranch.includes('..') ||
    trimmedBranch.startsWith('/') ||
    trimmedBranch.endsWith('/') ||
    trimmedBranch.includes('//')) {
    throw new ValidationError('Branch name contains path traversal attempts or invalid slashes', 'branch');
  }

  // Cannot start or end with dot (git rule)
  if (trimmedBranch.startsWith('.') || trimmedBranch.endsWith('.')) {
    throw new ValidationError('Branch name cannot start or end with a dot', 'branch');
  }

  // Cannot end with .lock (git rule)
  if (trimmedBranch.endsWith('.lock')) {
    throw new ValidationError('Branch name cannot end with .lock', 'branch');
  }

  // Prevent command injection attempts
  const injectionPatterns = [
    /[;&|`$()]/,  // Shell metacharacters
    /\$\{/,       // Variable expansion
    /\$\(/,       // Command substitution
    /`/          // Backticks
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(trimmedBranch)) {
      throw new ValidationError('Branch name contains potential command injection characters', 'branch');
    }
  }

  return trimmedBranch;
}

/**
 * Sanitize error messages to prevent information disclosure.
 *
 * Removes file paths, usernames, IP addresses, authentication tokens,
 * and other sensitive information from error messages.
 *
 * @param errorInput - Error object or message string
 * @returns Sanitized error message
 *
 * @example
 * ```typescript
 * import { error } from './security/sanitize.mts';
 *
 * const safeMessage = error(new Error('Failed at /Users/john/secret.txt'));
 * // Returns: "Failed at /Users/[user]/[path]"
 * ```
 */
export function error(errorInput: Error | string): string {
  let message = errorInput instanceof Error ? errorInput.message : String(errorInput);

  // Remove potential file paths that might leak system information
  message = message.replace(/\/[^\s]+/g, '[path]');
  message = message.replace(/[A-Z]:[^\s]+/g, '[path]'); // Windows paths

  // Remove potential usernames (more comprehensive)
  message = message.replace(/\/Users\/[^/\s]+/g, '/Users/[user]');
  message = message.replace(/\/home\/[^/\s]+/g, '/home/[user]');
  message = message.replace(/\\Users\\[^\\s]+/g, '\\Users\\[user]'); // Windows

  // Remove potential IP addresses
  message = message.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[ip]');

  // Remove potential ports
  message = message.replace(/:\d{2,5}\b/g, ':[port]');

  // Remove potential authentication tokens or keys (more comprehensive)
  message = message.replace(/\b[a-zA-Z0-9]{20,}\b/g, '[token]');
  message = message.replace(/\b[A-Fa-f0-9]{32,}\b/g, '[token]'); // Hex tokens
  message = message.replace(/\b[A-Za-z0-9+/]{20,}={0,2}\b/g, '[token]'); // Base64 tokens

  // Remove potential environment variables
  message = message.replace(/\$[A-Z_]+/g, '$[VAR]');

  // Remove potential secrets in various formats
  message = message.replace(/token[:\s=]+[^\s]+/gi, 'token [token]');
  message = message.replace(/key[:\s=]+[^\s]+/gi, 'key [token]');
  message = message.replace(/secret[:\s=]+[^\s]+/gi, 'secret [token]');
  message = message.replace(/password[:\s=]+[^\s]+/gi, 'password [token]');

  // Limit message length to prevent log flooding
  if (message.length > 500) {
    message = message.substring(0, 497) + '...';
  }

  return message;
}

/**
 * Create a secure temporary directory path with proper naming.
 *
 * Note: This function only generates the path - it does not create the directory.
 * The caller is responsible for creating and managing the directory.
 *
 * @returns Path for a secure temporary directory
 *
 * @internal
 */
export function _createSecureTempPath(): string {
  const tempBase = os.tmpdir();
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).slice(2, 9);

  // Create a predictable but unique temporary directory name
  const tempDirName = `tmp-template-${timestamp}-${randomSuffix}`;

  // Validate the generated name
  const sanitizedName = path(tempDirName, tempBase);

  return nodePath.join(tempBase, sanitizedName);
}

// Legacy export names for backward compatibility
export { path as sanitizePath };
export { branch as sanitizeBranchName };
export { error as sanitizeErrorMessage };
export { _createSecureTempPath as createSecureTempDir };
