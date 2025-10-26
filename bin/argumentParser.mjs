#!/usr/bin/env node

import { parseArgs } from 'util';
import { 
  validateProjectDirectory, 
  validateTemplateName, 
  validateRepoUrl, 
  sanitizeBranchName,
  validateIdeParameter,
  validateFeaturesParameter,
  ValidationError 
} from './security.mjs';

/**
 * Parse command line arguments using native Node.js util.parseArgs
 * Replaces minimist with zero external dependencies
 */
export function parseArguments(argv = process.argv.slice(2)) {
  try {
    const options = {
      'from-template': {
        type: 'string',
        short: 't',
        description: 'Template name to use for scaffolding'
      },
      repo: {
        type: 'string',
        short: 'r',
        description: 'Repository URL or user/repo format (default: million-views/templates)'
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
      features: {
        type: 'string',
        short: 'f',
        description: 'Comma-separated list of features to enable'
      },
      help: {
        type: 'boolean',
        short: 'h',
        description: 'Show help information'
      }
    };

    const { values, positionals } = parseArgs({
      args: argv,
      options,
      allowPositionals: true,
      strict: true
    });

    // Extract project directory from positional arguments
    const projectDirectory = positionals[0];

    // Return parsed arguments in expected format
    return {
      projectDirectory,
      template: values['from-template'],
      repo: values.repo,
      branch: values.branch,
      ide: values.ide,
      features: values.features,
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

  // Validate required project directory
  if (!args.projectDirectory) {
    errors.push('Project directory is required as the first argument');
  } else {
    try {
      validateProjectDirectory(args.projectDirectory);
    } catch (error) {
      if (error instanceof ValidationError) {
        errors.push(error.message);
      } else {
        errors.push('Project directory validation failed');
      }
    }
  }

  // Validate required template flag
  if (!args.template) {
    errors.push('--from-template flag is required');
  } else {
    try {
      validateTemplateName(args.template);
    } catch (error) {
      if (error instanceof ValidationError) {
        errors.push(error.message);
      } else {
        errors.push('Template name validation failed');
      }
    }
  }

  // Validate repository URL/format if provided
  if (args.repo) {
    try {
      validateRepoUrl(args.repo);
    } catch (error) {
      if (error instanceof ValidationError) {
        errors.push(error.message);
      } else {
        errors.push('Repository URL validation failed');
      }
    }
  }

  // Validate branch name if provided
  if (args.branch) {
    try {
      sanitizeBranchName(args.branch);
    } catch (error) {
      if (error instanceof ValidationError) {
        errors.push(error.message);
      } else {
        errors.push('Branch name validation failed');
      }
    }
  }

  // Validate IDE parameter if provided
  if (args.ide) {
    try {
      validateIdeParameter(args.ide);
    } catch (error) {
      if (error instanceof ValidationError) {
        errors.push(error.message);
      } else {
        errors.push('IDE parameter validation failed');
      }
    }
  }

  // Validate features parameter if provided
  if (args.features) {
    try {
      validateFeaturesParameter(args.features);
    } catch (error) {
      if (error instanceof ValidationError) {
        errors.push(error.message);
      } else {
        errors.push('Features parameter validation failed');
      }
    }
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
  npm create @m5nv/scaffold <project-directory> -- --from-template <template-name> [options]
  npx @m5nv/create-scaffold@latest <project-directory> --from-template <template-name> [options]

ARGUMENTS:
  <project-directory>    Name of the directory to create for your project

OPTIONS:
  -t, --from-template <name>  Template name to use for scaffolding (required)
  -r, --repo <repo>      Repository URL or user/repo format
                         Default: million-views/templates
                         Examples: 
                           user/repo
                           https://github.com/user/repo.git
                           /path/to/local/repo
  -b, --branch <branch>  Git branch to use (default: main/master)
  -i, --ide <ide>        Target IDE for template customization
                         Supported: kiro, vscode, cursor, windsurf
  -f, --features <list>  Comma-separated list of features to enable
                         Example: auth,database,testing
  -h, --help            Show this help message

EXAMPLES:
  # Create a new React project using the default repository
  npm create @m5nv/scaffold my-app -- --from-template react

  # Use a custom repository
  npm create @m5nv/scaffold my-app -- --from-template nextjs --repo custom-user/templates

  # Create project with IDE-specific customization
  npm create @m5nv/scaffold my-app -- --from-template react --ide kiro

  # Enable specific features
  npm create @m5nv/scaffold my-app -- --from-template fullstack --features auth,database,testing

  # Combine IDE and features
  npm create @m5nv/scaffold my-app -- --from-template react --ide vscode --features auth,testing

  # Using npx directly
  npx @m5nv/create-scaffold@latest my-app --from-template react --repo user/templates

TEMPLATE REPOSITORIES:
  Templates are organized as subdirectories within git repositories.
  The tool will clone the repository and copy the specified template
  subdirectory to your project directory.

SETUP SCRIPTS:
  Templates may include a _setup.mjs file that runs after copying.
  This script can customize the project based on your environment.
  Setup scripts run in your project context with appropriate permissions.

SECURITY:
  - Only use templates from repositories you trust
  - Review setup scripts before running if security is a concern
  - The tool validates inputs to prevent path traversal attacks
  - No credentials are stored or transmitted by this tool

For more information, visit: https://github.com/million-views/create
`;
}



/**
 * Custom error class for argument parsing errors
 */
export class ArgumentError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ArgumentError';
  }
}