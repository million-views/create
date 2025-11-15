#!/usr/bin/env node

/**
 * Make-Template CLI Help Definitions
 * Tool-specific help definitions that belong with the make-template tool
 * These would NOT be part of the reusable CLI framework package
 */

import { TERMINOLOGY } from '../../lib/shared/ontology.mjs';
import { HELP_PATTERNS } from '../../lib/cli/framework.mjs';

/**
 * Help definitions for make-template CLI
 * These are specific to the make-template tool and its commands
 */
export const MAKE_TEMPLATE_HELP = {
  [TERMINOLOGY.COMMAND.CONVERT]: {
    description: 'Convert project to template',
    detailedDescription: `Transform an existing project into a reusable template by extracting placeholders,
creating template.json configuration, and preparing the project for scaffolding. This command analyzes
your project structure, identifies configurable values, and converts them into template placeholders
that can be customized during scaffolding.`,
    options: {
      [TERMINOLOGY.OPTION.DRY_RUN]: HELP_PATTERNS.DRY_RUN,
      yes: HELP_PATTERNS.SKIP_CONFIRMATION,
      silent: HELP_PATTERNS.SILENT_MODE,
      type: {
        type: 'string',
        description: 'Force specific project type detection',
        detailedDescription: 'Override automatic project type detection. Specify the project type explicitly when auto-detection fails or when you want to force a specific template structure.'
      },
      'placeholder-format': {
        type: 'string',
        description: 'Specify placeholder format',
        detailedDescription: 'Define the format for placeholders in the template. Common formats include {{PLACEHOLDER}}, __PLACEHOLDER__, or custom patterns.'
      },
      'sanitize-undo': {
        type: 'boolean',
        description: 'Remove sensitive data from undo log',
        detailedDescription: 'Clean the undo log file by removing sensitive information like API keys, passwords, or personal data.'
      }
    }
  },

  [TERMINOLOGY.COMMAND.RESTORE]: {
    description: 'Restore template to project',
    detailedDescription: `Convert a template back into a working project by restoring original file names,
replacing placeholders with actual values, and reconstructing the project structure. This is the reverse
operation of template conversion, allowing you to develop and test templates as regular projects.`,
    options: {
      [TERMINOLOGY.OPTION.DRY_RUN]: HELP_PATTERNS.DRY_RUN,
      'restore-files': {
        type: 'string',
        description: 'Restore only specified files (comma-separated)',
        detailedDescription: 'Selectively restore only the specified files from the template. Provide a comma-separated list of file paths.'
      },
      'restore-placeholders': {
        type: 'boolean',
        description: 'Restore only placeholder values, keep files',
        detailedDescription: 'Only restore placeholder values in existing files without renaming files back to their original names.'
      },
      'generate-defaults': {
        type: 'boolean',
        description: 'Generate .restore-defaults.json configuration',
        detailedDescription: 'Create a .restore-defaults.json file with the current placeholder values for future restoration.'
      },
      yes: HELP_PATTERNS.SKIP_CONFIRMATION
    }
  },

  [TERMINOLOGY.COMMAND.INIT]: {
    description: 'Generate skeleton template.json',
    detailedDescription: `Create a basic template.json configuration file with sensible defaults.
This provides a starting point for template configuration that you can customize for your specific template needs.`,
    options: {
      'init-file': HELP_PATTERNS.OUTPUT_FILE
    }
  },

  [TERMINOLOGY.COMMAND.VALIDATE]: {
    description: 'Validate template.json',
    detailedDescription: `Check the template.json configuration file for correctness, completeness, and best practices.
This command validates the JSON syntax, required fields, placeholder definitions, and template structure.`,
    options: {
      'lint-file': HELP_PATTERNS.INPUT_FILE,
      suggest: {
        type: 'boolean',
        description: 'Show intelligent fix suggestions',
        detailedDescription: 'Display detailed suggestions for fixing validation errors and improving the template configuration.',
        disclosureLevel: 'basic'
      },
      fix: {
        type: 'boolean',
        description: 'Auto-apply safe fixes',
        detailedDescription: 'Automatically apply safe, non-destructive fixes to the template.json file.',
        disclosureLevel: 'basic'
      }
    }
  },

  [TERMINOLOGY.COMMAND.HINTS]: {
    description: 'Show hints catalog',
    detailedDescription: `Display a comprehensive catalog of template creation hints, tips, and best practices.
This includes guidance on placeholder naming, file organization, template structure, and common pitfalls to avoid.`
  },

  [TERMINOLOGY.COMMAND.TEST]: {
    description: 'Test template functionality',
    detailedDescription: `Run comprehensive tests on a template to ensure it works correctly. This includes
validating the template.json configuration, testing placeholder replacement, checking file generation,
and verifying the template can be scaffolded successfully.`,
    options: {
      verbose: {
        type: 'boolean',
        short: 'v',
        description: 'Enable verbose output with detailed test information',
        detailedDescription: 'Display comprehensive test results including timing, file operations, and validation details.'
      },
      'keep-temp': {
        type: 'boolean',
        description: 'Preserve temporary test directories for debugging',
        detailedDescription: 'Keep temporary directories created during testing instead of cleaning them up, useful for debugging test failures.'
      }
    }
  },
  help: {
    description: 'Show help information',
    detailedDescription: 'Display help information for commands. Use "help <command>" for detailed help or "<command> --help" for a quick option reference.',
    options: {}
  }
};
