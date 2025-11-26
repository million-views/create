#!/usr/bin/env node
// @ts-nocheck
import { Router } from '@m5nv/create-scaffold/lib/cli/router.mts';
import { NewCommand } from './commands/new/index.mts';
import { ListCommand } from './commands/list/index.mts';
import { ValidateCommand } from './commands/validate/index.mts';

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
