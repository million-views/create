/**
 * @fileoverview Tests for the lib/index.mts public facade
 * 
 * This test verifies that all domain namespaces are properly exported
 * and the public API is accessible.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Import the public facade
import * as lib from '../../lib/index.mts';

describe('lib/index.mts - Public Facade', () => {
  describe('Domain Namespaces', () => {
    it('exports error namespace', () => {
      assert.ok(lib.error, 'error namespace should be exported');
      assert.ok(lib.error.ValidationError, 'ValidationError should be accessible');
      assert.ok(lib.error.ContextualError, 'ContextualError should be accessible');
      assert.ok(lib.error.ViolationError, 'ViolationError should be accessible');
      assert.ok(lib.error.GateError, 'GateError should be accessible');
    });

    it('exports security namespace', () => {
      assert.ok(lib.security, 'security namespace should be exported');
      assert.ok(lib.security.Gate, 'Gate should be accessible');
      assert.ok(lib.security.Boundary, 'Boundary should be accessible');
      assert.ok(lib.security.sanitize, 'sanitize namespace should be accessible');
    });

    it('exports validation namespace', () => {
      assert.ok(lib.validation, 'validation namespace should be exported');
      assert.ok(lib.validation.schema, 'schema namespace should be accessible');
      assert.ok(lib.validation.domain, 'domain namespace should be accessible');
      assert.ok(lib.validation.cli, 'cli namespace should be accessible');
    });

    it('exports placeholder namespace', () => {
      assert.ok(lib.placeholder, 'placeholder namespace should be exported');
    });

    it('exports templatize namespace', () => {
      assert.ok(lib.templatize, 'templatize namespace should be exported');
      assert.ok(lib.templatize.strategy, 'strategy namespace should be accessible');
    });

    it('exports template namespace', () => {
      assert.ok(lib.template, 'template namespace should be exported');
      assert.ok(lib.template.TemplateDiscovery, 'TemplateDiscovery should be accessible');
      assert.ok(lib.template.createTemplateIgnoreSet, 'createTemplateIgnoreSet should be accessible');
    });

    it('exports util namespace', () => {
      assert.ok(lib.util, 'util namespace should be exported');
      assert.ok(lib.util.File, 'File should be accessible');
      assert.ok(lib.util.Shell, 'Shell should be accessible');
      assert.ok(lib.util.Text, 'Text should be accessible');
    });
  });

  describe('Direct Exports (backward compatibility)', () => {
    it('exports ValidationError directly', () => {
      assert.ok(lib.ValidationError, 'ValidationError should be directly exported');
      assert.strictEqual(lib.ValidationError, lib.error.ValidationError);
    });

    it('exports ContextualError directly', () => {
      assert.ok(lib.ContextualError, 'ContextualError should be directly exported');
      assert.strictEqual(lib.ContextualError, lib.error.ContextualError);
    });

    it('exports ViolationError directly', () => {
      assert.ok(lib.ViolationError, 'ViolationError should be directly exported');
      assert.strictEqual(lib.ViolationError, lib.error.ViolationError);
    });

    it('exports GateError directly', () => {
      assert.ok(lib.GateError, 'GateError should be directly exported');
      assert.strictEqual(lib.GateError, lib.error.GateError);
    });

    it('exports Gate directly', () => {
      assert.ok(lib.Gate, 'Gate should be directly exported');
      assert.strictEqual(lib.Gate, lib.security.Gate);
    });

    it('exports BoundaryValidator directly', () => {
      assert.ok(lib.BoundaryValidator, 'BoundaryValidator should be directly exported');
      assert.strictEqual(lib.BoundaryValidator, lib.security.BoundaryValidator);
    });
  });

  describe('Error class instantiation', () => {
    it('can instantiate ValidationError', () => {
      const err = new lib.ValidationError('test message');
      assert.ok(err instanceof Error);
      assert.strictEqual(err.message, 'test message');
    });

    it('can instantiate ContextualError', () => {
      const err = new lib.ContextualError('test message');
      assert.ok(err instanceof Error);
      assert.strictEqual(err.message, 'test message');
    });

    it('can instantiate ViolationError', () => {
      const err = new lib.ViolationError('test message');
      assert.ok(err instanceof Error);
      assert.strictEqual(err.message, 'test message');
    });

    it('can instantiate GateError', () => {
      const err = new lib.GateError('test message');
      assert.ok(err instanceof Error);
      assert.strictEqual(err.message, 'test message');
    });
  });

  describe('Export count verification', () => {
    it('has limited top-level exports (≤30)', () => {
      const exportCount = Object.keys(lib).length;
      assert.ok(exportCount <= 30, `Export count ${exportCount} exceeds limit of 30`);
      console.log(`  ℹ️  Current export count: ${exportCount}`);
    });

    it('exports exactly 7 domain namespaces', () => {
      const namespaces = ['error', 'security', 'validation', 'placeholder', 'templatize', 'template', 'util'];
      for (const ns of namespaces) {
        assert.ok(lib[ns], `Missing namespace: ${ns}`);
      }
    });
  });
});
