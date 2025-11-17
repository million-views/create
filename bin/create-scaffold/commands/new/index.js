import { Command } from '../../../../lib/cli/command.js';
import { newHelp } from './help.js';
import { Scaffolder } from './scaffolder.js';
import { validateProjectName } from './validator.js';

export class NewCommand extends Command {
  constructor() {
    super(newHelp);
  }

  parseArg(arg, args, i, parsed) {
    if (arg === '--template' || arg === '-T') {
      parsed.template = args[i + 1];
      return i + 1;
    } else if (arg === '--branch' || arg === '-b') {
      parsed.branch = args[i + 1];
      return i + 1;
    } else if (arg === '--no-cache') {
      parsed.cache = false;
    } else if (arg === '--cache-ttl') {
      const ttlValue = parseInt(args[i + 1]);
      if (isNaN(ttlValue) || ttlValue <= 0) {
        console.error(`❌ Invalid cache TTL value: ${args[i + 1]}. Must be a positive integer.`);
        process.exit(1);
      }
      parsed.cacheTtl = ttlValue;
      return i + 1;
    } else if (arg === '--placeholder') {
      if (!parsed.placeholders) parsed.placeholders = [];
      parsed.placeholders.push(args[i + 1]);
      return i + 1;
    } else if (arg === '--experimental-placeholder-prompts') {
      parsed.experimentalPlaceholderPrompts = true;
    } else if (arg === '--no-input-prompts') {
      parsed.inputPrompts = false;
    } else if (arg === '--no-config') {
      parsed.config = false;
    } else if (arg === '--options') {
      parsed.optionsFile = args[i + 1];
      return i + 1;
    } else if (arg === '--dry-run' || arg === '-d') {
      parsed.dryRun = true;
    } else if (arg === '--log-file') {
      parsed.logFile = args[i + 1];
      return i + 1;
    } else if (!arg.startsWith('-')) {
      // First positional argument is project name
      if (!parsed.projectName) {
        parsed.projectName = arg;
      }
    }
  }

  async run(parsed) {
    const errors = [];

    // Validate required argument
    if (!parsed.projectName) {
      errors.push('<project-name> is required');
    }

    // Validate required option
    if (!parsed.template) {
      errors.push('--template flag is required');
    }

    // Validate project name
    if (parsed.projectName) {
      const projectValidation = validateProjectName(parsed.projectName);
      if (!projectValidation.valid) {
        errors.push(projectValidation.error);
      }
    }

    // Validate template
    if (parsed.template) {
      try {
        // For validation purposes, allow absolute paths if they exist
        if (parsed.template.startsWith('/') || parsed.template.startsWith('\\')) {
          // Check if it's an existing directory
          const fs = await import('fs/promises');
          try {
            const stat = await fs.stat(parsed.template);
            if (!stat.isDirectory()) {
              errors.push('Template path must be a directory');
            }
          } catch (_error) {
            errors.push('Template not accessible');
          }
        } else {
          // Only validate for obvious security issues, not for existence
          if (parsed.template.includes('\0')) {
            errors.push('Template name contains invalid characters');
          } else if (parsed.template.includes(';') || parsed.template.includes('|') || parsed.template.includes('&') ||
                     parsed.template.includes('`') || parsed.template.includes('$(') || parsed.template.includes('${')) {
            errors.push('Template name contains invalid characters');
          } else if (parsed.template.includes(' ')) {
            errors.push('Template name contains invalid characters');
          }
          // Allow other template names to be validated later by the Scaffolder
        }
      } catch (error) {
        errors.push(`Invalid template: ${error.message}`);
      }
    }

    // Validate branch name for security
    if (parsed.branch) {
      if (parsed.branch.includes('\0')) {
        errors.push('Branch name contains invalid characters');
      } else if (parsed.branch.includes(';') || parsed.branch.includes('|') || parsed.branch.includes('&') ||
                 parsed.branch.includes('`') || parsed.branch.includes('$(') || parsed.branch.includes('${')) {
        errors.push('Branch name contains invalid characters');
      }
    }

    // Validate cache flags don't conflict
    if (parsed.cache === false && parsed.cacheTtl !== undefined) {
      errors.push('Cannot use both --no-cache and --cache-ttl');
    }

    if (errors.length > 0) {
      console.error('❌ Validation failed:');
      errors.forEach(error => console.error(`  • ${error}`));
      console.error(
        '\n⚠️  Always specify valid project name and template to avoid errors'
      );
      this.showHelp();
      process.exit(1);
    }

    // Execute scaffolding
    const scaffolder = new Scaffolder(parsed);
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
  }
}

// Direct execution support
if (import.meta.url === `file://${process.argv[1]}`) {
  const cmd = new NewCommand();
  const args = process.argv.slice(2);
  cmd.execute(args);
}
