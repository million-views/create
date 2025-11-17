export class Command {
  constructor(help) {
    this.help = help;
  }

  showHelp() {
    console.log(`${this.help.description}\n`);
    console.log(`USAGE: ${this.help.usage}\n`);

    if (this.help.options && this.help.options.length > 0) {
      console.log('Options:');
      this.help.options.forEach(opt => {
        const flags = this.formatFlags(opt);
        console.log(`  ${flags.padEnd(30)} ${opt.desc}`);
      });
      console.log();
    }

    if (this.help.optionGroups && this.help.optionGroups.length > 0) {
      this.help.optionGroups.forEach(group => {
        console.log(`${group.title}:`);
        group.options.forEach(opt => {
          const flags = this.formatFlags(opt);
          console.log(`  ${flags.padEnd(30)} ${opt.desc}`);
        });
        console.log();
      });
    }

    if (this.help.examples && this.help.examples.length > 0) {
      console.log('Examples:');
      this.help.examples.forEach(ex => {
        console.log(`  ${ex.cmd}`);
        if (ex.desc) console.log(`      ${ex.desc}`);
      });
      console.log();
    }

    console.log(`Run 'help ${this.help.name}' for more detailed information.`);
  }

  showDetailedHelp() {
    console.log(`NAME`);
    console.log(`    ${this.help.name} - ${this.help.description}\n`);

    console.log(`SYNOPSIS`);
    console.log(`    ${this.help.usage}\n`);

    if (this.help.detailedDescription) {
      console.log(`DESCRIPTION`);
      this.help.detailedDescription.forEach(para => {
        console.log(`    ${para}\n`);
      });
    }

    console.log(`OPTIONS`);

    if (this.help.options && this.help.options.length > 0) {
      this.help.options.forEach(opt => {
        const flags = this.formatFlags(opt);
        console.log(`    ${flags}`);
        console.log(`        ${opt.desc}`);
        if (opt.detailed) {
          console.log(`        ${opt.detailed}`);
        }
        console.log();
      });
    }

    if (this.help.optionGroups && this.help.optionGroups.length > 0) {
      this.help.optionGroups.forEach(group => {
        console.log(`  ${group.title}`);
        group.options.forEach(opt => {
          const flags = this.formatFlags(opt);
          console.log(`    ${flags}`);
          console.log(`        ${opt.desc}`);
          if (opt.detailed) {
            opt.detailed.forEach(line => {
              console.log(`        ${line}`);
            });
          }
          console.log();
        });
      });
    }

    if (this.help.examples && this.help.examples.length > 0) {
      console.log(`EXAMPLES`);
      this.help.examples.forEach(ex => {
        console.log(`    ${ex.cmd}`);
        if (ex.desc) console.log(`        ${ex.desc}\n`);
      });
    }
  }

  formatFlags(opt) {
    return `${opt.short ? opt.short + ', ' : ''}${opt.long}${opt.value ? ' ' + opt.value : ''}`;
  }

  parseArgs(args) {
    const parsed = {};

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg === '--help' || arg === '-h') {
        parsed.help = true;
        return parsed;
      }

      const skip = this.parseArg(arg, args, i, parsed);
      if (skip !== undefined) i = skip;
    }

    return parsed;
  }

  async execute(args) {
    const parsed = this.parseArgs(args);

    if (parsed.help) {
      this.showHelp();
      return;
    }

    return await this.run(parsed);
  }

  parseArg(_arg, _args, _index, _parsed) {
    throw new Error('parseArg must be implemented by subclass');
  }

  run(_parsed) {
    throw new Error('run must be implemented by subclass');
  }
}
