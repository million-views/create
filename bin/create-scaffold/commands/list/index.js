import { Command } from '../../../../lib/cli/command.js';
import { listHelp } from './help.js';
import { RegistryFetcher } from './registry-fetcher.js';

export class ListCommand extends Command {
  constructor() {
    super(listHelp);
  }

  parseArg(arg, args, i, parsed) {
    if (arg === '--registry') {
      parsed.registry = args[i + 1];
      return i + 1;
    } else if (arg === '--format') {
      parsed.format = args[i + 1];
      return i + 1;
    } else if (arg === '--verbose') {
      parsed.verbose = true;
      return i;
    } else if (arg === '--no-config') {
      parsed.config = false;
      return i;
    }
  }

  async run(parsed) {
    const fetcher = new RegistryFetcher(parsed);
    await fetcher.list();
  }
}

// Direct execution support
if (import.meta.url === `file://${process.argv[1]}`) {
  const cmd = new ListCommand();
  const args = process.argv.slice(2);
  cmd.execute(args);
}
