import { Command } from '../../../../../lib/cli/command.js';
import { configInitHelp } from './help.js';
import { generateConfigFile } from '../../../../../lib/templatize-config.mjs';

export class ConfigInitCommand extends Command {
  constructor() {
    super(configInitHelp);
  }

  parseArg(arg, args, i, parsed) {
    if (arg === '--file' || arg === '-f') {
      parsed.file = args[i + 1];
      return i + 1;
    }
  }

  run(_parsed) {
    console.log('Generating .templatize.json configuration file...');
    generateConfigFile(process.cwd());
    console.log('✓ Configuration file initialized. You can now run conversion.');
  }
}
