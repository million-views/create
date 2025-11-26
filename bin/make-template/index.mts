#!/usr/bin/env node
// @ts-nocheck
import { Router } from '@m5nv/create-scaffold/lib/cli/router.mts';
import { ConvertCommand } from './commands/convert/index.mts';
import { RestoreCommand } from './commands/restore/index.mts';
import { InitCommand } from './commands/init/index.mts';
import { ValidateCommand } from './commands/validate/index.mts';
import { HintsCommand } from './commands/hints/index.mts';
import { TestCommand } from './commands/test/index.mts';
import { ConfigValidateCommand } from './commands/config/validate/index.mts';

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
      'config validate'
    ];
  }
}

const router = new MakeTemplateRouter();
const args = process.argv.slice(2);
await router.route(args);
