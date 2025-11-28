// @ts-nocheck
import { Router } from '@m5nv/create/lib/cli/router.mts';
import { NewCommand } from './commands/new/index.mts';
import { ListCommand } from './commands/list/index.mts';
import { ValidateCommand } from './commands/validate/index.mts';

/**
 * ScaffoldRouter - Domain router for project scaffolding operations
 * 
 * DSL: Noun-first paradigm (operations are verbs acting on scaffold domain)
 * - `create scaffold new <name>` - create a new project
 * - `create scaffold list` - list available templates
 * - `create scaffold validate <path>` - validate a template
 */
export class ScaffoldRouter extends Router {
  constructor() {
    super();
    this.toolName = 'scaffold';
    this.description = 'Create projects from templates';
    
    // Operations terminology for nested router
    this.commandsLabel = 'OPERATIONS';
    this.commandsItemLabel = 'operation';
    
    this.commands = {
      new: new NewCommand(),
      list: new ListCommand(),
      validate: new ValidateCommand()
    };
    
    this.examples = [
      'new my-project --template react-app',
      'list --registry official',
      'validate ./my-template'
    ];
  }
}
