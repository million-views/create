#!/usr/bin/env node

/**
 * Shared CLI argument parser supporting hierarchical commands
 * Provides consistent argument parsing across all CLI tools
 */

import { parseArgs } from 'util';

/**
 * Global options available to all commands
 */
const GLOBAL_OPTIONS = {
  help: {
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
  verbose: {
    type: 'boolean',
    description: 'Enable verbose output'
  },
  'log-file': {
    type: 'string',
    description: 'Log output to specified file'
  },
  json: {
    type: 'boolean',
    description: 'Output results in JSON format'
  },
  version: {
    type: 'boolean',
    short: 'v',
    description: 'Show version information'
  }
};

/**
 * Parse command line arguments with hierarchical command support
 * @param {string[]} argv - Command line arguments
 * @param {object} commandDefinitions - Command definitions with their options
 * @returns {object} Parsed arguments with command identification
 */
export function parseArguments(argv = process.argv.slice(2), commandDefinitions = {}) {
  // Find the command (first non-option argument)
  let command = null;
  let commandIndex = -1;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('-')) {
      command = arg;
      commandIndex = i;
      break;
    }
  }

  if (!command) {
    // No command found, parse as global options only
    const globalParse = parseArgs({
      args: argv,
      options: GLOBAL_OPTIONS,
      allowPositionals: true
    });

    return {
      command: null,
      globalOptions: globalParse.values,
      commandOptions: {},
      positionals: globalParse.positionals,
      rawArgs: argv
    };
  }

  // Split arguments: before command (global options), command, after command (command options + positionals)
  const beforeCommand = argv.slice(0, commandIndex);
  const afterCommand = argv.slice(commandIndex + 1);

  // Parse global options from before command
  const globalParse = parseArgs({
    args: beforeCommand,
    options: GLOBAL_OPTIONS,
    allowPositionals: true
  });

  // Check if command exists
  const commandDef = commandDefinitions[command];
  if (!commandDef) {
    throw new ArgumentError(`Unknown command: ${command}`);
  }

  // Parse command-specific options and positionals
  const commandParse = parseArgs({
    args: afterCommand,
    options: commandDef.options || {},
    allowPositionals: true
  });

  return {
    command,
    globalOptions: globalParse.values,
    commandOptions: commandParse.values,
    positionals: commandParse.positionals,
    rawArgs: argv
  };
}

/**
 * Validate parsed arguments
 * @param {object} parsed - Parsed arguments object
 * @param {object} commandDefinitions - Command definitions
 */
export function validateArguments(parsed, commandDefinitions = {}) {
  // Validate global options
  if (parsed.globalOptions.help && parsed.globalOptions.version) {
    throw new ArgumentError('Cannot specify both --help and --version');
  }

  // If no command specified, help or version should be shown
  if (!parsed.command && !parsed.globalOptions.help && !parsed.globalOptions.version) {
    throw new ArgumentError('No command specified. Use --help for usage information.');
  }

  // Validate command-specific requirements
  if (parsed.command) {
    const commandDef = commandDefinitions[parsed.command];
    if (commandDef && commandDef.validate) {
      commandDef.validate(parsed.commandOptions, parsed.positionals);
    }
  }
}

/**
 * Custom argument error class
 */
export class ArgumentError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ArgumentError';
  }
}

/**
 * Generate help text for commands
 * @param {object} options - Help generation options
 * @returns {string} Formatted help text
 */
export function generateHelpText(options = {}) {
  const {
    toolName = 'CLI Tool',
    description = '',
    commands = {},
    globalOptions = GLOBAL_OPTIONS,
    examples = [],
    disclosureLevel = 'basic'
  } = options;

  let help = `${toolName}\n`;

  if (description) {
    help += `\n${description}\n`;
  }

  help += `\nUSAGE:\n  ${toolName.toLowerCase()} <command> [options]\n`;

  // Commands section
  if (Object.keys(commands).length > 0) {
    help += `\nCOMMANDS:\n`;
    for (const [cmd, def] of Object.entries(commands)) {
      const desc = def.description || '';
      const aliases = def.aliases ? ` (${def.aliases.join(', ')})` : '';
      help += `  ${cmd}${aliases}\t\t${desc}\n`;
    }
  }

  // Global options
  help += `\nGLOBAL OPTIONS:\n`;
  for (const [opt, config] of Object.entries(globalOptions)) {
    const short = config.short ? `-${config.short}, ` : '';
    help += `  ${short}--${opt}\t\t${config.description}\n`;
  }

  // Examples
  if (examples.length > 0) {
    help += `\nEXAMPLES:\n`;
    for (const example of examples) {
      help += `  ${example}\n`;
    }
  }

  // Advanced help hint
  if (disclosureLevel === 'basic') {
    help += `\nUse '${toolName.toLowerCase()} <command> --help' for command-specific help.\n`;
    help += `Use '${toolName.toLowerCase()} --help advanced' for advanced options.\n`;
  }

  return help;
}