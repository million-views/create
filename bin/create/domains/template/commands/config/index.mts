// @ts-nocheck
import { Router } from '@m5nv/create/lib/cli/router.mts';
import { ConfigValidateCommand } from './validate/index.mts';

export class ConfigRouter extends Router {
  constructor() {
    super();
    this.toolName = 'config';
    this.description = 'Manage template configuration';
    this.commands = {
      validate: new ConfigValidateCommand()
    };
    this.examples = [
      'validate',
      'validate .templatize.json'
    ];
  }
}
