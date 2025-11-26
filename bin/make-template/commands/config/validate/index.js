import { Command } from '@m5nv/create-scaffold/lib/cli/command.js';
import { configValidateHelp } from './help.js';
import { loadConfigFromFile } from '@m5nv/create-scaffold/lib/templatize/index.mts';

export class ConfigValidateCommand extends Command {
  constructor() {
    super(configValidateHelp);
  }

  parseArg(arg, args, i, parsed) {
    // Handle positional argument for config file
    if (!arg.startsWith('-') && !parsed.configFile) {
      parsed.configFile = arg;
    }
  }

  run(parsed) {
    // Use positional argument as config file, default to .templatize.json
    const configPath = parsed.configFile || '.templatize.json';

    console.log(`Validating .templatize.json configuration file...`);
    try {
      loadConfigFromFile(configPath);
      console.log('✓ Configuration file is valid');
    } catch (error) {
      console.error(`❌ Configuration validation failed: ${error.message}`);
      process.exit(1);
    }
  }
}
