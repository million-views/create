#!/usr/bin/env node

/**
 * Shared validation utilities for make-template commands
 * Provides consistent argument validation across all commands
 */

import { TERMINOLOGY } from '../ontology.mjs';

/**
 * Validate project type option
 * @param {string} type - Project type to validate
 * @returns {string|null} Error message or null if valid
 */
export function validateProjectType(type) {
  const PROJECT_TYPES = {
    'cf-d1': 'Cloudflare Worker with D1 database',
    'cf-turso': 'Cloudflare Worker with Turso database',
    'vite-react': 'Vite-based React project',
    'generic': 'Generic Node.js project'
  };

  if (!Object.keys(PROJECT_TYPES).includes(type)) {
    return `Invalid project type: ${type}. Supported types: ${Object.keys(PROJECT_TYPES).join(', ')}`;
  }

  return null;
}

/**
 * Validate placeholder format option
 * @param {string} format - Placeholder format to validate
 * @returns {string|null} Error message or null if valid
 */
export function validatePlaceholderFormat(format) {
  const supportedFormats = ['{{NAME}}', '__NAME__', '%NAME%'];

  if (!supportedFormats.includes(format)) {
    return `Invalid placeholder format: ${format}. Must contain NAME substitution mechanism. Supported formats: {{NAME}}, __NAME__, %NAME%`;
  }

  return null;
}

/**
 * Validate restoration option combinations
 * @param {object} options - Parsed options object
 * @returns {string|null} Error message or null if valid
 */
export function validateRestorationOptions(options) {
  const restorationOptions = [
    TERMINOLOGY.OPTION.RESTORE_FILES,
    TERMINOLOGY.OPTION.RESTORE_PLACEHOLDERS,
    TERMINOLOGY.OPTION.GENERATE_DEFAULTS
  ];
  const activeRestorationOptions = restorationOptions.filter(opt => options[opt]);

  if (activeRestorationOptions.length > 1) {
    if (options[TERMINOLOGY.OPTION.GENERATE_DEFAULTS] && activeRestorationOptions.length > 1) {
      return '--generate-defaults cannot be combined with other restoration options';
    } else if (options[TERMINOLOGY.OPTION.RESTORE_FILES] && options[TERMINOLOGY.OPTION.RESTORE_PLACEHOLDERS]) {
      return '--restore-files and --restore-placeholders cannot be used together';
    }
  }

  return null;
}

/**
 * Validate restore-files option format
 * @param {string} files - Comma-separated file list
 * @returns {string|null} Error message or null if valid
 */
export function validateRestoreFiles(files) {
  const fileList = files.split(',').map(f => f.trim());

  if (fileList.some(f => f === '')) {
    return '--restore-files cannot contain empty file names';
  }

  if (fileList.some(f => f.includes('..'))) {
    return '--restore-files cannot contain path traversal sequences (..)';
  }

  return null;
}

/**
 * Generic argument validation function for make-template commands
 * @param {object} options - Parsed options object
 * @param {string} command - Command name for context
 * @returns {string[]} Array of error messages
 */
export function validateMakeTemplateArguments(options, command) {
  const errors = [];

  // Command-specific validations
  switch (command) {
    case 'convert':
      if (options.type) {
        const typeError = validateProjectType(options.type);
        if (typeError) errors.push(typeError);
      }

      if (options['placeholder-format']) {
        const formatError = validatePlaceholderFormat(options['placeholder-format']);
        if (formatError) errors.push(formatError);
      }
      break;

    case 'restore':
      const restorationError = validateRestorationOptions(options);
      if (restorationError) errors.push(restorationError);

      if (options['restore-files']) {
        const filesError = validateRestoreFiles(options['restore-files']);
        if (filesError) errors.push(filesError);
      }
      break;

    // Add other commands as needed
  }

  return errors;
}
