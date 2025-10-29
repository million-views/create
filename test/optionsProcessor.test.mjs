#!/usr/bin/env node

import { normalizeOptions } from '../bin/optionsProcessor.mjs';
import { ValidationError } from '../bin/security.mjs';

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function run() {
  let passed = 0;
  let failed = 0;

  for (const { name, fn } of tests) {
    try {
      fn();
      passed++;
    } catch (error) {
      failed++;
      console.error(`❌ ${name}: ${error.message}`);
    }
  }

  console.log(`✅ ${passed} passed, ❌ ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

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

  if (!Array.isArray(result.byDimension.capabilities) || result.byDimension.capabilities.length !== 2) {
    throw new Error('Expected capabilities to include selected tokens');
  }

  if (result.unknown.length !== 0) {
    throw new Error('No tokens should be unknown');
  }
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

  if (result.byDimension.stack !== 'express') {
    throw new Error('Expected stack dimension to equal "express"');
  }
});

test('unknown dimension is surfaced for callers', () => {
  const result = normalizeOptions({
    rawTokens: ['unsupported=value'],
    dimensions: {}
  });

  if (result.unknown.length !== 1) {
    throw new Error('Expected unsupported token to be reported as unknown');
  }
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

  if (result.unknown.length !== 0) {
    throw new Error('Warn policy should not mark tokens as unknown');
  }

  if (result.warnings.length === 0) {
    throw new Error('Warn policy should record a warning');
  }
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

  try {
    normalizeOptions({
      rawTokens: ['infrastructure=cloudflare-d1+cloudflare-turso'],
      dimensions
    });
    throw new Error('Expected conflict to raise ValidationError');
  } catch (error) {
    if (!(error instanceof ValidationError)) {
      throw error;
    }
  }
});

run();
