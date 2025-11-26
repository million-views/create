import type { Command } from './command.mts';

interface GlobalOption {
  short?: string;
  long: string;
  desc: string;
}

export class Router {
  commands: Record<string, Command> = {};
  subcommands: Record<string, Record<string, Command>> = {};
  globalOptions: GlobalOption[] = [
    { short: '-h', long: '--help', desc: 'Print help' },
    { short: '-v', long: '--version', desc: 'Show version information' },
    { long: '--verbose', desc: 'Enable verbose output' }
  ];
  toolName: string = '';
  version: string = '';
  description: string = '';
  examples: string[] = [];

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
    const subcommandName = args[1];
    let commandArgs = args.slice(1);

    // Check for subcommands first (command subcommand ...)
    if (subcommandName && this.subcommands[commandName] && this.subcommands[commandName][subcommandName]) {
      commandArgs = args.slice(2); // Skip both command and subcommand
      const command = this.subcommands[commandName][subcommandName];
      await command.execute(commandArgs);
      return;
    }

    // Check for help on subcommands
    if (commandName === 'help' && subcommandName) {
      const helpTarget = args[2];
      if (helpTarget && this.subcommands[subcommandName] && this.subcommands[subcommandName][helpTarget]) {
        this.subcommands[subcommandName][helpTarget].showDetailedHelp();
        return;
      }
    }

    // Fall back to regular commands
    if (commandName === 'help') {
      const targetCommand = commandArgs[0];
      if (targetCommand && this.commands[targetCommand]) {
        this.commands[targetCommand].showDetailedHelp();
      } else {
        this.showGeneralHelp();
      }
      return;
    }

    const command = this.commands[commandName];

    if (!command) {
      console.error(`Error: Unknown command '${commandName}'`);
      console.log(`\nRun '${this.toolName} --help' for usage.`);
      process.exit(1);
    }

    await command.execute(commandArgs);
  }

  showGeneralHelp(): void {
    console.log(`${this.description}\n`);
    console.log(`USAGE:`);
    console.log(`  ${this.toolName} <command> [options]`);
    console.log(`  ${this.toolName} <command> <subcommand> [options]\n`);

    console.log(`COMMANDS:`);
    Object.entries(this.commands).forEach(([name, cmd]) => {
      console.log(`  ${name.padEnd(15)} ${cmd.help.description}`);
    });

    // Show subcommands
    if (Object.keys(this.subcommands).length > 0) {
      console.log();
      console.log(`SUBCOMMANDS:`);
      Object.entries(this.subcommands).forEach(([cmd, subcmds]) => {
        Object.entries(subcmds).forEach(([subcmd, subcmdInstance]) => {
          console.log(`  ${cmd} ${subcmd}`.padEnd(15) + ` ${subcmdInstance.help.description}`);
        });
      });
    }
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

    console.log(`See '${this.toolName} help <command>' for more information on a specific command.`);
  }
}
