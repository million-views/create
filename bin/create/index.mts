#!/usr/bin/env node
// @ts-nocheck
import { Router } from '@m5nv/create/lib/cli/router.mts';
import { ScaffoldRouter } from './domains/scaffold/index.mts';
import { TemplateRouter } from './domains/template/index.mts';

/**
 * CreateRouter - Unified CLI for project scaffolding and template authoring
 * 
 * DSL: Noun-first paradigm (domains are subjects, operations are verbs)
 * - `create scaffold new my-app` - scaffold domain, new operation
 * - `create template convert ./project` - template domain, convert operation
 */
class CreateRouter extends Router {
  constructor() {
    super();
    this.toolName = 'create';
    this.description = 'Project scaffolding and template authoring tool';
    
    // Noun-first DSL terminology
    this.commandsLabel = 'DOMAINS';
    this.commandsItemLabel = 'domain';
    
    this.commands = {
      scaffold: new ScaffoldRouter(),
      template: new TemplateRouter()
    };
    
    this.version = '1.0.0';
    this.examples = [
      'scaffold new my-project --template react-app',
      'scaffold list --registry official',
      'template init',
      'template convert ./my-project',
      'template config validate',
      'npm create @m5nv scaffold my-project --template react-app',
      'npx @m5nv/create scaffold my-project --template react-app'
    ];
  }
}

const router = new CreateRouter();
const args = process.argv.slice(2);
await router.route(args);
