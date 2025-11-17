import { Command } from '../../../../lib/cli/command.js';
import { validateHelp } from './help.js';
import { TemplateValidator } from './template-validator.js';

export class ValidateCommand extends Command {
  constructor() {
    super(validateHelp);
  }

  parseArg(arg, args, i, parsed) {
    if (arg === '--suggest') {
      parsed.suggest = true;
    } else if (arg === '--fix') {
      parsed.fix = true;
    } else if (arg === '--json') {
      parsed.json = true;
    } else if (!arg.startsWith('-')) {
      if (!parsed.templatePath) {
        parsed.templatePath = arg;
      }
    }
  }

  run(parsed) {
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

    const validator = new TemplateValidator(parsed);
    const result = validator.validate();

    if (!result.valid) {
      process.exit(1);
    }
  }
}

// Direct execution support
if (import.meta.url === `file://${process.argv[1]}`) {
  const cmd = new ValidateCommand();
  const args = process.argv.slice(2);
  cmd.execute(args);
}
