#!/usr/bin/env node

import path from 'path';
import {
  ValidationError,
  sanitizePath,
  validateProjectDirectory,
  validateIdeParameter,
  validateAuthoringMode
} from '../../lib/shared/security.mjs';

/**
 * Environment Object Factory Module
 * Creates and validates Environment_Object instances for setup scripts
 * Implements input validation, sanitization, and immutability
 */

/**
 * Sanitize project name to prevent security issues
 * @param {string} projectName - Raw project name
 * @returns {string} - Sanitized project name
 * @throws {ValidationError} - If project name is invalid
 */
function sanitizeProjectName(projectName) {
  if (!projectName || typeof projectName !== 'string') {
    throw new ValidationError('Project name must be a non-empty string', 'projectName');
  }

  // Remove any null bytes
  if (projectName.includes('\0')) {
    throw new ValidationError('Project name contains null bytes', 'projectName');
  }

  const trimmedName = projectName.trim();

  // Use same validation as project directory for consistency
  return validateProjectDirectory(trimmedName);
}


/**
 * Create Environment_Object with input validation and immutability
 * @param {Object} params - Parameters for environment object creation
 * @param {string} params.projectDirectory - Project directory path
 * @param {string} params.projectName - Project name
 * @param {string} params.cwd - Current working directory
 * @param {string|null|undefined} params.ide - IDE parameter
 * @param {Object} [params.options] - Normalized options payload (optional)
 * @param {string} params.authoringMode - Template authoring mode
 * @returns {Object} - Immutable Environment_Object
 * @throws {ValidationError} - If any parameter is invalid
 */
export function createEnvironmentObject({
  projectDirectory,
  projectName,
  cwd,
  ide,
  options = { raw: [], byDimension: {} },
  authoringMode,
  inputs,
  author
}) {
  // Validate and sanitize inputs (but don't resolve to absolute paths yet)
  const sanitizedProjectDir = sanitizePath(projectDirectory);
  const sanitizedProjectName = sanitizeProjectName(projectName);
  const validatedIde = validateIdeParameter(ide);
  const normalizedOptions = validateOptionsShape(options);
  const normalizedInputs = normalizeInputs(inputs);
  const normalizedAuthoringMode = validateAuthoringMode(authoringMode);
  const normalizedAuthor = normalizeAuthorMetadata(author);

  // For cwd, we need to handle it differently since it's already an absolute path
  let sanitizedCwd;
  if (path.isAbsolute(cwd)) {
    // If cwd is already absolute, just normalize it
    sanitizedCwd = path.normalize(cwd);
  } else {
    // If cwd is relative, sanitize it first
    sanitizedCwd = sanitizePath(cwd);
    sanitizedCwd = path.resolve(sanitizedCwd);
  }

  // Create the environment object with absolute paths
  const env = {
    projectDir: path.resolve(sanitizedProjectDir),
    projectName: sanitizedProjectName,
    cwd: sanitizedCwd,
    ide: validatedIde,
    authoringMode: normalizedAuthoringMode,
    options: normalizedOptions,
    inputs: normalizedInputs,
    author: normalizedAuthor
  };

  // Implement Object.freeze for immutability
  return Object.freeze(env);
}

function normalizeInputs(inputs) {
  if (inputs === undefined) {
    return Object.freeze({});
  }

  if (inputs === null || typeof inputs !== 'object' || Array.isArray(inputs)) {
    throw new ValidationError('Resolved placeholder inputs must be provided as an object', 'inputs');
  }

  const normalized = {};
  for (const [token, value] of Object.entries(inputs)) {
    if (typeof token !== 'string' || token.trim() === '') {
      throw new ValidationError('Placeholder token names must be non-empty strings', 'inputs');
    }
    normalized[token] = value;
  }

  return Object.freeze({ ...normalized });
}

function validateOptionsShape(options) {
  if (!options || typeof options !== 'object') {
    throw new ValidationError('Normalized options payload is required', 'options');
  }

  const { raw, byDimension } = options;

  if (!Array.isArray(raw)) {
    throw new ValidationError('options.raw must be an array', 'options');
  }

  for (const token of raw) {
    if (typeof token !== 'string') {
      throw new ValidationError('options.raw entries must be strings', 'options');
    }
  }

  if (typeof byDimension !== 'object' || byDimension === null || Array.isArray(byDimension)) {
    throw new ValidationError('options.byDimension must be an object', 'options');
  }

  const normalized = {};
  for (const [dimension, value] of Object.entries(byDimension)) {
    if (typeof value === 'string' || value === null) {
      normalized[dimension] = value;
      continue;
    }

    if (Array.isArray(value)) {
      const validated = [];
      for (const entry of value) {
        if (typeof entry !== 'string') {
          throw new ValidationError(
            `options.byDimension["${dimension}"] entries must be strings`,
            'options'
          );
        }
        validated.push(entry);
      }
      normalized[dimension] = Object.freeze([...validated]);
      continue;
    }

    throw new ValidationError(
      `options.byDimension["${dimension}"] must be a string, array of strings, or null`,
      'options'
    );
  }

  return Object.freeze({
    raw: Object.freeze([...raw]),
    byDimension: Object.freeze(normalized)
  });
}

function normalizeAuthorMetadata(author) {
  if (author === undefined || author === null) {
    return Object.freeze({});
  }

  if (typeof author !== 'object' || Array.isArray(author)) {
    throw new ValidationError('Author metadata must be an object', 'author');
  }

  const allowedKeys = new Set(['name', 'email', 'url']);
  const normalized = {};

  for (const [key, value] of Object.entries(author)) {
    if (!allowedKeys.has(key)) {
      throw new ValidationError(`Unknown author metadata field: ${key}`, 'author');
    }

    if (value === undefined || value === null) {
      continue;
    }

    if (typeof value !== 'string') {
      throw new ValidationError(`author.${key} must be a string`, 'author');
    }

    const trimmed = value.trim();
    if (!trimmed) {
      continue;
    }

    if (trimmed.includes('\0')) {
      throw new ValidationError(`author.${key} cannot contain null bytes`, 'author');
    }

    if (/[\r\n]/.test(trimmed)) {
      throw new ValidationError(`author.${key} cannot contain newlines`, 'author');
    }

    normalized[key] = trimmed;
  }

  return Object.freeze({ ...normalized });
}
