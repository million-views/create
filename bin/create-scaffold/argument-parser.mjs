#!/usr/bin/env node

import { parseArgs } from 'util';
import {
  validateProjectDirectory,
  validateTemplateName,
  validateRepoUrl,
  sanitizeBranchName,
  validateLogFilePath,
  validateCacheTtl
} from '../../lib/shared/security.mjs';
import { ArgumentError } from '../../lib/shared/utils/error-classes.mjs';
import { handleValidationError } from '../../lib/shared/utils/validation-utils.mjs';

// Re-export for backward compatibility with tests
export { ArgumentError };
import { TERMINOLOGY, GLOBAL_OPTIONS } from '../../lib/shared/ontology.mjs';

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
      [TERMINOLOGY.OPTION.TEMPLATE]: {
        type: 'string',
        short: 'T',
        description: 'Template URL or shorthand (create-remix style)'
      },
      [TERMINOLOGY.OPTION.BRANCH]: {
        type: 'string',
        short: 'b',
        description: 'Git branch to use (default: main/master)'
      },
      [TERMINOLOGY.OPTION.LOG_FILE]: {
        type: 'string',
        description: 'Enable detailed logging to specified file'
      },
      [TERMINOLOGY.OPTION.LIST_TEMPLATES]: {
        type: 'boolean',
        description: 'Display available registries or templates from a specific registry'
      },
      [TERMINOLOGY.OPTION.REGISTRY]: {
        type: 'string',
        description: 'Registry name to list templates from (used with --list-templates)'
      },
      [TERMINOLOGY.OPTION.DRY_RUN]: {
        type: 'boolean',
        description: 'Preview operations without executing them'
      },
      [TERMINOLOGY.OPTION.NO_CACHE]: {
        type: 'boolean',
        description: 'Bypass cache system and clone directly'
      },
      [TERMINOLOGY.OPTION.CACHE_TTL]: {
        type: 'string',
        description: 'Override default cache TTL in hours'
      },
      [TERMINOLOGY.OPTION.VALIDATE_TEMPLATE]: {
        type: 'string',
        description: 'Validate template at provided path and exit'
      },
      [TERMINOLOGY.OPTION.JSON]: {
        type: 'boolean',
        description: 'Emit JSON output for supported commands (e.g., validation)'
      },
      [TERMINOLOGY.OPTION.PLACEHOLDER]: {
        type: 'string',
        multiple: true,
        description: 'Supply placeholder value in NAME=value form'
      },
      [TERMINOLOGY.OPTION.NO_INPUT_PROMPTS]: {
        type: 'boolean',
        description: 'Disable interactive placeholder prompting'
      },
      [TERMINOLOGY.OPTION.NO_CONFIG]: {
        type: 'boolean',
        description: 'Disable configuration file discovery'
      },
      [TERMINOLOGY.OPTION.INTERACTIVE]: {
        type: 'boolean',
        description: 'Force interactive mode on or off explicitly'
      },
      [TERMINOLOGY.OPTION.NON_INTERACTIVE]: {
        type: 'boolean',
        description: 'Disable automatic interactive mode triggering'
      },
      [TERMINOLOGY.OPTION.VERBOSE]: {
        type: 'boolean',
        description: 'Enable verbose logging during scaffolding'
      },
      [TERMINOLOGY.OPTION.EXPERIMENTAL_PLACEHOLDER_PROMPTS]: {
        type: 'boolean',
        description: 'Enable placeholder prompt flow for experimental rollout'
      },
      [TERMINOLOGY.OPTION.GUIDED]: {
        type: 'boolean',
        description: 'Use guided setup workflow with progress indicators and error recovery'
      },
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
      }
    };

    const { values, positionals } = parseArgs({
      args: normalizedArgv,
      options,
      allowPositionals: true,
      strict: true
    });

    // Extract project directory from positional arguments
    // If CLI is invoked with a subcommand (e.g. `new <project-dir>`), the
    // first positional will be the command name. In that case, the project
    // directory (if present) will be the second positional.
    const knownCommands = [
      TERMINOLOGY.COMMAND.NEW,
      TERMINOLOGY.COMMAND.LIST,
      TERMINOLOGY.COMMAND.INFO,
      TERMINOLOGY.COMMAND.VALIDATE
    ];
    let projectDirectory;
    if (positionals.length > 0 && knownCommands.includes(positionals[0])) {
      projectDirectory = positionals[1];
    } else {
      projectDirectory = positionals[0];
    }

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
      [TERMINOLOGY.OPTION.TEMPLATE]: values[TERMINOLOGY.OPTION.TEMPLATE],
      [TERMINOLOGY.OPTION.BRANCH]: values[TERMINOLOGY.OPTION.BRANCH],
      [TERMINOLOGY.OPTION.LOG_FILE]: values[TERMINOLOGY.OPTION.LOG_FILE],
      [TERMINOLOGY.OPTION.LIST_TEMPLATES]: values[TERMINOLOGY.OPTION.LIST_TEMPLATES],
      [TERMINOLOGY.OPTION.REGISTRY]: values[TERMINOLOGY.OPTION.REGISTRY],
      [TERMINOLOGY.OPTION.DRY_RUN]: values[TERMINOLOGY.OPTION.DRY_RUN],
      [TERMINOLOGY.OPTION.NO_CACHE]: values[TERMINOLOGY.OPTION.NO_CACHE],
      [TERMINOLOGY.OPTION.CACHE_TTL]: values[TERMINOLOGY.OPTION.CACHE_TTL],
      [TERMINOLOGY.OPTION.VALIDATE_TEMPLATE]: validateTemplate,
      [TERMINOLOGY.OPTION.JSON]: json,
      [TERMINOLOGY.OPTION.PLACEHOLDER]: placeholders,
      [TERMINOLOGY.OPTION.NO_INPUT_PROMPTS]: noInputPrompts,
      [TERMINOLOGY.OPTION.VERBOSE]: verbose,
      [TERMINOLOGY.OPTION.EXPERIMENTAL_PLACEHOLDER_PROMPTS]: experimentalPlaceholderPrompts,
      [TERMINOLOGY.OPTION.GUIDED]: values[TERMINOLOGY.OPTION.GUIDED],
      [TERMINOLOGY.OPTION.INTERACTIVE]: interactive,
      [TERMINOLOGY.OPTION.NON_INTERACTIVE]: explicitNoInteractive,
      [TERMINOLOGY.OPTION.NO_CONFIG]: noConfig,
      [TERMINOLOGY.OPTION.HELP]: values[TERMINOLOGY.OPTION.HELP],
      'help-intermediate': values['help-intermediate'],
      'help-advanced': values['help-advanced'],
      'help-interactive': values['help-interactive'],
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
  const hasAnyArgs = args.projectDirectory || args[TERMINOLOGY.OPTION.TEMPLATE] || args[TERMINOLOGY.OPTION.BRANCH] ||
                     args.ide || args.options || args[TERMINOLOGY.OPTION.LOG_FILE] || args[TERMINOLOGY.OPTION.LIST_TEMPLATES] ||
                     args[TERMINOLOGY.OPTION.DRY_RUN] || args[TERMINOLOGY.OPTION.NO_CACHE] || args[TERMINOLOGY.OPTION.CACHE_TTL] || args[TERMINOLOGY.OPTION.VALIDATE_TEMPLATE] ||
                     args[TERMINOLOGY.OPTION.JSON] || (args[TERMINOLOGY.OPTION.PLACEHOLDER] && args[TERMINOLOGY.OPTION.PLACEHOLDER].length > 0) || args[TERMINOLOGY.OPTION.NO_INPUT_PROMPTS] ||
                     args[TERMINOLOGY.OPTION.VERBOSE] || args[TERMINOLOGY.OPTION.EXPERIMENTAL_PLACEHOLDER_PROMPTS] || args[TERMINOLOGY.OPTION.INTERACTIVE] ||
                     args[TERMINOLOGY.OPTION.NON_INTERACTIVE] || args[TERMINOLOGY.OPTION.NO_CONFIG];
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
                        args.template.startsWith('./') ||
                        args.template.startsWith('../');
    
    if (looksLikeUrl) {
      // Basic validation for URLs/paths
      if (args.template.includes('\0')) {
        errors.push('Template URL contains null bytes');
      }
      // Check for injection characters
      if (args.template.includes(';') || args.template.includes('|') || args.template.includes('&') || 
          args.template.includes('`') || args.template.includes('$(') || args.template.includes('${') ||
          args.template.includes(' ')) {
        errors.push('Invalid template URL');
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

  // Validate log file path if provided
  if (args['log-file'] !== undefined) {
    handleValidationError(validateLogFilePath, args['log-file'], errors, 'Log file path validation failed');
  }

  // Validate cache TTL if provided
  if (args[TERMINOLOGY.OPTION.CACHE_TTL] !== undefined) {
    handleValidationError(validateCacheTtl, args[TERMINOLOGY.OPTION.CACHE_TTL], errors, 'Cache TTL validation failed');
  }

  // Check for conflicting cache flags
  if (args[TERMINOLOGY.OPTION.NO_CACHE] && args[TERMINOLOGY.OPTION.CACHE_TTL]) {
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
  create-scaffold <command> [options]

COMMANDS:
  new <project-directory>    Create a new project from a template
  list                       List available templates and registries
  info <template>            Show detailed information about a template
  validate <template-path>   Validate a template directory

GLOBAL OPTIONS:
  --help, -h                 Show help information
  --version                  Show version information
  --verbose                  Enable verbose logging
  --no-config                Disable configuration file discovery
  --log-file <path>          Enable detailed logging to specified file

EXAMPLES:
  # Create a new project
  create-scaffold new my-app --template react-app

  # List available templates
  create-scaffold list
  create-scaffold list --registry official

  # Get template information
  create-scaffold info react-app

  # Validate a template
  create-scaffold validate ./my-template

  # Legacy usage (deprecated)
  create-scaffold my-app --template react-app

For detailed help on a specific command, use:
  create-scaffold <command> --help

OPTIONS:
  -T, --template <url>   Template URL or shorthand (create-remix style)
                         Examples:
                           favorites/express-api
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
  --guided          Use guided setup workflow with progress indicators and error recovery
  --no-config       Skip configuration file discovery (.m5nvrc)

VALIDATION:
  --validate-template <path>
                    Validate template manifest, required files, and setup script without scaffolding
      --json         Emit machine-readable JSON results (use with --validate-template)

CONFIGURATION DEFAULTS:
  The CLI looks for .m5nvrc in the current directory, then ~/.m5nv/rc.json (macOS/Linux)
  or %APPDATA%/m5nv/rc.json (Windows). Override discovery with CREATE_SCAFFOLD_CONFIG_PATH.
  Provide repo, branch, author, and placeholders to avoid repeating flags.

EXAMPLES:

  Basic Usage:
    # Create a new React project using registry alias (configure in .m5nvrc)
    npm create @m5nv/scaffold my-app -- --template favorites/react-spa

    # Create using GitHub shorthand
    npm create @m5nv/scaffold my-app -- --template remix-run/react-router

    # Use a local template directory
    npm create @m5nv/scaffold my-app -- --template ./my-templates/express-api

  IDE & Options:
    # Create project with IDE-specific customization
    npm create @m5nv/scaffold my-app -- --template favorites/react-spa --ide kiro

    # Contextual options for different scenarios
    npm create @m5nv/scaffold my-app -- --template favorites/react-spa --options monorepo,no-git,typescript
    npm create @m5nv/scaffold my-api -- --template favorites/express-api --options mvp,minimal,testing-focused
    npm create @m5nv/scaffold my-lib -- --template company/library --options prototype,ci-ready,docker-ready

    # Combine IDE and contextual options
    npm create @m5nv/scaffold my-app -- --template favorites/react-spa --ide vscode --options full-featured,typescript

  Template Discovery:
    # List available registries
    npm create @m5nv/scaffold -- --list-templates

    # List templates from specific registry
    npm create @m5nv/scaffold -- --list-templates --registry favorites

    # List templates from specific branch
    npm create @m5nv/scaffold -- --list-templates --branch develop

  Preview & Debugging:
    # Preview operations without executing (dry run)
    npm create @m5nv/scaffold my-app -- --template favorites/react-spa --dry-run

    # Enable detailed logging for troubleshooting
    npm create @m5nv/scaffold my-app -- --template favorites/react-spa --log-file ./scaffold.log

    # Combine dry run with logging
    npm create @m5nv/scaffold my-app -- --template favorites/react-spa --dry-run --log-file ./preview.log

  Cache Management:
    # Bypass cache for fresh clone (slower but ensures latest version)
    npm create @m5nv/scaffold my-app -- --template favorites/react-spa --no-cache

    # Set custom cache TTL (48 hours)
    npm create @m5nv/scaffold my-app -- --template favorites/react-spa --cache-ttl 48

    # Force fresh template discovery
    npm create @m5nv/scaffold -- --list-templates --no-cache

  Using npx directly:
    npx @m5nv/create-scaffold@latest my-app --template favorites/react-spa

TEMPLATE REPOSITORIES:
  Templates are organized as subdirectories within git repositories.
  The tool will clone the repository and copy the specified template
  subdirectory to your project directory.

  Cache Location: ~/.m5nv/cache/
  - Templates are cached locally for faster subsequent operations
  - Cache entries expire after 24 hours by default
  - Use --no-cache to bypass cache and get latest version

  Configuration Location: ~/.m5nv/rc.json
  - User preferences and registry definitions are stored here
  - Project-specific overrides can be set in .m5nvrc
  - Supports shared configuration for multiple m5nv products

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