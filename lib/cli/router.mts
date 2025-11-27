import type { Command } from './command.mts';

interface GlobalOption {
  short?: string;
  long: string;
  desc: string;
}

/**
 * Routable interface - both Command and Router implement execute()
 */
interface Routable {
  execute(args: string[]): Promise<unknown>;
  showDetailedHelp(): void;
  help?: { description: string };
  description?: string;
}

export class Router {
  commands: Record<string, Routable> = {};
  globalOptions: GlobalOption[] = [
    { short: '-h', long: '--help', desc: 'Print help' },
    { short: '-v', long: '--version', desc: 'Show version information' },
    { long: '--verbose', desc: 'Enable verbose output' }
  ];
  toolName: string = '';
  version: string = '';
  description: string = '';
  examples: string[] = [];
  
  // Configurable terminology for help display
  commandsLabel: string = 'COMMANDS';
  commandsItemLabel: string = 'command';

  /**
   * Uniform interface - enables Router to be used as a command
   */
  async execute(args: string[]): Promise<void> {
    return this.route(args);
  }

  /**
   * Show detailed help (for when this Router is used as a nested command)
   */
  showDetailedHelp(): void {
    this.showGeneralHelp();
  }

  async route(args: string[]): Promise<void> {
    if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
      this.showGeneralHelp();
      return;
    }

    if (args[0] === '--version' || args[0] === '-v') {
      console.log(`${this.toolName} ${this.version}`);
      return;
    }

    const commandName = args[0];
    const commandArgs = args.slice(1);

    // Handle 'help <target>' pattern
    if (commandName === 'help') {
      this.handleHelpCommand(commandArgs);
      return;
    }

    const command = this.commands[commandName];

    if (!command) {
      console.error(`Error: Unknown command '${commandName}'`);
      console.log(`\nRun '${this.toolName} --help' for usage.`);
      process.exit(1);
    }

    // Uniform interface - works for Command or nested Router
    await command.execute(commandArgs);
  }

  /**
   * Handle 'help <command> [subcommand]' pattern
   */
  handleHelpCommand(args: string[]): void {
    if (args.length === 0) {
      this.showGeneralHelp();
      return;
    }

    const target = this.commands[args[0]];
    if (!target) {
      this.showGeneralHelp();
      return;
    }

    // If target is a Router and there's a subcommand, delegate
    if (args.length > 1 && 'commands' in target) {
      const subRouter = target as Router;
      const subTarget = subRouter.commands[args[1]];
      if (subTarget) {
        subTarget.showDetailedHelp();
        return;
      }
    }

    target.showDetailedHelp();
  }

  showGeneralHelp(): void {
    console.log(`${this.description}\n`);
    console.log(`USAGE:`);
    console.log(`  ${this.toolName} <${this.commandsItemLabel}> [options]`);
    console.log(`  ${this.toolName} <${this.commandsItemLabel}> <subcommand> [options]\n`);

    console.log(`${this.commandsLabel}:`);
    Object.entries(this.commands).forEach(([name, cmd]) => {
      // Handle both Command (has help.description) and Router (has description)
      const desc = cmd.help?.description || cmd.description || '';
      console.log(`  ${name.padEnd(15)} ${desc}`);
    });
    console.log();

    console.log(`GLOBAL OPTIONS:`);
    this.globalOptions.forEach(opt => {
      const flags = `${opt.short ? opt.short + ', ' : ''}${opt.long}`;
      console.log(`  ${flags.padEnd(20)} ${opt.desc}`);
    });
    console.log();

    if (this.examples && this.examples.length > 0) {
      console.log(`EXAMPLES:`);
      this.examples.forEach(ex => {
        // Don't prefix examples that start with npm or npx
        if (ex.startsWith('npm ') || ex.startsWith('npx ')) {
          console.log(`  ${ex}`);
        } else {
          console.log(`  ${this.toolName} ${ex}`);
        }
      });
      console.log();
    }

    console.log(`See '${this.toolName} help <${this.commandsItemLabel}>' for more information on a specific ${this.commandsItemLabel}.`);
  }
}
