/**
 * CLI Input Validators
 *
 * Validates CLI command inputs including repository URLs, template names,
 * and project directory names for security and format compliance.
 *
 * @module lib/validation/cli/input
 */

import { ValidationError } from '../../error/validation.mts';

/**
 * Validate and sanitize repository URLs to prevent malicious redirects.
 *
 * Accepts:
 * - Local file paths: `/path/to/repo`, `./relative`, `~/home`
 * - Full URLs: `https://github.com/user/repo`
 * - GitHub shorthand: `user/repo`
 *
 * @param repoUrl - Repository URL or identifier
 * @returns Validated repository URL
 * @throws ValidationError if repository URL is invalid or malicious
 *
 * @example
 * ```typescript
 * import { repoUrl } from './validation/cli/input.mts';
 *
 * const validUrl = repoUrl('octocat/hello-world');
 * const localRepo = repoUrl('./my-template');
 * const httpsRepo = repoUrl('https://github.com/user/repo');
 * ```
 */
export function repoUrl(input: string): string {
  if (!input || typeof input !== 'string') {
    throw new ValidationError('Repository URL must be a non-empty string', 'repo');
  }

  // Remove any null bytes
  if (input.includes('\0')) {
    throw new ValidationError('Repository URL contains null bytes', 'repo');
  }

  // Trim whitespace
  const trimmedUrl = input.trim();

  // Local file path validation
  if (trimmedUrl.startsWith('/') || trimmedUrl.startsWith('./') || trimmedUrl.startsWith('~/')) {
    // Validate local paths
    if (trimmedUrl.includes('..')) {
      throw new ValidationError('Local repository path contains path traversal attempts', 'repo');
    }

    // Additional validation for local paths
    if (trimmedUrl.includes('\n') || trimmedUrl.includes('\r')) {
      throw new ValidationError('Repository path contains invalid characters', 'repo');
    }

    return trimmedUrl;
  }

  // Full URL validation
  if (trimmedUrl.includes('://')) {
    try {
      const url = new URL(trimmedUrl);

      // Allow only safe protocols
      const allowedProtocols = ['http:', 'https:', 'git:', 'ssh:'];
      if (!allowedProtocols.includes(url.protocol)) {
        throw new ValidationError(`Unsupported protocol: ${url.protocol}`, 'repo');
      }

      // Prevent localhost and private IP ranges for security
      const hostname = url.hostname.toLowerCase();
      if (hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '::1' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.match(/^172\.(1[6-9]|2[0-9]|3[01])\./)) {
        throw new ValidationError('Private network URLs are not allowed', 'repo');
      }

      // Prevent suspicious characters in URL
      if (url.href.includes('\n') || url.href.includes('\r') || url.href.includes('\t')) {
        throw new ValidationError('Repository URL contains invalid characters', 'repo');
      }

      return trimmedUrl;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError('Invalid repository URL format', 'repo');
    }
  }

  // GitHub user/repo format validation
  const userRepoPattern = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;
  if (!userRepoPattern.test(trimmedUrl)) {
    throw new ValidationError(
      'Repository format must be user/repo, a valid URL, or a local path',
      'repo'
    );
  }

  // Additional validation for user/repo format
  const [user, repo] = trimmedUrl.split('/');

  // Validate user and repo names
  if (user.length > 39 || repo.length > 100) {
    throw new ValidationError('Repository user or name is too long', 'repo');
  }

  if (user.startsWith('.') || user.endsWith('.') ||
    repo.startsWith('.') || repo.endsWith('.')) {
    throw new ValidationError('Repository user or name cannot start or end with dots', 'repo');
  }

  return trimmedUrl;
}

/**
 * Validate template names to prevent directory traversal.
 *
 * Template names support nested paths (e.g., "category/template") but
 * each segment must be safe alphanumeric with hyphens/underscores.
 *
 * @param templateName - Template name or path
 * @returns Validated template name
 * @throws ValidationError if template name is invalid or contains traversal attempts
 *
 * @example
 * ```typescript
 * import { templateName } from './validation/cli/input.mts';
 *
 * const validName = templateName('react-app');
 * const nested = templateName('frontend/react-app');
 * ```
 */
export function templateName(input: string): string {
  if (!input || typeof input !== 'string') {
    throw new ValidationError('Template name must be a non-empty string', 'template');
  }

  // Remove any null bytes
  if (input.includes('\0')) {
    throw new ValidationError('Template name contains null bytes', 'template');
  }

  const trimmedTemplate = input.trim();

  // Check for path traversal attempts
  if (trimmedTemplate.includes('..') ||
    trimmedTemplate.startsWith('/') ||
    trimmedTemplate.includes('\\')) {
    throw new ValidationError('Template name contains path traversal attempts', 'template');
  }

  // Validate each segment of the template path (for nested templates)
  const segments = trimmedTemplate.split('/');

  for (const segment of segments) {
    if (!segment) {
      throw new ValidationError('Template name contains empty path segments', 'template');
    }

    if (segment === '.' || segment === '..') {
      throw new ValidationError('Template name contains relative path components', 'template');
    }

    if (segment.startsWith('.')) {
      throw new ValidationError('Template name segments cannot start with dots', 'template');
    }

    // Each segment should contain only safe characters
    if (!/^[a-zA-Z0-9_-]+$/.test(segment)) {
      throw new ValidationError(
        'Template name contains invalid characters (use only letters, numbers, hyphens, and underscores)',
        'template'
      );
    }

    // Check segment length
    if (segment.length > 100) {
      throw new ValidationError('Template name segment is too long', 'template');
    }
  }

  // Check total length
  if (trimmedTemplate.length > 255) {
    throw new ValidationError('Template name is too long (maximum 255 characters)', 'template');
  }

  return trimmedTemplate;
}

/**
 * Reserved directory names that cannot be used as project directories.
 */
const RESERVED_NAMES = [
  'node_modules', 'package.json', 'package-lock.json', 'yarn.lock',
  'con', 'prn', 'aux', 'nul', // Windows reserved names
  'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9',
  'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9'
];

/**
 * Validate project directory names for filesystem compatibility and security.
 *
 * @param projectDir - Project directory name
 * @returns Validated project directory name
 * @throws ValidationError if project directory name is invalid
 *
 * @example
 * ```typescript
 * import { projectDirectory } from './validation/cli/input.mts';
 *
 * const validDir = projectDirectory('my-project');
 * ```
 */
export function projectDirectory(input: string): string {
  if (!input || typeof input !== 'string') {
    throw new ValidationError('Project directory name must be a non-empty string', 'projectDirectory');
  }

  // Remove any null bytes
  if (input.includes('\0')) {
    throw new ValidationError('Project directory name contains null bytes', 'projectDirectory');
  }

  const trimmedDir = input.trim();

  // Check for path traversal attempts
  if (trimmedDir.includes('..') ||
    trimmedDir.includes('/') ||
    trimmedDir.includes('\\')) {
    throw new ValidationError('Project directory name contains path separators or traversal attempts', 'projectDirectory');
  }

  // Prevent hidden directories and special names
  if (trimmedDir.startsWith('.')) {
    throw new ValidationError('Project directory name cannot start with a dot', 'projectDirectory');
  }

  // Prevent reserved names
  if (RESERVED_NAMES.includes(trimmedDir.toLowerCase())) {
    throw new ValidationError('Project directory name is reserved and cannot be used', 'projectDirectory');
  }

  // Check for valid characters (letters, numbers, hyphens, underscores)
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  if (!validPattern.test(trimmedDir)) {
    throw new ValidationError(
      'Project directory name contains invalid characters (use only letters, numbers, hyphens, and underscores)',
      'projectDirectory'
    );
  }

  // Check length limits
  if (trimmedDir.length > 100) {
    throw new ValidationError('Project directory name is too long (maximum 100 characters)', 'projectDirectory');
  }

  if (trimmedDir.length < 1) {
    throw new ValidationError('Project directory name is too short', 'projectDirectory');
  }

  return trimmedDir;
}

/**
 * Input object for comprehensive validation.
 */
export interface AllInputs {
  projectName?: string;
  projectDirectory?: string;
  template?: string;
  repo?: string;
  branch?: string;
  ide?: string;
  logFile?: string;
  cacheTtl?: string;
  cache?: boolean;
  dryRun?: boolean;
  inputPrompts?: boolean;
  config?: unknown;
  placeholders?: unknown;
  selection?: unknown;
}

/**
 * Validated inputs result.
 */
export interface ValidatedInputs {
  projectName?: string;
  projectDirectory?: string;
  template?: string;
  repo?: string;
  branch?: string;
  ide?: string | null;
  logFile?: string | null;
  cacheTtl?: number | null;
  cache?: boolean;
  dryRun?: boolean;
  inputPrompts?: boolean;
  config?: unknown;
  placeholders?: unknown;
  selection?: unknown;
}

// Import other validators for allInputs orchestration
import { ide as validateIde, logFilePath, cacheTtl as validateCacheTtl } from './option.mts';
import { branch as sanitizeBranch } from '../../security/sanitize.mts';

/**
 * Validate all inputs comprehensively.
 *
 * Orchestrates validation of all CLI inputs, collecting all errors
 * and reporting them together.
 *
 * @param inputs - Object containing all user inputs
 * @returns Validated and sanitized inputs
 * @throws ValidationError if any input is invalid
 *
 * @example
 * ```typescript
 * import { allInputs } from './validation/cli/input.mts';
 *
 * const validated = allInputs({
 *   projectName: 'my-app',
 *   template: 'react-app',
 *   repo: 'octocat/templates'
 * });
 * ```
 */
export function allInputs(inputs: AllInputs): ValidatedInputs {
  const validated: ValidatedInputs = {};
  const errors: string[] = [];

  try {
    if (inputs.projectName) {
      validated.projectName = projectDirectory(inputs.projectName);
    }
  } catch (error) {
    errors.push((error as Error).message);
  }

  try {
    if (inputs.projectDirectory) {
      validated.projectDirectory = projectDirectory(inputs.projectDirectory);
    }
  } catch (error) {
    errors.push((error as Error).message);
  }

  try {
    if (inputs.template) {
      // Check if this looks like a URL/path (for --template flag)
      const looksLikeUrl = inputs.template.includes('/') ||
        inputs.template.includes('://') ||
        inputs.template.startsWith('./') ||
        inputs.template.startsWith('../');

      if (looksLikeUrl) {
        // For template URLs, validate against injection attacks
        if (inputs.template.includes('\0')) {
          throw new ValidationError('Template URL contains null bytes', 'template');
        }
        // Block shell metacharacters (injection prevention)
        if (inputs.template.includes(';') || inputs.template.includes('|') ||
          inputs.template.includes('&') || inputs.template.includes('`') ||
          inputs.template.includes('$(') || inputs.template.includes('${')) {
          throw new ValidationError('Template URL contains shell metacharacters (blocked for security)', 'template');
        }
        validated.template = inputs.template.trim();
      } else {
        // For template names, use full validation
        validated.template = templateName(inputs.template);
      }
    }
  } catch (error) {
    errors.push((error as Error).message);
  }

  try {
    if (inputs.repo) {
      validated.repo = repoUrl(inputs.repo);
    }
  } catch (error) {
    errors.push((error as Error).message);
  }

  try {
    if (inputs.branch) {
      validated.branch = sanitizeBranch(inputs.branch);
    }
  } catch (error) {
    errors.push((error as Error).message);
  }

  try {
    if (inputs.ide !== undefined) {
      validated.ide = validateIde(inputs.ide);
    }
  } catch (error) {
    errors.push((error as Error).message);
  }

  try {
    if (inputs.logFile !== undefined) {
      validated.logFile = logFilePath(inputs.logFile);
    }
  } catch (error) {
    errors.push((error as Error).message);
  }

  try {
    if (inputs.cacheTtl !== undefined) {
      validated.cacheTtl = validateCacheTtl(inputs.cacheTtl);
    }
  } catch (error) {
    errors.push((error as Error).message);
  }

  if (errors.length > 0) {
    throw new ValidationError(`Input validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}`);
  }

  // Copy over safe boolean/string flags that don't need validation
  if (inputs.cache !== undefined) validated.cache = inputs.cache;
  if (inputs.dryRun !== undefined) validated.dryRun = inputs.dryRun;
  if (inputs.inputPrompts !== undefined) validated.inputPrompts = inputs.inputPrompts;
  if (inputs.config !== undefined) validated.config = inputs.config;
  if (inputs.placeholders !== undefined) validated.placeholders = inputs.placeholders;
  if (inputs.selection !== undefined) validated.selection = inputs.selection;

  return validated;
}

// Legacy export names for backward compatibility
export { repoUrl as validateRepoUrl };
export { templateName as validateTemplateName };
export { projectDirectory as validateProjectDirectory };
export { allInputs as validateAllInputs };
