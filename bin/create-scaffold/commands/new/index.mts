// @ts-nocheck
import { Command } from '@m5nv/create-scaffold/lib/cli/command.mts';
import { newHelp } from './help.mts';
import { Scaffolder } from './scaffolder.mts';
import { SecurityGate } from '@m5nv/create-scaffold/lib/security/index.mts';
import { GateError as SecurityGateError } from '@m5nv/create-scaffold/lib/error/index.mts';

export class NewCommand extends Command {
  #securityGate;

  constructor() {
    super(newHelp);
    this.#securityGate = new SecurityGate();
  }

  parseArg(arg, args, i, parsed) {
    if (arg === '--template' || arg === '-T') {
      parsed.template = args[i + 1];
      return i + 1;
    } else if (arg === '--no-cache') {
      parsed.cache = false;
      return i;
    } else if (arg === '--cache-ttl') {
      parsed.cacheTtl = args[i + 1]; // SecurityGate will validate
      return i + 1;
    } else if (arg === '--placeholder') {
      if (!parsed.placeholders) parsed.placeholders = [];
      parsed.placeholders.push(args[i + 1]);
      return i + 1;
    } else if (arg === '--selection') {
      parsed.selection = args[i + 1];
      return i + 1;
    } else if (arg === '--yes') {
      parsed.inputPrompts = false;
      return i;
    } else if (arg === '--no-config') {
      parsed.config = false;
      return i;
    } else if (arg === '--dry-run' || arg === '-d') {
      parsed.dryRun = true;
      return i;
    } else if (arg === '--log-file') {
      parsed.logFile = args[i + 1];
      return i;
    } else if (!arg.startsWith('-')) {
      // First positional argument is project name
      if (!parsed.projectName) {
        parsed.projectName = arg;
      }
      return i;
    }
    // Unknown option - let base class handle error
    return undefined;
  }

  async run(parsed) {
    try {
      // Security Gate enforces ALL validation - architectural boundary (Layer 1)
      // No manual validation, no bypass paths
      // Note: template is optional (guided mode), only projectName required
      const validated = await this.#securityGate.enforce(parsed, {
        command: 'new',
        requiredFields: ['projectName'],
        timestamp: Date.now()
      });

      // Additional business logic validation
      if (validated.cache === false && validated.cacheTtl !== undefined) {
        console.error('❌ Cannot use both --no-cache and --cache-ttl');
        this.showHelp();
        process.exit(1);
      }

      // All validation complete - proceed with business logic
      const scaffolder = new Scaffolder(validated);
      const result = await scaffolder.scaffold();

      if (!result.success) {
        console.error(`❌ Failed to create project: ${result.error || 'Unknown error'}`);
        process.exit(1);
      }

      if (result.dryRun) {
        console.log('✅ Dry run completed successfully');
      } else {
        console.log('✅ Project created successfully');
      }

    } catch (error) {
      if (error instanceof SecurityGateError) {
        // User-friendly error messages for common issues
        if (error.message.includes('Missing required fields: projectName')) {
          console.error('❌ <project-name> is required');
          console.error('\nUsage: new <project-name> [options]');
          this.showHelp();
          process.exit(1);
        }

        console.error('❌ Security validation failed:');
        if (error.validationErrors) {
          error.validationErrors.forEach(err => console.error(`  • ${err}`));
        } else {
          console.error(`  • ${error.message}`);
        }
        console.error('\n⚠️  Ensure all inputs are valid and safe');
        this.showHelp();
        process.exit(1);
      }

      // Re-throw unexpected errors
      throw error;
    }
  }
}

// Direct execution support
if (import.meta.url === `file://${process.argv[1]}`) {
  const cmd = new NewCommand();
  const args = process.argv.slice(2);
  cmd.execute(args);
}
