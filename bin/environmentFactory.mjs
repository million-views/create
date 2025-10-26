#!/usr/bin/env node

import path from 'path';
import { 
  ValidationError, 
  sanitizePath, 
  validateProjectDirectory,
  validateIdeParameter,
  validateFeaturesParameter
} from './security.mjs';

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
 * @param {string|null|undefined} params.features - Features parameter
 * @returns {Object} - Immutable Environment_Object
 * @throws {ValidationError} - If any parameter is invalid
 */
export function createEnvironmentObject({ projectDirectory, projectName, cwd, ide, features }) {
  // Validate and sanitize inputs (but don't resolve to absolute paths yet)
  const sanitizedProjectDir = sanitizePath(projectDirectory);
  const sanitizedProjectName = sanitizeProjectName(projectName);
  const validatedIde = validateIdeParameter(ide);
  const validatedFeatures = validateFeaturesParameter(features);

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
    features: validatedFeatures
  };

  // Implement Object.freeze for immutability
  return Object.freeze(env);
}