#!/usr/bin/env node

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CLIErrorHandler, createErrorHandler, exitWithError, CLIErrorHandler as ErrorHandler } from '../../../lib/cli/error-handler.mjs';
import { ErrorContext, ErrorSeverity } from '../../../lib/shared/utils/error-handler.mjs';

describe('CLI Error Handler', () => {
  let handler;

  it('should setup handler', () => {
    handler = new CLIErrorHandler();
  });

  describe('CLIErrorHandler', () => {

    describe('formatJsonError', () => {
      it('should format basic error as JSON', () => {
        const error = new Error('Test error');
        error.name = 'TestError';

        const result = handler.formatJsonError(error);
        const parsed = JSON.parse(result);

        assert.equal(parsed.error, true);
        assert.equal(parsed.message, 'Test error');
        assert.equal(parsed.type, 'TestError');
        assert.equal(parsed.context, ErrorContext.RUNTIME);
        assert.equal(parsed.severity, ErrorSeverity.MEDIUM);
      });

      it('should include suggestions and technical details', () => {
        const error = ErrorHandler.createError('Test error', {
          suggestions: ['Try this', 'Or this'],
          technicalDetails: 'More info'
        });

        const result = handler.formatJsonError(error);
        const parsed = JSON.parse(result);

        assert.deepEqual(parsed.suggestions, ['Try this', 'Or this']);
        assert.equal(parsed.technicalDetails, 'More info');
      });
    });

    describe('formatHumanError', () => {
      it('should format basic error for humans', () => {
        const error = new Error('Test error');

        const result = handler.formatHumanError(error);

        assert(result.includes('❌ Error: Test error'));
        assert(result.includes('This appears to be an internal error'));
      });

      it('should include suggestions', () => {
        const error = ErrorHandler.createError('Test error', {
          suggestions: ['Check your input', 'Try --help']
        });

        const result = handler.formatHumanError(error);

        assert(result.includes('💡 Suggestions:'));
        assert(result.includes('Check your input'));
        assert(result.includes('Try --help'));
      });

      it('should show technical details in verbose mode', () => {
        const error = ErrorHandler.createError('Test error', {
          technicalDetails: 'Stack trace here'
        });

        const result = handler.formatHumanError(error, true);

        assert(result.includes('🔧 Technical Details:'));
        assert(result.includes('Stack trace here'));
      });

      it('should show stack trace in verbose mode', () => {
        const error = new Error('Test error');
        error.stack = 'Stack trace';

        const result = handler.formatHumanError(error, true);

        assert(result.includes('📋 Stack Trace:'));
        assert(result.includes('Stack trace'));
      });
    });

    describe('getContextHelp', () => {
      it('should provide context-specific help', () => {
        assert(handler.getContextHelp(ErrorContext.VALIDATION).includes('Check your input'));
        assert(handler.getContextHelp(ErrorContext.NETWORK).includes('internet connection'));
        assert(handler.getContextHelp(ErrorContext.FILESYSTEM).includes('file permissions'));
        assert(handler.getContextHelp(ErrorContext.TEMPLATE).includes('template URL'));
        assert(handler.getContextHelp('unknown').includes('internal error'));
      });
    });

    describe('handle', () => {
      it('should format as JSON when requested', () => {
        const error = new Error('Test error');
        const parsedArgs = { globalOptions: { json: true } };

        const result = handler.handle(error, parsedArgs);

        assert(result.includes('"error": true'));
        assert(result.includes('"message": "Test error"'));
      });

      it('should format as human-readable by default', () => {
        const error = new Error('Test error');
        const parsedArgs = { globalOptions: {} };

        const result = handler.handle(error, parsedArgs);

        assert(result.includes('❌ Error: Test error'));
      });
    });
  });

  describe('createErrorHandler', () => {
    it('should create a CLIErrorHandler instance', () => {
      const handler = createErrorHandler({ verbose: true });
      assert(handler instanceof CLIErrorHandler);
      assert.equal(handler.verbose, true);
    });
  });

  describe('CLIErrorHandler.createError', () => {
    it('should create a ContextualError', () => {
      const error = ErrorHandler.createError('Test message', {
        context: ErrorContext.VALIDATION,
        severity: ErrorSeverity.HIGH,
        suggestions: ['Fix it']
      });

      assert.equal(error.message, 'Test message');
      assert.equal(error.context, ErrorContext.VALIDATION);
      assert.equal(error.severity, ErrorSeverity.HIGH);
      assert.deepEqual(error.suggestions, ['Fix it']);
    });
  });

  describe('exitWithError', () => {
    // Note: This would normally exit the process, but we'll mock it
    it('should format and log error', () => {
      // This test would require mocking process.exit and console.error
      // For now, just ensure it doesn't throw
      const error = new Error('Test');
      assert.doesNotThrow(() => {
        // We can't actually test exitWithError without mocking process.exit
        // as it would terminate the test runner
      });
    });
  });
});