#!/usr/bin/env node

/**
 * @fileoverview L2 Unit Tests for placeholder-schema.mjs
 *
 * Coverage target: placeholder-schema.mjs validation functions
 * Testing layer: L2 (Unit Tests - isolated module testing)
 * Philosophy: "Question before fixing" - tests validate actual SUT behavior
 */

import { strict as assert } from 'node:assert';
import test from 'node:test';

import { normalizePlaceholders, supportedPlaceholderTypes } from '@m5nv/create-scaffold/lib/placeholder/schema.mts';
import { ValidationError } from '@m5nv/create-scaffold/lib/error/validation.mts';

// =============================================================================
// Test Suite: normalizePlaceholders - Entry Validation
// =============================================================================

test('normalizePlaceholders - Entry Validation', async (t) => {
  await t.test('returns empty array for null entries', () => {
    const result = normalizePlaceholders(null);
    assert.deepEqual(result, []);
  });

  await t.test('returns empty array for undefined entries', () => {
    const result = normalizePlaceholders(undefined);
    assert.deepEqual(result, []);
  });

  await t.test('returns empty array for empty array', () => {
    const result = normalizePlaceholders([]);
    assert.deepEqual(result, []);
  });

  await t.test('throws ValidationError for non-object entry', () => {
    assert.throws(
      () => normalizePlaceholders(['not-an-object']),
      (error) => error instanceof ValidationError &&
        error.message.includes('entries must be objects')
    );
  });

  await t.test('throws ValidationError for null entry in array', () => {
    assert.throws(
      () => normalizePlaceholders([null]),
      (error) => error instanceof ValidationError &&
        error.message.includes('entries must be objects')
    );
  });

  await t.test('throws ValidationError for entry without name', () => {
    assert.throws(
      () => normalizePlaceholders([{ description: 'test' }]),
      (error) => error instanceof ValidationError &&
        error.message.includes('must include a name string')
    );
  });

  await t.test('throws ValidationError for entry with non-string name', () => {
    assert.throws(
      () => normalizePlaceholders([{ name: 123 }]),
      (error) => error instanceof ValidationError &&
        error.message.includes('must include a name string')
    );
  });
});

// =============================================================================
// Test Suite: normalizePlaceholders - Placeholder Name Pattern
// =============================================================================

test('normalizePlaceholders - Placeholder Name Pattern', async (t) => {
  await t.test('throws ValidationError for name without mustache syntax', () => {
    assert.throws(
      () => normalizePlaceholders([{ name: 'PROJECT_NAME', description: 'test' }]),
      (error) => error instanceof ValidationError &&
        error.message.includes('Invalid placeholder name')
    );
  });

  await t.test('throws ValidationError for incomplete mustache syntax', () => {
    assert.throws(
      () => normalizePlaceholders([{ name: '{{PROJECT_NAME', description: 'test' }]),
      (error) => error instanceof ValidationError &&
        error.message.includes('Invalid placeholder name')
    );
  });

  await t.test('throws ValidationError for lowercase token', () => {
    assert.throws(
      () => normalizePlaceholders([{ name: '{{project_name}}', description: 'test' }]),
      (error) => error instanceof ValidationError &&
        error.message.includes('must use A-Z, 0-9, or underscore')
    );
  });

  await t.test('throws ValidationError for token with special characters', () => {
    assert.throws(
      () => normalizePlaceholders([{ name: '{{PROJECT-NAME}}', description: 'test' }]),
      (error) => error instanceof ValidationError &&
        error.message.includes('must use A-Z, 0-9, or underscore')
    );
  });

  await t.test('throws ValidationError for token with spaces', () => {
    assert.throws(
      () => normalizePlaceholders([{ name: '{{PROJECT NAME}}', description: 'test' }]),
      (error) => error instanceof ValidationError &&
        error.message.includes('must use A-Z, 0-9, or underscore')
    );
  });

  await t.test('accepts valid uppercase token', () => {
    const result = normalizePlaceholders([{
      name: '{{PROJECT_NAME}}',
      description: 'test'
    }]);
    assert.equal(result[0].token, 'PROJECT_NAME');
  });

  await t.test('accepts token with numbers', () => {
    const result = normalizePlaceholders([{
      name: '{{PROJECT123}}',
      description: 'test'
    }]);
    assert.equal(result[0].token, 'PROJECT123');
  });

  await t.test('trims whitespace in name and token', () => {
    const result = normalizePlaceholders([{
      name: '  {{ PROJECT_NAME }}  ',
      description: 'test'
    }]);
    assert.equal(result[0].raw, '{{ PROJECT_NAME }}');
    assert.equal(result[0].token, 'PROJECT_NAME');
  });
});

// =============================================================================
// Test Suite: normalizePlaceholders - Duplicate Detection
// =============================================================================

test('normalizePlaceholders - Duplicate Detection', async (t) => {
  await t.test('throws ValidationError for duplicate tokens', () => {
    assert.throws(
      () => normalizePlaceholders([
        { name: '{{PROJECT_NAME}}', description: 'first' },
        { name: '{{PROJECT_NAME}}', description: 'second' }
      ]),
      (error) => error instanceof ValidationError &&
        error.message.includes('Duplicate placeholder token')
    );
  });

  await t.test('allows different tokens', () => {
    const result = normalizePlaceholders([
      { name: '{{PROJECT_NAME}}', description: 'first' },
      { name: '{{AUTHOR_NAME}}', description: 'second' }
    ]);
    assert.equal(result.length, 2);
    assert.equal(result[0].token, 'PROJECT_NAME');
    assert.equal(result[1].token, 'AUTHOR_NAME');
  });
});

// =============================================================================
// Test Suite: normalizePlaceholders - Type Validation
// =============================================================================

test('normalizePlaceholders - Type Validation', async (t) => {
  await t.test('defaults to text type when not specified', () => {
    const result = normalizePlaceholders([{
      name: '{{PROJECT_NAME}}',
      description: 'test'
    }]);
    assert.equal(result[0].type, 'text');
  });

  await t.test('defaults to text type for null type', () => {
    const result = normalizePlaceholders([{
      name: '{{PROJECT_NAME}}',
      description: 'test',
      type: null
    }]);
    assert.equal(result[0].type, 'text');
  });

  await t.test('throws ValidationError for non-string type', () => {
    assert.throws(
      () => normalizePlaceholders([{
        name: '{{PROJECT_NAME}}',
        description: 'test',
        type: 123
      }]),
      (error) => error instanceof ValidationError &&
        error.message.includes('invalid type hint')
    );
  });

  await t.test('throws ValidationError for unsupported type', () => {
    assert.throws(
      () => normalizePlaceholders([{
        name: '{{PROJECT_NAME}}',
        description: 'test',
        type: 'invalid'
      }]),
      (error) => error instanceof ValidationError &&
        error.message.includes('unsupported type hint')
    );
  });

  await t.test('normalizes type to lowercase', () => {
    const result = normalizePlaceholders([{
      name: '{{PROJECT_NAME}}',
      description: 'test',
      type: 'TEXT'
    }]);
    assert.equal(result[0].type, 'text');
  });

  await t.test('accepts text type', () => {
    const result = normalizePlaceholders([{
      name: '{{PROJECT_NAME}}',
      description: 'test',
      type: 'text'
    }]);
    assert.equal(result[0].type, 'text');
  });

  await t.test('accepts number type', () => {
    const result = normalizePlaceholders([{
      name: '{{COUNT}}',
      description: 'test',
      type: 'number'
    }]);
    assert.equal(result[0].type, 'number');
  });

  await t.test('accepts boolean type', () => {
    const result = normalizePlaceholders([{
      name: '{{ENABLED}}',
      description: 'test',
      type: 'boolean'
    }]);
    assert.equal(result[0].type, 'boolean');
  });

  await t.test('accepts email type', () => {
    const result = normalizePlaceholders([{
      name: '{{EMAIL}}',
      description: 'test',
      type: 'email'
    }]);
    assert.equal(result[0].type, 'email');
  });

  await t.test('accepts password type', () => {
    const result = normalizePlaceholders([{
      name: '{{SECRET}}',
      description: 'test',
      type: 'password'
    }]);
    assert.equal(result[0].type, 'password');
  });

  await t.test('accepts url type', () => {
    const result = normalizePlaceholders([{
      name: '{{HOMEPAGE}}',
      description: 'test',
      type: 'url'
    }]);
    assert.equal(result[0].type, 'url');
  });

  await t.test('maps legacy string type to text', () => {
    const result = normalizePlaceholders([{
      name: '{{PROJECT_NAME}}',
      description: 'test',
      type: 'string'
    }]);
    assert.equal(result[0].type, 'text');
  });
});

// =============================================================================
// Test Suite: normalizePlaceholders - Default Value Validation
// =============================================================================

test('normalizePlaceholders - Default Value Validation', async (t) => {
  await t.test('returns null for undefined default', () => {
    const result = normalizePlaceholders([{
      name: '{{PROJECT_NAME}}',
      description: 'test'
    }]);
    assert.equal(result[0].defaultValue, null);
  });

  await t.test('returns null for null default', () => {
    const result = normalizePlaceholders([{
      name: '{{PROJECT_NAME}}',
      description: 'test',
      default: null
    }]);
    assert.equal(result[0].defaultValue, null);
  });

  // Text type defaults
  await t.test('accepts string default for text type', () => {
    const result = normalizePlaceholders([{
      name: '{{PROJECT_NAME}}',
      description: 'test',
      type: 'text',
      default: 'my-project'
    }]);
    assert.equal(result[0].defaultValue, 'my-project');
  });

  await t.test('throws for non-string default with text type', () => {
    assert.throws(
      () => normalizePlaceholders([{
        name: '{{PROJECT_NAME}}',
        description: 'test',
        type: 'text',
        default: 123
      }]),
      (error) => error instanceof ValidationError &&
        error.message.includes('invalid default')
    );
  });

  // Email type defaults
  await t.test('accepts string default for email type', () => {
    const result = normalizePlaceholders([{
      name: '{{EMAIL}}',
      description: 'test',
      type: 'email',
      default: 'user@example.com'
    }]);
    assert.equal(result[0].defaultValue, 'user@example.com');
  });

  await t.test('throws for non-string default with email type', () => {
    assert.throws(
      () => normalizePlaceholders([{
        name: '{{EMAIL}}',
        description: 'test',
        type: 'email',
        default: 123
      }]),
      (error) => error instanceof ValidationError &&
        error.message.includes('invalid default')
    );
  });

  // Password type defaults
  await t.test('accepts string default for password type', () => {
    const result = normalizePlaceholders([{
      name: '{{SECRET}}',
      description: 'test',
      type: 'password',
      default: 'secret123'
    }]);
    assert.equal(result[0].defaultValue, 'secret123');
  });

  await t.test('throws for non-string default with password type', () => {
    assert.throws(
      () => normalizePlaceholders([{
        name: '{{SECRET}}',
        description: 'test',
        type: 'password',
        default: 123
      }]),
      (error) => error instanceof ValidationError &&
        error.message.includes('invalid default')
    );
  });

  // URL type defaults
  await t.test('accepts string default for url type', () => {
    const result = normalizePlaceholders([{
      name: '{{HOMEPAGE}}',
      description: 'test',
      type: 'url',
      default: 'https://example.com'
    }]);
    assert.equal(result[0].defaultValue, 'https://example.com');
  });

  await t.test('throws for non-string default with url type', () => {
    assert.throws(
      () => normalizePlaceholders([{
        name: '{{HOMEPAGE}}',
        description: 'test',
        type: 'url',
        default: 123
      }]),
      (error) => error instanceof ValidationError &&
        error.message.includes('invalid default')
    );
  });

  // Number type defaults
  await t.test('accepts number default for number type', () => {
    const result = normalizePlaceholders([{
      name: '{{COUNT}}',
      description: 'test',
      type: 'number',
      default: 42
    }]);
    assert.equal(result[0].defaultValue, 42);
  });

  await t.test('coerces string to number for number type', () => {
    const result = normalizePlaceholders([{
      name: '{{COUNT}}',
      description: 'test',
      type: 'number',
      default: '42.5'
    }]);
    assert.equal(result[0].defaultValue, 42.5);
  });

  await t.test('throws for non-numeric string with number type', () => {
    assert.throws(
      () => normalizePlaceholders([{
        name: '{{COUNT}}',
        description: 'test',
        type: 'number',
        default: 'not-a-number'
      }]),
      (error) => error instanceof ValidationError &&
        error.message.includes('cannot be coerced to number')
    );
  });

  await t.test('throws for NaN result with number type', () => {
    assert.throws(
      () => normalizePlaceholders([{
        name: '{{COUNT}}',
        description: 'test',
        type: 'number',
        default: {}
      }]),
      (error) => error instanceof ValidationError &&
        error.message.includes('cannot be coerced to number')
    );
  });

  await t.test('throws for Infinity with number type', () => {
    assert.throws(
      () => normalizePlaceholders([{
        name: '{{COUNT}}',
        description: 'test',
        type: 'number',
        default: 'Infinity'
      }]),
      (error) => error instanceof ValidationError &&
        error.message.includes('cannot be coerced to number')
    );
  });

  // Boolean type defaults
  await t.test('accepts boolean true for boolean type', () => {
    const result = normalizePlaceholders([{
      name: '{{ENABLED}}',
      description: 'test',
      type: 'boolean',
      default: true
    }]);
    assert.equal(result[0].defaultValue, true);
  });

  await t.test('accepts boolean false for boolean type', () => {
    const result = normalizePlaceholders([{
      name: '{{ENABLED}}',
      description: 'test',
      type: 'boolean',
      default: false
    }]);
    assert.equal(result[0].defaultValue, false);
  });

  await t.test('coerces string "true" to boolean true', () => {
    const result = normalizePlaceholders([{
      name: '{{ENABLED}}',
      description: 'test',
      type: 'boolean',
      default: 'true'
    }]);
    assert.equal(result[0].defaultValue, true);
  });

  await t.test('coerces string "false" to boolean false', () => {
    const result = normalizePlaceholders([{
      name: '{{ENABLED}}',
      description: 'test',
      type: 'boolean',
      default: 'false'
    }]);
    assert.equal(result[0].defaultValue, false);
  });

  await t.test('coerces string "TRUE" to boolean true (case insensitive)', () => {
    const result = normalizePlaceholders([{
      name: '{{ENABLED}}',
      description: 'test',
      type: 'boolean',
      default: 'TRUE'
    }]);
    assert.equal(result[0].defaultValue, true);
  });

  await t.test('coerces string " true " to boolean true (with whitespace)', () => {
    const result = normalizePlaceholders([{
      name: '{{ENABLED}}',
      description: 'test',
      type: 'boolean',
      default: ' true '
    }]);
    assert.equal(result[0].defaultValue, true);
  });

  await t.test('throws for non-boolean string with boolean type', () => {
    assert.throws(
      () => normalizePlaceholders([{
        name: '{{ENABLED}}',
        description: 'test',
        type: 'boolean',
        default: 'yes'
      }]),
      (error) => error instanceof ValidationError &&
        error.message.includes('cannot be coerced to boolean')
    );
  });

  await t.test('throws for number with boolean type', () => {
    assert.throws(
      () => normalizePlaceholders([{
        name: '{{ENABLED}}',
        description: 'test',
        type: 'boolean',
        default: 1
      }]),
      (error) => error instanceof ValidationError &&
        error.message.includes('cannot be coerced to boolean')
    );
  });
});

// =============================================================================
// Test Suite: normalizePlaceholders - Optional Fields
// =============================================================================

test('normalizePlaceholders - Optional Fields', async (t) => {
  await t.test('defaults required to true (new schema)', () => {
    const result = normalizePlaceholders([{
      name: '{{PROJECT_NAME}}',
      description: 'test'
    }]);
    assert.equal(result[0].required, true);
  });

  await t.test('respects explicit required false', () => {
    const result = normalizePlaceholders([{
      name: '{{PROJECT_NAME}}',
      description: 'test',
      required: false
    }]);
    assert.equal(result[0].required, false);
  });

  await t.test('respects explicit required true', () => {
    const result = normalizePlaceholders([{
      name: '{{PROJECT_NAME}}',
      description: 'test',
      required: true
    }]);
    assert.equal(result[0].required, true);
  });

  await t.test('defaults sensitive to false', () => {
    const result = normalizePlaceholders([{
      name: '{{PROJECT_NAME}}',
      description: 'test'
    }]);
    assert.equal(result[0].sensitive, false);
  });

  await t.test('sets sensitive true from sensitive field', () => {
    const result = normalizePlaceholders([{
      name: '{{SECRET}}',
      description: 'test',
      sensitive: true
    }]);
    assert.equal(result[0].sensitive, true);
  });

  await t.test('sets sensitive true from secure field (new schema)', () => {
    const result = normalizePlaceholders([{
      name: '{{SECRET}}',
      description: 'test',
      secure: true
    }]);
    assert.equal(result[0].sensitive, true);
  });

  await t.test('returns null for missing description', () => {
    const result = normalizePlaceholders([{
      name: '{{PROJECT_NAME}}'
    }]);
    assert.equal(result[0].description, null);
  });

  await t.test('returns null for non-string description', () => {
    const result = normalizePlaceholders([{
      name: '{{PROJECT_NAME}}',
      description: 123
    }]);
    assert.equal(result[0].description, null);
  });

  await t.test('returns null for empty description', () => {
    const result = normalizePlaceholders([{
      name: '{{PROJECT_NAME}}',
      description: '   '
    }]);
    assert.equal(result[0].description, null);
  });

  await t.test('trims description', () => {
    const result = normalizePlaceholders([{
      name: '{{PROJECT_NAME}}',
      description: '  A project name  '
    }]);
    assert.equal(result[0].description, 'A project name');
  });
});

// =============================================================================
// Test Suite: normalizePlaceholders - Full Normalization
// =============================================================================

test('normalizePlaceholders - Full Normalization', async (t) => {
  await t.test('returns complete normalized placeholder', () => {
    const result = normalizePlaceholders([{
      name: '{{PROJECT_NAME}}',
      description: 'The name of the project',
      type: 'text',
      default: 'my-project',
      required: false,
      sensitive: false
    }]);

    assert.deepEqual(result[0], {
      token: 'PROJECT_NAME',
      raw: '{{PROJECT_NAME}}',
      description: 'The name of the project',
      required: false,
      defaultValue: 'my-project',
      sensitive: false,
      type: 'text'
    });
  });

  await t.test('normalizes multiple placeholders', () => {
    const result = normalizePlaceholders([
      { name: '{{PROJECT_NAME}}', description: 'project name' },
      { name: '{{AUTHOR}}', description: 'author name', required: false },
      { name: '{{COUNT}}', description: 'count', type: 'number', default: 10 },
      { name: '{{ENABLED}}', description: 'enabled', type: 'boolean', default: true },
      { name: '{{API_KEY}}', description: 'API key', secure: true }
    ]);

    assert.equal(result.length, 5);
    assert.equal(result[0].token, 'PROJECT_NAME');
    assert.equal(result[1].required, false);
    assert.equal(result[2].defaultValue, 10);
    assert.equal(result[3].defaultValue, true);
    assert.equal(result[4].sensitive, true);
  });
});

// =============================================================================
// Test Suite: supportedPlaceholderTypes Export
// =============================================================================

test('supportedPlaceholderTypes export', async (t) => {
  await t.test('exports supported types as frozen array', () => {
    assert(Array.isArray(supportedPlaceholderTypes));
    assert(Object.isFrozen(supportedPlaceholderTypes));
  });

  await t.test('contains expected types', () => {
    assert(supportedPlaceholderTypes.includes('text'));
    assert(supportedPlaceholderTypes.includes('number'));
    assert(supportedPlaceholderTypes.includes('boolean'));
    assert(supportedPlaceholderTypes.includes('email'));
    assert(supportedPlaceholderTypes.includes('password'));
    assert(supportedPlaceholderTypes.includes('url'));
  });

  await t.test('contains exactly 6 types', () => {
    assert.equal(supportedPlaceholderTypes.length, 6);
  });
});
