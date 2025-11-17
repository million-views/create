export class Router {
  constructor() {
    this.commands = {};
    this.globalOptions = [
      { short: '-h', long: '--help', desc: 'Print help' },
      { short: '-v', long: '--version', desc: 'Show version information' },
      { long: '--verbose', desc: 'Enable verbose output' },
      { long: '--json', desc: 'Output results in JSON format' }
    ];
  }

  async route(args) {
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

  showGeneralHelp() {
    console.log(`${this.description}\n`);
    console.log(`USAGE:`);
    console.log(`  ${this.toolName} <command> [options]\n`);

    console.log(`COMMANDS:`);
    Object.entries(this.commands).forEach(([name, cmd]) => {
      console.log(`  ${name.padEnd(15)} ${cmd.help.description}`);
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

    console.log(`See '${this.toolName} help <command>' for more information on a specific command.`);
  }
}
