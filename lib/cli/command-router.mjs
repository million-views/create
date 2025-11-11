#!/usr/bin/env node

/**
 * Shared CLI command router
 * Routes commands to appropriate handlers with consistent error handling
 */

import { getDisclosureLevel, isInteractiveHelp } from './help-generator.mjs';

/**
 * Route command to handler
 * @param {object} parsedArgs - Parsed command line arguments
 * @param {object} commandHandlers - Map of command names to handler functions
 * @param {object} context - Execution context
 * @returns {Promise} Command execution result
 */
export async function routeCommand(parsedArgs, commandHandlers, context = {}) {
  const { command, globalOptions, commandOptions, positionals } = parsedArgs;

  // Handle global options first
  if (globalOptions.help) {
    return handleHelp(parsedArgs, context);
  }

  if (globalOptions['help-interactive']) {
    return handleInteractiveHelp(parsedArgs, context);
  }

  if (globalOptions.version) {
    return handleVersion(context);
  }

  // Route to command handler
  if (!command) {
    throw new Error('No command specified');
  }

  const handler = commandHandlers[command];
  if (!handler) {
    throw new Error(`Unknown command: ${command}`);
  }

  // Execute command
  return await handler({
    globalOptions,
    commandOptions,
    positionals,
    context
  });
}

/**
 * Handle help command
 */
async function handleHelp(parsedArgs, context) {
  const { helpGenerator, toolName, commands, globalOptions, examples } = context;

  if (!helpGenerator) {
    throw new Error('Help generator not provided in context');
  }

  const disclosureLevel = getDisclosureLevel(parsedArgs.globalOptions);
  const interactive = isInteractiveHelp(parsedArgs.globalOptions);

  return helpGenerator.generateHelp({
    toolName,
    description: context.description,
    commands,
    globalOptions,
    examples,
    disclosureLevel,
    command: parsedArgs.command,
    commandOptions: parsedArgs.commandOptions,
    interactive
  });
}

/**
 * Handle version command
 */
async function handleVersion(_context) {
  console.log('0.5.0');
}

/**
 * Handle interactive help command
 */
async function handleInteractiveHelp(parsedArgs, context) {
  const { helpGenerator, toolName, commands, globalOptions, examples } = context;

  if (!helpGenerator) {
    throw new Error('Help generator not provided in context');
  }

  return helpGenerator.generateHelp({
    toolName,
    description: context.description,
    commands,
    globalOptions,
    examples,
    disclosureLevel: 'basic',
    interactive: true
  });
}

/**
 * Create command router with error handling
 * @param {object} config - Router configuration
 * @returns {function} Configured router function
 */
export function createCommandRouter(config = {}) {
  const {
    commandHandlers = {},
    helpGenerator,
    errorHandler,
    toolName,
    version,
    description,
    commands = {},
    globalOptions = {},
    examples = []
  } = config;

  return async (parsedArgs) => {
    try {
      const context = {
        helpGenerator,
        errorHandler,
        toolName,
        version,
        description,
        commands,
        globalOptions,
        examples
      };

      return await routeCommand(parsedArgs, commandHandlers, context);
    } catch (error) {
      if (errorHandler) {
        return errorHandler.handle(error, parsedArgs);
      }
      throw error;
    }
  };
}
