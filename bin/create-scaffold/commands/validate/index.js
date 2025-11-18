import { Command } from '../../../../lib/cli/command.js';
import { validateHelp } from './help.js';
import { TemplateValidator } from '../../../../lib/validation/template-validator.mjs';
import fs from 'fs';
import path from 'path';

export class ValidateCommand extends Command {
  constructor() {
    super(validateHelp);
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
    if (!parsed.templatePath) {
      if (parsed.json) {
        console.log(JSON.stringify({
          status: 'fail',
          results: [{ type: 'error', message: 'Template path is required' }]
        }, null, 2));
      } else {
        console.error('❌ Template path is required. Use: create-scaffold validate <template-path>');
        console.log('\n💡 Suggestions:');
        console.log('   • Check that the template path exists and is accessible');
        console.log('   • Ensure template.json is valid JSON');
        console.log('   • Use --verbose for detailed validation output');
        this.showHelp();
      }
      process.exit(1);
    }

    // Handle file/directory validation
    const validationResult = this.validateTemplatePath(parsed.templatePath);
    if (!validationResult.valid) {
      if (parsed.json) {
        console.log(JSON.stringify({
          status: 'fail',
          results: validationResult.errors.map(error => ({ type: 'error', message: error }))
        }, null, 2));
      } else {
        console.error('❌ Validation failed:');
        validationResult.errors.forEach(error => console.error(`  • ${error}`));
      }
      process.exit(1);
    }

    const validator = new TemplateValidator();
    const result = await validator.validate(validationResult.templatePath, 'strict', {
      mode: 'consumption',
      output: 'console',
      json: parsed.json,
      suggest: parsed.suggest
    });

    if (!result.valid) {
      process.exit(1);
    }
  }

  validateTemplatePath(templatePath) {
    try {
      const stats = fs.statSync(templatePath);

      if (stats.isDirectory()) {
        return this.validateDirectory(templatePath);
      } else if (stats.isFile() && path.basename(templatePath) === 'template.json') {
        return { valid: true, templatePath };
      } else {
        return {
          valid: false,
          errors: [`Invalid template path: ${templatePath}. Expected a directory or template.json file`]
        };
      }
    } catch (error) {
      return {
        valid: false,
        errors: [`Cannot access template path: ${templatePath} - ${error.message}`]
      };
    }
  }

  validateDirectory(dirPath) {
    const templateJsonPath = path.join(dirPath, 'template.json');
    const readmePath = path.join(dirPath, 'README.md');

    if (!fs.existsSync(templateJsonPath)) {
      return {
        valid: false,
        errors: [`template.json not found in ${dirPath}`]
      };
    }

    // Check for README.md
    if (!fs.existsSync(readmePath)) {
      return {
        valid: false,
        errors: ['Missing required file: README.md']
      };
    }

    return { valid: true, templatePath: templateJsonPath };
  }
}

// Direct execution support
if (import.meta.url === `file://${process.argv[1]}`) {
  const cmd = new ValidateCommand();
  const args = process.argv.slice(2);
  cmd.execute(args);
}
