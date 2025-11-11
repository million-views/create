#!/usr/bin/env node

import { TERMINOLOGY } from '../../../lib/shared/ontology.mjs';

/**
 * Command router for make-template CLI
 * Routes to appropriate command handlers based on the first argument
 */
export class CommandRouter {
  constructor() {
    this.commands = {
      [TERMINOLOGY.COMMAND.CONVERT]: () => import('./commands/convert.mjs'),
      [TERMINOLOGY.COMMAND.RESTORE]: () => import('./commands/restore.mjs'),
      [TERMINOLOGY.COMMAND.INIT]: () => import('./commands/init.mjs'),
      [TERMINOLOGY.COMMAND.VALIDATE]: () => import('./commands/validate.mjs'),
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
    console.log('🔧 make-template - Convert projects to reusable templates');
    console.log('');
    console.log('USAGE:');
    console.log('  make-template <command> [options]');
    console.log('');
    console.log('COMMANDS:');
    console.log(`  ${TERMINOLOGY.COMMAND.CONVERT}          Convert project to template`);
    console.log(`  ${TERMINOLOGY.COMMAND.RESTORE}          Restore template to project`);
    console.log(`  ${TERMINOLOGY.COMMAND.INIT}             Generate skeleton template.json`);
    console.log(`  ${TERMINOLOGY.COMMAND.VALIDATE}         Validate template.json`);
    console.log(`  ${TERMINOLOGY.COMMAND.HINTS}            Show hints catalog`);
    console.log('');
    console.log('OPTIONS:');
    console.log('  --help, -h              Show help information');
    console.log('  --version               Show version information');
    console.log('');
    console.log('LEGACY USAGE:');
    console.log('  make-template [options]  Convert project (default command)');
    console.log('  make-template --restore  Restore template');
    console.log('  make-template --init     Generate skeleton');
    console.log('  make-template --lint     Validate template');
    console.log('  make-template --hints    Show hints');
    console.log('');
    console.log('EXAMPLES:');
    console.log('  make-template convert --dry-run');
    console.log('  make-template restore --yes');
    console.log('  make-template init');
    console.log('  make-template validate');
    console.log('  make-template hints');
    console.log('');
    console.log('For help with a specific command, use:');
    console.log('  make-template <command> --help');
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
