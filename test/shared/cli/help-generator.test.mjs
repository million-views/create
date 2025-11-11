#!/usr/bin/env node

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateHelp, DISCLOSURE_LEVELS } from '../../../lib/cli/help-generator.mjs';

describe('CLI Help Generator', () => {
  describe('generateHelp', () => {
    it('should generate basic global help', () => {
      const config = {
        toolName: 'test-cli',
        description: 'A test CLI tool',
        commands: {
          create: { description: 'Create something' },
          list: { description: 'List items' }
        },
        globalOptions: {
          help: { type: 'boolean', short: 'h', description: 'Show help' },
          verbose: { type: 'boolean', description: 'Verbose output' }
        },
        examples: ['test-cli create my-project'],
        disclosureLevel: DISCLOSURE_LEVELS.BASIC
      };

      const help = generateHelp(config);

      assert(help.includes('test-cli'));
      assert(help.includes('A test CLI tool'));
      assert(help.includes('create'));
      assert(help.includes('list'));
      assert(help.includes('USAGE:'));
      assert(help.includes('--help advanced'));
    });

    it('should generate command-specific help', () => {
      const config = {
        toolName: 'test-cli',
        command: 'create',
        commands: {
          create: {
            description: 'Create a new project',
            options: {
              template: { type: 'string', description: 'Template to use' },
              'dry-run': { type: 'boolean', description: 'Preview only' }
            },
            usage: '[name]'
          }
        },
        commandOptions: {},
        commandExamples: ['test-cli create my-app --template basic'],
        disclosureLevel: DISCLOSURE_LEVELS.BASIC
      };

      const help = generateHelp(config);

      assert(help.includes('test-cli create'));
      assert(help.includes('Create a new project'));
      assert(help.includes('[name]'));
      assert(help.includes('--template'));
      assert(help.includes('--dry-run'));
    });

    it('should filter options by disclosure level', () => {
      const config = {
        toolName: 'test-cli',
        commands: {},
        globalOptions: {
          help: { type: 'boolean', disclosureLevel: DISCLOSURE_LEVELS.BASIC },
          verbose: { type: 'boolean', disclosureLevel: DISCLOSURE_LEVELS.INTERMEDIATE },
          debug: { type: 'boolean', disclosureLevel: DISCLOSURE_LEVELS.ADVANCED }
        },
        disclosureLevel: DISCLOSURE_LEVELS.BASIC
      };

      const help = generateHelp(config);

      assert(help.includes('--help'));
      assert(!help.includes('--verbose'));
      assert(!help.includes('--debug'));
    });

    it('should show advanced options at advanced level', () => {
      const config = {
        toolName: 'test-cli',
        commands: {},
        globalOptions: {
          help: { type: 'boolean', disclosureLevel: DISCLOSURE_LEVELS.BASIC },
          verbose: { type: 'boolean', disclosureLevel: DISCLOSURE_LEVELS.INTERMEDIATE },
          debug: { type: 'boolean', disclosureLevel: DISCLOSURE_LEVELS.ADVANCED }
        },
        disclosureLevel: DISCLOSURE_LEVELS.ADVANCED
      };

      const help = generateHelp(config);

      assert(help.includes('--help'));
      assert(help.includes('--verbose'));
      assert(help.includes('--debug'));
    });
  });
});
