#!/usr/bin/env node

import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeOptions } from '../bin/optionsProcessor.mjs';
import { ValidationError } from '../bin/security.mjs';

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
