import { Command } from '../../../../lib/cli/command.js';
import { validateHelp } from './help.js';
import { TemplateValidator } from '../../../../lib/validation/template-validator.mjs';
import fs from 'fs/promises';

export class ValidateCommand extends Command {
  constructor() {
    super(validateHelp);
  }

  parseArg(arg, args, i, parsed) {
    if (arg === '--file' || arg === '-f') {
      parsed.file = args[i + 1];
      return i + 1;
    } else if (arg === '--suggest') {
      parsed.suggest = true;
      return i;
    } else if (!arg.startsWith('-')) {
      if (!parsed.file) {
        parsed.file = arg;
      }
    }
  }

  async run(parsed) {
    const filePath = parsed.file || 'template.json';
    const validator = new TemplateValidator();

    console.log(`🔍 Validating ${filePath}...`);

    try {
      await fs.access(filePath);
    } catch (error) {
      console.error(`❌ Template validation failed!`);
      console.error(`File not found: ${filePath}`);
      console.error(`Error: ${error.message}`);
      throw new Error(`File not found: ${filePath}`);
    }

    try {
      const result = await validator.validate(filePath, 'strict');

      console.log(`Schema validation: ${result.errors.length === 0 ? '✅ Passed' : '❌ Failed'}`);
      console.log(`Domain validation: ${result.errors.length === 0 ? '✅ Passed' : '❌ Failed'}`);

      console.log(`📋 Validation Summary:`);
      if (result.errors.length > 0) {
        console.error(`❌ Errors:`);
        result.errors.forEach(error => {
          console.error(`  • ${error.message}`);
        });
      } else {
        console.log(`✅ No errors found`);
      }

      if (result.warnings.length > 0) {
        console.log(`⚠️  Warnings:`);
        result.warnings.forEach(warning => {
          console.log(`  • ${warning.message}`);
        });
      }

      if (result.valid) {
        console.log(`✅ Template validation passed!`);
      } else {
        console.error(`❌ Template validation failed!`);
        throw new Error('Validation failed');
      }

    } catch (error) {
      if (error.message.includes('File not found')) {
        throw error;
      }
      if (error instanceof SyntaxError) {
        console.error(`❌ Template validation failed!`);
        console.error(`Invalid JSON format: ${error.message}`);
        throw error;
      }
      throw error;
    }
  }
}

// Direct execution support
if (import.meta.url === `file://${process.argv[1]}`) {
  const cmd = new ValidateCommand();
  const args = process.argv.slice(2);
  cmd.execute(args);
}
