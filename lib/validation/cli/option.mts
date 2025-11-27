/**
 * CLI Option Validators
 *
 * Validates CLI command options and parameters.
 * Part of the security validation layer for user inputs.
 *
 * @module lib/validation/cli/option
 */

import { ValidationError } from '../../error/validation.mts';

/**
 * Supported IDE values.
 */
export const SUPPORTED_IDES = ['kiro', 'vscode', 'cursor', 'windsurf'] as const;
export type SupportedIde = typeof SUPPORTED_IDES[number];

/**
 * Supported authoring modes.
 */
export const AUTHORING_MODES = ['wysiwyg', 'composable'] as const;
export type AuthoringMode = typeof AUTHORING_MODES[number];

/**
 * Default author assets directory name.
 */
export const DEFAULT_AUTHOR_ASSETS_DIR = '__scaffold__';

/**
 * Validate IDE parameter.
 *
 * @param ide - IDE parameter value
 * @returns Normalized IDE name or null if not provided
 * @throws ValidationError if IDE value is invalid
 */
export function ide(input: unknown): SupportedIde | null {
  // Return null for undefined or null values
  if (input === undefined || input === null) {
    return null;
  }

  if (typeof input !== 'string') {
    throw new ValidationError('IDE parameter must be a string', 'ide');
  }

  // Remove any null bytes
  if (input.includes('\0')) {
    throw new ValidationError('IDE parameter contains null bytes', 'ide');
  }

  const trimmedIde = input.trim();

  // Return null for empty strings
  if (!trimmedIde) {
    return null;
  }

  // Case-insensitive matching with lowercase normalization
  const normalizedIde = trimmedIde.toLowerCase();

  if (!SUPPORTED_IDES.includes(normalizedIde as SupportedIde)) {
    throw new ValidationError(
      `Invalid IDE: "${input}". Supported IDEs: ${SUPPORTED_IDES.join(', ')}`,
      'ide'
    );
  }

  return normalizedIde as SupportedIde;
}

/**
 * Validate authoring mode string.
 *
 * @param mode - Authoring mode value
 * @returns Normalized authoring mode (defaults to 'wysiwyg')
 * @throws ValidationError if mode is invalid
 */
export function authoringMode(mode: unknown): AuthoringMode {
  if (mode === undefined || mode === null) {
    return 'wysiwyg';
  }

  if (typeof mode !== 'string') {
    throw new ValidationError('setup.authoring must be a string', 'authoring');
  }

  const normalized = mode.trim().toLowerCase();
  if (normalized === '') {
    return 'wysiwyg';
  }

  if (!AUTHORING_MODES.includes(normalized as AuthoringMode)) {
    throw new ValidationError(
      `setup.authoring must be one of: ${AUTHORING_MODES.join(', ')}`,
      'authoring'
    );
  }

  return normalized as AuthoringMode;
}

/**
 * Validate the author assets directory name.
 *
 * @param value - Directory name value
 * @returns Validated directory name (defaults to '__scaffold__')
 * @throws ValidationError if directory name is invalid
 */
export function authorAssetsDir(value: unknown): string {
  if (value === undefined || value === null) {
    return DEFAULT_AUTHOR_ASSETS_DIR;
  }

  if (typeof value !== 'string') {
    throw new ValidationError('setup.authorAssetsDir must be a string', 'authorAssetsDir');
  }

  const trimmed = value.trim();
  if (trimmed === '') {
    return DEFAULT_AUTHOR_ASSETS_DIR;
  }

  if (trimmed.length > 80) {
    throw new ValidationError('setup.authorAssetsDir must be 80 characters or fewer', 'authorAssetsDir');
  }

  if (trimmed.includes('/') || trimmed.includes('\\')) {
    throw new ValidationError('setup.authorAssetsDir cannot contain path separators', 'authorAssetsDir');
  }

  if (!/^[A-Za-z0-9._-]+$/.test(trimmed)) {
    throw new ValidationError(
      'setup.authorAssetsDir may contain only letters, numbers, ".", "-", and "_"',
      'authorAssetsDir'
    );
  }

  return trimmed;
}

/**
 * Validate log file path parameter.
 *
 * @param logFile - Log file path
 * @returns Validated log file path or null
 * @throws ValidationError if log file path is invalid
 */
export function logFilePath(logFile: unknown): string | null {
  // Return null for undefined or null values
  if (logFile === undefined || logFile === null) {
    return null;
  }

  if (typeof logFile !== 'string') {
    throw new ValidationError('Log file path must be a string', 'logFile');
  }

  // Remove any null bytes
  if (logFile.includes('\0')) {
    throw new ValidationError('Log file path contains null bytes', 'logFile');
  }

  const trimmedPath = logFile.trim();

  // Reject empty strings
  if (!trimmedPath) {
    throw new ValidationError('Log file path cannot be empty', 'logFile');
  }

  // Check for path traversal attempts
  if (trimmedPath.includes('..')) {
    throw new ValidationError('Log file path contains path traversal attempts', 'logFile');
  }

  // Prevent certain dangerous paths
  const dangerousPaths = ['/etc/', '/usr/', '/var/', '/sys/', '/proc/'];
  for (const dangerous of dangerousPaths) {
    if (trimmedPath.startsWith(dangerous)) {
      throw new ValidationError('Log file path points to restricted system directory', 'logFile');
    }
  }

  return trimmedPath;
}

/**
 * Validate cache TTL parameter.
 *
 * @param cacheTtl - Cache TTL in hours as string
 * @returns Validated TTL in hours or null
 * @throws ValidationError if cache TTL is invalid
 */
export function cacheTtl(input: unknown): number | null {
  // Return null for undefined or null values
  if (input === undefined || input === null) {
    return null;
  }

  if (typeof input !== 'string') {
    throw new ValidationError('Cache TTL must be a string', 'cacheTtl');
  }

  // Remove any null bytes
  if (input.includes('\0')) {
    throw new ValidationError('Cache TTL contains null bytes', 'cacheTtl');
  }

  const trimmedTtl = input.trim();

  // Return null for empty strings
  if (!trimmedTtl) {
    return null;
  }

  // Parse as integer
  const ttlValue = parseInt(trimmedTtl, 10);

  // Check if parsing was successful
  if (isNaN(ttlValue) || ttlValue.toString() !== trimmedTtl) {
    throw new ValidationError('Cache TTL must be a valid integer', 'cacheTtl');
  }

  // Check range (1 hour to 30 days)
  if (ttlValue < 1 || ttlValue > 720) {
    throw new ValidationError('Cache TTL must be between 1 and 720 hours', 'cacheTtl');
  }

  return ttlValue;
}

// Legacy export names for backward compatibility
export { ide as validateIdeParameter };
export { authoringMode as validateAuthoringMode };
export { authorAssetsDir as validateAuthorAssetsDir };
export { logFilePath as validateLogFilePath };
export { cacheTtl as validateCacheTtl };
