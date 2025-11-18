import { Command } from '../../../../lib/cli/command.js';
import { convertHelp } from './help.js';
import { Converter } from './converter.js';
import { validateProjectPath } from './validator.js';

export class ConvertCommand extends Command {
  constructor() {
    super(convertHelp);
  }

  parseArg(arg, args, i, parsed) {
    if (arg === '--dry-run' || arg === '-d') {
      parsed.dryRun = true;
      return i;
    } else if (arg === '--yes') {
      parsed.yes = true;
      return i;
    } else if (arg === '--silent') {
      parsed.silent = true;
      return i;
    } else if (arg === '--type') {
      parsed.type = args[i + 1];
      return i + 1;
    } else if (arg === '--placeholder-format') {
      parsed.placeholderFormat = args[i + 1];
      return i + 1;
    } else if (arg === '--sanitize-undo') {
      parsed.sanitizeUndo = true;
      return i;
    } else if (arg === '--config') {
      parsed.config = args[i + 1];
      return i + 1;
    } else if (!arg.startsWith('-')) {
      if (!parsed.projectPath) {
        parsed.projectPath = arg;
      }
      return i;
    }
  }

  async run(parsed) {
    if (!parsed.projectPath) {
      console.error('Error: <project-path> is required');
      console.error('\n⚠️  Always specify the project path explicitly to avoid accidental conversion');
      this.showHelp();
      process.exit(1);
    }

    const validation = validateProjectPath(parsed.projectPath);
    if (!validation.valid) {
      console.error(`❌ ${validation.error}`);
      process.exit(1);
    }

    const converter = new Converter(parsed);
    await converter.convert();
  }
}

// Direct execution support
if (import.meta.url === `file://${process.argv[1]}`) {
  const cmd = new ConvertCommand();
  const args = process.argv.slice(2);
  cmd.execute(args);
}
