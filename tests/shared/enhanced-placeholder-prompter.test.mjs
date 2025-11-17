#!/usr/bin/env node

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { EnhancedPlaceholderPrompter } from '../../bin/create-scaffold/enhanced-placeholder-prompter.mjs';
import { PlaceholderResolutionError } from '../../bin/create-scaffold/placeholder-resolver.mjs';

// Mock prompt adapter for testing
class MockPromptAdapter {
  constructor(responses = []) {
    this.responses = [...responses];
    this.written = [];
    this.questions = [];
  }

  async question(text) {
    this.questions.push(text);
    return this.responses.shift() || '';
  }

  async write(text) {
    this.written.push(text);
  }

  getWritten() {
    return this.written.join('');
  }

  getQuestions() {
    return this.questions;
  }
}

// Mock logger for testing
class MockLogger {
  constructor() {
    this.logs = [];
  }

  logOperation(operation, data) {
    this.logs.push({ operation, data });
  }

  getLogs() {
    return this.logs;
  }
}

describe('EnhancedPlaceholderPrompter', () => {
  describe('Constructor', () => {
    it('should create EnhancedPlaceholderPrompter with required parameters', () => {
      const promptAdapter = new MockPromptAdapter();
      const logger = new MockLogger();
      const prompter = new EnhancedPlaceholderPrompter({ promptAdapter, logger });

      assert.ok(prompter instanceof EnhancedPlaceholderPrompter);
      assert.strictEqual(prompter.prompt, promptAdapter);
      assert.strictEqual(prompter.logger, logger);
      assert.strictEqual(prompter.maxAttempts, 3);
    });

    it('should accept custom maxAttempts', () => {
      const promptAdapter = new MockPromptAdapter();
      const logger = new MockLogger();
      const prompter = new EnhancedPlaceholderPrompter({ promptAdapter, logger, maxAttempts: 5 });

      assert.strictEqual(prompter.maxAttempts, 5);
    });
  });

  describe('resolvePlaceholdersEnhanced() - Main Method', () => {
    it('should return empty result for empty definitions', async () => {
      const promptAdapter = new MockPromptAdapter();
      const logger = new MockLogger();
      const prompter = new EnhancedPlaceholderPrompter({ promptAdapter, logger });

      const result = await prompter.resolvePlaceholdersEnhanced({ definitions: [] });

      assert.deepStrictEqual(result.values, {});
      assert.deepStrictEqual(result.report, []);
      assert.deepStrictEqual(result.unknownTokens, []);
    });

    it('should handle null definitions', async () => {
      const promptAdapter = new MockPromptAdapter();
      const logger = new MockLogger();
      const prompter = new EnhancedPlaceholderPrompter({ promptAdapter, logger });

      const result = await prompter.resolvePlaceholdersEnhanced({ definitions: null });

      assert.deepStrictEqual(result.values, {});
      assert.deepStrictEqual(result.report, []);
      assert.deepStrictEqual(result.unknownTokens, []);
    });

    it('should resolve placeholders from flag inputs', async () => {
      const promptAdapter = new MockPromptAdapter();
      const logger = new MockLogger();
      const prompter = new EnhancedPlaceholderPrompter({ promptAdapter, logger });

      const definitions = [
        { token: 'PROJECT_NAME', type: 'string', required: true },
        { token: 'AUTHOR_NAME', type: 'string', required: false }
      ];

      const result = await prompter.resolvePlaceholdersEnhanced({
        definitions,
        flagInputs: ['PROJECT_NAME=my-project', 'AUTHOR_NAME=John Doe']
      });

      assert.strictEqual(result.values.PROJECT_NAME, 'my-project');
      assert.strictEqual(result.values.AUTHOR_NAME, 'John Doe');
      assert.strictEqual(result.report.length, 2);
      assert.strictEqual(result.report[0].source, 'flag');
      assert.strictEqual(result.report[1].source, 'flag');
    });

    it('should resolve placeholders from environment variables', async () => {
      const promptAdapter = new MockPromptAdapter();
      const logger = new MockLogger();
      const prompter = new EnhancedPlaceholderPrompter({ promptAdapter, logger });

      const definitions = [
        { token: 'PROJECT_NAME', type: 'string', required: true }
      ];

      const result = await prompter.resolvePlaceholdersEnhanced({
        definitions,
        env: { CREATE_SCAFFOLD_PLACEHOLDER_PROJECT_NAME: 'env-project' }
      });

      assert.strictEqual(result.values.PROJECT_NAME, 'env-project');
      assert.strictEqual(result.report[0].source, 'env');
    });

    it('should resolve placeholders from config defaults', async () => {
      const promptAdapter = new MockPromptAdapter();
      const logger = new MockLogger();
      const prompter = new EnhancedPlaceholderPrompter({ promptAdapter, logger });

      const definitions = [
        { token: 'PROJECT_NAME', type: 'string', required: true }
      ];

      const result = await prompter.resolvePlaceholdersEnhanced({
        definitions,
        configDefaults: ['PROJECT_NAME=config-project']
      });

      assert.strictEqual(result.values.PROJECT_NAME, 'config-project');
      assert.strictEqual(result.report[0].source, 'config');
    });

    it('should prioritize sources correctly (flag > env > config > default)', async () => {
      const promptAdapter = new MockPromptAdapter();
      const logger = new MockLogger();
      const prompter = new EnhancedPlaceholderPrompter({ promptAdapter, logger });

      const definitions = [
        { token: 'PROJECT_NAME', type: 'string', required: true, defaultValue: 'default-project' }
      ];

      const result = await prompter.resolvePlaceholdersEnhanced({
        definitions,
        flagInputs: ['PROJECT_NAME=flag-project'],
        env: { CREATE_SCAFFOLD_PLACEHOLDER_PROJECT_NAME: 'env-project' },
        configDefaults: ['PROJECT_NAME=config-project']
      });

      assert.strictEqual(result.values.PROJECT_NAME, 'flag-project');
      assert.strictEqual(result.report[0].source, 'flag');
    });

    it('should handle sensitive placeholders', async () => {
      const promptAdapter = new MockPromptAdapter();
      const logger = new MockLogger();
      const prompter = new EnhancedPlaceholderPrompter({ promptAdapter, logger });

      const definitions = [
        { token: 'API_KEY', type: 'string', required: true, sensitive: true }
      ];

      const result = await prompter.resolvePlaceholdersEnhanced({
        definitions,
        flagInputs: ['API_KEY=secret-key']
      });

      assert.strictEqual(result.values.API_KEY, 'secret-key');
      assert.strictEqual(result.report[0].sensitive, true);
    });
  });

  describe('Placeholder Grouping', () => {
    it('should group placeholders by workflow categories', async () => {
      const promptAdapter = new MockPromptAdapter();
      const logger = new MockLogger();
      const prompter = new EnhancedPlaceholderPrompter({ promptAdapter, logger });

      const definitions = [
        { token: 'PROJECT_NAME', type: 'string', required: true },
        { token: 'FRAMEWORK', type: 'string', required: true },
        { token: 'PORT', type: 'number', required: false },
        { token: 'CUSTOM_VAR', type: 'string', required: false }
      ];

      // Access private method for testing
      const groups = prompter['#groupPlaceholdersByWorkflow'](definitions, {});

      assert.strictEqual(groups.length, 4);
      assert.strictEqual(groups[0].name, 'Project Identity');
      assert.strictEqual(groups[1].name, 'Technology Stack');
      assert.strictEqual(groups[2].name, 'Configuration');
      assert.strictEqual(groups[3].name, 'Additional Settings');

      assert.strictEqual(groups[0].placeholders.length, 1);
      assert.strictEqual(groups[1].placeholders.length, 1);
      assert.strictEqual(groups[2].placeholders.length, 1);
      assert.strictEqual(groups[3].placeholders.length, 1);
    });

    it('should sort groups by priority', async () => {
      const promptAdapter = new MockPromptAdapter();
      const logger = new MockLogger();
      const prompter = new EnhancedPlaceholderPrompter({ promptAdapter, logger });

      const definitions = [
        { token: 'CUSTOM_VAR', type: 'string', required: false },
        { token: 'PROJECT_NAME', type: 'string', required: true },
        { token: 'FRAMEWORK', type: 'string', required: true }
      ];

      const groups = prompter['#groupPlaceholdersByWorkflow'](definitions, {});

      assert.strictEqual(groups[0].priority, 1); // Project Identity
      assert.strictEqual(groups[1].priority, 2); // Technology Stack
      assert.strictEqual(groups[2].priority, 4); // Additional Settings
    });
  });

  describe('Type Validation and Coercion', () => {
    it('should coerce string values', async () => {
      const promptAdapter = new MockPromptAdapter();
      const logger = new MockLogger();
      const prompter = new EnhancedPlaceholderPrompter({ promptAdapter, logger });

      const definitions = [
        { token: 'PROJECT_NAME', type: 'string', required: true }
      ];

      const result = await prompter.resolvePlaceholdersEnhanced({
        definitions,
        flagInputs: ['PROJECT_NAME=my project']
      });

      assert.strictEqual(result.values.PROJECT_NAME, 'my project');
    });

    it('should coerce number values', async () => {
      const promptAdapter = new MockPromptAdapter();
      const logger = new MockLogger();
      const prompter = new EnhancedPlaceholderPrompter({ promptAdapter, logger });

      const definitions = [
        { token: 'PORT', type: 'number', required: true }
      ];

      const result = await prompter.resolvePlaceholdersEnhanced({
        definitions,
        flagInputs: ['PORT=3000']
      });

      assert.strictEqual(result.values.PORT, 3000);
    });

    it('should coerce boolean values', async () => {
      const promptAdapter = new MockPromptAdapter();
      const logger = new MockLogger();
      const prompter = new EnhancedPlaceholderPrompter({ promptAdapter, logger });

      const definitions = [
        { token: 'DEBUG', type: 'boolean', required: true }
      ];

      const result = await prompter.resolvePlaceholdersEnhanced({
        definitions,
        flagInputs: ['DEBUG=true']
      });

      assert.strictEqual(result.values.DEBUG, true);
    });

    it('should coerce integer values', async () => {
      const promptAdapter = new MockPromptAdapter();
      const logger = new MockLogger();
      const prompter = new EnhancedPlaceholderPrompter({ promptAdapter, logger });

      const definitions = [
        { token: 'COUNT', type: 'integer', required: true }
      ];

      const result = await prompter.resolvePlaceholdersEnhanced({
        definitions,
        flagInputs: ['COUNT=42']
      });

      assert.strictEqual(result.values.COUNT, 42);
    });

    it('should reject invalid number values', async () => {
      const promptAdapter = new MockPromptAdapter();
      const logger = new MockLogger();
      const prompter = new EnhancedPlaceholderPrompter({ promptAdapter, logger });

      const definitions = [
        { token: 'PORT', type: 'number', required: true }
      ];

      await assert.rejects(
        prompter.resolvePlaceholdersEnhanced({
          definitions,
          flagInputs: ['PORT=not-a-number']
        }),
        PlaceholderResolutionError
      );
    });

    it('should reject invalid boolean values', async () => {
      const promptAdapter = new MockPromptAdapter();
      const logger = new MockLogger();
      const prompter = new EnhancedPlaceholderPrompter({ promptAdapter, logger });

      const definitions = [
        { token: 'DEBUG', type: 'boolean', required: true }
      ];

      await assert.rejects(
        prompter.resolvePlaceholdersEnhanced({
          definitions,
          flagInputs: ['DEBUG=maybe']
        }),
        PlaceholderResolutionError
      );
    });
  });

  describe('Smart Suggestions', () => {
    it('should provide suggestions for PROJECT_NAME', async () => {
      const promptAdapter = new MockPromptAdapter();
      const logger = new MockLogger();
      const prompter = new EnhancedPlaceholderPrompter({ promptAdapter, logger });

      const placeholder = { token: 'PROJECT_NAME', type: 'string', required: true };
      const suggestions = prompter['#getSmartSuggestions'](placeholder, new Map(), {});

      assert.ok(suggestions.includes('my-awesome-project'));
      assert.ok(suggestions.includes('project-name'));
    });

    it('should provide suggestions for FRAMEWORK', async () => {
      const promptAdapter = new MockPromptAdapter();
      const logger = new MockLogger();
      const prompter = new EnhancedPlaceholderPrompter({ promptAdapter, logger });

      const placeholder = { token: 'FRAMEWORK', type: 'string', required: true };
      const suggestions = prompter['#getSmartSuggestions'](placeholder, new Map(), {});

      assert.ok(suggestions.includes('express'));
      assert.ok(suggestions.includes('fastify'));
    });

    it('should provide suggestions for PORT', async () => {
      const promptAdapter = new MockPromptAdapter();
      const logger = new MockLogger();
      const prompter = new EnhancedPlaceholderPrompter({ promptAdapter, logger });

      const placeholder = { token: 'PORT', type: 'number', required: true };
      const suggestions = prompter['#getSmartSuggestions'](placeholder, new Map(), {});

      assert.ok(suggestions.includes('3000'));
      assert.ok(suggestions.includes('8080'));
    });

    it('should include template-specific suggestions', async () => {
      const promptAdapter = new MockPromptAdapter();
      const logger = new MockLogger();
      const prompter = new EnhancedPlaceholderPrompter({ promptAdapter, logger });

      const placeholder = { token: 'CUSTOM_VAR', type: 'string', required: true };
      const templateMetadata = {
        suggestions: {
          CUSTOM_VAR: ['template-suggestion-1', 'template-suggestion-2']
        }
      };

      const suggestions = prompter['#getSmartSuggestions'](placeholder, new Map(), templateMetadata);

      assert.ok(suggestions.includes('template-suggestion-1'));
      assert.ok(suggestions.includes('template-suggestion-2'));
    });

    it('should deduplicate suggestions', async () => {
      const promptAdapter = new MockPromptAdapter();
      const logger = new MockLogger();
      const prompter = new EnhancedPlaceholderPrompter({ promptAdapter, logger });

      const placeholder = { token: 'FRAMEWORK', type: 'string', required: true };
      const templateMetadata = {
        suggestions: {
          FRAMEWORK: ['express', 'custom-framework']
        }
      };

      const suggestions = prompter['#getSmartSuggestions'](placeholder, new Map(), templateMetadata);

      // Should have express only once
      const expressCount = suggestions.filter(s => s === 'express').length;
      assert.strictEqual(expressCount, 1);
    });
  });

  describe('Contextual Validation', () => {
    it('should validate TypeScript requires compatible runtime', async () => {
      const promptAdapter = new MockPromptAdapter();
      const logger = new MockLogger();
      const prompter = new EnhancedPlaceholderPrompter({ promptAdapter, logger });

      const resolvedContext = new Map([['RUNTIME', 'deno']]);
      const placeholder = { token: 'LANGUAGE', type: 'string', required: true };

      assert.throws(() => {
        prompter['#validateContextualConstraints']('typescript', placeholder, resolvedContext);
      }, /TypeScript requires Node.js or Bun runtime/);
    });

    it('should allow TypeScript with Node.js runtime', async () => {
      const promptAdapter = new MockPromptAdapter();
      const logger = new MockLogger();
      const prompter = new EnhancedPlaceholderPrompter({ promptAdapter, logger });

      const resolvedContext = new Map([['RUNTIME', 'node']]);
      const placeholder = { token: 'LANGUAGE', type: 'string', required: true };

      // Should not throw
      prompter['#validateContextualConstraints']('typescript', placeholder, resolvedContext);
    });

    it('should validate port ranges', async () => {
      const promptAdapter = new MockPromptAdapter();
      const logger = new MockLogger();
      const prompter = new EnhancedPlaceholderPrompter({ promptAdapter, logger });

      const placeholder = { token: 'PORT', type: 'number', required: true };

      assert.throws(() => {
        prompter['#validateContextualConstraints']('0', placeholder, new Map());
      }, /Port must be between 1 and 65535/);

      assert.throws(() => {
        prompter['#validateContextualConstraints']('70000', placeholder, new Map());
      }, /Port must be between 1 and 65535/);

      // Should not throw for valid ports
      prompter['#validateContextualConstraints']('3000', placeholder, new Map());
    });
  });

  describe('Email Validation', () => {
    it('should validate email format for AUTHOR_EMAIL', async () => {
      const promptAdapter = new MockPromptAdapter();
      const logger = new MockLogger();
      const prompter = new EnhancedPlaceholderPrompter({ promptAdapter, logger });

      const placeholder = { token: 'AUTHOR_EMAIL', type: 'string', required: true };

      // Should not throw for valid email
      assert.strictEqual(
        prompter['#validateAndCoerceInput']('user@example.com', placeholder),
        'user@example.com'
      );

      // Should throw for invalid email
      assert.throws(() => {
        prompter['#validateAndCoerceInput']('not-an-email', placeholder);
      }, /Must be a valid email address/);
    });

    it('should skip email validation for other tokens', async () => {
      const promptAdapter = new MockPromptAdapter();
      const logger = new MockLogger();
      const prompter = new EnhancedPlaceholderPrompter({ promptAdapter, logger });

      const placeholder = { token: 'CUSTOM_EMAIL', type: 'string', required: true };

      // Should not validate email format for non-AUTHOR_EMAIL tokens
      assert.strictEqual(
        prompter['#validateAndCoerceInput']('not-an-email', placeholder),
        'not-an-email'
      );
    });
  });

  describe('Non-Interactive Resolution', () => {
    it('should resolve from defaults', async () => {
      const promptAdapter = new MockPromptAdapter();
      const logger = new MockLogger();
      const prompter = new EnhancedPlaceholderPrompter({ promptAdapter, logger });

      const definitions = [
        { token: 'PROJECT_NAME', type: 'string', required: true, defaultValue: 'default-project' }
      ];

      const result = prompter['#resolveNonInteractively'](definitions, [], [], {});

      assert.strictEqual(result.values.PROJECT_NAME, 'default-project');
      assert.strictEqual(result.report[0].source, 'default');
    });

    it('should handle unknown tokens in flag inputs', async () => {
      const promptAdapter = new MockPromptAdapter();
      const logger = new MockLogger();
      const prompter = new EnhancedPlaceholderPrompter({ promptAdapter, logger });

      const definitions = [
        { token: 'PROJECT_NAME', type: 'string', required: true }
      ];

      const result = prompter['#resolveNonInteractively'](
        definitions,
        ['UNKNOWN_TOKEN=value'],
        [],
        {}
      );

      assert.deepStrictEqual(result.unknownTokens, ['UNKNOWN_TOKEN']);
    });

    it('should handle malformed flag inputs', async () => {
      const promptAdapter = new MockPromptAdapter();
      const logger = new MockLogger();
      const prompter = new EnhancedPlaceholderPrompter({ promptAdapter, logger });

      const definitions = [
        { token: 'PROJECT_NAME', type: 'string', required: true }
      ];

      assert.throws(() => {
        prompter['#resolveNonInteractively'](definitions, ['malformed'], [], {});
      }, PlaceholderResolutionError);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid placeholder definitions', async () => {
      const promptAdapter = new MockPromptAdapter();
      const logger = new MockLogger();
      const prompter = new EnhancedPlaceholderPrompter({ promptAdapter, logger });

      const definitions = [
        { token: 'INVALID_TOKEN!', type: 'string', required: true }
      ];

      // Should handle gracefully - invalid tokens are just ignored in resolution
      const result = await prompter.resolvePlaceholdersEnhanced({ definitions });
      assert.deepStrictEqual(result.values, {});
    });

    it('should handle missing required placeholders', async () => {
      const promptAdapter = new MockPromptAdapter(['my-project']);
      const logger = new MockLogger();
      const prompter = new EnhancedPlaceholderPrompter({ promptAdapter, logger });

      const definitions = [
        { token: 'PROJECT_NAME', type: 'string', required: true }
      ];

      const result = await prompter.resolvePlaceholdersEnhanced({ definitions });

      assert.strictEqual(result.values.PROJECT_NAME, 'my-project');
      assert.strictEqual(result.report[0].source, 'prompt');
    });
  });

  describe('Integration Tests', () => {
    it('should handle complex resolution with multiple sources', async () => {
      const promptAdapter = new MockPromptAdapter();
      const logger = new MockLogger();
      const prompter = new EnhancedPlaceholderPrompter({ promptAdapter, logger });

      const definitions = [
        { token: 'PROJECT_NAME', type: 'string', required: true, defaultValue: 'default-name' },
        { token: 'AUTHOR_NAME', type: 'string', required: false, defaultValue: 'default-author' },
        { token: 'PORT', type: 'number', required: true, defaultValue: 3000 },
        { token: 'DEBUG', type: 'boolean', required: false, defaultValue: false }
      ];

      const result = await prompter.resolvePlaceholdersEnhanced({
        definitions,
        flagInputs: ['PROJECT_NAME=flag-project', 'PORT=8080'],
        env: { CREATE_SCAFFOLD_PLACEHOLDER_AUTHOR_NAME: 'env-author' },
        configDefaults: ['DEBUG=true']
      });

      assert.strictEqual(result.values.PROJECT_NAME, 'flag-project'); // flag
      assert.strictEqual(result.values.AUTHOR_NAME, 'env-author'); // env
      assert.strictEqual(result.values.PORT, 8080); // flag
      assert.strictEqual(result.values.DEBUG, true); // config

      assert.strictEqual(result.report[0].source, 'flag');
      assert.strictEqual(result.report[1].source, 'env');
      assert.strictEqual(result.report[2].source, 'flag');
      assert.strictEqual(result.report[3].source, 'config');
    });

    it('should build correct placeholders array', async () => {
      const promptAdapter = new MockPromptAdapter();
      const logger = new MockLogger();
      const prompter = new EnhancedPlaceholderPrompter({ promptAdapter, logger });

      const definitions = [
        { token: 'PROJECT_NAME', type: 'string', required: true },
        { token: 'AUTHOR_NAME', type: 'string', required: false }
      ];

      const result = await prompter.resolvePlaceholdersEnhanced({
        definitions,
        flagInputs: ['PROJECT_NAME=my-project', 'AUTHOR_NAME=John']
      });

      assert.deepStrictEqual(result.placeholders, [
        'PROJECT_NAME=my-project',
        'AUTHOR_NAME=John'
      ]);
    });
  });
});
