#!/usr/bin/env node

import path from 'path';

/**
 * Comprehensive input validation and security module
 * Implements path traversal prevention, input sanitization, and security validation
 * for all user inputs in the CLI tool.
 */

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
  // eslint-disable-next-line no-control-regex
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
    /`/,          // Backticks
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
  const tempBase = process.cwd();
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).slice(2, 9);
  
  // Create a predictable but unique temporary directory name
  const tempDirName = `.tmp-template-${timestamp}-${randomSuffix}`;
  
  // Validate the generated name
  const sanitizedName = sanitizePath(tempDirName, tempBase);
  
  return path.join(tempBase, sanitizedName);
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
      validated.template = validateTemplateName(inputs.template);
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

  if (errors.length > 0) {
    throw new ValidationError(`Input validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}`);
  }

  return validated;
}