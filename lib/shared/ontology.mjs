#!/usr/bin/env node

/**
 * Shared ontology for CLI tools
 * Defines consistent terminology, patterns, and constants across the ecosystem
 */

/**
 * Core terminology constants
 */
export const TERMINOLOGY = {
  // Commands
  COMMAND: {
    CREATE: 'create',
    SCAFFOLD: 'scaffold',
    NEW: 'new',
    LIST: 'list',
    INFO: 'info',
    VALIDATE: 'validate',
    CONVERT: 'convert',
    RESTORE: 'restore',
    INIT: 'init',
    HINTS: 'hints',
    TEST: 'test',
    HELP: 'help',
    VERSION: 'version'
  },

  // Options
  OPTION: {
    TEMPLATE: 'template',
    SOURCE: 'source',
    TARGET: 'target',
    BRANCH: 'branch',
    TAG: 'tag',
    PATH: 'path',
    DIRECTORY: 'directory',
    PROJECT: 'project',
    NAME: 'name',
    OUTPUT: 'output',
    FORMAT: 'format',
    VERBOSE: 'verbose',
    QUIET: 'quiet',
    FORCE: 'force',
    DRY_RUN: 'dry-run',
    INTERACTIVE: 'interactive',
    NON_INTERACTIVE: 'no-interactive',
    HELP: 'help',
    VERSION: 'version',
    JSON: 'json',
    CONFIG: 'config',
    NO_CONFIG: 'no-config',
    CACHE: 'cache',
    NO_CACHE: 'no-cache',
    LOG_FILE: 'log-file',
    PLACEHOLDER: 'placeholder',
    NO_INPUT_PROMPTS: 'no-input-prompts',
    EXPERIMENTAL_PLACEHOLDER_PROMPTS: 'experimental-placeholder-prompts',
    VALIDATE_TEMPLATE: 'validate-template',
    LIST_TEMPLATES: 'list-templates',
    REGISTRY: 'registry',
    CACHE_TTL: 'cache-ttl',
    GUIDED: 'guided',
    OPTIONS: 'options',
    SELECTION: 'selection',
    YES: 'yes',
    TYPE: 'type',
    PLACEHOLDER_FORMAT: 'placeholder-format',
    SANITIZE_UNDO: 'sanitize-undo',
    SILENT: 'silent',
    FORCE_LENIENT: 'force-lenient',
    RESTORE: 'restore',
    RESTORE_FILES: 'restore-files',
    RESTORE_PLACEHOLDERS: 'restore-placeholders',
    GENERATE_DEFAULTS: 'generate-defaults',
    INIT: 'init',
    INIT_FILE: 'init-file',
    HINTS: 'hints',
    LINT: 'lint',
    LINT_FILE: 'lint-file',
    SUGGEST: 'suggest',
    FIX: 'fix',
    ADD_DIMENSION: 'add-dimension',
    SET_COMPAT: 'set-compat',
    SET_NEEDS: 'set-needs',
    PREVIEW: 'preview',
    MIGRATE: 'migrate',
    MIGRATE_FILE: 'migrate-file',
    BULK_ADD_DIMENSIONS: 'bulk-add-dimensions',
    BULK_SET_COMPAT: 'bulk-set-compat',
    BULK_SET_NEEDS: 'bulk-set-needs'
  },

  // Arguments
  ARGUMENT: {
    PROJECT_DIRECTORY: 'project-directory',
    TEMPLATE_URL: 'template-url',
    TEMPLATE_NAME: 'template-name',
    FILE_PATH: 'file-path',
    REGISTRY_NAME: 'registry-name'
  },

  // Messages and labels
  MESSAGE: {
    // Success messages
    SUCCESS_SCAFFOLDED: 'Project scaffolded successfully',
    SUCCESS_VALIDATED: 'Template validated successfully',
    SUCCESS_CONVERTED: 'Project converted to template successfully',
    SUCCESS_RESTORED: 'Project restored successfully',

    // Error messages
    ERROR_INVALID_TEMPLATE: 'Invalid template',
    ERROR_TEMPLATE_NOT_FOUND: 'Template not found',
    ERROR_PROJECT_EXISTS: 'Project directory already exists',
    ERROR_PERMISSION_DENIED: 'Permission denied',
    ERROR_NETWORK_ERROR: 'Network error',
    ERROR_VALIDATION_FAILED: 'Validation failed',

    // Prompts
    PROMPT_PROJECT_NAME: 'Enter project name',
    PROMPT_TEMPLATE_SELECTION: 'Select a template',
    PROMPT_CONFIRM_OVERWRITE: 'Directory exists. Overwrite?',

    // Help text
    HELP_USAGE: 'Usage',
    HELP_COMMANDS: 'Commands',
    HELP_OPTIONS: 'Options',
    HELP_ARGUMENTS: 'Arguments',
    HELP_EXAMPLES: 'Examples',
    HELP_DESCRIPTION: 'Description'
  },

  // Patterns and formats
  PATTERN: {
    TEMPLATE_URL: /^(https?|git|file):\/\/.+$/,
    TEMPLATE_SHORTCUT: /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/,
    PROJECT_NAME: /^[a-zA-Z0-9_-]+$/,
    PLACEHOLDER_TOKEN: /\$\{([^}]+)\}/g,
    ENVIRONMENT_VARIABLE: /^CREATE_SCAFFOLD_PLACEHOLDER_(.+)$/
  },

  // File and directory names
  FILE: {
    TEMPLATE_JSON: 'template.json',
    SETUP_SCRIPT: '_setup.mjs',
    CONFIG_FILE: '.m5nvrc',
    CACHE_DIR: '.m5nv/cache',
    LOG_DIR: '.m5nv/logs'
  },

  // Environment variables
  ENV: {
    PREFIX: 'CREATE_SCAFFOLD',
    PLACEHOLDER_PREFIX: 'CREATE_SCAFFOLD_PLACEHOLDER_',
    CONFIG_PATH: 'CREATE_SCAFFOLD_CONFIG',
    CACHE_DIR: 'CREATE_SCAFFOLD_CACHE_DIR',
    LOG_LEVEL: 'CREATE_SCAFFOLD_LOG_LEVEL',
    NO_COLOR: 'NO_COLOR'
  },

  // Exit codes
  EXIT_CODE: {
    SUCCESS: 0,
    ERROR: 1,
    INVALID_ARGUMENT: 2,
    TEMPLATE_ERROR: 3,
    NETWORK_ERROR: 4,
    PERMISSION_ERROR: 5
  }
};

/**
 * Command definitions with consistent structure
 */
export const COMMAND_DEFINITIONS = {
  [TERMINOLOGY.COMMAND.CREATE]: {
    description: 'Create a new project from a template',
    usage: '[options] <project-directory>',
    options: {
      [TERMINOLOGY.OPTION.TEMPLATE]: {
        type: 'string',
        short: 't',
        description: 'Template URL or name'
      },
      [TERMINOLOGY.OPTION.BRANCH]: {
        type: 'string',
        short: 'b',
        description: 'Git branch to use'
      },
      [TERMINOLOGY.OPTION.INTERACTIVE]: {
        type: 'boolean',
        description: 'Enable interactive mode'
      }
    }
  },

  [TERMINOLOGY.COMMAND.LIST]: {
    description: 'List available templates',
    usage: '[options]',
    options: {
      [TERMINOLOGY.OPTION.REGISTRY]: {
        type: 'string',
        description: 'Registry to list from'
      },
      [TERMINOLOGY.OPTION.JSON]: {
        type: 'boolean',
        description: 'Output in JSON format'
      }
    }
  },

  [TERMINOLOGY.COMMAND.VALIDATE]: {
    description: 'Validate a template',
    usage: '[options] <template-path>',
    options: {
      [TERMINOLOGY.OPTION.JSON]: {
        type: 'boolean',
        description: 'Output in JSON format'
      }
    }
  },

  [TERMINOLOGY.COMMAND.TEST]: {
    description: 'Test template functionality',
    usage: '[options] <template-path>',
    options: {
      'verbose': {
        type: 'boolean',
        short: 'v',
        description: 'Show detailed test output'
      },
      'keep-temp': {
        type: 'boolean',
        description: 'Keep temporary test directories'
      }
    }
  },

  [TERMINOLOGY.COMMAND.CONVERT]: {
    description: 'Convert a project to a template',
    usage: '[options] <project-path>',
    options: {
      [TERMINOLOGY.OPTION.OUTPUT]: {
        type: 'string',
        short: 'o',
        description: 'Output directory'
      },
      [TERMINOLOGY.OPTION.FORCE]: {
        type: 'boolean',
        description: 'Overwrite existing files'
      }
    }
  }
};

/**
 * Global options available to all commands
 */
export const GLOBAL_OPTIONS = {
  [TERMINOLOGY.OPTION.HELP]: {
    type: 'boolean',
    short: 'h',
    description: 'Show help information'
  },
  'help-intermediate': {
    type: 'boolean',
    description: 'Show intermediate help with additional options'
  },
  'help-advanced': {
    type: 'boolean',
    description: 'Show advanced help with all options and details'
  },
  'help-interactive': {
    type: 'boolean',
    description: 'Launch interactive help mode'
  },
  [TERMINOLOGY.OPTION.VERSION]: {
    type: 'boolean',
    short: 'v',
    description: 'Show version information'
  },
  [TERMINOLOGY.OPTION.VERBOSE]: {
    type: 'boolean',
    description: 'Enable verbose output'
  },
  [TERMINOLOGY.OPTION.QUIET]: {
    type: 'boolean',
    description: 'Suppress output'
  },
  [TERMINOLOGY.OPTION.JSON]: {
    type: 'boolean',
    description: 'Output results in JSON format'
  },
  [TERMINOLOGY.OPTION.LOG_FILE]: {
    type: 'string',
    description: 'Log output to specified file'
  },
  [TERMINOLOGY.OPTION.NO_CONFIG]: {
    type: 'boolean',
    description: 'Skip configuration file loading'
  }
};

/**
 * Generate documentation for the ontology
 */
export function generateOntologyDocs() {
  let docs = '# CLI Ontology Documentation\n\n';
  docs += 'This document describes the shared terminology and patterns used across CLI tools.\n\n';

  // Commands
  docs += '## Commands\n\n';
  for (const [key, def] of Object.entries(COMMAND_DEFINITIONS)) {
    docs += `### ${key}\n`;
    docs += `${def.description}\n\n`;
    docs += `**Usage:** \`${key} ${def.usage}\`\n\n`;
    if (def.options && Object.keys(def.options).length > 0) {
      docs += '**Options:**\n';
      for (const [opt, config] of Object.entries(def.options)) {
        const short = config.short ? `-${config.short}, ` : '';
        docs += `- ${short}--${opt}: ${config.description}\n`;
      }
      docs += '\n';
    }
  }

  // Global Options
  docs += '## Global Options\n\n';
  for (const [opt, config] of Object.entries(GLOBAL_OPTIONS)) {
    const short = config.short ? `-${config.short}, ` : '';
    docs += `- ${short}--${opt}: ${config.description}\n`;
  }
  docs += '\n';

  // Terminology
  docs += '## Terminology\n\n';
  docs += '### Commands\n';
  Object.entries(TERMINOLOGY.COMMAND).forEach(([key, value]) => {
    docs += `- \`${value}\`: ${key.toLowerCase().replace(/_/g, ' ')}\n`;
  });
  docs += '\n';

  docs += '### Options\n';
  Object.entries(TERMINOLOGY.OPTION).forEach(([key, value]) => {
    docs += `- \`${value}\`: ${key.toLowerCase().replace(/_/g, ' ')}\n`;
  });
  docs += '\n';

  return docs;
}
