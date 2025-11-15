#!/usr/bin/env node

/**
 * CLI Framework Package Structure
 * This represents what would be in a separate @m5nv/cli-framework package
 * Generic, reusable CLI components that can be packaged and shared
 */

/**
 * Help definition schema for validation
 * Generic validation that can work with any tool's definitions
 */
export const HELP_SCHEMA = {
  required: ['description', 'detailedDescription'],
  optionRequired: ['description', 'detailedDescription', 'type'],
  optionOptional: ['short', 'default', 'examples', 'disclosureLevel']
};

/**
 * Common help patterns that can be reused across any CLI tool
 * Generic patterns that work for any command-line interface
 */
export const HELP_PATTERNS = {
  DRY_RUN: {
    type: 'boolean',
    description: 'Preview changes without executing them',
    detailedDescription: 'Show what would be done without making any actual changes. Useful for understanding the impact of operations before committing to them.'
  },
  SKIP_CONFIRMATION: {
    type: 'boolean',
    description: 'Skip confirmation prompts',
    detailedDescription: 'Automatically proceed without asking for confirmation. Use this in automated scripts or when you\'re confident about the operation.'
  },
  SILENT_MODE: {
    type: 'boolean',
    description: 'Suppress prompts and non-essential output',
    detailedDescription: 'Run quietly, showing only essential progress and error messages. Suppresses interactive prompts and verbose logging.'
  },
  OUTPUT_FILE: {
    type: 'string',
    description: 'Specify output file path',
    detailedDescription: 'Define where to write the output. If not specified, output will be written to stdout or a default location.'
  },
  INPUT_FILE: {
    type: 'string',
    description: 'Specify input file path',
    detailedDescription: 'Path to the file to process. Defaults to standard input or a conventional location if not specified.'
  },
  FORCE_MODE: {
    type: 'boolean',
    description: 'Force operation even with warnings',
    detailedDescription: 'Override safety checks and proceed with the operation. Use with caution as this may overwrite files or ignore important warnings.'
  },
  VERBOSE_MODE: {
    type: 'boolean',
    description: 'Show detailed operation information',
    detailedDescription: 'Display comprehensive information about what the command is doing, including internal operations and progress details.'
  }
};

/**
 * Validate help definition against schema
 * Generic validation function that works with any tool's definitions
 * @param {object} helpDef - Help definition to validate
 * @param {string} commandName - Name of command for error messages
 * @returns {boolean} True if valid
 */
export function validateHelpDefinition(helpDef, commandName = 'unknown') {
  const errors = [];

  // Check required fields
  for (const field of HELP_SCHEMA.required) {
    if (!helpDef[field]) {
      errors.push(`Missing required field '${field}' for command '${commandName}'`);
    }
  }

  // Check options
  if (helpDef.options) {
    for (const [optName, optDef] of Object.entries(helpDef.options)) {
      // Check required option fields
      for (const field of HELP_SCHEMA.optionRequired) {
        if (!optDef[field]) {
          errors.push(`Missing required field '${field}' for option '${optName}' in command '${commandName}'`);
        }
      }

      // Validate option types
      if (optDef.type && !['string', 'boolean', 'number', 'array'].includes(optDef.type)) {
        errors.push(`Invalid type '${optDef.type}' for option '${optName}' in command '${commandName}'`);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Help definition validation failed:\n${errors.join('\n')}`);
  }

  return true;
}

/**
 * Validate all help definitions for a tool
 * Generic function that can validate any tool's help definitions
 * @param {object} helpDefinitions - Help definitions object for a tool
 * @param {string} toolName - Name of the tool for error messages
 */
export function validateToolHelpDefinitions(helpDefinitions, toolName = 'unknown') {
  console.log(`Validating help definitions for ${toolName}...`);

  for (const [command, helpDef] of Object.entries(helpDefinitions)) {
    validateHelpDefinition(helpDef, `${toolName}:${command}`);
  }

  console.log(`✅ ${toolName} help definitions are valid`);
}

/**
 * Create a help validator for a specific tool
 * Returns a validation function that can be used in that tool's validation
 * @param {object} helpDefinitions - The tool's help definitions
 * @param {string} toolName - Name of the tool
 * @returns {function} Validation function
 */
export function createHelpValidator(helpDefinitions, toolName) {
  return () => validateToolHelpDefinitions(helpDefinitions, toolName);
}

// Re-export CLI framework components that would be in the package
export { DISCLOSURE_LEVELS, generateHelp } from './help-generator.mjs';
export { createCommandRouter } from './command-router.mjs';
export { parseArguments, validateArguments } from './argument-parser.mjs';
