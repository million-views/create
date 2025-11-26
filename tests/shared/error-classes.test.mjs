#!/usr/bin/env node

/**
 * Layer 2 Tests: error-classes.mjs - Custom error class instantiation and properties
 *
 * Tests error classes in isolation without Node.js imports
 * Focus: ArgumentError and PreflightError constructors with all parameter combinations
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ArgumentError, PreflightError } from '../../lib/error/index.mts';

describe('Error Classes', () => {
  describe('ArgumentError', () => {
    it('creates error with message only', () => {
      const error = new ArgumentError('Invalid argument');

      assert.strictEqual(error.message, 'Invalid argument');
      assert.strictEqual(error.name, 'ArgumentError');
      assert.strictEqual(error.field, undefined);
      assert.deepStrictEqual(error.suggestions, []);
      assert.ok(error instanceof Error);
      assert.ok(error instanceof ArgumentError);
    });

    it('creates error with field option', () => {
      const error = new ArgumentError('Invalid field value', { field: 'templateName' });

      assert.strictEqual(error.message, 'Invalid field value');
      assert.strictEqual(error.name, 'ArgumentError');
      assert.strictEqual(error.field, 'templateName');
      assert.deepStrictEqual(error.suggestions, []);
    });

    it('creates error with suggestions option', () => {
      const suggestions = ['Use --help for usage', 'Check the docs'];
      const error = new ArgumentError('Command failed', { suggestions });

      assert.strictEqual(error.message, 'Command failed');
      assert.strictEqual(error.name, 'ArgumentError');
      assert.strictEqual(error.field, undefined);
      assert.deepStrictEqual(error.suggestions, suggestions);
    });

    it('creates error with both field and suggestions', () => {
      const suggestions = ['Use valid template name'];
      const error = new ArgumentError('Invalid template', {
        field: 'template',
        suggestions
      });

      assert.strictEqual(error.message, 'Invalid template');
      assert.strictEqual(error.name, 'ArgumentError');
      assert.strictEqual(error.field, 'template');
      assert.deepStrictEqual(error.suggestions, suggestions);
    });

    it('handles empty options object', () => {
      const error = new ArgumentError('Error message', {});

      assert.strictEqual(error.message, 'Error message');
      assert.strictEqual(error.name, 'ArgumentError');
      assert.strictEqual(error.field, undefined);
      assert.deepStrictEqual(error.suggestions, []);
    });

    it('handles undefined field in options', () => {
      const error = new ArgumentError('Error', { field: undefined, suggestions: ['tip'] });

      assert.strictEqual(error.field, undefined);
      assert.deepStrictEqual(error.suggestions, ['tip']);
    });

    it('handles null suggestions in options', () => {
      const error = new ArgumentError('Error', { field: 'name', suggestions: null });

      assert.strictEqual(error.field, 'name');
      assert.deepStrictEqual(error.suggestions, []); // null coalesces to []
    });

    it('handles undefined suggestions in options', () => {
      const error = new ArgumentError('Error', { field: 'name', suggestions: undefined });

      assert.strictEqual(error.field, 'name');
      assert.deepStrictEqual(error.suggestions, []); // undefined coalesces to []
    });

    it('preserves error stack trace', () => {
      const error = new ArgumentError('Test error');

      assert.ok(error.stack);
      assert.ok(error.stack.includes('ArgumentError'));
      assert.ok(error.stack.includes('Test error'));
    });
  });

  describe('PreflightError', () => {
    it('creates error with message only', () => {
      const error = new PreflightError('Preflight check failed');

      assert.strictEqual(error.message, 'Preflight check failed');
      assert.strictEqual(error.name, 'PreflightError');
      assert.strictEqual(error.code, null);
      assert.ok(error instanceof Error);
      assert.ok(error instanceof PreflightError);
    });

    it('creates error with code parameter', () => {
      const error = new PreflightError('Git not found', 'ENOENT');

      assert.strictEqual(error.message, 'Git not found');
      assert.strictEqual(error.name, 'PreflightError');
      assert.strictEqual(error.code, 'ENOENT');
    });

    it('creates error with numeric code', () => {
      const error = new PreflightError('Exit code error', 127);

      assert.strictEqual(error.message, 'Exit code error');
      assert.strictEqual(error.name, 'PreflightError');
      assert.strictEqual(error.code, 127);
    });

    it('creates error with null code explicitly', () => {
      const error = new PreflightError('Generic failure', null);

      assert.strictEqual(error.message, 'Generic failure');
      assert.strictEqual(error.name, 'PreflightError');
      assert.strictEqual(error.code, null);
    });

    it('creates error with undefined code (defaults to null)', () => {
      const error = new PreflightError('Undefined code', undefined);

      assert.strictEqual(error.message, 'Undefined code');
      assert.strictEqual(error.name, 'PreflightError');
      assert.strictEqual(error.code, null); // undefined parameter uses default value null
    });

    it('handles empty string code', () => {
      const error = new PreflightError('Empty code', '');

      assert.strictEqual(error.code, '');
    });

    it('preserves error stack trace', () => {
      const error = new PreflightError('Test preflight error', 'TEST_CODE');

      assert.ok(error.stack);
      assert.ok(error.stack.includes('PreflightError'));
      assert.ok(error.stack.includes('Test preflight error'));
    });

    it('supports instanceof checks', () => {
      const error = new PreflightError('Test');

      assert.ok(error instanceof Error);
      assert.ok(error instanceof PreflightError);
      assert.ok(!(error instanceof ArgumentError));
    });
  });

  describe('Error Class Interactions', () => {
    it('distinguishes between ArgumentError and PreflightError', () => {
      const argError = new ArgumentError('Arg error');
      const preflightError = new PreflightError('Preflight error');

      assert.ok(argError instanceof ArgumentError);
      assert.ok(!(argError instanceof PreflightError));

      assert.ok(preflightError instanceof PreflightError);
      assert.ok(!(preflightError instanceof ArgumentError));
    });

    it('both error types are instanceof Error', () => {
      const argError = new ArgumentError('Arg error');
      const preflightError = new PreflightError('Preflight error');

      assert.ok(argError instanceof Error);
      assert.ok(preflightError instanceof Error);
    });

    it('can be thrown and caught', () => {
      assert.throws(
        () => { throw new ArgumentError('Test throw'); },
        ArgumentError
      );

      assert.throws(
        () => { throw new PreflightError('Test throw', 'CODE'); },
        PreflightError
      );
    });

    it('can be caught as generic Error', () => {
      assert.throws(
        () => { throw new ArgumentError('Test'); },
        Error
      );

      assert.throws(
        () => { throw new PreflightError('Test'); },
        Error
      );
    });
  });
});
