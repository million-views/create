#!/usr/bin/env node

import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePlaceholders } from '../bin/utils/placeholderSchema.mjs';
import { ValidationError } from '../bin/security.mjs';

test('normalizes placeholder entries and strips braces', () => {
  const result = normalizePlaceholders([
    {
      name: '{{PROJECT_NAME}}',
      description: 'Project name',
      required: true,
      default: 'demo-app'
    },
    {
      name: '{{AUTHOR}}'
    }
  ]);

  assert.equal(result.length, 2);
  assert.deepEqual(result[0], {
    token: 'PROJECT_NAME',
    raw: '{{PROJECT_NAME}}',
    description: 'Project name',
    required: true,
    defaultValue: 'demo-app',
    sensitive: false,
    type: 'string'
  });
  assert.equal(result[1].token, 'AUTHOR');
  assert.equal(result[1].required, false);
  assert.equal(result[1].defaultValue, null);
});

test('coerces defaults based on type hints', () => {
  const result = normalizePlaceholders([
    { name: '{{MAX_WORKERS}}', type: 'number', default: '10' },
    { name: '{{ENABLE_LOGGING}}', type: 'boolean', default: 'true' }
  ]);

  assert.equal(result[0].type, 'number');
  assert.equal(result[0].defaultValue, 10);
  assert.equal(result[1].type, 'boolean');
  assert.equal(result[1].defaultValue, true);
});

test('throws when placeholder definitions are duplicated', () => {
  assert.throws(
    () => normalizePlaceholders([
      { name: '{{PROJECT_NAME}}' },
      { name: '{{PROJECT_NAME}}' }
    ]),
    ValidationError
  );
});

test('throws on invalid placeholder names', () => {
  assert.throws(
    () => normalizePlaceholders([
      { name: 'PROJECT_NAME' }
    ]),
    ValidationError
  );
});

test('throws on unsupported type hints', () => {
  assert.throws(
    () => normalizePlaceholders([
      { name: '{{TOKEN}}', type: 'date' }
    ]),
    ValidationError
  );
});

test('throws when defaults cannot be coerced', () => {
  assert.throws(
    () => normalizePlaceholders([
      { name: '{{MAX_WORKERS}}', type: 'number', default: 'abc' }
    ]),
    ValidationError
  );
});
