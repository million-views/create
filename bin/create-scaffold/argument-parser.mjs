#!/usr/bin/env node

import { parseArgs } from 'util';
import {
  validateProjectDirectory,
  validateTemplateName,
  validateRepoUrl,
  sanitizeBranchName,
  validateIdeParameter,
  validateOptionsParameter,
  validateLogFilePath,
  validateCacheTtl
} from '../../lib/shared/security.mjs';
import { handleValidationError } from '../../lib/shared/utils/validation-utils.mjs';

/**
 * Parse command line arguments using native Node.js util.parseArgs
 * Replaces minimist with zero external dependencies
 */
export function parseArguments(argv = process.argv.slice(2)) {
  try {
    const normalizedArgv = Array.isArray(argv)
      ? argv.map((entry) => {
        if (typeof entry !== 'string') {
          return entry;
        }

        if (entry.startsWith('--interactive=')) {
          const value = entry.slice('--interactive='.length).trim().toLowerCase();
          if (value === 'true') {
            return '--interactive';
          }
          if (value === 'false') {
            return '--no-interactive';
          }
          throw new ArgumentError(
            `Invalid option value: --interactive expects true or false but received "${value}"`
          );
        }

        return entry;
      })
      : [];

    const options = {
      template: {
        type: 'string',
        short: 'T',
        description: 'Template URL or shorthand (create-remix style)'
      },
      branch: {
        type: 'string',
        short: 'b',
        description: 'Git branch to use (default: main/master)'
      },
      ide: {
        type: 'string',
        short: 'i',
        description: 'Target IDE (kiro, vscode, cursor, windsurf)'
      },
      options: {
        type: 'string',
        short: 'o',
        description: 'Comma-separated list of options to enable'
      },
      'log-file': {
        type: 'string',
        description: 'Enable detailed logging to specified file'
      },
      'list-templates': {
        type: 'boolean',
        description: 'Display available templates from repository'
      },
      'dry-run': {
        type: 'boolean',
        description: 'Preview operations without executing them'
      },
      'no-cache': {
        type: 'boolean',
        description: 'Bypass cache system and clone directly'
      },
      'cache-ttl': {
        type: 'string',
        description: 'Override default cache TTL in hours'
      },
      'validate-template': {
        type: 'string',
        description: 'Validate template at provided path and exit'
      },
      json: {
        type: 'boolean',
        description: 'Emit JSON output for supported commands (e.g., validation)'
      },
      placeholder: {
        type: 'string',
        multiple: true,
        description: 'Supply placeholder value in NAME=value form'
      },
      'no-input-prompts': {
        type: 'boolean',
        description: 'Disable interactive placeholder prompting'
      },
      'no-config': {
        type: 'boolean',
        description: 'Disable configuration file discovery'
      },
      interactive: {
        type: 'boolean',
        description: 'Force interactive mode on or off explicitly'
      },
      'no-interactive': {
        type: 'boolean',
        description: 'Disable automatic interactive mode triggering'
      },
      verbose: {
        type: 'boolean',
        description: 'Enable verbose logging during scaffolding'
      },
      'experimental-placeholder-prompts': {
        type: 'boolean',
        description: 'Enable placeholder prompt flow for experimental rollout'
      },
      help: {
        type: 'boolean',
        short: 'h',
        description: 'Show help information'
      }
    };

    const { values, positionals } = parseArgs({
      args: normalizedArgv,
      options,
      allowPositionals: true,
      strict: true
    });

    // Extract project directory from positional arguments
    const projectDirectory = positionals[0];

    const placeholderValues = values.placeholder ?? [];
    const placeholders = Array.isArray(placeholderValues)
      ? placeholderValues
      : placeholderValues === undefined
        ? []
        : [placeholderValues];
    const noInputPrompts = Boolean(values['no-input-prompts']);
    const verbose = Boolean(values.verbose);
    const experimentalPlaceholderPrompts = Boolean(values['experimental-placeholder-prompts']);

    const explicitInteractive =
      typeof values.interactive === 'boolean' ? values.interactive : undefined;
    const explicitNoInteractive = Boolean(values['no-interactive']);
    const noConfig = Boolean(values['no-config']);
    const validateTemplate = typeof values['validate-template'] === 'string'
      ? values['validate-template']
      : undefined;
    const json = Boolean(values.json);
    const interactive =
      explicitInteractive !== undefined
        ? explicitInteractive
        : explicitNoInteractive
          ? false
          : undefined;

    // Return parsed arguments in expected format
    return {
      projectDirectory,
      template: values.template,
      branch: values.branch,
      ide: values.ide,
      options: values.options,
      logFile: values['log-file'],
      listTemplates: values['list-templates'],
      dryRun: values['dry-run'],
      noCache: values['no-cache'],
      cacheTtl: values['cache-ttl'],
  validateTemplate,
  json,
      placeholders,
      noInputPrompts,
      verbose,
      experimentalPlaceholderPrompts,
      interactive,
      noInteractive: explicitNoInteractive,
      noConfig,
      help: values.help,
      _: positionals // For backward compatibility
    };

  } catch (error) {
    // Handle parsing errors with helpful messages
    if (error.code === 'ERR_PARSE_ARGS_UNKNOWN_OPTION') {
      throw new ArgumentError(
        `Unknown option: ${error.message.split(' ')[1]}\n\n` +
        'Use --help to see available options.'
      );
    } else if (error.code === 'ERR_PARSE_ARGS_INVALID_OPTION_VALUE') {
      throw new ArgumentError(
        `Invalid option value: ${error.message}\n\n` +
        'Use --help to see expected option formats.'
      );
    } else {
      throw new ArgumentError(`Argument parsing failed: ${error.message}`);
    }
  }
}

/**
 * Validate parsed arguments according to CLI requirements using security module
 */
export function validateArguments(args) {
  const errors = [];

  // Check for help flag first
  if (args.help) {
    return { isValid: true, showHelp: true };
  }

  // Show help if no arguments provided (standard CLI behavior)
  const hasAnyArgs = args.projectDirectory || args.template || args.branch ||
                     args.ide || args.options || args.logFile || args.listTemplates ||
                     args.dryRun || args.noCache || args.cacheTtl || args.validateTemplate ||
                     args.json || args.placeholders.length > 0 || args.noInputPrompts ||
                     args.verbose || args.experimentalPlaceholderPrompts || args.interactive ||
                     args.noInteractive || args.noConfig;
  if (!hasAnyArgs) {
    return { isValid: true, showHelp: true };
  }

  if (args.validateTemplate) {
    if (typeof args.validateTemplate !== 'string' || !args.validateTemplate.trim()) {
      errors.push('Provide a template directory when using --validate-template.');
    }

    if (args.projectDirectory) {
      errors.push('Do not supply a project directory positional argument with --validate-template.');
    }

    if (args.template) {
      errors.push('The --template flag cannot be combined with --validate-template.');
    }

    if (errors.length > 0) {
      return {
        isValid: false,
        errors,
        showHelp: false
      };
    }

    return {
      isValid: true,
      errors: [],
      showHelp: false
    };
  }

  if (args.json) {
    errors.push('--json can only be used with --validate-template.');
  }

  // Special case: --list-templates doesn't require project directory or template
  if (args.listTemplates) {
    // Only validate branch if provided
    if (args.branch) {
      handleValidationError(sanitizeBranchName, args.branch, errors, 'Branch name validation failed');
    }

    // Skip other validations for list-templates mode
    return {
      isValid: errors.length === 0,
      errors,
      showHelp: false
    };
  }

  // Validate required project directory
  if (!args.projectDirectory) {
    errors.push('Project directory is required as the first argument');
  } else {
    handleValidationError(validateProjectDirectory, args.projectDirectory, errors, 'Project directory validation failed');
  }

  // Validate required template flag
  if (!args.template) {
    errors.push('--template flag is required');
  }

  // Validate template argument if provided
  if (args.template) {
    // For --template flag, allow URLs and paths
    const looksLikeUrl = args.template.includes('/') || 
                        args.template.includes('://') || 
                        args.template.startsWith('registry/') ||
                        args.template.startsWith('./') ||
                        args.template.startsWith('../');
    
    if (looksLikeUrl) {
      // Basic validation for URLs/paths
      if (args.template.includes('\0')) {
        errors.push('Template URL contains null bytes');
      }
    } else {
      // Validate as template name for simple names
      handleValidationError(validateTemplateName, args.template, errors, 'Template name validation failed');
    }
  }

  // Validate branch name if provided
  if (args.branch) {
    handleValidationError(sanitizeBranchName, args.branch, errors, 'Branch name validation failed');
  }

  // Validate IDE parameter if provided
  if (args.ide) {
    handleValidationError(validateIdeParameter, args.ide, errors, 'IDE parameter validation failed');
  }

  // Validate options parameter if provided
  if (args.options) {
    handleValidationError(validateOptionsParameter, args.options, errors, 'Options parameter validation failed');
  }

  // Validate log file path if provided
  if (args.logFile !== undefined) {
    handleValidationError(validateLogFilePath, args.logFile, errors, 'Log file path validation failed');
  }

  // Validate cache TTL if provided
  if (args.cacheTtl !== undefined) {
    handleValidationError(validateCacheTtl, args.cacheTtl, errors, 'Cache TTL validation failed');
  }

  // Check for conflicting cache flags
  if (args.noCache && args.cacheTtl) {
    errors.push('cannot use both --no-cache and --cache-ttl flags together');
  }

  return {
    isValid: errors.length === 0,
    errors,
    showHelp: false
  };
}

/**
 * Generate comprehensive help text
 */
export function generateHelpText() {
  return `
@m5nv/create-scaffold - Project scaffolding CLI for Million Views templates

USAGE:
  npm create @m5nv/scaffold <project-directory> -- --template <url> [options]
  npx @m5nv/create-scaffold@latest <project-directory> --template <url> [options]

ARGUMENTS:
  <project-directory>    Name of the directory to create for your project

OPTIONS:
  -T, --template <url>   Template URL or shorthand (create-remix style)
                         Examples:
                           registry/official/express-api
                           user/repo
                           ./local/template/path
                           https://github.com/user/repo
  -b, --branch <branch>  Git branch to use (default: main/master)
  -i, --ide <ide>        Target IDE for template customization
                         Supported: kiro, vscode, cursor, windsurf
  -o, --options <list>   Comma-separated contextual options for template customization
                         Templates use these to adapt behavior to your specific needs
                         Common options: monorepo, no-git, mvp, prototype, typescript,
                         minimal, full-featured, testing-focused, ci-ready, docker-ready
                         Example: --options monorepo,no-git,mvp

PERFORMANCE & CACHING:
      --no-cache         Bypass cache system and clone directly from remote
                         Use when you need the latest template version
      --cache-ttl <hours> Override default cache TTL (1-720 hours, default: 24)
                         Higher values = less frequent updates, faster operations

DEBUGGING & PREVIEW:
      --log-file <path>  Enable detailed logging to specified file
                         Logs git operations, file copies, and setup script execution
      --dry-run          Preview operations without executing them
                         Shows planned file operations and setup scripts
      --list-templates   Display available templates from repository
                         Fast discovery using cached repositories

PLACEHOLDER INPUTS:
  --experimental-placeholder-prompts
         Enable placeholder prompt flow for templates that declare metadata.placeholders
  --placeholder NAME=value
         Provide placeholder overrides directly (repeat flag to set multiple values)
  --no-input-prompts Fail when required placeholders are missing instead of prompting
         Also supports environment variables: CREATE_SCAFFOLD_PLACEHOLDER_<TOKEN>=value

GENERAL:
  -h, --help            Show this help message
  --verbose         Enable verbose CLI output (includes placeholder source summary)
  --no-config       Skip configuration file discovery (.m5nvrc)

VALIDATION:
  --validate-template <path>
                    Validate template manifest, required files, and setup script without scaffolding
      --json         Emit machine-readable JSON results (use with --validate-template)

CONFIGURATION DEFAULTS:
  The CLI looks for .m5nvrc in the current directory, then ~/.config/m5nv/rc.json (macOS/Linux)
  or %APPDATA%/m5nv/rc.json (Windows). Override discovery with CREATE_SCAFFOLD_CONFIG_PATH.
  Provide repo, branch, author, and placeholders to avoid repeating flags.

EXAMPLES:

  Basic Usage:
    # Create a new React project using template URL (recommended)
    npm create @m5nv/scaffold my-app -- --template registry/official/react

    # Create using GitHub shorthand
    npm create @m5nv/scaffold my-app -- --template remix-run/react-router

    # Use a local template directory
    npm create @m5nv/scaffold my-app -- --template ./my-templates/express-api

  IDE & Options:
    # Create project with IDE-specific customization
    npm create @m5nv/scaffold my-app -- --template registry/official/react --ide kiro

    # Contextual options for different scenarios
    npm create @m5nv/scaffold my-app -- --template registry/official/react --options monorepo,no-git,typescript
    npm create @m5nv/scaffold my-api -- --template registry/official/fastify --options mvp,minimal,testing-focused
    npm create @m5nv/scaffold my-lib -- --template registry/official/library --options prototype,ci-ready,docker-ready

    # Combine IDE and contextual options
    npm create @m5nv/scaffold my-app -- --template registry/official/react --ide vscode --options full-featured,typescript

  Template Discovery:
    # List available templates from default repository
    npm create @m5nv/scaffold -- --list-templates

    # List templates from specific branch
    npm create @m5nv/scaffold -- --list-templates --branch develop

  Preview & Debugging:
    # Preview operations without executing (dry run)
    npm create @m5nv/scaffold my-app -- --template registry/official/react --dry-run

    # Enable detailed logging for troubleshooting
    npm create @m5nv/scaffold my-app -- --template registry/official/react --log-file ./scaffold.log

    # Combine dry run with logging
    npm create @m5nv/scaffold my-app -- --template registry/official/react --dry-run --log-file ./preview.log

  Cache Management:
    # Bypass cache for fresh clone (slower but ensures latest version)
    npm create @m5nv/scaffold my-app -- --template registry/official/react --no-cache

    # Set custom cache TTL (48 hours)
    npm create @m5nv/scaffold my-app -- --template registry/official/react --cache-ttl 48

    # Force fresh template discovery
    npm create @m5nv/scaffold -- --list-templates --no-cache

  Using npx directly:
    npx @m5nv/create-scaffold@latest my-app --template registry/official/react

TEMPLATE REPOSITORIES:
  Templates are organized as subdirectories within git repositories.
  The tool will clone the repository and copy the specified template
  subdirectory to your project directory.

  Cache Location: ~/.m5nv/cache/
  - Templates are cached locally for faster subsequent operations
  - Cache entries expire after 24 hours by default
  - Use --no-cache to bypass cache and get latest version

CONTEXTUAL OPTIONS:
  The --options parameter enables template customization based on your specific
  context and preferences. Templates can use these hints to:

  Project Stage Options:
    poc          - Proof of concept setup with minimal dependencies
    prototype    - Prototype development with rapid iteration focus
    mvp          - Minimum viable product with essential functionality only
    production   - Production-ready setup with full tooling

  Environment Context:
    monorepo     - Part of a monorepo structure (affects paths, configs)
    standalone   - Standalone project (full independent setup)
    existing-project - Adding to existing codebase (minimal conflicts)

  Development Preferences:
    no-git       - Skip git initialization and related setup
    minimal      - Minimal dependencies and configuration
    full-featured - Include all available functionality and tooling
    typescript   - TypeScript-focused configuration and dependencies
    testing-focused - Comprehensive test setup and utilities
    ci-ready     - Include CI/CD configuration files
    docker-ready - Include Docker configuration and setup

  Templates define their own option vocabularies, so check template
  documentation for supported options. Options are passed to setup
  scripts as an array for custom processing.

SETUP SCRIPTS:
  Templates may include a _setup.mjs file that runs after copying.
  This script can customize the project based on your environment.
  Setup scripts run in your project context with appropriate permissions.

TROUBLESHOOTING:

  Common Cache Issues:
    Problem: "Cache directory permission denied"
    Solution: Check ~/.m5nv/cache permissions or use --no-cache

    Problem: "Corrupted cache entry"
    Solution: Tool automatically re-clones corrupted entries

    Problem: "Template not found in cached repository"
    Solution: Use --no-cache to get latest repository version

  Common Logging Issues:
    Problem: "Cannot write to log file"
    Solution: Check log file path permissions and disk space

    Problem: "Log file path invalid"
    Solution: Use absolute path or ensure parent directory exists

  Template Discovery Issues:
    Problem: "No templates found"
    Solution: Verify repository URL and branch name are correct

    Problem: "Repository access denied"
    Solution: Check git credentials and repository permissions

  General Issues:
    Problem: "Git command not found"
    Solution: Install git and ensure it's in your PATH

    Problem: "Network timeout during clone"
    Solution: Check internet connection or use --cache-ttl for longer cache

SECURITY:
  - Only use templates from repositories you trust
  - Review setup scripts before running if security is a concern
  - The tool validates inputs to prevent path traversal attacks
  - No credentials are stored or transmitted by this tool
  - Log files may contain repository URLs but no sensitive information

For more information, visit: https://github.com/million-views/create
`;
}



/**
 * Custom error class for argument parsing errors
 */
export class ArgumentError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'ArgumentError';
    this.field = options.field;
    this.suggestions = options.suggestions || [];
  }
}