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
import { MAKE_TEMPLATE_HELP } from './help-definitions.mjs';

// Use centralized help definitions
const COMMAND_DEFINITIONS = MAKE_TEMPLATE_HELP;

// Import command handlers
import { executeConvertCommand } from './commands/convert.mjs';
import { executeRestoreCommand } from './commands/restore.mjs';
import { executeInitCommand } from './commands/init.mjs';
import { executeValidateCommand } from './commands/validate.mjs';
import { executeHintsCommand } from './commands/hints.mjs';
import { executeTestCommand } from './commands/test.mjs';

// Command handlers for shared router
const COMMAND_HANDLERS = {
  [TERMINOLOGY.COMMAND.CONVERT]: async ({ globalOptions, commandOptions, positionals }) => {
    const args = {
      ...globalOptions,
      ...commandOptions,
      projectDirectory: positionals[0]
    };
    return await executeConvertCommand(args);
  },
  [TERMINOLOGY.COMMAND.RESTORE]: async ({ globalOptions, commandOptions, positionals }) => {
    const args = {
      ...globalOptions,
      ...commandOptions,
      projectDirectory: positionals[0]
    };
    return await executeRestoreCommand(args);
  },
  [TERMINOLOGY.COMMAND.INIT]: async ({ globalOptions, commandOptions, positionals }) => {
    const args = {
      ...globalOptions,
      ...commandOptions,
      outputFile: positionals[0]
    };
    return await executeInitCommand(args);
  },
  [TERMINOLOGY.COMMAND.VALIDATE]: async ({ globalOptions, commandOptions, positionals }) => {
    const args = {
      ...globalOptions,
      ...commandOptions,
      templatePath: positionals[0]
    };
    return await executeValidateCommand(args);
  },
  [TERMINOLOGY.COMMAND.HINTS]: async ({ globalOptions, commandOptions }) => {
    const args = { ...globalOptions, ...commandOptions };
    return await executeHintsCommand(args);
  },
  [TERMINOLOGY.COMMAND.TEST]: async ({ globalOptions, commandOptions, positionals }) => {
    const args = {
      ...globalOptions,
      ...commandOptions,
      templatePath: positionals[0]
    };
    return await executeTestCommand(args);
  },
  help: async ({ globalOptions: _globalOptions, commandOptions: _commandOptions, positionals }) => {
    // Handle help command with subcommands
    const subCommand = positionals[0];

    if (subCommand && COMMAND_DEFINITIONS[subCommand]) {
      // Show detailed/advanced help for specific command
      return generateHelp({
        toolName: '@m5nv/make-template',
        description: 'Convert existing Node.js projects into reusable templates compatible with @m5nv/create-scaffold',
        commands: COMMAND_DEFINITIONS,
        globalOptions: GLOBAL_OPTIONS,
        examples: [
          'convert --dry-run    # Preview conversion without making changes',
          'convert --type vite-react --yes    # Convert as Vite React project, skip confirmations',
          'restore --dry-run    # Preview restoration without making changes',
          'restore --yes    # Restore template to working state, skip confirmations',
          'init    # Generate skeleton template.json',
          'validate    # Validate template.json in current directory',
          'hints    # Display hints catalog',
          'help convert    # Show help for convert command'
        ],
        disclosureLevel: DISCLOSURE_LEVELS.COMMAND,
        command: subCommand,
        commandOptions: {},
        interactive: false
      });
    } else {
      // Show global help
      return generateHelp({
        toolName: '@m5nv/make-template',
        description: 'Convert existing Node.js projects into reusable templates compatible with @m5nv/create-scaffold',
        commands: COMMAND_DEFINITIONS,
        globalOptions: GLOBAL_OPTIONS,
        examples: [
          'convert --dry-run    # Preview conversion without making changes',
          'convert --type vite-react --yes    # Convert as Vite React project, skip confirmations',
          'restore --dry-run    # Preview restoration without making changes',
          'restore --yes    # Restore template to working state, skip confirmations',
          'init    # Generate skeleton template.json',
          'validate    # Validate template.json in current directory',
          'hints    # Display hints catalog',
          'help convert    # Show help for convert command'
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
  toolName: '@m5nv/make-template',
  version: '0.6.0',
  description: 'Convert existing Node.js projects into reusable templates compatible with @m5nv/create-scaffold',
  commands: COMMAND_DEFINITIONS,
  globalOptions: GLOBAL_OPTIONS,
  examples: [
    'convert --dry-run    # Preview conversion without making changes',
    'convert --type vite-react --yes    # Convert as Vite React project, skip confirmations',
    'restore --dry-run    # Preview restoration without making changes',
    'restore --yes    # Restore template to working state, skip confirmations',
    'init    # Generate skeleton template.json',
    'validate    # Validate template.json in current directory',
    'hints    # Display hints catalog',
    'help convert    # Show help for convert command'
  ]
});

/**
 * Main entry point for the make-template CLI tool
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
