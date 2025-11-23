import { Command } from '../../../../lib/cli/command.js';
import { validateHelp } from './help.js';
import { TemplateValidator } from '../../../../lib/validation/template-validator.mjs';
import { SecurityGate, SecurityGateError } from '../../../../lib/security-gate.mjs';
import { BoundaryValidator } from '../../../../lib/boundary-validator.mjs';
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
    } else if (arg === '--fix') {
      parsed.fix = true;
      return i;
    } else if (arg === '--json') {
      parsed.json = true;
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
        const errorMsg = `Cannot access template path: ${validated.templatePath}`;
        if (validated.json) {
          console.log(JSON.stringify({
            status: 'fail',
            results: [{ type: 'error', message: errorMsg }]
          }, null, 2));
        } else {
          console.error(`❌ ${errorMsg}`);
        }
        process.exit(1);
      }

      let templatePath;
      if (stats.isDirectory()) {
        templatePath = resolvedPath;
      } else if (stats.isFile() && basename(resolvedPath) === 'template.json') {
        templatePath = resolvedPath;
      } else {
        const errorMsg = `Invalid template path. Expected a directory or template.json file`;
        if (validated.json) {
          console.log(JSON.stringify({
            status: 'fail',
            results: [{ type: 'error', message: errorMsg }]
          }, null, 2));
        } else {
          console.error(`❌ ${errorMsg}`);
        }
        process.exit(1);
      }

      const validator = new TemplateValidator();
      const result = await validator.validate(templatePath, 'strict', {
        mode: 'consumption',
        output: 'console',
        json: validated.json,
        suggest: validated.suggest
      });

      if (!result.valid) {
        process.exit(1);
      }

    } catch (error) {
      if (error instanceof SecurityGateError) {
        if (parsed.json) {
          console.log(JSON.stringify({
            status: 'fail',
            results: [{ type: 'error', message: error.message }]
          }, null, 2));
        } else {
          console.error('❌ Security validation failed:');
          if (error.validationErrors) {
            error.validationErrors.forEach(err => console.error(`  • ${err}`));
          } else {
            console.error(`  • ${error.message}`);
          }
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
