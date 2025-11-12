#!/usr/bin/env node

import { TERMINOLOGY } from '../../../lib/shared/ontology.mjs';
import { Logger } from '../../../lib/shared/utils/logger.mjs';

/**
 * Command router for make-template CLI
 * Routes to appropriate command handlers based on the first argument
 */
export class CommandRouter {
  constructor() {
    this.logger = Logger.getInstance();
    this.commands = {
      [TERMINOLOGY.COMMAND.CONVERT]: () => import('./commands/convert.mjs'),
      [TERMINOLOGY.COMMAND.RESTORE]: () => import('./commands/restore.mjs'),
      [TERMINOLOGY.COMMAND.INIT]: () => import('./commands/init.mjs'),
      [TERMINOLOGY.COMMAND.VALIDATE]: () => import('./commands/validate.mjs'),
      [TERMINOLOGY.COMMAND.TEST]: () => import('./commands/test.mjs'),
      [TERMINOLOGY.COMMAND.HINTS]: () => import('./commands/hints.mjs')
    };
  }

  /**
   * Route to the appropriate command handler
   * @param {string[]} args - Command line arguments
   * @param {object} parsedArgs - Parsed arguments object
   * @returns {Promise<number>} Exit code
   */
  async route(args, parsedArgs) {
    // Get the command from the first positional argument
    const command = args[0];

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

    // Dynamically import and execute the command
    const commandModule = await this.commands[command]();
    const commandHandler = commandModule.main;
    return await commandHandler(parsedArgs);
  }

  /**
   * Show help information
   */
  showHelp() {
    this.logger.info('🔧 make-template - Convert projects to reusable templates');
    this.logger.info('');
    this.logger.info('USAGE:');
    this.logger.info('  make-template <command> [options]');
    this.logger.info('');
    this.logger.info('COMMANDS:');
    this.logger.info(`  ${TERMINOLOGY.COMMAND.CONVERT}          Convert project to template`);
    this.logger.info(`  ${TERMINOLOGY.COMMAND.RESTORE}          Restore template to project`);
    this.logger.info(`  ${TERMINOLOGY.COMMAND.INIT}             Generate skeleton template.json`);
    this.logger.info(`  ${TERMINOLOGY.COMMAND.VALIDATE}         Validate template.json`);
    this.logger.info(`  ${TERMINOLOGY.COMMAND.TEST}             Test template functionality`);
    this.logger.info(`  ${TERMINOLOGY.COMMAND.HINTS}            Show hints catalog`);
    this.logger.info('');
    this.logger.info('OPTIONS:');
    this.logger.info('  --help, -h              Show help information');
    this.logger.info('  --version               Show version information');
    this.logger.info('');
    this.logger.info('LEGACY USAGE:');
    this.logger.info('  make-template [options]  Convert project (default command)');
    this.logger.info('  make-template --restore  Restore template');
    this.logger.info('  make-template --init     Generate skeleton');
    this.logger.info('  make-template --lint     Validate template');
    this.logger.info('  make-template --hints    Show hints');
    this.logger.info('');
    this.logger.info('EXAMPLES:');
    this.logger.info('  make-template convert --dry-run');
    this.logger.info('  make-template restore --yes');
    this.logger.info('  make-template init');
    this.logger.info('  make-template validate');
    this.logger.info('  make-template test <template>');
    this.logger.info('  make-template hints');
    this.logger.info('');
    this.logger.info('For help with a specific command, use:');
    this.logger.info('  make-template <command> --help');
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
export async function routeCommand(args, parsedArgs) {
  const router = new CommandRouter();
  return await router.route(args, parsedArgs);
}
