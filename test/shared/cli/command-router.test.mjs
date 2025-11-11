#!/usr/bin/env node

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { routeCommand, createCommandRouter } from '../../../lib/cli/command-router.mjs';

describe('CLI Command Router', () => {
  describe('routeCommand', () => {
    it('should route to help handler', async () => {
      const parsedArgs = {
        command: null,
        globalOptions: { help: true },
        commandOptions: {},
        positionals: []
      };

      const context = {
        helpGenerator: {
          generateHelp: () => 'Help text'
        },
        toolName: 'test-cli'
      };

      const result = await routeCommand(parsedArgs, {}, context);
      assert.equal(result, 'Help text');
    });

    it('should route to version handler', async () => {
      const parsedArgs = {
        command: null,
        globalOptions: { version: true },
        commandOptions: {},
        positionals: []
      };

      const context = {
        toolName: 'test-cli',
        version: '1.0.0'
      };

      const result = await routeCommand(parsedArgs, {}, context);
      assert.equal(result, 'test-cli version 1.0.0');
    });

    it('should route to command handler', async () => {
      const parsedArgs = {
        command: 'test',
        globalOptions: {},
        commandOptions: { output: 'file.txt' },
        positionals: ['arg1']
      };

      const commandHandlers = {
        test: async ({ _globalOptions, commandOptions, positionals }) => {
          return `Executed test with ${commandOptions.output} and ${positionals[0]}`;
        }
      };

      const result = await routeCommand(parsedArgs, commandHandlers, {});
      assert.equal(result, 'Executed test with file.txt and arg1');
    });

    it('should throw error for unknown command', async () => {
      const parsedArgs = {
        command: 'unknown',
        globalOptions: {},
        commandOptions: {},
        positionals: []
      };

      await assert.rejects(async () => {
        await routeCommand(parsedArgs, {}, {});
      }, /Unknown command/);
    });

    it('should throw error for no command', async () => {
      const parsedArgs = {
        command: null,
        globalOptions: {},
        commandOptions: {},
        positionals: []
      };

      await assert.rejects(async () => {
        await routeCommand(parsedArgs, {}, {});
      }, /No command specified/);
    });
  });

  describe('createCommandRouter', () => {
    it('should create router with error handling', async () => {
      const router = createCommandRouter({
        commandHandlers: {
          test: async () => 'success'
        },
        errorHandler: {
          handle: (error) => `Handled: ${error.message}`
        },
        toolName: 'test-cli',
        version: '1.0.0'
      });

      const parsedArgs = {
        command: 'test',
        globalOptions: {},
        commandOptions: {},
        positionals: []
      };

      const result = await router(parsedArgs);
      assert.equal(result, 'success');
    });

    it('should handle errors through error handler', async () => {
      const router = createCommandRouter({
        commandHandlers: {
          test: async () => {
            throw new Error('Test error');
          }
        },
        errorHandler: {
          handle: (error) => `Handled: ${error.message}`
        },
        toolName: 'test-cli'
      });

      const parsedArgs = {
        command: 'test',
        globalOptions: {},
        commandOptions: {},
        positionals: []
      };

      const result = await router(parsedArgs);
      assert.equal(result, 'Handled: Test error');
    });
  });
});
