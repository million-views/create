// @ts-nocheck
import { Router } from '@m5nv/create/lib/cli/router.mts';
import { ConvertCommand } from './commands/convert/index.mts';
import { RestoreCommand } from './commands/restore/index.mts';
import { InitCommand } from './commands/init/index.mts';
import { ValidateCommand } from './commands/validate/index.mts';
import { HintsCommand } from './commands/hints/index.mts';
import { TestCommand } from './commands/test/index.mts';
import { ConfigRouter } from './commands/config/index.mts';

/**
 * TemplateRouter - Domain router for template authoring operations
 * 
 * DSL: Noun-first paradigm (operations are verbs acting on template domain)
 * - `create template init` - initialize template configuration
 * - `create template convert <path>` - convert project to template
 * - `create template config validate` - validate template configuration
 */
export class TemplateRouter extends Router {
  constructor() {
    super();
    this.toolName = 'template';
    this.description = 'Convert existing Node.js projects into reusable templates';
    
    // Operations terminology for nested router
    this.commandsLabel = 'OPERATIONS';
    this.commandsItemLabel = 'operation';
    
    this.commands = {
      convert: new ConvertCommand(),
      restore: new RestoreCommand(),
      init: new InitCommand(),
      validate: new ValidateCommand(),
      hints: new HintsCommand(),
      test: new TestCommand(),
      config: new ConfigRouter()
    };
    
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
