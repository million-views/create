#!/usr/bin/env node

import { realpathSync } from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { parseArguments, validateArguments, GLOBAL_OPTIONS } from '../../lib/cli/argument-parser.mjs';
import {
  handleError
} from '../../lib/shared/utils/error-handler.mjs';

// Import terminology
import { TERMINOLOGY } from '../../lib/shared/ontology.mjs';

// Import shared CLI components
import { createCommandRouter } from '../../lib/cli/command-router.mjs';
import { generateHelp, DISCLOSURE_LEVELS } from '../../lib/cli/help-generator.mjs';
import { CREATE_SCAFFOLD_HELP } from './help-definitions.mjs';

// Import command handlers
import { executeNewCommand } from './commands/new.mjs';
import { executeListCommand } from './commands/list.mjs';
import { executeValidateCommand } from './commands/validate.mjs';

// Use centralized help definitions
const COMMAND_DEFINITIONS = CREATE_SCAFFOLD_HELP;

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
  },
  help: async ({ globalOptions: _globalOptions, commandOptions: _commandOptions, positionals }) => {
    // Handle help command with subcommands
    const subCommand = positionals[0];

    if (subCommand && COMMAND_DEFINITIONS[subCommand]) {
      // Show detailed/advanced help for specific command
      return generateHelp({
        toolName: '@m5nv/create-scaffold',
        description: 'Project scaffolding tool',
        commands: COMMAND_DEFINITIONS,
        globalOptions: GLOBAL_OPTIONS,
        examples: [
          'create-scaffold new my-project --template react-app',
          'npm create @m5nv/scaffold my-project -- --template react-app',
          'npx @m5nv/create-scaffold new my-project --template react-app',
          'create-scaffold list --registry official',
          'create-scaffold validate ./my-template',
          'create-scaffold help new    # Show help for new command'
        ],
        disclosureLevel: DISCLOSURE_LEVELS.COMMAND,
        command: subCommand,
        commandOptions: {},
        interactive: false
      });
    } else {
      // Show global help
      return generateHelp({
        toolName: '@m5nv/create-scaffold',
        description: 'Project scaffolding tool',
        commands: COMMAND_DEFINITIONS,
        globalOptions: GLOBAL_OPTIONS,
        examples: [
          'create-scaffold new my-project --template react-app',
          'npm create @m5nv/scaffold my-project -- --template react-app',
          'npx @m5nv/create-scaffold new my-project --template react-app',
          'create-scaffold list --registry official',
          'create-scaffold validate ./my-template',
          'create-scaffold help new    # Show help for new command'
        ],
        disclosureLevel: DISCLOSURE_LEVELS.GLOBAL,
        command: null,
        commandOptions: {},
        interactive: false
      });
    }
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
  toolName: '@m5nv/create-scaffold',
  version: '0.6.0',
  description: 'Project scaffolding tool',
  commands: COMMAND_DEFINITIONS,
  globalOptions: GLOBAL_OPTIONS,
  examples: [
    'create-scaffold new my-project --template react-app',
    'npm create @m5nv/scaffold my-project -- --template react-app',
    'npx @m5nv/create-scaffold new my-project --template react-app',
    'create-scaffold list --registry official',
    'create-scaffold validate ./my-template',
    'create-scaffold help new    # Show help for new command'
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
