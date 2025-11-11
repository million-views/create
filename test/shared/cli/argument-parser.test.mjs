#!/usr/bin/env node

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseArguments, validateArguments, ArgumentError } from '../../../lib/cli/argument-parser.mjs';

describe('CLI Argument Parser', () => {
  describe('parseArguments', () => {
    it('should parse global options without command', () => {
      const result = parseArguments(['--help', '--verbose']);

      assert.equal(result.command, null);
      assert.equal(result.globalOptions.help, true);
      assert.equal(result.globalOptions.verbose, true);
    });

    it('should parse command with options', () => {
      const commandDefs = {
        test: {
          options: {
            output: { type: 'string', short: 'o' }
          }
        }
      };

      const result = parseArguments(['test', '--output', 'result.json'], commandDefs);

      assert.equal(result.command, 'test');
      assert.equal(result.commandOptions.output, 'result.json');
    });

    it('should handle positional arguments', () => {
      const commandDefs = {
        create: {
          options: {
            template: { type: 'string' }
          }
        }
      };

      const result = parseArguments(['create', 'my-project', '--template', 'basic'], commandDefs);

      assert.equal(result.command, 'create');
      assert.deepEqual(result.positionals, ['my-project']);
      assert.equal(result.commandOptions.template, 'basic');
    });

    it('should throw error for unknown command', () => {
      assert.throws(() => {
        parseArguments(['unknown', '--help'], {});
      }, ArgumentError);
    });
  });

  describe('validateArguments', () => {
    it('should validate successfully', () => {
      const parsed = {
        command: 'test',
        globalOptions: {},
        commandOptions: {},
        positionals: []
      };

      assert.doesNotThrow(() => {
        validateArguments(parsed, { test: {} });
      });
    });

    it('should throw error for conflicting global options', () => {
      const parsed = {
        command: null,
        globalOptions: { help: true, version: true },
        commandOptions: {},
        positionals: []
      };

      assert.throws(() => {
        validateArguments(parsed);
      }, ArgumentError);
    });

    it('should throw error for missing command without help/version', () => {
      const parsed = {
        command: null,
        globalOptions: {},
        commandOptions: {},
        positionals: []
      };

      assert.throws(() => {
        validateArguments(parsed);
      }, ArgumentError);
    });
  });
});