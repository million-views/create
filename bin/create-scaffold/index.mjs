#!/usr/bin/env node
import { Router } from '../../lib/cli/router.js';
import { NewCommand } from './commands/new/index.js';
import { ListCommand } from './commands/list/index.js';
import { ValidateCommand } from './commands/validate/index.js';

class CreateScaffoldRouter extends Router {
  constructor() {
    super();
    this.toolName = '@m5nv/create-scaffold';
    this.description = 'Project scaffolding tool';
    this.commands = {
      new: new NewCommand(),
      list: new ListCommand(),
      validate: new ValidateCommand()
    };
    this.version = '1.0.0';
    this.examples = [
      'new my-project --template react-app',
      'list --registry official',
      'validate ./my-template',
      'npm create @m5nv/scaffold my-project --template react-app',
      'npx @m5nv/create-scaffold new my-project --template react-app'
    ];
  }
}

const router = new CreateScaffoldRouter();
const args = process.argv.slice(2);
await router.route(args);
