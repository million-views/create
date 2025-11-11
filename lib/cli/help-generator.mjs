#!/usr/bin/env node

/**
 * Shared CLI help generator with progressive disclosure
 * Provides contextual help at different levels of complexity
 */

/**
 * Help disclosure levels
 */
export const DISCLOSURE_LEVELS = {
  BASIC: 'basic',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced'
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
  help += `  ${toolName.toLowerCase()} --help intermediate      # More options\n`;
  help += `  ${toolName.toLowerCase()} --help advanced          # All options\n`;
  help += `  ${toolName.toLowerCase()} <command> --help         # Command help\n`;

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

  help += `\nUSAGE:\n  ${toolName.toLowerCase()} ${command}`;
  if (commandDef.usage) {
    help += ` ${commandDef.usage}`;
  }
  help += ` [options]\n`;

  // Command-specific options with context awareness
  if (commandDef.options && Object.keys(commandDef.options).length > 0) {
    help += `\nOPTIONS:\n`;
    const options = filterOptionsByDisclosure(commandDef.options, disclosureLevel);
    for (const [opt, def] of Object.entries(options)) {
      const short = def.short ? `-${def.short}, ` : '';
      const required = def.required ? ' (required)' : '';
      const defaultValue = def.default ? ` (default: ${def.default})` : '';
      help += `  ${short}--${opt}${required}${defaultValue}\t\t${def.description}\n`;

      // Add examples for complex options
      if (def.examples && def.examples.length > 0 && disclosureLevel !== DISCLOSURE_LEVELS.BASIC) {
        help += `    Examples: ${def.examples.join(', ')}\n`;
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
    disclosureLevel
  } = config;

  let help = `${toolName}\n`;

  if (description) {
    help += `\n${description}\n`;
  }

  help += `\nUSAGE:\n  ${toolName.toLowerCase()} <command> [options]\n`;

  // Commands section
  if (Object.keys(commands).length > 0) {
    help += `\nCOMMANDS:\n`;
    const visibleCommands = filterCommandsByDisclosure(commands, disclosureLevel);
    for (const [cmd, def] of Object.entries(visibleCommands)) {
      const desc = def.description || '';
      const aliases = def.aliases ? ` (${def.aliases.join(', ')})` : '';
      help += `  ${cmd}${aliases}\t\t${desc}\n`;
    }

    // For basic disclosure, show the primary 'new' command options
    if (disclosureLevel === DISCLOSURE_LEVELS.BASIC && commands.new && commands.new.options) {
      help += `\nOPTIONS:\n`;
      const options = filterOptionsByDisclosure(commands.new.options, DISCLOSURE_LEVELS.BASIC);
      for (const [opt, def] of Object.entries(options)) {
        if (def.disclosureLevel === DISCLOSURE_LEVELS.BASIC || !def.disclosureLevel) {
          const short = def.short ? `-${def.short}, ` : '';
          const required = def.required ? ' (required)' : '';
          help += `  ${short}--${opt}${required}\t\t${def.description}\n`;
        }
      }
    }
  }

  // Global options
  if (disclosureLevel !== DISCLOSURE_LEVELS.BASIC) {
    help += `\nGLOBAL OPTIONS:\n`;
    const options = filterOptionsByDisclosure(globalOptions, disclosureLevel);
    for (const [opt, def] of Object.entries(options)) {
      const short = def.short ? `-${def.short}, ` : '';
      help += `  ${short}--${opt}\t\t${def.description}\n`;
    }
  }

  // Examples
  if (examples.length > 0) {
    help += `\nEXAMPLES:\n`;
    for (const example of examples) {
      help += `  ${example}\n`;
    }
  }

  // Disclosure hints
  if (disclosureLevel === DISCLOSURE_LEVELS.BASIC) {
    help += `\nUse '${toolName.toLowerCase()} --help intermediate' for more options.\n`;
    help += `Use '${toolName.toLowerCase()} --help advanced' for all options.\n`;
    help += `Use '${toolName.toLowerCase()} --help interactive' for guided help.\n`;
  } else if (disclosureLevel === DISCLOSURE_LEVELS.INTERMEDIATE) {
    help += `\nUse '${toolName.toLowerCase()} --help advanced' for complete reference.\n`;
    help += `Use '${toolName.toLowerCase()} --help interactive' for guided help.\n`;
  }

  return help;
}

/**
 * Filter options based on disclosure level
 */
function filterOptionsByDisclosure(options, level) {
  if (level === DISCLOSURE_LEVELS.ADVANCED) {
    return options;
  }

  const filtered = {};
  for (const [key, def] of Object.entries(options)) {
    const optionLevel = def.disclosureLevel || DISCLOSURE_LEVELS.BASIC;
    if (level === DISCLOSURE_LEVELS.INTERMEDIATE) {
      if (optionLevel !== DISCLOSURE_LEVELS.ADVANCED) {
        filtered[key] = def;
      }
    } else if (level === DISCLOSURE_LEVELS.BASIC) {
      if (optionLevel === DISCLOSURE_LEVELS.BASIC) {
        filtered[key] = def;
      }
    }
  }
  return filtered;
}

/**
 * Filter commands based on disclosure level
 */
function filterCommandsByDisclosure(commands, level) {
  if (level === DISCLOSURE_LEVELS.ADVANCED) {
    return commands;
  }

  const filtered = {};
  for (const [key, def] of Object.entries(commands)) {
    const commandLevel = def.disclosureLevel || DISCLOSURE_LEVELS.BASIC;
    if (level === DISCLOSURE_LEVELS.INTERMEDIATE) {
      if (commandLevel !== DISCLOSURE_LEVELS.ADVANCED) {
        filtered[key] = def;
      }
    } else if (level === DISCLOSURE_LEVELS.BASIC) {
      if (commandLevel === DISCLOSURE_LEVELS.BASIC) {
        filtered[key] = def;
      }
    }
  }
  return filtered;
}

/**
 * Get disclosure level from arguments
 * @param {object} globalOptions - Parsed global options
 * @returns {string} Disclosure level
 */
export function getDisclosureLevel(globalOptions) {
  if (globalOptions['help-advanced']) {
    return DISCLOSURE_LEVELS.ADVANCED;
  }
  if (globalOptions['help-intermediate']) {
    return DISCLOSURE_LEVELS.INTERMEDIATE;
  }
  return DISCLOSURE_LEVELS.BASIC;
}

/**
 * Check if interactive help mode is requested
 * @param {object} globalOptions - Parsed global options
 * @returns {boolean} Whether interactive mode is requested
 */
export function isInteractiveHelp(globalOptions) {
  return globalOptions['help-interactive'] === true;
}
