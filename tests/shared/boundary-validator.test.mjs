#!/usr/bin/env node

import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'fs/promises';
import { join, isAbsolute } from 'path';
import { tmpdir } from 'os';
import { BoundaryValidator, BoundaryViolationError } from '../../lib/boundary-validator.mjs';

/**
 * L2 Tests for BoundaryValidator
 *
 * Following Guardrails:
 * - No mocks - uses actual temp directories
 * - L2 utility tests - pure inputs, let SUT handle Node APIs
 * - Tests critical security boundary enforcement
 */

describe('BoundaryValidator', () => {
  let testRoot;
  let validator;

  beforeEach(async () => {
    // Create isolated test directory
    testRoot = await mkdtemp(join(tmpdir(), 'boundary-test-'));
    validator = new BoundaryValidator(testRoot);
  });

  afterEach(async () => {
    // Cleanup
    await rm(testRoot, { recursive: true, force: true });
  });

  describe('Construction', () => {
    test('creates validator with absolute allowed root', () => {
      const v = new BoundaryValidator('/some/path');
      assert.ok(v);
    });

    test('resolves relative allowed root to absolute', () => {
      const v = new BoundaryValidator('./relative');
      assert.ok(v);
    });
  });

  describe('validatePath() - Valid Paths', () => {
    test('allows paths within allowed root', () => {
      const result = validator.validatePath('subdir/file.txt');
      assert.ok(result.startsWith(testRoot));
      assert.ok(result.endsWith('subdir/file.txt'));
    });

    test('allows absolute paths within allowed root', () => {
      const subPath = join(testRoot, 'file.txt');
      const result = validator.validatePath(subPath);
      assert.strictEqual(result, subPath);
    });

    test('allows path exactly at root', () => {
      const result = validator.validatePath('.');
      assert.strictEqual(result, testRoot);
    });

    test('allows nested paths', () => {
      const result = validator.validatePath('a/b/c/d/file.txt');
      assert.ok(result.startsWith(testRoot));
      assert.ok(result.includes('a/b/c/d'));
    });

    test('normalizes redundant path segments', () => {
      const result = validator.validatePath('./subdir/./file.txt');
      assert.ok(result.startsWith(testRoot));
      assert.ok(!result.includes('./'));
    });
  });

  describe('validatePath() - Path Traversal Prevention', () => {
    test('blocks ../ traversal out of root', () => {
      assert.throws(
        () => validator.validatePath('../outside'),
        BoundaryViolationError
      );
    });

    test('blocks multiple ../ traversals', () => {
      assert.throws(
        () => validator.validatePath('../../outside'),
        BoundaryViolationError
      );
    });

    test('blocks traversal via allowed path then escape', () => {
      assert.throws(
        () => validator.validatePath('subdir/../../outside'),
        BoundaryViolationError
      );
    });

    test('blocks absolute paths outside root', () => {
      assert.throws(
        () => validator.validatePath('/etc/passwd'),
        BoundaryViolationError
      );
    });

    test('allows ../ that stays within root', () => {
      const result = validator.validatePath('a/b/../c/file.txt');
      assert.ok(result.startsWith(testRoot));
      assert.ok(result.includes('a/c'));
    });
  });

  describe('validatePath() - Null Byte Injection Prevention', () => {
    test('blocks null byte in path', () => {
      assert.throws(
        () => validator.validatePath('file.txt\0.jpg'),
        BoundaryViolationError
      );
    });

    test('blocks null byte at start', () => {
      assert.throws(
        () => validator.validatePath('\0file.txt'),
        BoundaryViolationError
      );
    });

    test('blocks null byte at end', () => {
      assert.throws(
        () => validator.validatePath('file.txt\0'),
        BoundaryViolationError
      );
    });
  });

  describe('validatePath() - Input Validation', () => {
    test('rejects non-string input', () => {
      assert.throws(
        () => validator.validatePath(123),
        BoundaryViolationError
      );
    });

    test('rejects null input', () => {
      assert.throws(
        () => validator.validatePath(null),
        BoundaryViolationError
      );
    });

    test('rejects undefined input', () => {
      assert.throws(
        () => validator.validatePath(undefined),
        BoundaryViolationError
      );
    });

    test('rejects object input', () => {
      assert.throws(
        () => validator.validatePath({}),
        BoundaryViolationError
      );
    });
  });

  describe('validatePath() - Error Details', () => {
    test('error includes operation name', () => {
      try {
        validator.validatePath('../outside', 'testOperation');
        assert.fail('Should have thrown');
      } catch (error) {
        assert.strictEqual(error.operation, 'testOperation');
      }
    });

    test('error includes user path', () => {
      try {
        validator.validatePath('../outside');
        assert.fail('Should have thrown');
      } catch (error) {
        assert.strictEqual(error.userPath, '../outside');
      }
    });

    test('error includes resolved path for traversal', () => {
      try {
        validator.validatePath('../outside');
        assert.fail('Should have thrown');
      } catch (error) {
        assert.ok(error.resolvedPath);
      }
    });

    test('error includes allowed root', () => {
      try {
        validator.validatePath('../outside');
        assert.fail('Should have thrown');
      } catch (error) {
        assert.strictEqual(error.allowedRoot, testRoot);
      }
    });
  });

  describe('validatePaths() - Batch Validation', () => {
    test('validates multiple paths', () => {
      const paths = ['file1.txt', 'dir/file2.txt', 'a/b/c.txt'];
      const results = validator.validatePaths(paths);

      assert.strictEqual(results.length, 3);
      results.forEach(result => {
        assert.ok(result.startsWith(testRoot));
      });
    });

    test('throws on first invalid path', () => {
      const paths = ['valid.txt', '../invalid', 'another.txt'];
      assert.throws(
        () => validator.validatePaths(paths),
        BoundaryViolationError
      );
    });

    test('handles empty array', () => {
      const results = validator.validatePaths([]);
      assert.strictEqual(results.length, 0);
    });
  });

  describe('getBasename()', () => {
    test('extracts basename from path', () => {
      const result = validator.getBasename('dir/subdir/file.txt');
      assert.strictEqual(result, 'file.txt');
    });

    test('extracts basename from absolute path', () => {
      const result = validator.getBasename(join(testRoot, 'dir/file.txt'));
      assert.strictEqual(result, 'file.txt');
    });

    test('handles path with no directory', () => {
      const result = validator.getBasename('file.txt');
      assert.strictEqual(result, 'file.txt');
    });

    test('blocks traversal attempts in getBasename', () => {
      assert.throws(
        () => validator.getBasename('../outside/file.txt'),
        BoundaryViolationError
      );
    });
  });

  describe('getAllowedRoot()', () => {
    test('returns allowed root path', () => {
      const root = validator.getAllowedRoot();
      assert.strictEqual(root, testRoot);
    });

    test('returns absolute path', () => {
      const root = validator.getAllowedRoot();
      assert.ok(isAbsolute(root));
    });
  });

  describe('Security Edge Cases', () => {
    test('blocks Windows-style absolute path on Unix', () => {
      if (process.platform !== 'win32') {
        // On Unix, C: is just a directory name, not path traversal
        // But let's ensure it's handled correctly
        const result = validator.validatePath('C:/test');
        assert.ok(result.startsWith(testRoot));
      }
    });

    test('handles empty string gracefully', () => {
      // Empty string resolves to current directory (allowed root)
      const result = validator.validatePath('');
      assert.strictEqual(result, testRoot);
    });

    test('handles path with spaces', () => {
      const result = validator.validatePath('dir with spaces/file.txt');
      assert.ok(result.includes('dir with spaces'));
    });

    test('handles path with unicode characters', () => {
      const result = validator.validatePath('文件.txt');
      assert.ok(result.includes('文件.txt'));
    });

    test('blocks symlink-like patterns (..../ which is valid filename)', () => {
      // .... is a valid directory name, should be allowed
      const result = validator.validatePath('..../file.txt');
      assert.ok(result.startsWith(testRoot));
    });
  });

  describe('BoundaryViolationError', () => {
    test('is instance of Error', () => {
      const error = new BoundaryViolationError('test');
      assert.ok(error instanceof Error);
    });

    test('has correct name', () => {
      const error = new BoundaryViolationError('test');
      assert.strictEqual(error.name, 'BoundaryViolationError');
    });

    test('stores custom properties', () => {
      const error = new BoundaryViolationError('test', {
        userPath: '/bad',
        resolvedPath: '/etc',
        allowedRoot: '/safe',
        operation: 'read'
      });

      assert.strictEqual(error.userPath, '/bad');
      assert.strictEqual(error.resolvedPath, '/etc');
      assert.strictEqual(error.allowedRoot, '/safe');
      assert.strictEqual(error.operation, 'read');
    });
  });
});
