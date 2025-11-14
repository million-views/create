#!/usr/bin/env node

import { realpathSync } from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { parseArguments, validateArguments } from '../../lib/cli/argument-parser.mjs';
import {
  handleError
} from '../../lib/shared/utils/error-handler.mjs';

// Import terminology
import { TERMINOLOGY } from '../../lib/shared/ontology.mjs';

// Import shared CLI components
import { createCommandRouter } from '../../lib/cli/command-router.mjs';
import { generateHelp } from '../../lib/cli/help-generator.mjs';

// Import command handlers
import { executeNewCommand } from './commands/new.mjs';
import { executeListCommand } from './commands/list.mjs';
import { executeValidateCommand } from './commands/validate.mjs';

// Command definitions for shared argument parser
const COMMAND_DEFINITIONS = {
  [TERMINOLOGY.COMMAND.NEW]: {
    description: 'Create a new project from a template',
    options: {
      [TERMINOLOGY.OPTION.TEMPLATE]: {
        type: 'string',
        short: 'T',
        description: 'Template to use'
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
      [TERMINOLOGY.OPTION.PLACEHOLDER]: {
        type: 'string',
        multiple: true,
        description: 'Supply placeholder value in NAME=value form'
      },
      [TERMINOLOGY.OPTION.NO_INPUT_PROMPTS]: {
        type: 'boolean',
        description: 'Disable interactive placeholder prompting'
      },
      [TERMINOLOGY.OPTION.INTERACTIVE]: {
        type: 'boolean',
        description: 'Force interactive mode'
      },
      [TERMINOLOGY.OPTION.NON_INTERACTIVE]: {
        type: 'boolean',
        description: 'Force non-interactive mode'
      },
      [TERMINOLOGY.OPTION.NO_CONFIG]: {
        type: 'boolean',
        description: 'Skip loading user configuration'
      }
    }
  },
  [TERMINOLOGY.COMMAND.LIST]: {
    description: 'List available templates and registries',
    options: {
      [TERMINOLOGY.OPTION.REGISTRY]: {
        type: 'string',
        description: 'Registry name to list templates from'
      },
      [TERMINOLOGY.OPTION.LOG_FILE]: {
        type: 'string',
        description: 'Enable detailed logging to specified file'
      }
    }
  },
  [TERMINOLOGY.COMMAND.VALIDATE]: {
    description: 'Validate a template directory',
    options: {
      [TERMINOLOGY.OPTION.LOG_FILE]: {
        type: 'string',
        description: 'Enable detailed logging to specified file'
      },
      [TERMINOLOGY.OPTION.JSON]: {
        type: 'boolean',
        description: 'Output validation results in JSON format'
      }
    }
  }
};

// Command handlers for shared router
const COMMAND_HANDLERS = {
  [TERMINOLOGY.COMMAND.NEW]: async ({ globalOptions, commandOptions, positionals }) => {
    // Merge global and command options, add positional args
    const args = {
      ...globalOptions,
      ...commandOptions,
      projectDirectory: positionals[0]
    };
    return await executeNewCommand(args);
  },
  [TERMINOLOGY.COMMAND.LIST]: async ({ globalOptions, commandOptions }) => {
    const args = { ...globalOptions, ...commandOptions };
    return await executeListCommand(args);
  },
  [TERMINOLOGY.COMMAND.VALIDATE]: async ({ globalOptions, commandOptions, positionals }) => {
    const args = {
      ...globalOptions,
      ...commandOptions,
      path: positionals[0]
    };
    return await executeValidateCommand(args);
  }
};

// Create the shared command router
const router = createCommandRouter({
  commandHandlers: COMMAND_HANDLERS,
  helpGenerator: { generateHelp },
  errorHandler: {
    handle: (error) => {
      handleError(error, { exit: false });
      return 1;
    }
  },
  toolName: 'create-scaffold',
  version: '0.6.0',
  description: 'Project scaffolding tool',
  commands: COMMAND_DEFINITIONS,
  globalOptions: {},
  examples: [
    'create-scaffold new my-project --template react-app',
    'create-scaffold list --registry official',
    'create-scaffold validate ./my-template'
  ]
});

/**
 * Main entry point for the create-scaffold CLI tool
 * Uses shared CLI framework for consistent behavior
 */
async function main() {
  try {
    // Parse arguments using shared argument parser
    const parsedArgs = parseArguments(process.argv.slice(2), COMMAND_DEFINITIONS);

    // Validate arguments
    validateArguments(parsedArgs, COMMAND_DEFINITIONS);

    // Execute command using shared router
    const result = await router(parsedArgs);

    // Handle help output (router returns help text as string)
    if (typeof result === 'string') {
      console.log(result);
      process.exit(0);
    }

    // Handle normal exit codes
    process.exit(result);
  } catch (error) {
    handleError(error, { exit: true });
  }
}

// Run main function when executed directly
const entryPoint = process.argv[1];
if (entryPoint) {
  const modulePath = fileURLToPath(import.meta.url);
  const resolvedEntry = path.resolve(entryPoint);
  let realEntry = resolvedEntry;

  try {
    realEntry = realpathSync(resolvedEntry);
  } catch {
    // Ignore resolution failures; fall back to resolvedEntry comparison below.
  }

  if (modulePath === resolvedEntry || modulePath === realEntry) {
    main().catch(async (error) => {
      const { handleError } = await import('../../lib/shared/utils/error-handler.mjs');
      handleError(error, { operation: 'main_execution' });
    });
  }
}
