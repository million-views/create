/**
 * Unit tests for the Environment module
 *
 * Tests for:
 * - createContext() factory function
 * - isContext() validator
 * - createTestContext() helper
 * - Logger utilities
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createContext,
  isContext,
  ContextValidationError,
  DEFAULT_AUTHOR_ASSETS_DIR,
  DEFAULT_AUTHORING_MODE,
  createTestContext,
  createTestLogger,
  createSilentLogger,
  TEST_DEFAULTS
} from '../../lib/environment/index.mjs';

describe('Environment Module', () => {
  describe('createContext()', () => {
    it('should create a context with required parameters', () => {
      const ctx = createContext({
        projectName: 'my-app',
        projectDirectory: '/path/to/my-app',
        cwd: '/path/to/my-app' // Explicit cwd to avoid process.cwd() dependency
      });

      assert.equal(ctx.projectName, 'my-app');
      assert.equal(ctx.projectDir, '/path/to/my-app');
      assert.equal(ctx.cwd, '/path/to/my-app');
      assert.equal(ctx.authoring, DEFAULT_AUTHORING_MODE);
      assert.equal(ctx.authorAssetsDir, DEFAULT_AUTHOR_ASSETS_DIR);
      assert.deepEqual(ctx.inputs, {});
      assert.deepEqual(ctx.constants, {});
    });

    it('should use custom cwd when provided', () => {
      const ctx = createContext({
        projectName: 'my-app',
        projectDirectory: '/path/to/my-app',
        cwd: '/custom/cwd'
      });

      assert.equal(ctx.projectDir, '/path/to/my-app');
      assert.equal(ctx.cwd, '/custom/cwd');
    });

    it('should accept custom authoring mode', () => {
      const ctx = createContext({
        projectName: 'my-app',
        projectDirectory: '/path/to/my-app',
        authoring: 'composable'
      });

      assert.equal(ctx.authoring, 'composable');
    });

    it('should accept custom authorAssetsDir', () => {
      const ctx = createContext({
        projectName: 'my-app',
        projectDirectory: '/path/to/my-app',
        authorAssetsDir: '__custom_assets__'
      });

      assert.equal(ctx.authorAssetsDir, '__custom_assets__');
    });

    it('should freeze inputs and constants', () => {
      const ctx = createContext({
        projectName: 'my-app',
        projectDirectory: '/path/to/my-app',
        inputs: { AUTHOR: 'Test Author' },
        constants: { version: '1.0.0' }
      });

      assert.equal(ctx.inputs.AUTHOR, 'Test Author');
      assert.equal(ctx.constants.version, '1.0.0');

      // Verify frozen
      assert.throws(() => {
        ctx.inputs.NEW_KEY = 'value';
      }, TypeError);

      assert.throws(() => {
        ctx.constants.newKey = 'value';
      }, TypeError);
    });

    it('should freeze the entire context object', () => {
      const ctx = createContext({
        projectName: 'my-app',
        projectDirectory: '/path/to/my-app'
      });

      assert.throws(() => {
        ctx.projectName = 'changed';
      }, TypeError);

      assert.throws(() => {
        ctx.newProperty = 'value';
      }, TypeError);
    });

    it('should throw ContextValidationError for missing projectName', () => {
      assert.throws(
        () => createContext({ projectDirectory: '/path' }),
        (err) => err instanceof ContextValidationError && err.message.includes('projectName')
      );
    });

    it('should throw ContextValidationError for empty projectName', () => {
      assert.throws(
        () => createContext({ projectName: '', projectDirectory: '/path' }),
        (err) => err instanceof ContextValidationError && err.message.includes('projectName')
      );
    });

    it('should throw ContextValidationError for missing projectDirectory', () => {
      assert.throws(
        () => createContext({ projectName: 'my-app' }),
        (err) => err instanceof ContextValidationError && err.message.includes('projectDirectory')
      );
    });

    it('should throw ContextValidationError for invalid authoring mode', () => {
      assert.throws(
        () => createContext({
          projectName: 'my-app',
          projectDirectory: '/path',
          authoring: 'invalid'
        }),
        (err) => err instanceof ContextValidationError && err.message.includes('authoring')
      );
    });
  });

  describe('isContext()', () => {
    it('should return true for valid context', () => {
      const ctx = createContext({
        projectName: 'my-app',
        projectDirectory: '/path/to/my-app'
      });

      assert.equal(isContext(ctx), true);
    });

    it('should return false for null', () => {
      assert.equal(isContext(null), false);
    });

    it('should return false for undefined', () => {
      assert.equal(isContext(undefined), false);
    });

    it('should return false for object missing required properties', () => {
      assert.equal(isContext({}), false);
      assert.equal(isContext({ projectName: 'app' }), false);
      assert.equal(isContext({ projectDir: '/path' }), false);
    });

    it('should return false for object with wrong types', () => {
      assert.equal(isContext({
        projectName: 123,
        projectDir: '/path',
        cwd: '/path',
        authoring: 'wysiwyg',
        authorAssetsDir: '__scaffold__',
        inputs: {},
        constants: {}
      }), false);
    });

    it('should return true for manually constructed valid object', () => {
      const manualCtx = {
        projectName: 'manual-app',
        projectDir: '/path/to/app',
        cwd: '/path/to/app',
        authoring: 'wysiwyg',
        authorAssetsDir: '__scaffold__',
        inputs: {},
        constants: {},
        options: {
          raw: [],
          byDimension: {}
        }
      };

      assert.equal(isContext(manualCtx), true);
    });
  });

  describe('ContextValidationError', () => {
    it('should have correct name', () => {
      const error = new ContextValidationError('test error');
      assert.equal(error.name, 'ContextValidationError');
    });

    it('should include message', () => {
      const error = new ContextValidationError('test message');
      assert.equal(error.message, 'test message');
    });

    it('should be instanceof Error', () => {
      const error = new ContextValidationError('test');
      assert.ok(error instanceof Error);
    });
  });

  describe('DEFAULT_AUTHOR_ASSETS_DIR', () => {
    it('should equal __scaffold__', () => {
      assert.equal(DEFAULT_AUTHOR_ASSETS_DIR, '__scaffold__');
    });
  });

  describe('DEFAULT_AUTHORING_MODE', () => {
    it('should equal wysiwyg', () => {
      assert.equal(DEFAULT_AUTHORING_MODE, 'wysiwyg');
    });
  });
});

describe('Testing Utilities', () => {
  describe('TEST_DEFAULTS', () => {
    it('should have expected default values', () => {
      assert.equal(TEST_DEFAULTS.projectName, 'test-project');
      assert.ok(TEST_DEFAULTS.projectDirectory.includes('test-project'));
      assert.equal(TEST_DEFAULTS.authoring, 'wysiwyg');
      assert.equal(TEST_DEFAULTS.authorAssetsDir, '__scaffold__');
    });

    it('should be frozen', () => {
      assert.throws(() => {
        TEST_DEFAULTS.projectName = 'changed';
      }, TypeError);
    });
  });

  describe('createTestContext()', () => {
    it('should create a valid context with defaults', () => {
      const ctx = createTestContext();

      assert.equal(ctx.projectName, TEST_DEFAULTS.projectName);
      assert.equal(ctx.projectDir, TEST_DEFAULTS.projectDirectory);
      assert.equal(ctx.authoring, TEST_DEFAULTS.authoring);
      assert.ok(isContext(ctx));
    });

    it('should allow overriding projectName', () => {
      const ctx = createTestContext({ projectName: 'custom-app' });

      assert.equal(ctx.projectName, 'custom-app');
      assert.ok(isContext(ctx));
    });

    it('should allow overriding inputs', () => {
      const ctx = createTestContext({
        inputs: { AUTHOR: 'Test Author', VERSION: '2.0.0' }
      });

      assert.equal(ctx.inputs.AUTHOR, 'Test Author');
      assert.equal(ctx.inputs.VERSION, '2.0.0');
    });

    it('should allow overriding multiple properties', () => {
      const ctx = createTestContext({
        projectName: 'my-app',
        authoring: 'composable',
        constants: { debug: true }
      });

      assert.equal(ctx.projectName, 'my-app');
      assert.equal(ctx.authoring, 'composable');
      assert.equal(ctx.constants.debug, true);
    });
  });

  describe('createTestLogger()', () => {
    it('should create a logger with info and warn methods', () => {
      const logger = createTestLogger();

      assert.equal(typeof logger.info, 'function');
      assert.equal(typeof logger.warn, 'function');
    });

    it('should capture info calls', () => {
      const logger = createTestLogger();

      logger.info('first message');
      logger.info('second message');

      assert.deepEqual(logger.infoCalls, ['first message', 'second message']);
    });

    it('should capture warn calls', () => {
      const logger = createTestLogger();

      logger.warn('warning 1');
      logger.warn('warning 2');

      assert.deepEqual(logger.warnCalls, ['warning 1', 'warning 2']);
    });

    it('should keep info and warn calls separate', () => {
      const logger = createTestLogger();

      logger.info('info message');
      logger.warn('warn message');

      assert.equal(logger.infoCalls.length, 1);
      assert.equal(logger.warnCalls.length, 1);
    });
  });

  describe('createSilentLogger()', () => {
    it('should create a logger with info and warn methods', () => {
      const logger = createSilentLogger();

      assert.equal(typeof logger.info, 'function');
      assert.equal(typeof logger.warn, 'function');
    });

    it('should not throw when called', () => {
      const logger = createSilentLogger();

      assert.doesNotThrow(() => {
        logger.info('message');
        logger.warn('message');
      });
    });
  });
});
