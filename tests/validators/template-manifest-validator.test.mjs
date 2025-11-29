#!/usr/bin/env node

/**
 * @fileoverview L2 Unit Tests for template-manifest-validator.mjs
 *
 * Coverage target: template-manifest-validator.mjs validation functions
 * Testing layer: L2 (Unit Tests - isolated module testing)
 * Philosophy: "Question before fixing" - tests validate actual SUT behavior
 */

import { strict as assert } from 'node:assert';
import test from 'node:test';

import { validateTemplateManifest } from '@m5nv/create/lib/validation/schema/manifest.mts';
import { ValidationError } from '@m5nv/create/lib/error/validation.mts';

// =============================================================================
// Test Suite: validateTemplateManifest - Input Validation
// =============================================================================

test('validateTemplateManifest - Input Validation', async (t) => {
  await t.test('throws ValidationError for null manifest', () => {
    assert.throws(
      () => validateTemplateManifest(null),
      (error) => error instanceof ValidationError &&
        error.message.includes('must be an object')
    );
  });

  await t.test('throws ValidationError for undefined manifest', () => {
    assert.throws(
      () => validateTemplateManifest(undefined),
      (error) => error instanceof ValidationError &&
        error.message.includes('must be an object')
    );
  });

  await t.test('throws ValidationError for array manifest', () => {
    assert.throws(
      () => validateTemplateManifest([]),
      (error) => error instanceof ValidationError &&
        error.message.includes('must be an object')
    );
  });

  await t.test('throws ValidationError for primitive manifest', () => {
    assert.throws(
      () => validateTemplateManifest('not-an-object'),
      (error) => error instanceof ValidationError &&
        error.message.includes('must be an object')
    );
  });

  await t.test('throws ValidationError for missing schemaVersion', () => {
    assert.throws(
      () => validateTemplateManifest({}),
      (error) => error instanceof ValidationError &&
        error.field === 'schemaVersion'
    );
  });

  await t.test('throws ValidationError for non-1.0.0 schemaVersion', () => {
    assert.throws(
      () => validateTemplateManifest({ schemaVersion: '2.0.0' }),
      (error) => error instanceof ValidationError &&
        error.message.includes('schemaVersion: "1.0.0"')
    );
  });
});

// =============================================================================
// Test Suite: validateTemplateManifest - V1 Required Fields
// =============================================================================

test('validateTemplateManifest - V1 Required Fields', async (t) => {
  await t.test('throws ValidationError for missing id', () => {
    assert.throws(
      () => validateTemplateManifest({
        schemaVersion: '1.0.0',
        name: 'Test',
        description: 'Test template'
      }),
      (error) => error instanceof ValidationError &&
        error.field === 'id'
    );
  });

  await t.test('throws ValidationError for non-string id', () => {
    assert.throws(
      () => validateTemplateManifest({
        schemaVersion: '1.0.0',
        id: 123,
        name: 'Test',
        description: 'Test template'
      }),
      (error) => error instanceof ValidationError &&
        error.field === 'id'
    );
  });

  await t.test('throws ValidationError for invalid id format', () => {
    assert.throws(
      () => validateTemplateManifest({
        schemaVersion: '1.0.0',
        id: 'invalid-format',
        name: 'Test',
        description: 'Test template'
      }),
      (error) => error instanceof ValidationError &&
        error.message.includes('Invalid ID format')
    );
  });

  await t.test('throws ValidationError for missing name', () => {
    assert.throws(
      () => validateTemplateManifest({
        schemaVersion: '1.0.0',
        id: 'test/template'
      }),
      (error) => error instanceof ValidationError &&
        error.field === 'name'
    );
  });

  await t.test('throws ValidationError for non-string name', () => {
    assert.throws(
      () => validateTemplateManifest({
        schemaVersion: '1.0.0',
        id: 'test/template',
        name: 123
      }),
      (error) => error instanceof ValidationError &&
        error.field === 'name'
    );
  });

  await t.test('throws ValidationError for missing description', () => {
    assert.throws(
      () => validateTemplateManifest({
        schemaVersion: '1.0.0',
        id: 'test/template',
        name: 'Test Template'
      }),
      (error) => error instanceof ValidationError &&
        error.field === 'description'
    );
  });

  await t.test('throws ValidationError for non-string description', () => {
    assert.throws(
      () => validateTemplateManifest({
        schemaVersion: '1.0.0',
        id: 'test/template',
        name: 'Test Template',
        description: 123
      }),
      (error) => error instanceof ValidationError &&
        error.field === 'description'
    );
  });

  await t.test('throws ValidationError for missing placeholderFormat', () => {
    assert.throws(
      () => validateTemplateManifest({
        schemaVersion: '1.0.0',
        id: 'test/template',
        name: 'Test Template',
        description: 'A test template'
      }),
      (error) => error instanceof ValidationError &&
        error.field === 'placeholderFormat'
    );
  });

  await t.test('throws ValidationError for invalid placeholderFormat', () => {
    assert.throws(
      () => validateTemplateManifest({
        schemaVersion: '1.0.0',
        id: 'test/template',
        name: 'Test Template',
        description: 'A test template',
        placeholderFormat: 'invalid'
      }),
      (error) => error instanceof ValidationError &&
        error.message.includes('Invalid placeholderFormat')
    );
  });

  await t.test('accepts valid placeholderFormat: unicode', () => {
    const manifest = {
      schemaVersion: '1.0.0',
      id: 'test/template',
      name: 'Test Template',
      description: 'A test template',
      placeholderFormat: 'unicode',
      placeholders: {}
    };
    const result = validateTemplateManifest(manifest);
    assert.equal(result.schemaVersion, '1.0.0');
  });

  await t.test('accepts valid placeholderFormat: mustache', () => {
    const manifest = {
      schemaVersion: '1.0.0',
      id: 'test/template',
      name: 'Test Template',
      description: 'A test template',
      placeholderFormat: 'mustache',
      placeholders: {}
    };
    const result = validateTemplateManifest(manifest);
    assert.equal(result.schemaVersion, '1.0.0');
  });

  await t.test('accepts valid placeholderFormat: dollar', () => {
    const manifest = {
      schemaVersion: '1.0.0',
      id: 'test/template',
      name: 'Test Template',
      description: 'A test template',
      placeholderFormat: 'dollar',
      placeholders: {}
    };
    const result = validateTemplateManifest(manifest);
    assert.equal(result.schemaVersion, '1.0.0');
  });

  await t.test('accepts valid placeholderFormat: percent', () => {
    const manifest = {
      schemaVersion: '1.0.0',
      id: 'test/template',
      name: 'Test Template',
      description: 'A test template',
      placeholderFormat: 'percent',
      placeholders: {}
    };
    const result = validateTemplateManifest(manifest);
    assert.equal(result.schemaVersion, '1.0.0');
  });

  await t.test('throws ValidationError for missing placeholders', () => {
    assert.throws(
      () => validateTemplateManifest({
        schemaVersion: '1.0.0',
        id: 'test/template',
        name: 'Test Template',
        description: 'A test template',
        placeholderFormat: 'unicode'
      }),
      (error) => error instanceof ValidationError &&
        error.field === 'placeholders'
    );
  });

  await t.test('throws ValidationError for array placeholders', () => {
    assert.throws(
      () => validateTemplateManifest({
        schemaVersion: '1.0.0',
        id: 'test/template',
        name: 'Test Template',
        description: 'A test template',
        placeholderFormat: 'unicode',
        placeholders: []
      }),
      (error) => error instanceof ValidationError &&
        error.field === 'placeholders'
    );
  });
});

// =============================================================================
// Test Suite: validateTemplateManifest - Dimensions Validation
// =============================================================================

test('validateTemplateManifest - Dimensions Validation', async (t) => {
  const baseManifest = {
    schemaVersion: '1.0.0',
    id: 'test/template',
    name: 'Test Template',
    description: 'A test template',
    placeholderFormat: 'unicode',
    placeholders: {}
  };

  await t.test('throws ValidationError for array dimensions', () => {
    assert.throws(
      () => validateTemplateManifest({
        ...baseManifest,
        dimensions: []
      }),
      (error) => error instanceof ValidationError &&
        error.message.includes('dimensions must be an object')
    );
  });

  await t.test('throws ValidationError for dimension with non-array values', () => {
    assert.throws(
      () => validateTemplateManifest({
        ...baseManifest,
        dimensions: {
          features: { values: 'not-an-array' }
        }
      }),
      (error) => error instanceof ValidationError &&
        error.message.includes('values must be an array')
    );
  });

  await t.test('throws ValidationError for dimension with empty values array', () => {
    assert.throws(
      () => validateTemplateManifest({
        ...baseManifest,
        dimensions: {
          features: { values: [] }
        }
      }),
      (error) => error instanceof ValidationError &&
        error.message.includes('must have at least one value')
    );
  });

  await t.test('accepts valid dimension with values array', () => {
    const result = validateTemplateManifest({
      ...baseManifest,
      dimensions: {
        features: { values: ['auth', 'database'] }
      }
    });
    assert.deepEqual(result.dimensions.features.values, ['auth', 'database']);
  });

  // Structured dimension format
  await t.test('throws ValidationError for structured dimension without name', () => {
    assert.throws(
      () => validateTemplateManifest({
        ...baseManifest,
        dimensions: {
          features: { options: [{ id: 'test', name: 'Test' }] }
        }
      }),
      (error) => error instanceof ValidationError &&
        error.message.includes('must have a name')
    );
  });

  await t.test('throws ValidationError for structured dimension without description', () => {
    assert.throws(
      () => validateTemplateManifest({
        ...baseManifest,
        dimensions: {
          features: { name: 'Features', options: [{ id: 'test', name: 'Test' }] }
        }
      }),
      (error) => error instanceof ValidationError &&
        error.message.includes('must have a description')
    );
  });

  await t.test('throws ValidationError for structured dimension with non-array options', () => {
    assert.throws(
      () => validateTemplateManifest({
        ...baseManifest,
        dimensions: {
          features: {
            name: 'Features',
            description: 'Choose features',
            options: 'not-an-array'
          }
        }
      }),
      (error) => error instanceof ValidationError &&
        error.message.includes('must have options array')
    );
  });

  await t.test('throws ValidationError for option without id', () => {
    assert.throws(
      () => validateTemplateManifest({
        ...baseManifest,
        dimensions: {
          features: {
            name: 'Features',
            description: 'Choose features',
            options: [{ name: 'Test' }]
          }
        }
      }),
      (error) => error instanceof ValidationError &&
        error.message.includes('option 0 must have an id')
    );
  });

  await t.test('throws ValidationError for option without name', () => {
    assert.throws(
      () => validateTemplateManifest({
        ...baseManifest,
        dimensions: {
          features: {
            name: 'Features',
            description: 'Choose features',
            options: [{ id: 'test' }]
          }
        }
      }),
      (error) => error instanceof ValidationError &&
        error.message.includes('option 0 must have a name')
    );
  });

  await t.test('accepts valid structured dimension', () => {
    const result = validateTemplateManifest({
      ...baseManifest,
      dimensions: {
        features: {
          name: 'Features',
          description: 'Choose features',
          options: [
            { id: 'auth', name: 'Authentication' },
            { id: 'db', name: 'Database' }
          ]
        }
      }
    });
    assert.equal(result.dimensions.features.options.length, 2);
  });

  await t.test('throws ValidationError for dimension without values or options', () => {
    assert.throws(
      () => validateTemplateManifest({
        ...baseManifest,
        dimensions: {
          features: { description: 'some dimension' }
        }
      }),
      (error) => error instanceof ValidationError &&
        error.message.includes("must have either 'values' or 'options' property")
    );
  });
});

// =============================================================================
// Test Suite: validateTemplateManifest - Gates Validation
// =============================================================================

test('validateTemplateManifest - Gates Validation', async (t) => {
  const baseManifest = {
    schemaVersion: '1.0.0',
    id: 'test/template',
    name: 'Test Template',
    description: 'A test template',
    placeholderFormat: 'unicode',
    placeholders: {}
  };

  await t.test('throws ValidationError for array gates', () => {
    assert.throws(
      () => validateTemplateManifest({
        ...baseManifest,
        gates: []
      }),
      (error) => error instanceof ValidationError &&
        error.message.includes('gates must be an object')
    );
  });

  await t.test('throws ValidationError for non-object gate', () => {
    assert.throws(
      () => validateTemplateManifest({
        ...baseManifest,
        gates: {
          myGate: 'not-an-object'
        }
      }),
      (error) => error instanceof ValidationError &&
        error.message.includes("gate 'myGate' must be an object")
    );
  });

  await t.test('throws ValidationError for null gate', () => {
    assert.throws(
      () => validateTemplateManifest({
        ...baseManifest,
        gates: {
          myGate: null
        }
      }),
      (error) => error instanceof ValidationError &&
        error.message.includes("gate 'myGate' must be an object")
    );
  });

  await t.test('throws ValidationError for array gate', () => {
    assert.throws(
      () => validateTemplateManifest({
        ...baseManifest,
        gates: {
          myGate: []
        }
      }),
      (error) => error instanceof ValidationError &&
        error.message.includes("gate 'myGate' must be an object")
    );
  });

  await t.test('throws ValidationError for empty gate object', () => {
    assert.throws(
      () => validateTemplateManifest({
        ...baseManifest,
        gates: {
          myGate: {}
        }
      }),
      (error) => error instanceof ValidationError &&
        error.message.includes('must have configuration properties')
    );
  });

  await t.test('accepts valid gate', () => {
    const result = validateTemplateManifest({
      ...baseManifest,
      gates: {
        platform: { constraint: 'node >= 18' }
      }
    });
    assert.deepEqual(result.gates.platform, { constraint: 'node >= 18' });
  });
});

// =============================================================================
// Test Suite: validateTemplateManifest - Feature Specs Validation
// =============================================================================

test('validateTemplateManifest - Feature Specs Validation', async (t) => {
  const baseManifest = {
    schemaVersion: '1.0.0',
    id: 'test/template',
    name: 'Test Template',
    description: 'A test template',
    placeholderFormat: 'unicode',
    placeholders: {}
  };

  await t.test('throws ValidationError for array featureSpecs', () => {
    assert.throws(
      () => validateTemplateManifest({
        ...baseManifest,
        featureSpecs: []
      }),
      (error) => error instanceof ValidationError &&
        error.message.includes('featureSpecs must be an object')
    );
  });

  await t.test('throws ValidationError for non-object feature', () => {
    assert.throws(
      () => validateTemplateManifest({
        ...baseManifest,
        featureSpecs: {
          auth: 'not-an-object'
        }
      }),
      (error) => error instanceof ValidationError &&
        error.message.includes("feature 'auth' must be an object")
    );
  });

  await t.test('throws ValidationError for null feature', () => {
    assert.throws(
      () => validateTemplateManifest({
        ...baseManifest,
        featureSpecs: {
          auth: null
        }
      }),
      (error) => error instanceof ValidationError &&
        error.message.includes("feature 'auth' must be an object")
    );
  });

  await t.test('throws ValidationError for array feature', () => {
    assert.throws(
      () => validateTemplateManifest({
        ...baseManifest,
        featureSpecs: {
          auth: []
        }
      }),
      (error) => error instanceof ValidationError &&
        error.message.includes("feature 'auth' must be an object")
    );
  });

  await t.test('throws ValidationError for empty feature object', () => {
    assert.throws(
      () => validateTemplateManifest({
        ...baseManifest,
        featureSpecs: {
          auth: {}
        }
      }),
      (error) => error instanceof ValidationError &&
        error.message.includes('must have configuration properties')
    );
  });

  await t.test('accepts valid feature spec', () => {
    const result = validateTemplateManifest({
      ...baseManifest,
      featureSpecs: {
        auth: { label: 'Authentication', description: 'User auth' }
      }
    });
    assert.deepEqual(result.featureSpecs.auth, { label: 'Authentication', description: 'User auth' });
  });
});

// =============================================================================
// Test Suite: validateTemplateManifest - Hints Validation
// =============================================================================

test('validateTemplateManifest - Hints Validation', async (t) => {
  const baseManifest = {
    schemaVersion: '1.0.0',
    id: 'test/template',
    name: 'Test Template',
    description: 'A test template',
    placeholderFormat: 'unicode',
    placeholders: {}
  };

  await t.test('throws ValidationError for array hints', () => {
    assert.throws(
      () => validateTemplateManifest({
        ...baseManifest,
        hints: []
      }),
      (error) => error instanceof ValidationError &&
        error.message.includes('hints must be an object')
    );
  });

  await t.test('throws ValidationError for non-object hint', () => {
    assert.throws(
      () => validateTemplateManifest({
        ...baseManifest,
        hints: {
          features: 'not-an-object'
        }
      }),
      (error) => error instanceof ValidationError &&
        error.message.includes("hint 'features' must be an object")
    );
  });

  await t.test('throws ValidationError for null hint', () => {
    assert.throws(
      () => validateTemplateManifest({
        ...baseManifest,
        hints: {
          features: null
        }
      }),
      (error) => error instanceof ValidationError &&
        error.message.includes("hint 'features' must be an object")
    );
  });

  await t.test('throws ValidationError for array hint', () => {
    assert.throws(
      () => validateTemplateManifest({
        ...baseManifest,
        hints: {
          features: []
        }
      }),
      (error) => error instanceof ValidationError &&
        error.message.includes("hint 'features' must be an object")
    );
  });

  await t.test('throws ValidationError for empty hint object', () => {
    assert.throws(
      () => validateTemplateManifest({
        ...baseManifest,
        hints: {
          features: {}
        }
      }),
      (error) => error instanceof ValidationError &&
        error.message.includes('must have configuration properties')
    );
  });

  await t.test('accepts valid hint', () => {
    const result = validateTemplateManifest({
      ...baseManifest,
      hints: {
        features: { auth: 'Recommended for most apps' }
      }
    });
    assert.deepEqual(result.hints.features, { auth: 'Recommended for most apps' });
  });
});

// =============================================================================
// Test Suite: validateTemplateManifest - Placeholder Processing
// =============================================================================

test('validateTemplateManifest - Placeholder Processing', async (t) => {
  const baseManifest = {
    schemaVersion: '1.0.0',
    id: 'test/template',
    name: 'Test Template',
    description: 'A test template',
    placeholderFormat: 'unicode'
  };

  await t.test('throws ValidationError for non-object placeholder config', () => {
    assert.throws(
      () => validateTemplateManifest({
        ...baseManifest,
        placeholders: {
          PROJECT_NAME: 'not-an-object'
        }
      }),
      (error) => error instanceof ValidationError &&
        error.message.includes("placeholder 'PROJECT_NAME' must be an object")
    );
  });

  await t.test('throws ValidationError for null placeholder config', () => {
    assert.throws(
      () => validateTemplateManifest({
        ...baseManifest,
        placeholders: {
          PROJECT_NAME: null
        }
      }),
      (error) => error instanceof ValidationError &&
        error.message.includes("placeholder 'PROJECT_NAME' must be an object")
    );
  });

  await t.test('throws ValidationError for array placeholder config', () => {
    assert.throws(
      () => validateTemplateManifest({
        ...baseManifest,
        placeholders: {
          PROJECT_NAME: []
        }
      }),
      (error) => error instanceof ValidationError &&
        error.message.includes("placeholder 'PROJECT_NAME' must be an object")
    );
  });

  await t.test('throws ValidationError for placeholder without description', () => {
    assert.throws(
      () => validateTemplateManifest({
        ...baseManifest,
        placeholders: {
          PROJECT_NAME: { default: 'my-project' }
        }
      }),
      (error) => error instanceof ValidationError &&
        error.message.includes('must have a string description')
    );
  });

  await t.test('throws ValidationError for invalid default type', () => {
    assert.throws(
      () => validateTemplateManifest({
        ...baseManifest,
        placeholders: {
          PROJECT_NAME: {
            description: 'Project name',
            default: { nested: 'object' }
          }
        }
      }),
      (error) => error instanceof ValidationError &&
        error.message.includes('default must be string, number, or boolean')
    );
  });

  await t.test('accepts valid placeholder with string default', () => {
    const result = validateTemplateManifest({
      ...baseManifest,
      placeholders: {
        PROJECT_NAME: {
          description: 'Project name',
          default: 'my-project'
        }
      }
    });
    assert.equal(result.placeholders[0].token, 'PROJECT_NAME');
    assert.equal(result.placeholders[0].defaultValue, 'my-project');
  });

  await t.test('accepts valid placeholder with number default', () => {
    const result = validateTemplateManifest({
      ...baseManifest,
      placeholders: {
        PORT: {
          description: 'Server port',
          default: 3000,
          type: 'number'
        }
      }
    });
    assert.equal(result.placeholders[0].defaultValue, 3000);
  });

  await t.test('accepts valid placeholder with boolean default', () => {
    const result = validateTemplateManifest({
      ...baseManifest,
      placeholders: {
        ENABLED: {
          description: 'Enable feature',
          default: true,
          type: 'boolean'
        }
      }
    });
    assert.equal(result.placeholders[0].defaultValue, true);
  });

  await t.test('defaults required to true', () => {
    const result = validateTemplateManifest({
      ...baseManifest,
      placeholders: {
        PROJECT_NAME: {
          description: 'Project name'
        }
      }
    });
    assert.equal(result.placeholders[0].required, true);
  });

  await t.test('respects explicit required false', () => {
    const result = validateTemplateManifest({
      ...baseManifest,
      placeholders: {
        PROJECT_NAME: {
          description: 'Project name',
          required: false
        }
      }
    });
    assert.equal(result.placeholders[0].required, false);
  });

  await t.test('maps secure to sensitive', () => {
    const result = validateTemplateManifest({
      ...baseManifest,
      placeholders: {
        API_KEY: {
          description: 'API Key',
          secure: true
        }
      }
    });
    assert.equal(result.placeholders[0].sensitive, true);
  });

  await t.test('defaults type to text', () => {
    const result = validateTemplateManifest({
      ...baseManifest,
      placeholders: {
        PROJECT_NAME: {
          description: 'Project name'
        }
      }
    });
    assert.equal(result.placeholders[0].type, 'text');
  });
});

// =============================================================================
// Test Suite: validateTemplateManifest - Return Value Structure
// =============================================================================

test('validateTemplateManifest - Return Value Structure', async (t) => {
  const validManifest = {
    schemaVersion: '1.0.0',
    id: 'test/template',
    name: 'Test Template',
    description: 'A test template',
    placeholderFormat: 'unicode',
    placeholders: {}
  };

  await t.test('returns frozen object', () => {
    const result = validateTemplateManifest(validManifest);
    assert(Object.isFrozen(result));
  });

  await t.test('returns expected structure', () => {
    const result = validateTemplateManifest(validManifest);

    assert('schemaVersion' in result);
    assert('name' in result);
    assert('description' in result);
    assert('dimensions' in result);
    assert('gates' in result);
    assert('featureSpecs' in result);
    assert('hints' in result);
    assert('authoringMode' in result);
    assert('authorAssetsDir' in result);
    assert('placeholders' in result);
    assert('canonicalVariables' in result);
    assert('handoff' in result);
  });

  await t.test('defaults authoringMode to composable', () => {
    const result = validateTemplateManifest(validManifest);
    assert.equal(result.authoringMode, 'composable');
  });

  await t.test('defaults authorAssetsDir to __scaffold__', () => {
    const result = validateTemplateManifest(validManifest);
    assert.equal(result.authorAssetsDir, '__scaffold__');
  });

  await t.test('defaults canonicalVariables to empty array', () => {
    const result = validateTemplateManifest(validManifest);
    assert.deepEqual(result.canonicalVariables, []);
  });

  await t.test('defaults handoff to empty array', () => {
    const result = validateTemplateManifest(validManifest);
    assert.deepEqual(result.handoff, []);
  });

  await t.test('passes through handoff array', () => {
    const result = validateTemplateManifest({
      ...validManifest,
      handoff: ['npm install', 'npm run build']
    });
    assert.deepEqual(result.handoff, ['npm install', 'npm run build']);
  });
});

// =============================================================================
// Test Suite: validateTemplateManifest - Caching
// =============================================================================

test('validateTemplateManifest - Caching', async (t) => {
  await t.test('returns cached result for same object reference', () => {
    const manifest = {
      schemaVersion: '1.0.0',
      id: 'test/template',
      name: 'Test Template',
      description: 'A test template',
      placeholderFormat: 'unicode',
      placeholders: {}
    };

    const result1 = validateTemplateManifest(manifest);
    const result2 = validateTemplateManifest(manifest);

    // Same object reference means cache hit
    assert.strictEqual(result1, result2);
  });

  await t.test('returns different result for different object references', () => {
    const manifest1 = {
      schemaVersion: '1.0.0',
      id: 'test/template1',
      name: 'Test Template 1',
      description: 'A test template',
      placeholderFormat: 'unicode',
      placeholders: {}
    };

    const manifest2 = {
      schemaVersion: '1.0.0',
      id: 'test/template2',
      name: 'Test Template 2',
      description: 'A test template',
      placeholderFormat: 'unicode',
      placeholders: {}
    };

    const result1 = validateTemplateManifest(manifest1);
    const result2 = validateTemplateManifest(manifest2);

    // Different objects = different results
    assert.notStrictEqual(result1, result2);
    assert.equal(result1.name, 'Test Template 1');
    assert.equal(result2.name, 'Test Template 2');
  });
});
