#!/usr/bin/env node

import { TERMINOLOGY } from '../../../create/lib/shared/ontology.mjs';
import { executeNewCommand } from './commands/new.mjs';
import { executeListCommand } from './commands/list.mjs';
import { executeValidateCommand } from './commands/validate.mjs';
import { sanitizeBranchName } from '../../../create/lib/shared/security.mjs';

/**
 * Command router for create-scaffold CLI
 * Routes to appropriate command handlers based on the first argument
 */
export class CommandRouter {
  constructor() {
    this.commands = {
      [TERMINOLOGY.COMMAND.NEW]: executeNewCommand,
      [TERMINOLOGY.COMMAND.LIST]: executeListCommand,
      [TERMINOLOGY.COMMAND.VALIDATE]: executeValidateCommand
    };
  }

  /**
   * Route to the appropriate command handler
   * @param {string} command - The command name
   * @param {string[]} positionalArgs - Positional arguments for the command
   * @param {object} parsedArgs - Parsed arguments object
   * @returns {Promise<number>} Exit code
   */
  async route(command, positionalArgs, parsedArgs) {

    if (!command) {
      // No command specified, show help
      this.showHelp();
      return 0;
    }

    // Check if it's a valid command
    if (!this.commands[command]) {
      console.error(`❌ Unknown command: ${command}`);
      console.error('');
      this.showHelp();
      return 1;
    }

    // Add positional arguments to parsedArgs based on command
    const enrichedArgs = this.enrichArgsWithPositional(command, positionalArgs, parsedArgs);

    // Validate command-specific arguments
    const validation = this.validateCommandArgs(command, enrichedArgs);
    if (!validation.isValid) {
      console.error(`❌ ${validation.error}`);
      return 1;
    }

    // Execute the command
    const commandHandler = this.commands[command];
    return await commandHandler(enrichedArgs);
  }

  /**
   * Enrich parsed arguments with positional arguments based on command
   * @param {string} command - The command name
   * @param {string[]} positionalArgs - Positional arguments
   * @param {object} parsedArgs - Parsed arguments object
   * @returns {object} Enriched arguments object
   */
  enrichArgsWithPositional(command, positionalArgs, parsedArgs) {
    const enriched = { ...parsedArgs };

    switch (command) {
      case TERMINOLOGY.COMMAND.VALIDATE:
        if (positionalArgs.length > 0) {
          enriched.path = positionalArgs[0];
        }
        break;
      case TERMINOLOGY.COMMAND.NEW:
        if (positionalArgs.length > 0) {
          enriched.projectDirectory = positionalArgs[0];
        }
        break;
      case TERMINOLOGY.COMMAND.LIST:
        // List command doesn't take positional arguments
        break;
      default:
        // Unknown command, don't modify
        break;
    }

    return enriched;
  }

  /**
   * Validate command-specific arguments
   * @param {string} command - The command name
   * @param {object} args - Parsed and enriched arguments
   * @returns {object} Validation result with isValid and error message
   */
  validateCommandArgs(command, args) {
    switch (command) {
      case TERMINOLOGY.COMMAND.NEW:
        // Validate project directory is provided
        if (!args.projectDirectory) {
          return { isValid: false, error: 'Project directory name is required' };
        }

        // Validate template is provided
        if (!args[TERMINOLOGY.OPTION.TEMPLATE]) {
          return { isValid: false, error: '--template flag is required' };
        }

        // Validate branch name if provided
        if (args[TERMINOLOGY.OPTION.BRANCH]) {
          try {
            sanitizeBranchName(args[TERMINOLOGY.OPTION.BRANCH]);
          } catch (error) {
            return { isValid: false, error: `Branch name validation failed: ${error.message}` };
          }
        }

        // Validate cache TTL if provided
        if (args[TERMINOLOGY.OPTION.CACHE_TTL]) {
          const ttl = parseInt(args[TERMINOLOGY.OPTION.CACHE_TTL], 10);
          if (isNaN(ttl) || ttl < 1 || ttl > 720) {
            return { isValid: false, error: 'Cache TTL must be a number between 1 and 720 hours' };
          }
        }

        // Validate conflicting cache flags
        if (args[TERMINOLOGY.OPTION.NO_CACHE] && args[TERMINOLOGY.OPTION.CACHE_TTL]) {
          return { isValid: false, error: 'cannot use both --no-cache and --cache-ttl' };
        }

        break;

      case TERMINOLOGY.COMMAND.VALIDATE:
        // Validate path is provided
        if (!args.path) {
          return { isValid: false, error: 'Template path is required' };
        }
        break;

      case TERMINOLOGY.COMMAND.LIST:
        // Validate branch if provided
        if (args[TERMINOLOGY.OPTION.BRANCH]) {
          // Basic branch name validation
          if (typeof args[TERMINOLOGY.OPTION.BRANCH] !== 'string' || !args[TERMINOLOGY.OPTION.BRANCH].trim()) {
            return { isValid: false, error: 'Branch name must be a non-empty string' };
          }
        }
        break;
    }

    return { isValid: true };
  }

  /**
   * Show help information
   */
  showHelp() {
    console.log('🔧 create-scaffold - Project scaffolding tool');
    console.log('');
    console.log('USAGE:');
    console.log('  create-scaffold <command> [options]');
    console.log('');
    console.log('COMMANDS:');
    console.log(`  ${TERMINOLOGY.COMMAND.NEW} <project-dir>    Create a new project from a template`);
    console.log(`  ${TERMINOLOGY.COMMAND.LIST}                 List available templates and registries`);
    console.log(`  ${TERMINOLOGY.COMMAND.VALIDATE} <path>      Validate a template directory`);
    console.log('');
    console.log('OPTIONS:');
    console.log('  --help, -h              Show help information');
    console.log('  --version               Show version information');
    console.log('');
    console.log('EXAMPLES:');
    console.log('  create-scaffold new my-project --template react-app');
    console.log('  create-scaffold list --registry official');
    console.log('  create-scaffold validate ./my-template');
    console.log('');
    console.log('For help with a specific command, use:');
    console.log('  create-scaffold <command> --help');
  }

  /**
   * Get list of available commands
   * @returns {string[]} Array of command names
   */
  getAvailableCommands() {
    return Object.keys(this.commands);
  }
}

/**
 * Execute command routing
 * @param {string[]} args - Raw command line arguments
 * @param {object} parsedArgs - Parsed arguments object
 * @returns {Promise<number>} Exit code
 */
export async function routeCommand(command, positionalArgs, parsedArgs) {
  const router = new CommandRouter();
  return await router.route(command, positionalArgs, parsedArgs);
}
