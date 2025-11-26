#!/usr/bin/env node

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  ErrorContext,
  ErrorSeverity,
  formatErrorMessage,
  ErrorMessages,
  handleError,
  withErrorHandling,
  contextualizeError
} from '@m5nv/create-scaffold/lib/error/handler.mts';
import { ContextualError } from '@m5nv/create-scaffold/lib/error/contextual.mts';

describe('Error Handler', () => {
  describe('Constants', () => {
    it('should export ErrorContext constants', () => {
      assert.strictEqual(typeof ErrorContext.VALIDATION, 'string');
      assert.strictEqual(typeof ErrorContext.NETWORK, 'string');
      assert.strictEqual(typeof ErrorContext.FILESYSTEM, 'string');
      assert.strictEqual(typeof ErrorContext.TEMPLATE, 'string');
      assert.strictEqual(typeof ErrorContext.CONFIGURATION, 'string');
      assert.strictEqual(typeof ErrorContext.RUNTIME, 'string');
      assert.strictEqual(typeof ErrorContext.USER_INPUT, 'string');
    });

    it('should export ErrorSeverity constants', () => {
      assert.strictEqual(typeof ErrorSeverity.LOW, 'string');
      assert.strictEqual(typeof ErrorSeverity.MEDIUM, 'string');
      assert.strictEqual(typeof ErrorSeverity.HIGH, 'string');
      assert.strictEqual(typeof ErrorSeverity.FATAL, 'string');
    });
  });

  describe('ContextualError Class', () => {
    it('should create ContextualError with default values', () => {
      const error = new ContextualError('Test message');

      assert.strictEqual(error.name, 'ContextualError');
      assert.strictEqual(error.message, 'Test message');
      assert.strictEqual(error.context, ErrorContext.RUNTIME);
      assert.strictEqual(error.severity, ErrorSeverity.MEDIUM);
      assert.deepStrictEqual(error.suggestions, []);
      assert.strictEqual(error.technicalDetails, undefined);
      assert.strictEqual(error.userFriendlyMessage, 'Test message');
    });

    it('should create ContextualError with custom values', () => {
      const error = new ContextualError('Test message', {
        context: ErrorContext.VALIDATION,
        severity: ErrorSeverity.HIGH,
        suggestions: ['Try this', 'Try that'],
        technicalDetails: 'Detailed error info',
        userFriendlyMessage: 'User-friendly message'
      });

      assert.strictEqual(error.context, ErrorContext.VALIDATION);
      assert.strictEqual(error.severity, ErrorSeverity.HIGH);
      assert.deepStrictEqual(error.suggestions, ['Try this', 'Try that']);
      assert.strictEqual(error.technicalDetails, 'Detailed error info');
      assert.strictEqual(error.userFriendlyMessage, 'User-friendly message');
    });
  });

  describe('formatErrorMessage()', () => {
    it('should format basic error message', () => {
      const error = new ContextualError('Test error');
      const formatted = formatErrorMessage(error);

      assert(formatted.includes('❌ Test error'));
      assert(formatted.includes('❌'));
    });

    it('should include technical details when requested', () => {
      const error = new ContextualError('Test error', {
        technicalDetails: 'Technical info'
      });
      const formatted = formatErrorMessage(error, { includeTechnical: true });

      assert(formatted.includes('🔧 Technical Details:'));
      assert(formatted.includes('Technical info'));
    });

    it('should include suggestions when available', () => {
      const error = new ContextualError('Test error', {
        suggestions: ['Suggestion 1', 'Suggestion 2', 'Suggestion 3']
      });
      const formatted = formatErrorMessage(error);

      assert(formatted.includes('💡 Suggestions:'));
      assert(formatted.includes('Suggestion 1'));
      assert(formatted.includes('Suggestion 2'));
      assert(formatted.includes('Suggestion 3'));
    });

    it('should limit suggestions to maxSuggestions', () => {
      const error = new ContextualError('Test error', {
        suggestions: ['Suggestion 1', 'Suggestion 2', 'Suggestion 3', 'Suggestion 4']
      });
      const formatted = formatErrorMessage(error, { maxSuggestions: 2 });

      assert(formatted.includes('Suggestion 1'));
      assert(formatted.includes('Suggestion 2'));
      assert(formatted.includes('... and 2 more'));
    });

    it('should exclude suggestions when includeSuggestions is false', () => {
      const error = new ContextualError('Test error', {
        suggestions: ['Suggestion 1']
      });
      const formatted = formatErrorMessage(error, { includeSuggestions: false });

      assert(!formatted.includes('💡 Suggestions:'));
    });
  });

  describe('ErrorMessages', () => {
    it('should create templateNotFound error', () => {
      const error = ErrorMessages.templateNotFound('my-template');

      assert.strictEqual(error.message, 'Template "my-template" not found');
      assert.strictEqual(error.context, ErrorContext.TEMPLATE);
      assert.strictEqual(error.severity, ErrorSeverity.HIGH);
      assert(error.suggestions.length > 0);
    });

    it('should create templateInvalidUrl error', () => {
      const error = ErrorMessages.templateInvalidUrl('invalid-url', 'Invalid format');

      assert(error.message.includes('Invalid template URL: invalid-url'));
      assert.strictEqual(error.context, ErrorContext.TEMPLATE);
      assert.strictEqual(error.technicalDetails, 'Invalid format');
    });

    it('should create validationFailed error', () => {
      const error = ErrorMessages.validationFailed('field', 'Invalid value');

      assert.strictEqual(error.message, 'Invalid field: Invalid value');
      assert.strictEqual(error.context, ErrorContext.VALIDATION);
    });

    it('should create networkError error', () => {
      const error = ErrorMessages.networkError('download', 'Connection timeout');

      assert(error.message.includes('Network error during download'));
      assert.strictEqual(error.context, ErrorContext.NETWORK);
      assert.strictEqual(error.technicalDetails, 'Connection timeout');
    });

    it('should create filesystemError error', () => {
      const error = ErrorMessages.filesystemError('read', '/path/to/file', 'Permission denied');

      assert(error.message.includes('File system error during read'));
      assert(error.technicalDetails.includes('Path: /path/to/file'));
      assert(error.technicalDetails.includes('Reason: Permission denied'));
      assert.strictEqual(error.context, ErrorContext.FILESYSTEM);
    });

    it('should create configError error', () => {
      const error = ErrorMessages.configError('setting', 'Invalid value');

      assert.strictEqual(error.message, 'Configuration error: setting');
      assert.strictEqual(error.context, ErrorContext.CONFIGURATION);
      assert.strictEqual(error.technicalDetails, 'Invalid value');
    });

    it('should create genericError error', () => {
      const error = ErrorMessages.genericError('Something went wrong');

      assert.strictEqual(error.message, 'Something went wrong');
      assert.strictEqual(error.context, ErrorContext.RUNTIME);
    });

    it('should create genericError with custom context', () => {
      const error = ErrorMessages.genericError('Something went wrong', ErrorContext.VALIDATION);

      assert.strictEqual(error.context, ErrorContext.VALIDATION);
    });

    it('should create unknownCommand error', () => {
      const error = ErrorMessages.unknownCommand('invalid-cmd');

      assert.strictEqual(error.message, 'Unknown command: invalid-cmd');
      assert.strictEqual(error.context, ErrorContext.USER_INPUT);
    });

    it('should create missingRequiredArgument error', () => {
      const error = ErrorMessages.missingRequiredArgument('template', 'new');

      assert(error.message.includes('Missing required argument: template'));
      assert(error.suggestions[0].includes('template'));
    });

    it('should create invalidArgumentValue error', () => {
      const error = ErrorMessages.invalidArgumentValue('port', 'abc', 'number');

      assert(error.message.includes('Invalid value for port: "abc"'));
      assert(error.suggestions[0].includes('Expected: number'));
    });

    it('should create commandValidationFailed error', () => {
      const error = ErrorMessages.commandValidationFailed('new', 'Invalid template name');

      assert(error.message.includes('Command validation failed for "new"'));
      assert(error.message.includes('Invalid template name'));
    });
  });

  describe('handleError()', () => {
    it('should format and display error without exiting', () => {
      // Mock console.error to capture output
      const consoleErrorOutput = [];
      const originalConsoleError = console.error;
      console.error = (...args) => {
        consoleErrorOutput.push(args.join(' '));
      };

      try {
        const error = new ContextualError('Test error', {
          suggestions: ['Try this']
        });

        const exitCode = handleError(error, { exit: false });

        assert.strictEqual(exitCode, 1);
        assert(consoleErrorOutput.length > 0);
        assert(consoleErrorOutput[0].includes('❌ Test error'));
      } finally {
        console.error = originalConsoleError;
      }
    });

    it('should include technical details when requested', () => {
      // Mock console.error to capture output
      const consoleErrorOutput = [];
      const originalConsoleError = console.error;
      console.error = (...args) => {
        consoleErrorOutput.push(args.join(' '));
      };

      try {
        const error = new ContextualError('Test error', {
          technicalDetails: 'Technical info'
        });

        handleError(error, { exit: false, includeTechnical: true });

        const output = consoleErrorOutput.join('\n');
        assert(output.includes('🔧 Technical Details:'));
        assert(output.includes('Technical info'));
      } finally {
        console.error = originalConsoleError;
      }
    });
  });

  describe('withErrorHandling()', () => {
    it('should return result when operation succeeds', async () => {
      const result = await withErrorHandling(async () => 'success', { exit: false });
      assert.strictEqual(result, 'success');
    });

    it('should handle errors and return exit code', async () => {
      const result = await withErrorHandling(async () => {
        throw new Error('Test error');
      }, { exit: false });

      assert.strictEqual(typeof result, 'number'); // Exit code
    });
  });

  describe('contextualizeError()', () => {
    it('should return ContextualError unchanged', () => {
      const original = new ContextualError('Original message');
      const result = contextualizeError(original);

      assert.strictEqual(result, original);
    });

    it('should convert generic Error to ContextualError', () => {
      const original = new Error('Generic error message');
      const result = contextualizeError(original);

      assert(result instanceof ContextualError);
      assert.strictEqual(result.message, 'Generic error message');
      assert.strictEqual(result.context, ErrorContext.RUNTIME);
      assert.strictEqual(result.severity, ErrorSeverity.MEDIUM);
      assert.strictEqual(result.technicalDetails, 'Generic error message');
    });

    it('should apply custom context options', () => {
      const original = new Error('Generic error');
      const result = contextualizeError(original, {
        context: ErrorContext.VALIDATION,
        severity: ErrorSeverity.HIGH,
        suggestions: ['Custom suggestion'],
        userFriendlyMessage: 'User message'
      });

      assert.strictEqual(result.context, ErrorContext.VALIDATION);
      assert.strictEqual(result.severity, ErrorSeverity.HIGH);
      assert.deepStrictEqual(result.suggestions, ['Custom suggestion']);
      assert.strictEqual(result.userFriendlyMessage, 'User message');
    });
  });
});
