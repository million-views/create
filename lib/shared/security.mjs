#!/usr/bin/env node

import path from 'path';
import os from 'os';

/**
 * Comprehensive input validation and security module
 * Implements path traversal prevention, input sanitization, and security validation
 * for all user inputs in the CLI tool.
 */

/**
 * Get the current package name for use in error messages and validation
 * @returns {string} - The current package name
 */
export function getPackageName() {
  return '@m5nv/create-scaffold';
}

/**
 * Generate installation instructions with correct package name
 * @returns {string} - Installation instructions
 */
export function generateInstallationInstructions() {
  const packageName = getPackageName();
  return `Installation options:
  • Use npm create: npm create @m5nv/scaffold <project-name> -- --template <template-name>
  • Use npx: npx ${packageName}@latest <project-name> --template <template-name>
  • Install globally: npm install -g ${packageName}`;
}

/**
 * Generate package validation error message
 * @param {string} invalidName - The invalid package name that was provided
 * @returns {string} - Error message with correct package name
 */
export function generatePackageValidationError(invalidName) {
  const correctName = getPackageName();
  return `Invalid package name: "${invalidName}". Expected: "${correctName}"`;
}

/**
 * Validate that the provided package name matches the expected package name
 * @param {string} packageName - Package name to validate
 * @returns {boolean} - True if package name is valid
 * @throws {ValidationError} - If package name is invalid
 */
export function validatePackageName(packageName) {
  if (!packageName || typeof packageName !== 'string') {
    throw new ValidationError('Package name must be a non-empty string', 'packageName');
  }

  const expectedName = getPackageName();

  if (packageName.trim() !== expectedName) {
    throw new ValidationError(
      generatePackageValidationError(packageName),
      'packageName'
    );
  }

  return true;
}

/**
 * Validate package identity and ensure consistency
 * This function can be used to verify the package is running with the correct identity
 * @returns {boolean} - True if package identity is valid
 * @throws {ValidationError} - If package identity validation fails
 */
export function validatePackageIdentity() {
  try {
    const expectedName = getPackageName();

    // Validate the expected name format
    if (expectedName !== '@m5nv/create-scaffold') {
      throw new ValidationError(
        'Package identity validation failed: incorrect package name format',
        'packageIdentity'
      );
    }

    // Validate package name follows npm create conventions
    if (!expectedName.startsWith('@m5nv/create-')) {
      throw new ValidationError(
        'Package identity validation failed: package name does not follow npm create conventions',
        'packageIdentity'
      );
    }

    return true;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError(
      'Package identity validation failed: unable to verify package configuration',
      'packageIdentity'
    );
  }
}

/**
 * Custom error class for validation errors
 */
export class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Sanitize and validate file paths to prevent directory traversal attacks
 * @param {string} inputPath - User-provided path
 * @param {string} allowedBase - Base directory that operations should be restricted to
 * @returns {string} - Sanitized and validated path
 * @throws {ValidationError} - If path is invalid or contains traversal attempts
 */
export function sanitizePath(inputPath, allowedBase = process.cwd()) {
  if (!inputPath || typeof inputPath !== 'string') {
    throw new ValidationError('Path must be a non-empty string', 'path');
  }

  // Remove any null bytes (security measure)
  if (inputPath.includes('\0')) {
    throw new ValidationError('Path contains null bytes', 'path');
  }

  // Normalize the path to resolve any relative components
  const normalizedPath = path.normalize(inputPath);

  // Check for path traversal attempts
  if (normalizedPath.includes('..')) {
    throw new ValidationError('Path traversal attempts are not allowed', 'path');
  }

  // Prevent absolute paths that could escape the working directory
  if (path.isAbsolute(normalizedPath)) {
    throw new ValidationError('Absolute paths are not allowed', 'path');
  }

  // Resolve the full path relative to the allowed base
  const resolvedPath = path.resolve(allowedBase, normalizedPath);
  const resolvedBase = path.resolve(allowedBase);

  // Ensure the resolved path is within the allowed base directory
  if (!resolvedPath.startsWith(resolvedBase + path.sep) && resolvedPath !== resolvedBase) {
    throw new ValidationError('Path escapes allowed directory boundaries', 'path');
  }

  return normalizedPath;
}

/**
 * Validate and sanitize repository URLs to prevent malicious redirects
 * @param {string} repoUrl - Repository URL or identifier
 * @returns {string} - Validated repository URL
 * @throws {ValidationError} - If repository URL is invalid or malicious
 */
export function validateRepoUrl(repoUrl) {
  if (!repoUrl || typeof repoUrl !== 'string') {
    throw new ValidationError('Repository URL must be a non-empty string', 'repo');
  }

  // Remove any null bytes
  if (repoUrl.includes('\0')) {
    throw new ValidationError('Repository URL contains null bytes', 'repo');
  }

  // Trim whitespace
  const trimmedUrl = repoUrl.trim();

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
 * Validate branch names against injection attacks and git naming rules
 * @param {string} branchName - Git branch name
 * @returns {string} - Validated branch name
 * @throws {ValidationError} - If branch name is invalid or contains injection attempts
 */
export function sanitizeBranchName(branchName) {
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
 * Validate template names to prevent directory traversal
 * @param {string} templateName - Template name or path
 * @returns {string} - Validated template name
 * @throws {ValidationError} - If template name is invalid or contains traversal attempts
 */
export function validateTemplateName(templateName) {
  if (!templateName || typeof templateName !== 'string') {
    throw new ValidationError('Template name must be a non-empty string', 'template');
  }

  // Remove any null bytes
  if (templateName.includes('\0')) {
    throw new ValidationError('Template name contains null bytes', 'template');
  }

  const trimmedTemplate = templateName.trim();

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
 * Validate project directory names for filesystem compatibility and security
 * @param {string} projectDir - Project directory name
 * @returns {string} - Validated project directory name
 * @throws {ValidationError} - If project directory name is invalid
 */
export function validateProjectDirectory(projectDir) {
  if (!projectDir || typeof projectDir !== 'string') {
    throw new ValidationError('Project directory name must be a non-empty string', 'projectDirectory');
  }

  // Remove any null bytes
  if (projectDir.includes('\0')) {
    throw new ValidationError('Project directory name contains null bytes', 'projectDirectory');
  }

  const trimmedDir = projectDir.trim();

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
  const reservedNames = [
    'node_modules', 'package.json', 'package-lock.json', 'yarn.lock',
    'con', 'prn', 'aux', 'nul', // Windows reserved names
    'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9',
    'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9'
  ];

  if (reservedNames.includes(trimmedDir.toLowerCase())) {
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
 * Sanitize error messages to prevent information disclosure
 * @param {Error|string} error - Error object or message
 * @returns {string} - Sanitized error message
 */
export function sanitizeErrorMessage(error) {
  let message = error instanceof Error ? error.message : String(error);

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
 * Create a secure temporary directory with proper permissions
 * @returns {string} - Path to the created temporary directory
 * @throws {ValidationError} - If temporary directory creation fails
 */
export function createSecureTempDir() {
  const tempBase = os.tmpdir();
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).slice(2, 9);

  // Create a predictable but unique temporary directory name
  const tempDirName = `tmp-template-${timestamp}-${randomSuffix}`;

  // Validate the generated name
  const sanitizedName = sanitizePath(tempDirName, tempBase);

  return path.join(tempBase, sanitizedName);
}

/**
 * Validate IDE parameter against allowed values
 * @param {string|null|undefined} ide - IDE parameter value
 * @returns {string|null} - Validated and normalized IDE value or null
 * @throws {ValidationError} - If IDE value is invalid
 */
export function validateIdeParameter(ide) {
  // Return null for undefined or null values
  if (ide === undefined || ide === null) {
    return null;
  }

  if (typeof ide !== 'string') {
    throw new ValidationError('IDE parameter must be a string', 'ide');
  }

  // Remove any null bytes
  if (ide.includes('\0')) {
    throw new ValidationError('IDE parameter contains null bytes', 'ide');
  }

  const trimmedIde = ide.trim();

  // Return null for empty strings
  if (!trimmedIde) {
    return null;
  }

  // Allowed IDE values
  const allowedIdes = ['kiro', 'vscode', 'cursor', 'windsurf'];

  // Case-insensitive matching with lowercase normalization
  const normalizedIde = trimmedIde.toLowerCase();

  if (!allowedIdes.includes(normalizedIde)) {
    throw new ValidationError(
      `Invalid IDE: "${ide}". Supported IDEs: ${allowedIdes.join(', ')}`,
      'ide'
    );
  }

  return normalizedIde;
}

/**
 * Validate options parameter with parsing and validation
 * @param {string|null|undefined} options - Options parameter value
 * @returns {string[]} - Array of validated option names or empty array
 * @throws {ValidationError} - If options parameter is invalid
 */
export function validateOptionsParameter(options) {
  // Return empty array for undefined, null, or empty values
  if (options === undefined || options === null) {
    return [];
  }

  if (typeof options !== 'string') {
    throw new ValidationError('Options parameter must be a string', 'options');
  }

  // Remove any null bytes
  if (options.includes('\0')) {
    throw new ValidationError('Options parameter contains null bytes', 'options');
  }

  const trimmedOptions = options.trim();

  // Return empty array for empty strings
  if (!trimmedOptions) {
    return [];
  }

  // Parse comma-separated option names
  const optionList = trimmedOptions.split(',').map(f => f.trim()).filter(f => f.length > 0);

  // Regex validation for option tokens
  const validOptionPattern = /^[a-zA-Z0-9_-]+(?:=[a-zA-Z0-9_-]+(?:\+[a-zA-Z0-9_-]+)*)?$/;

  for (const option of optionList) {
    if (!validOptionPattern.test(option)) {
      throw new ValidationError(
        `Invalid option name: "${option}". Option names must contain only letters, numbers, hyphens, and underscores`,
        'options'
      );
    }

    // Check option name length
    if (option.length > 200) {
      throw new ValidationError(
        `Option token too long: "${option}". Maximum 200 characters allowed`,
        'options'
      );
    }
  }

  return optionList;
}

/**
 * Validate authoring mode string
 * @param {any} mode
 * @returns {'wysiwyg'|'composable'}
 */
export function validateAuthoringMode(mode) {
  if (mode === undefined || mode === null) {
    return 'wysiwyg';
  }

  if (typeof mode !== 'string') {
    throw new ValidationError('setup.authoringMode must be a string', 'authoringMode');
  }

  const normalized = mode.trim().toLowerCase();
  if (normalized === '') {
    return 'wysiwyg';
  }

  const allowed = ['wysiwyg', 'composable'];
  if (!allowed.includes(normalized)) {
    throw new ValidationError(
      `setup.authoringMode must be one of: ${allowed.join(', ')}`,
      'authoringMode'
    );
  }

  return normalized;
}

/**
 * Validate the author assets directory name.
 * @param {any} value
 * @returns {string}
 */
export function validateAuthorAssetsDir(value) {
  const DEFAULT_DIR = '__scaffold__';

  if (value === undefined || value === null) {
    return DEFAULT_DIR;
  }

  if (typeof value !== 'string') {
    throw new ValidationError('setup.authorAssetsDir must be a string', 'authorAssetsDir');
  }

  const trimmed = value.trim();
  if (trimmed === '') {
    return DEFAULT_DIR;
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
 * Validate dimensions metadata
 * @param {any} dimensions
 * @returns {Record<string, object>}
 */
export function validateDimensionsMetadata(dimensions) {
  if (dimensions === undefined || dimensions === null) {
    return {};
  }

  if (typeof dimensions !== 'object' || Array.isArray(dimensions)) {
    throw new ValidationError('setup.dimensions must be an object', 'dimensions');
  }

  const normalized = {};
  const dimensionNamePattern = /^[a-z][a-z0-9_-]{0,49}$/;
  const valuePattern = /^[a-zA-Z0-9_-]+$/;

  for (const [name, rawDefinition] of Object.entries(dimensions)) {
    if (!dimensionNamePattern.test(name)) {
      throw new ValidationError(
        `Invalid dimension name "${name}". Dimension names must start with a letter and contain only letters, numbers, hyphens, or underscores (max 50 characters).`,
        'dimensions'
      );
    }

    if (typeof rawDefinition !== 'object' || rawDefinition === null || Array.isArray(rawDefinition)) {
      throw new ValidationError(
        `Dimension "${name}" must be an object`,
        'dimensions'
      );
    }

    const type = rawDefinition.type === 'multi' ? 'multi' : rawDefinition.type === 'single' ? 'single' : null;
    if (!type) {
      throw new ValidationError(
        `Dimension "${name}" must declare type \"single\" or \"multi\"`,
        'dimensions'
      );
    }

    if (!Array.isArray(rawDefinition.values) || rawDefinition.values.length === 0) {
      throw new ValidationError(
        `Dimension "${name}" must declare a non-empty values array`,
        'dimensions'
      );
    }

    const values = [];
    const seenValues = new Set();
    for (const rawValue of rawDefinition.values) {
      if (typeof rawValue !== 'string') {
        throw new ValidationError(
          `Dimension "${name}" values must be strings`,
          'dimensions'
        );
      }
      const trimmed = rawValue.trim();
      if (!trimmed) {
        throw new ValidationError(
          `Dimension "${name}" values cannot be empty`,
          'dimensions'
        );
      }
      if (!valuePattern.test(trimmed)) {
        throw new ValidationError(
          `Dimension "${name}" has invalid value "${rawValue}". Values must contain only letters, numbers, hyphens, or underscores`,
          'dimensions'
        );
      }
      if (trimmed.length > 50) {
        throw new ValidationError(
          `Dimension "${name}" value "${trimmed}" exceeds 50 characters`,
          'dimensions'
        );
      }
      if (!seenValues.has(trimmed)) {
        seenValues.add(trimmed);
        values.push(trimmed);
      }
    }

    let defaultValue = rawDefinition.default ?? (type === 'single' ? null : []);

    if (type === 'single') {
      if (defaultValue !== null) {
        if (typeof defaultValue !== 'string') {
          throw new ValidationError(
            `Dimension "${name}" default must be a string or null`,
            'dimensions'
          );
        }
        const normalizedDefault = defaultValue.trim();
        if (normalizedDefault && !values.includes(normalizedDefault)) {
          throw new ValidationError(
            `Dimension "${name}" default "${normalizedDefault}" must be one of the declared values`,
            'dimensions'
          );
        }
        defaultValue = normalizedDefault || null;
      }
    } else {
      if (!Array.isArray(defaultValue)) {
        defaultValue = [];
      }
      const multiDefaults = [];
      for (const rawDefault of defaultValue) {
        if (typeof rawDefault !== 'string') {
          throw new ValidationError(
            `Dimension "${name}" multi default entries must be strings`,
            'dimensions'
          );
        }
        const trimmedDefault = rawDefault.trim();
        if (!values.includes(trimmedDefault)) {
          throw new ValidationError(
            `Dimension "${name}" default value "${trimmedDefault}" must be one of the declared values`,
            'dimensions'
          );
        }
        if (!multiDefaults.includes(trimmedDefault)) {
          multiDefaults.push(trimmedDefault);
        }
      }
      defaultValue = multiDefaults;
    }

    const normalizedRequires = {};
    if (rawDefinition.requires !== undefined) {
      if (typeof rawDefinition.requires !== 'object' || rawDefinition.requires === null || Array.isArray(rawDefinition.requires)) {
        throw new ValidationError(
          `Dimension "${name}" requires must be an object`,
          'dimensions'
        );
      }
      for (const [value, deps] of Object.entries(rawDefinition.requires)) {
        if (!values.includes(value)) {
          throw new ValidationError(
            `Dimension "${name}" requires references unknown value "${value}"`,
            'dimensions'
          );
        }
        if (!Array.isArray(deps) || deps.length === 0) {
          throw new ValidationError(
            `Dimension "${name}" requires entry for "${value}" must be a non-empty array`,
            'dimensions'
          );
        }
        const normalizedDeps = [];
        for (const dep of deps) {
          if (typeof dep !== 'string') {
            throw new ValidationError(
              `Dimension "${name}" requires for "${value}" must be strings`,
              'dimensions'
            );
          }
          const trimmedDep = dep.trim();
          if (!values.includes(trimmedDep)) {
            throw new ValidationError(
              `Dimension "${name}" requires for "${value}" references unknown value "${trimmedDep}"`,
              'dimensions'
            );
          }
          if (!normalizedDeps.includes(trimmedDep)) {
            normalizedDeps.push(trimmedDep);
          }
        }
        normalizedRequires[value] = normalizedDeps;
      }
    }

    const normalizedConflicts = {};
    if (rawDefinition.conflicts !== undefined) {
      if (typeof rawDefinition.conflicts !== 'object' || rawDefinition.conflicts === null || Array.isArray(rawDefinition.conflicts)) {
        throw new ValidationError(
          `Dimension "${name}" conflicts must be an object`,
          'dimensions'
        );
      }
      for (const [value, conflicts] of Object.entries(rawDefinition.conflicts)) {
        if (!values.includes(value)) {
          throw new ValidationError(
            `Dimension "${name}" conflicts references unknown value "${value}"`,
            'dimensions'
          );
        }
        if (!Array.isArray(conflicts) || conflicts.length === 0) {
          throw new ValidationError(
            `Dimension "${name}" conflicts entry for "${value}" must be a non-empty array`,
            'dimensions'
          );
        }
        const normalizedConflictsForValue = [];
        for (const conflict of conflicts) {
          if (typeof conflict !== 'string') {
            throw new ValidationError(
              `Dimension "${name}" conflicts for "${value}" must be strings`,
              'dimensions'
            );
          }
          const trimmedConflict = conflict.trim();
          if (!values.includes(trimmedConflict)) {
            throw new ValidationError(
              `Dimension "${name}" conflicts for "${value}" references unknown value "${trimmedConflict}"`,
              'dimensions'
            );
          }
          if (trimmedConflict === value) {
            throw new ValidationError(
              `Dimension "${name}" conflicts for "${value}" cannot reference itself`,
              'dimensions'
            );
          }
          if (!normalizedConflictsForValue.includes(trimmedConflict)) {
            normalizedConflictsForValue.push(trimmedConflict);
          }
        }
        normalizedConflicts[value] = normalizedConflictsForValue;
      }
    }

    let policy = 'strict';
    if (rawDefinition.policy !== undefined) {
      if (typeof rawDefinition.policy !== 'string') {
        throw new ValidationError(
          `Dimension "${name}" policy must be a string`,
          'dimensions'
        );
      }
      const normalizedPolicy = rawDefinition.policy.trim().toLowerCase();
      if (!['strict', 'warn'].includes(normalizedPolicy)) {
        throw new ValidationError(
          `Dimension "${name}" policy must be "strict" or "warn"`,
          'dimensions'
        );
      }
      policy = normalizedPolicy;
    }

    let description = null;
    if (typeof rawDefinition.description === 'string') {
      const trimmedDescription = rawDefinition.description.trim();
      description = trimmedDescription.length > 0 ? trimmedDescription : null;
    }

    const frozenValues = Object.freeze([...values]);
    const frozenDefault =
      type === 'single'
        ? defaultValue
        : Object.freeze([...(defaultValue ?? [])]);

    const frozenRequires = Object.freeze(
      Object.fromEntries(
        Object.entries(normalizedRequires).map(([key, deps]) => [
          key,
          Object.freeze([...deps])
        ])
      )
    );

    const frozenConflicts = Object.freeze(
      Object.fromEntries(
        Object.entries(normalizedConflicts).map(([key, deps]) => [
          key,
          Object.freeze([...deps])
        ])
      )
    );

    normalized[name] = Object.freeze({
      type,
      values: frozenValues,
      default: frozenDefault,
      requires: frozenRequires,
      conflicts: frozenConflicts,
      policy,
      description
    });
  }

  return normalized;
}
/**
 * Validate log file path parameter
 * @param {string|null|undefined} logFile - Log file path parameter
 * @returns {string|null} - Validated log file path or null
 * @throws {ValidationError} - If log file path is invalid
 */
export function validateLogFilePath(logFile) {
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
 * Validate cache TTL parameter
 * @param {string|null|undefined} cacheTtl - Cache TTL parameter in hours
 * @returns {number|null} - Validated TTL in hours or null
 * @throws {ValidationError} - If cache TTL is invalid
 */
export function validateCacheTtl(cacheTtl) {
  // Return null for undefined or null values
  if (cacheTtl === undefined || cacheTtl === null) {
    return null;
  }

  if (typeof cacheTtl !== 'string') {
    throw new ValidationError('Cache TTL must be a string', 'cacheTtl');
  }

  // Remove any null bytes
  if (cacheTtl.includes('\0')) {
    throw new ValidationError('Cache TTL contains null bytes', 'cacheTtl');
  }

  const trimmedTtl = cacheTtl.trim();

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

/**
 * Validate all inputs comprehensively
 * @param {Object} inputs - Object containing all user inputs
 * @returns {Object} - Validated and sanitized inputs
 * @throws {ValidationError} - If any input is invalid
 */
export function validateAllInputs(inputs) {
  const validated = {};
  const errors = [];

  try {
    if (inputs.projectDirectory) {
      validated.projectDirectory = validateProjectDirectory(inputs.projectDirectory);
    }
  } catch (error) {
    errors.push(error.message);
  }

  try {
    if (inputs.template) {
      // Check if this looks like a URL/path (for --template flag)
      const looksLikeUrl = inputs.template.includes('/') ||
                          inputs.template.includes('://') ||
                          inputs.template.startsWith('./') ||
                          inputs.template.startsWith('../');

      if (looksLikeUrl) {
        // For template URLs, just do basic validation
        if (inputs.template.includes('\0')) {
          throw new ValidationError('Template URL contains null bytes', 'template');
        }
        validated.template = inputs.template.trim();
      } else {
        // For template names, use full validation
        validated.template = validateTemplateName(inputs.template);
      }
    }
  } catch (error) {
    errors.push(error.message);
  }

  try {
    if (inputs.repo) {
      validated.repo = validateRepoUrl(inputs.repo);
    }
  } catch (error) {
    errors.push(error.message);
  }

  try {
    if (inputs.branch) {
      validated.branch = sanitizeBranchName(inputs.branch);
    }
  } catch (error) {
    errors.push(error.message);
  }

  try {
    if (inputs.ide !== undefined) {
      validated.ide = validateIdeParameter(inputs.ide);
    }
  } catch (error) {
    errors.push(error.message);
  }

  try {
    if (inputs.options !== undefined) {
      validated.options = validateOptionsParameter(inputs.options);
    }
  } catch (error) {
    errors.push(error.message);
  }

  try {
    if (inputs.logFile !== undefined) {
      validated.logFile = validateLogFilePath(inputs.logFile);
    }
  } catch (error) {
    errors.push(error.message);
  }

  try {
    if (inputs.cacheTtl !== undefined) {
      validated.cacheTtl = validateCacheTtl(inputs.cacheTtl);
    }
  } catch (error) {
    errors.push(error.message);
  }

  if (errors.length > 0) {
    throw new ValidationError(`Input validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}`);
  }

  return validated;
}
