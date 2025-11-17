#!/usr/bin/env node

import { test } from 'node:test';
import assert from 'node:assert';

import {
  handleValidationError,
  validateMultipleFields
} from '../../lib/validation-utils.mjs';
import { ValidationError } from '../../lib/security.mjs';

test('Validation Utils', async (t) => {
  await t.test('handleValidationError returns result on success', () => {
    const validationFn = (value) => value.toUpperCase();
    const errors = [];

    const result = handleValidationError(validationFn, 'test', errors, 'fallback');

    assert.equal(result, 'TEST', 'Should return transformed value');
    assert.equal(errors.length, 0, 'Should not add errors on success');
  });

  await t.test('handleValidationError handles ValidationError', () => {
    const validationFn = () => {
      throw new ValidationError('Custom validation error');
    };
    const errors = [];

    const result = handleValidationError(validationFn, 'test', errors, 'fallback');

    assert.equal(result, null, 'Should return null on error');
    assert.equal(errors.length, 1, 'Should add one error');
    assert.equal(errors[0], 'Custom validation error', 'Should capture ValidationError message');
  });

  await t.test('handleValidationError handles generic error with fallback', () => {
    const validationFn = () => {
      throw new Error('Generic error');
    };
    const errors = [];

    const result = handleValidationError(validationFn, 'test', errors, 'fallback message');

    assert.equal(result, null, 'Should return null on error');
    assert.equal(errors.length, 1, 'Should add one error');
    assert.equal(errors[0], 'fallback message', 'Should use fallback message for generic errors');
  });

  await t.test('validateMultipleFields handles all successful validations', () => {
    const validations = [
      {
        key: 'name',
        fn: (value) => value.toUpperCase(),
        value: 'test',
        fallback: 'Name validation failed'
      },
      {
        key: 'age',
        fn: (value) => parseInt(value),
        value: '25',
        fallback: 'Age validation failed'
      }
    ];

    const result = validateMultipleFields(validations);

    assert.equal(result.errors.length, 0, 'Should have no errors');
    assert.equal(result.validated.name, 'TEST', 'Should validate name');
    assert.equal(result.validated.age, 25, 'Should validate age');
  });

  await t.test('validateMultipleFields handles mixed success and failure', () => {
    const validations = [
      {
        key: 'name',
        fn: (value) => value.toUpperCase(),
        value: 'test',
        fallback: 'Name validation failed'
      },
      {
        key: 'age',
        fn: () => {
          throw new ValidationError('Invalid age format');
        },
        value: 'invalid',
        fallback: 'Age validation failed'
      },
      {
        key: 'email',
        fn: (value) => value + '@example.com',
        value: 'user',
        fallback: 'Email validation failed'
      }
    ];

    const result = validateMultipleFields(validations);

    assert.equal(result.errors.length, 1, 'Should have one error');
    assert.equal(result.errors[0], 'Invalid age format', 'Should capture validation error');
    assert.equal(result.validated.name, 'TEST', 'Should validate successful fields');
    assert.equal(result.validated.email, 'user@example.com', 'Should validate other successful fields');
    assert(!result.validated.hasOwnProperty('age'), 'Should not include failed validation in validated object');
  });

  await t.test('validateMultipleFields handles all failures', () => {
    const validations = [
      {
        key: 'name',
        fn: () => {
          throw new Error('Name error');
        },
        value: 'test',
        fallback: 'Name fallback'
      },
      {
        key: 'age',
        fn: () => {
          throw new ValidationError('Age error');
        },
        value: '25',
        fallback: 'Age fallback'
      }
    ];

    const result = validateMultipleFields(validations);

    assert.equal(result.errors.length, 2, 'Should have two errors');
    assert.equal(result.errors[0], 'Name fallback', 'Should use fallback for generic error');
    assert.equal(result.errors[1], 'Age error', 'Should capture ValidationError message');
    assert.deepEqual(result.validated, {}, 'Should have empty validated object');
  });

  await t.test('validateMultipleFields handles empty validations array', () => {
    const result = validateMultipleFields([]);

    assert.equal(result.errors.length, 0, 'Should have no errors');
    assert.deepEqual(result.validated, {}, 'Should have empty validated object');
  });
});
