#!/usr/bin/env node
import { Router } from '../../lib/cli/router.js';
import { ConvertCommand } from './commands/convert/index.js';
import { RestoreCommand } from './commands/restore/index.js';
import { InitCommand } from './commands/init/index.js';
import { ValidateCommand } from './commands/validate/index.js';
import { HintsCommand } from './commands/hints/index.js';
import { TestCommand } from './commands/test/index.js';
import { ConfigInitCommand } from './commands/config/init/index.js';
import { ConfigValidateCommand } from './commands/config/validate/index.js';

class MakeTemplateRouter extends Router {
  constructor() {
    super();
    this.toolName = '@m5nv/make-template';
    this.description = 'Convert existing Node.js projects into reusable templates';
    this.commands = {
      convert: new ConvertCommand(),
      restore: new RestoreCommand(),
      init: new InitCommand(),
      validate: new ValidateCommand(),
      hints: new HintsCommand(),
      test: new TestCommand()
    };
    this.subcommands = {
      config: {
        init: new ConfigInitCommand(),
        validate: new ConfigValidateCommand()
      }
    };
    this.version = '1.0.0';
    this.examples = [
      'convert ./my-project',
      'restore ./my-template',
      'init',
      'validate',
      'hints',
      'test ./my-template',
      'config init',
      'config validate'
    ];
  }
}

const router = new MakeTemplateRouter();
const args = process.argv.slice(2);
await router.route(args);
