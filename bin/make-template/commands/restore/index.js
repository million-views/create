import { Command } from '../../../../lib/cli/command.js';
import { restoreHelp } from './help.js';
import { Restorer } from './restorer.js';

export class RestoreCommand extends Command {
  constructor() {
    super(restoreHelp);
  }

  parseArg(arg, args, i, parsed) {
    if (arg === '--dry-run' || arg === '-d') {
      parsed.dryRun = true;
      return i;
    } else if (arg === '--yes') {
      parsed.yes = true;
      return i;
    } else if (arg === '--restore-files') {
      parsed.files = args[i + 1].split(',');
      return i + 1;
    } else if (arg === '--placeholders-only') {
      parsed.placeholdersOnly = true;
      return i;
    } else if (arg === '--generate-defaults') {
      parsed.generateDefaults = true;
      return i;
    } else if (arg === '--keep-undo') {
      parsed.keepUndo = true;
      return i;
    } else if (!arg.startsWith('-')) {
      if (!parsed.projectPath) {
        parsed.projectPath = arg;
      }
      return i;
    }
  }

  async run(parsed) {
    // Default to current directory if no project path specified
    if (!parsed.projectPath) {
      parsed.projectPath = '.';
    }

    const restorer = new Restorer(parsed);
    await restorer.restore();
  }
}

// Direct execution support
if (import.meta.url === `file://${process.argv[1]}`) {
  const cmd = new RestoreCommand();
  const args = process.argv.slice(2);
  cmd.execute(args);
}
