#!/usr/bin/env node

/**
 * Shared CLI help generator with progressive disclosure
 * Provides contextual help at different levels of complexity
 */

/**
 * Help disclosure levels
 */
export const DISCLOSURE_LEVELS = {
  GLOBAL: 'global',      // Full help for main command (all commands + global options)
  COMMAND: 'command'     // Help for specific command
};

/**
 * Generate help text with progressive disclosure
 * @param {object} config - Help configuration
 * @returns {string} Formatted help text
 */
export function generateHelp(config = {}) {
  const {
    toolName,
    description,
    commands = {},
    globalOptions = {},
    examples = [],
    disclosureLevel = DISCLOSURE_LEVELS.BASIC,
    command = null,
    commandOptions = {},
    commandExamples = [],
    interactive = false
  } = config;

  // Interactive help mode
  if (interactive) {
    return generateInteractiveHelp({
      toolName,
      description,
      commands,
      globalOptions,
      examples
    });
  }

  // Command-specific help
  if (command && commands[command]) {
    return generateCommandHelp({
      toolName,
      command,
      commandDef: commands[command],
      commandOptions: commandOptions || {},
      commandExamples: commandExamples || [],
      disclosureLevel
    });
  }

  // Global help
  return generateGlobalHelp({
    toolName,
    description,
    commands,
    globalOptions,
    examples,
    disclosureLevel
  });
}

/**
 * Generate interactive help mode
 */
function generateInteractiveHelp(config) {
  const { toolName, description, commands } = config;

  let help = `${toolName} - Interactive Help Mode\n`;
  help += `=${'='.repeat(toolName.length + 25)}=\n\n`;

  if (description) {
    help += `${description}\n\n`;
  }

  help += `Available commands:\n`;
  for (const [cmd, def] of Object.entries(commands)) {
    const level = def.disclosureLevel || DISCLOSURE_LEVELS.BASIC;
    const levelIndicator = level === DISCLOSURE_LEVELS.ADVANCED ? '[ADV]' :
      level === DISCLOSURE_LEVELS.INTERMEDIATE ? '[INT]' : '[BAS]';
    help += `  ${cmd} ${levelIndicator}\t${def.description || ''}\n`;
  }

  help += `\nNavigation:\n`;
  help += `  Type a command name for detailed help\n`;
  help += `  Type 'basic', 'intermediate', or 'advanced' for disclosure level\n`;
  help += `  Type 'examples' to see usage examples\n`;
  help += `  Type 'quit' or 'exit' to exit interactive mode\n`;

  help += `\nGetting started:\n`;
  help += `  ${toolName.toLowerCase()} --help                    # Basic help\n`;
  help += `  ${toolName.toLowerCase()} help                      # Intermediate help\n`;
  help += `  ${toolName.toLowerCase()} help advanced             # Advanced help\n`;
  help += `  ${toolName.toLowerCase()} help <command>            # Command help\n`;

  return help;
}

/**
 * Generate help for a specific command
 */
function generateCommandHelp(config) {
  const {
    toolName,
    command,
    commandDef,
    _commandOptions,
    commandExamples,
    disclosureLevel,
    context = {}
  } = config;

  let help = `${toolName} ${command}\n`;

  if (commandDef.description) {
    help += `\n${commandDef.description}\n`;
  }

  // Add detailed description for advanced help
  if (disclosureLevel === DISCLOSURE_LEVELS.ADVANCED && commandDef.detailedDescription) {
    help += `\nDESCRIPTION:\n${commandDef.detailedDescription.trim()}\n`;
  }

  help += `\nUSAGE:\n  ${toolName.toLowerCase()} ${command}`;
  if (commandDef.usage) {
    help += ` ${commandDef.usage}`;
  }
  help += ` [options]\n`;

  // Command-specific options - show options based on disclosure level
  if (commandDef.options && Object.keys(commandDef.options).length > 0) {
    help += `\nOPTIONS:\n`;

    if (disclosureLevel === DISCLOSURE_LEVELS.ADVANCED && commandDef.detailedDescription) {
      // For advanced help, show detailed contextual information
      const options = commandDef.options;
      for (const [opt, def] of Object.entries(options)) {
        const short = def.short ? `-${def.short}, ` : '';
        help += `\n${short}--${opt}:\n`;
        if (def.detailedDescription) {
          help += `${def.detailedDescription.trim()}\n`;
        } else {
          help += `  ${def.description}\n`;
        }
      }
    } else {
      // For basic command help, show succinct option list (all options)
      const options = commandDef.options; // Show all options for command --help

      for (const [opt, def] of Object.entries(options)) {
        const short = def.short ? `-${def.short}, ` : '';
        const required = def.required ? ' (required)' : '';
        const defaultValue = def.default ? ` (default: ${def.default})` : '';
        help += `  ${short}--${opt}${required}${defaultValue}\t\t${def.description}\n`;
      }
    }
  }

  // Context-aware examples
  if (commandExamples.length > 0) {
    help += `\nEXAMPLES:\n`;
    for (const example of commandExamples) {
      help += `  ${example}\n`;
    }
  } else if (commandDef.examples && commandDef.examples.length > 0) {
    help += `\nEXAMPLES:\n`;
    for (const example of commandDef.examples) {
      help += `  ${toolName.toLowerCase()} ${command} ${example}\n`;
    }
  }

  // Related commands or next steps
  if (commandDef.related && commandDef.related.length > 0) {
    help += `\nRELATED COMMANDS:\n`;
    for (const related of commandDef.related) {
      help += `  ${related}\n`;
    }
  }

  // Context-specific hints
  if (context.currentDirectory) {
    help += `\nCURRENT CONTEXT:\n`;
    help += `  Working directory: ${context.currentDirectory}\n`;
  }

  return help;
}

/**
 * Generate global help
 */
function generateGlobalHelp(config) {
  const {
    toolName,
    description,
    commands,
    globalOptions,
    examples,
    disclosureLevel: _disclosureLevel
  } = config;

  let help = `${toolName}\n`;

  if (description) {
    help += `\n${description}\n`;
  }

  help += `\nUSAGE:\n  ${toolName.toLowerCase()} <command> [options]\n`;

  // Commands section - show all commands for global help
  if (Object.keys(commands).length > 0) {
    help += `\nCOMMANDS:\n`;
    for (const [cmd, def] of Object.entries(commands)) {
      const desc = def.description || '';
      const aliases = def.aliases ? ` (${def.aliases.join(', ')})` : '';
      help += `  ${cmd}${aliases}\t\t${desc}\n`;
    }
  }

  // Global options - show all for global help
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

  // Disclosure hints - simplified to match cargo
  help += `\nSee '${toolName.toLowerCase()} help <command>' for more information on a specific command.`;

  return help;
}

/**
 * Get disclosure level from arguments
 * @param {object} globalOptions - Parsed global options
 * @returns {string} Disclosure level
 */
/**
 * Determine disclosure level based on global options
 * @param {object} globalOptions - Parsed global options
 * @returns {string} Disclosure level
 */
export function getDisclosureLevel(globalOptions) {
  // If we have a specific command being requested, show command help
  if (globalOptions.command) {
    return DISCLOSURE_LEVELS.COMMAND;
  }
  // Otherwise show global help
  return DISCLOSURE_LEVELS.GLOBAL;
}

/**
 * Check if interactive help mode is requested
 * @param {object} globalOptions - Parsed global options
 * @returns {boolean} Whether interactive mode is requested
 */
export function isInteractiveHelp(globalOptions) {
  return globalOptions['help-interactive'] === true;
}
