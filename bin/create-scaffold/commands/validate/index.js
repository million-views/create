import { Command } from '@m5nv/create-scaffold/lib/cli/command.js';
import { validateHelp } from './help.js';
import { TemplateValidator } from '@m5nv/create-scaffold/lib/validation/template-validator.mjs';
import { SecurityGate, BoundaryValidator } from '@m5nv/create-scaffold/lib/security/index.mts';
import { GateError as SecurityGateError } from '@m5nv/create-scaffold/lib/error/index.mts';
import { stat } from 'fs/promises';
import { basename } from 'path';

export class ValidateCommand extends Command {
  #securityGate;

  constructor() {
    super(validateHelp);
    this.#securityGate = new SecurityGate();
  }

  parseArg(arg, args, i, parsed) {
    if (arg === '--suggest') {
      parsed.suggest = true;
      return i;
    } else if (!arg.startsWith('-')) {
      if (!parsed.templatePath) {
        parsed.templatePath = arg;
      }
      return i;
    }
  }

  async run(parsed) {
    try {
      const validated = await this.#securityGate.enforce(parsed, {
        command: 'validate',
        requiredFields: ['templatePath'],
        timestamp: Date.now()
      });

      const cwd = process.cwd();
      const boundaryValidator = new BoundaryValidator(cwd);
      const resolvedPath = boundaryValidator.validatePath(validated.templatePath, 'validate');

      let stats;
      try {
        stats = await stat(resolvedPath);
      } catch {
        console.error(`❌ Cannot access template path: ${validated.templatePath}`);
        process.exit(1);
      }

      let templatePath;
      if (stats.isDirectory()) {
        // For directory, append /template.json
        const { join } = await import('path');
        templatePath = join(resolvedPath, 'template.json');
      } else if (stats.isFile() && basename(resolvedPath) === 'template.json') {
        templatePath = resolvedPath;
      } else {
        console.error(`❌ Invalid template path. Expected a directory or template.json file`);
        process.exit(1);
      }

      const validator = new TemplateValidator();
      const result = await validator.validate(templatePath, 'strict', {
        mode: 'consumption',
        output: 'console',
        suggest: validated.suggest
      });

      if (!result.valid) {
        process.exit(1);
      }

    } catch (error) {
      if (error instanceof SecurityGateError) {
        console.error('❌ Security validation failed:');
        if (error.validationErrors) {
          error.validationErrors.forEach(err => console.error(`  • ${err}`));
        } else {
          console.error(`  • ${error.message}`);
        }
        process.exit(1);
      }

      throw error;
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const cmd = new ValidateCommand();
  const args = process.argv.slice(2);
  cmd.execute(args);
}
