#!/usr/bin/env node

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseArguments, validateArguments } from '../../../lib/cli/argument-parser.mjs';
import { generateHelp } from '../../../lib/cli/help-generator.mjs';
import { createCommandRouter } from '../../../lib/cli/command-router.mjs';
import { createConfigManager } from '../../../lib/cli/config-manager.mjs';
import { createErrorHandler } from '../../../lib/cli/error-handler.mjs';

describe('CLI Framework Integration', () => {
  it('should handle a complete command flow', async () => {
    // Define a simple CLI tool
    const commandDefinitions = {
      greet: {
        description: 'Greet someone',
        options: {
          name: { type: 'string', short: 'n', description: 'Name to greet' },
          loud: { type: 'boolean', description: 'Shout the greeting' }
        }
      }
    };

    // Parse arguments
    const argv = ['greet', '--name', 'World', '--loud'];
    const parsedArgs = parseArguments(argv, commandDefinitions);

    // Validate arguments
    validateArguments(parsedArgs, commandDefinitions);

    // Verify parsing
    assert.equal(parsedArgs.command, 'greet');
    assert.equal(parsedArgs.commandOptions.name, 'World');
    assert.equal(parsedArgs.commandOptions.loud, true);

    // Create command router
    const commandHandlers = {
      greet: async ({ commandOptions }) => {
        const greeting = `Hello, ${commandOptions.name || 'stranger'}!`;
        return commandOptions.loud ? greeting.toUpperCase() : greeting;
      }
    };

    const router = createCommandRouter({
      commandHandlers,
      helpGenerator: { generateHelp: () => 'Help text' },
      errorHandler: createErrorHandler(),
      toolName: 'test-cli',
      version: '1.0.0',
      commands: commandDefinitions
    });

    // Execute command
    const result = await router(parsedArgs);
    assert.equal(result, 'HELLO, WORLD!');
  });

  it('should handle help command', async () => {
    const commandDefinitions = {
      test: { description: 'Run tests' }
    };

    const parsedArgs = parseArguments(['--help'], commandDefinitions);

    const router = createCommandRouter({
      commandHandlers: {},
      helpGenerator: {
        generateHelp: (config) => `Help for ${config.toolName}`
      },
      errorHandler: createErrorHandler(),
      toolName: 'test-cli',
      commands: commandDefinitions
    });

    const result = await router(parsedArgs);
    assert.equal(result, 'Help for test-cli');
  });

  it('should handle configuration loading', async () => {
    const configManager = createConfigManager({
      toolName: 'test-cli',
      defaults: { theme: 'dark', timeout: 5000 }
    });

    const config = await configManager.load();

    assert.equal(config.theme, 'dark');
    assert.equal(config.timeout, 5000);
  });

  it('should handle errors consistently', () => {
    const errorHandler = createErrorHandler();
    const error = new Error('Test error');

    const result = errorHandler.handle(error, { globalOptions: {} });

    assert(result.includes('❌ Error: Test error'));
    assert(result.includes('This appears to be an internal error'));
  });

  it('should generate progressive help', () => {
    const helpConfig = {
      toolName: 'test-cli',
      description: 'A test CLI',
      commands: {
        basic: { description: 'Basic command', disclosureLevel: 'basic' },
        advanced: { description: 'Advanced command', disclosureLevel: 'advanced' }
      },
      globalOptions: {
        help: { description: 'Show help', disclosureLevel: 'basic' },
        debug: { description: 'Debug mode', disclosureLevel: 'advanced' }
      },
      disclosureLevel: 'basic'
    };

    const help = generateHelp(helpConfig);

    assert(help.includes('basic'));
    assert(help.includes('advanced')); // Included in the hint
    assert(help.includes('--help'));
    assert(!help.includes('--debug'));
  });
});
