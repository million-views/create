#!/usr/bin/env node

import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeOptions } from '../../bin/create-scaffold/options-processor.mjs';
import { ValidationError } from '../../lib/shared/security.mjs';

test('normalizes catch-all capabilities tokens', () => {
  const dimensions = {
    capabilities: {
      type: 'multi',
      values: Object.freeze(['auth', 'testing', 'logging']),
      default: Object.freeze([]),
      requires: Object.freeze({}),
      conflicts: Object.freeze({}),
      policy: 'strict',
      builtIn: false,
      description: null
    }
  };

  const result = normalizeOptions({
    rawTokens: ['auth', 'testing'],
    dimensions
  });

  assert.deepEqual(result.byDimension.capabilities, ['auth', 'testing']);
  assert.deepEqual(result.unknown, []);
});

test('accepts keyed single-value dimension', () => {
  const dimensions = {
    stack: {
      type: 'single',
      values: Object.freeze(['react-vite', 'express']),
      default: 'react-vite',
      requires: Object.freeze({}),
      conflicts: Object.freeze({}),
      policy: 'strict',
      builtIn: false,
      description: null
    }
  };

  const result = normalizeOptions({
    rawTokens: ['stack=express'],
    dimensions
  });

  assert.equal(result.byDimension.stack, 'express');
});

test('unknown dimension is surfaced for callers', () => {
  const result = normalizeOptions({
    rawTokens: ['unsupported=value'],
    dimensions: {}
  });

  assert.equal(result.unknown.length, 1);
  assert.equal(result.unknown[0], 'unsupported=value');
});

test('policy warn records warning without failure', () => {
  const dimensions = {
    capabilities: {
      type: 'multi',
      values: Object.freeze(['auth']),
      default: Object.freeze([]),
      requires: Object.freeze({}),
      conflicts: Object.freeze({}),
      policy: 'warn',
      builtIn: false,
      description: null
    }
  };

  const result = normalizeOptions({
    rawTokens: ['logging'],
    dimensions
  });

  assert.deepEqual(result.unknown, []);
  assert.ok(result.warnings.length > 0);
});

test('conflicting values raise validation error', () => {
  const dimensions = {
    infrastructure: {
      type: 'multi',
      values: Object.freeze(['cloudflare-d1', 'cloudflare-turso']),
      default: Object.freeze([]),
      requires: Object.freeze({}),
      conflicts: Object.freeze({
        'cloudflare-d1': Object.freeze(['cloudflare-turso']),
        'cloudflare-turso': Object.freeze(['cloudflare-d1'])
      }),
      policy: 'strict',
      builtIn: false,
      description: null
    }
  };

  assert.throws(
    () => normalizeOptions({
      rawTokens: ['infrastructure=cloudflare-d1+cloudflare-turso'],
      dimensions
    }),
    (error) => {
      assert.ok(error instanceof ValidationError);
      return true;
    }
  );
});

test('normalizeOptions handles empty input', () => {
  const result = normalizeOptions({
    rawTokens: [],
    dimensions: {}
  });

  assert.deepEqual(result.byDimension, {});
  assert.deepEqual(result.unknown, []);
  assert.deepEqual(result.warnings, []);
});

test('normalizeOptions initializes single dimensions with defaults', () => {
  const dimensions = {
    auth: {
      type: 'single',
      values: ['none', 'basic'],
      default: 'none'
    }
  };

  const result = normalizeOptions({
    rawTokens: [],
    dimensions
  });

  assert.equal(result.byDimension.auth, 'none');
});

test('normalizeOptions initializes multi dimensions with defaults', () => {
  const dimensions = {
    features: {
      type: 'multi',
      values: ['api', 'db'],
      default: ['api']
    }
  };

  const result = normalizeOptions({
    rawTokens: [],
    dimensions
  });

  assert.deepEqual(result.byDimension.features, ['api']);
});

test('normalizeOptions throws on missing value', () => {
  const dimensions = {
    auth: {
      type: 'single',
      values: ['none', 'basic']
    }
  };

  assert.throws(() => {
    normalizeOptions({
      rawTokens: ['auth='],
      dimensions
    });
  }, ValidationError);
});

test('normalizeOptions throws on multiple values for single dimension', () => {
  const dimensions = {
    auth: {
      type: 'single',
      values: ['none', 'basic', 'jwt']
    }
  };

  assert.throws(() => {
    normalizeOptions({
      rawTokens: ['auth=basic+jwt'],
      dimensions
    });
  }, ValidationError);
});

test('normalizeOptions enforces dependencies', () => {
  const dimensions = {
    auth: {
      type: 'single',
      values: ['none', 'basic', 'jwt']
    },
    security: {
      type: 'single',
      values: ['low', 'high'],
      requires: {
        high: ['jwt']
      }
    }
  };

  assert.throws(() => {
    normalizeOptions({
      rawTokens: ['auth=basic', 'security=high'],
      dimensions
    });
  }, ValidationError);
});

test('normalizeOptions sorts multi-dimension values', () => {
  const dimensions = {
    features: {
      type: 'multi',
      values: ['api', 'db', 'auth', 'cache']
    }
  };

  const result = normalizeOptions({
    rawTokens: ['features=cache+api+db'],
    dimensions
  });

  assert.deepEqual(result.byDimension.features, ['api', 'cache', 'db']);
});
