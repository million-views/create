#!/usr/bin/env node

/**
 * @fileoverview L2 Unit Tests for template-runtime-validator.mts
 *
 * Coverage target: template-runtime-validator.mts validation functions
 * Testing layer: L2 (Unit Tests - isolated module testing)
 * Philosophy: "Question before fixing" - tests validate actual SUT behavior
 */

import { strict as assert } from 'node:assert';
import test from 'node:test';

import { validateTemplateManifest } from '@m5nv/create/lib/validation/schema/template-runtime-validator.mts';
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
// Test Suite: validateTemplateManifest - Dimensions Validation (V1.0.0)
// V1.0.0: Fixed vocabulary of 7 dimensions (deployment, database, storage, etc.)
// Each dimension uses 'options' array (NOT 'values') with {id, label?, desc?} objects
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

  await t.test('throws ValidationError for invalid dimension name', () => {
    assert.throws(
      () => validateTemplateManifest({
        ...baseManifest,
        dimensions: {
          invalidDimension: { options: [{ id: 'test' }] }
        }
      }),
      (error) => error instanceof ValidationError &&
        error.message.includes('Invalid dimension name: invalidDimension')
    );
  });

  await t.test('throws ValidationError for dimension with non-array options', () => {
    assert.throws(
      () => validateTemplateManifest({
        ...baseManifest,
        dimensions: {
          deployment: { options: 'not-an-array' }
        }
      }),
      (error) => error instanceof ValidationError &&
        error.message.includes("must have an 'options' array")
    );
  });

  await t.test('throws ValidationError for dimension with empty options array', () => {
    assert.throws(
      () => validateTemplateManifest({
        ...baseManifest,
        dimensions: {
          deployment: { options: [] }
        }
      }),
      (error) => error instanceof ValidationError &&
        error.message.includes('must have at least one option')
    );
  });

  await t.test('throws ValidationError for option without id', () => {
    assert.throws(
      () => validateTemplateManifest({
        ...baseManifest,
        dimensions: {
          deployment: {
            options: [{ label: 'Test' }]
          }
        }
      }),
      (error) => error instanceof ValidationError &&
        error.message.includes("option 0 must have an 'id' string")
    );
  });

  await t.test('accepts valid dimension with options array', () => {
    const result = validateTemplateManifest({
      ...baseManifest,
      dimensions: {
        deployment: {
          label: 'Deployment Target',
          options: [
            { id: 'aws', label: 'AWS' },
            { id: 'gcp', label: 'GCP' }
          ]
        }
      }
    });
    assert.equal(result.dimensions.deployment.options.length, 2);
    assert.equal(result.dimensions.deployment.options[0].id, 'aws');
  });

  await t.test('accepts all valid dimension names', () => {
    const result = validateTemplateManifest({
      ...baseManifest,
      dimensions: {
        deployment: { options: [{ id: 'aws' }] },
        database: { options: [{ id: 'postgres' }] },
        storage: { options: [{ id: 'r2' }] },
        identity: { options: [{ id: 'github' }] },
        billing: { options: [{ id: 'stripe' }] },
        analytics: { options: [{ id: 'umami' }] },
        monitoring: { options: [{ id: 'sentry' }] }
      }
    });
    assert.equal(Object.keys(result.dimensions).length, 7);
  });

  await t.test('accepts dimension with optional label property', () => {
    const result = validateTemplateManifest({
      ...baseManifest,
      dimensions: {
        database: {
          label: 'Database Provider',
          options: [
            { id: 'postgres', label: 'PostgreSQL', desc: 'Relational database' }
          ]
        }
      }
    });
    assert.equal(result.dimensions.database.label, 'Database Provider');
    assert.equal(result.dimensions.database.options[0].desc, 'Relational database');
  });

  await t.test('throws ValidationError for dimension without options property', () => {
    assert.throws(
      () => validateTemplateManifest({
        ...baseManifest,
        dimensions: {
          deployment: { label: 'Deployment' }
        }
      }),
      (error) => error instanceof ValidationError &&
        error.message.includes("must have an 'options' array")
    );
  });
});

// =============================================================================
// Test Suite: validateTemplateManifest - Gates Validation (V1.0.0)
// V1.0.0 Schema: Gates are keyed by dimension name, then by option ID.
// Each option ID maps to constraint objects specifying allowed option IDs for other dimensions.
// =============================================================================

test('validateTemplateManifest - Gates Validation', async (t) => {
  const baseManifest = {
    schemaVersion: '1.0.0',
    id: 'test/template',
    name: 'Test Template',
    description: 'A test template',
    placeholderFormat: 'unicode',
    placeholders: {},
    dimensions: {
      deployment: {
        label: 'Deployment',
        options: [
          { id: 'aws', label: 'AWS' },
          { id: 'gcp', label: 'GCP' }
        ]
      },
      database: {
        label: 'Database',
        options: [
          { id: 'postgres', label: 'PostgreSQL' },
          { id: 'dynamodb', label: 'DynamoDB' }
        ]
      }
    }
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

  await t.test('throws ValidationError for invalid dimension key', () => {
    assert.throws(
      () => validateTemplateManifest({
        ...baseManifest,
        gates: {
          invalidDimension: { someOption: {} }
        }
      }),
      (error) => error instanceof ValidationError &&
        error.message.includes("Gate key 'invalidDimension' is not a valid dimension")
    );
  });

  await t.test('throws ValidationError for non-object dimension gate', () => {
    assert.throws(
      () => validateTemplateManifest({
        ...baseManifest,
        gates: {
          deployment: 'not-an-object'
        }
      }),
      (error) => error instanceof ValidationError &&
        error.message.includes('gates.deployment must be an object')
    );
  });

  await t.test('throws ValidationError for null dimension gate', () => {
    assert.throws(
      () => validateTemplateManifest({
        ...baseManifest,
        gates: {
          deployment: null
        }
      }),
      (error) => error instanceof ValidationError &&
        error.message.includes('gates.deployment must be an object')
    );
  });

  await t.test('throws ValidationError for array dimension gate', () => {
    assert.throws(
      () => validateTemplateManifest({
        ...baseManifest,
        gates: {
          deployment: []
        }
      }),
      (error) => error instanceof ValidationError &&
        error.message.includes('gates.deployment must be an object')
    );
  });

  await t.test('throws ValidationError for invalid option ID in gate', () => {
    assert.throws(
      () => validateTemplateManifest({
        ...baseManifest,
        gates: {
          deployment: {
            invalidOption: { database: ['postgres'] }
          }
        }
      }),
      (error) => error instanceof ValidationError &&
        error.message.includes("Gate option 'invalidOption' is not defined in dimension 'deployment'")
    );
  });

  await t.test('throws ValidationError for non-object constraint', () => {
    assert.throws(
      () => validateTemplateManifest({
        ...baseManifest,
        gates: {
          deployment: {
            aws: 'not-an-object'
          }
        }
      }),
      (error) => error instanceof ValidationError &&
        error.message.includes('gates.deployment.aws must be an object')
    );
  });

  await t.test('throws ValidationError for invalid constraint target dimension', () => {
    assert.throws(
      () => validateTemplateManifest({
        ...baseManifest,
        gates: {
          deployment: {
            aws: { invalidDimension: ['postgres'] }
          }
        }
      }),
      (error) => error instanceof ValidationError &&
        error.message.includes("Gate constraint target 'invalidDimension' is not a valid dimension")
    );
  });

  await t.test('throws ValidationError for non-array constraint values', () => {
    assert.throws(
      () => validateTemplateManifest({
        ...baseManifest,
        gates: {
          deployment: {
            aws: { database: 'postgres' }
          }
        }
      }),
      (error) => error instanceof ValidationError &&
        error.message.includes('gates.deployment.aws.database must be an array')
    );
  });

  await t.test('accepts valid gate with proper V1.0.0 structure', () => {
    const result = validateTemplateManifest({
      ...baseManifest,
      gates: {
        deployment: {
          aws: { database: ['dynamodb', 'postgres'] },
          gcp: { database: ['postgres'] }
        }
      }
    });
    assert.deepEqual(result.gates.deployment, {
      aws: { database: ['dynamodb', 'postgres'] },
      gcp: { database: ['postgres'] }
    });
  });

  await t.test('accepts empty gates object', () => {
    const result = validateTemplateManifest({
      ...baseManifest,
      gates: {}
    });
    assert.deepEqual(result.gates, {});
  });
});

// =============================================================================
// =============================================================================
// Test Suite: validateTemplateManifest - Features Array Validation (V1.0.0)
// =============================================================================

test('validateTemplateManifest - Features Array Validation', async (t) => {
  const baseManifest = {
    schemaVersion: '1.0.0',
    id: 'test/template',
    name: 'Test Template',
    description: 'A test template',
    placeholderFormat: 'unicode',
    placeholders: {}
  };

  await t.test('accepts empty features array', () => {
    const result = validateTemplateManifest({
      ...baseManifest,
      features: []
    });
    assert.deepEqual(result.features, []);
  });

  await t.test('throws ValidationError for feature without id', () => {
    assert.throws(
      () => validateTemplateManifest({
        ...baseManifest,
        features: [
          { label: 'Auth', needs: {} }
        ]
      }),
      (error) => error instanceof ValidationError &&
        error.message.includes("must have an 'id' string")
    );
  });

  await t.test('throws ValidationError for feature without label', () => {
    assert.throws(
      () => validateTemplateManifest({
        ...baseManifest,
        features: [
          { id: 'auth', needs: {} }
        ]
      }),
      (error) => error instanceof ValidationError &&
        error.message.includes("must have a 'label' string")
    );
  });

  await t.test('throws ValidationError for feature without needs', () => {
    assert.throws(
      () => validateTemplateManifest({
        ...baseManifest,
        features: [
          { id: 'auth', label: 'Authentication' }
        ]
      }),
      (error) => error instanceof ValidationError &&
        error.message.includes("must have a 'needs' object")
    );
  });

  await t.test('throws ValidationError for feature with invalid id format', () => {
    assert.throws(
      () => validateTemplateManifest({
        ...baseManifest,
        features: [
          { id: 'INVALID_ID', label: 'Auth', needs: {} }
        ]
      }),
      (error) => error instanceof ValidationError &&
        error.message.includes('has invalid format')
    );
  });

  await t.test('throws ValidationError for needs referencing invalid dimension', () => {
    assert.throws(
      () => validateTemplateManifest({
        ...baseManifest,
        features: [
          { id: 'auth', label: 'Auth', needs: { invalid_dimension: 'required' } }
        ]
      }),
      (error) => error instanceof ValidationError &&
        error.message.includes('references invalid dimension')
    );
  });

  await t.test('throws ValidationError for invalid needs level', () => {
    assert.throws(
      () => validateTemplateManifest({
        ...baseManifest,
        features: [
          { id: 'auth', label: 'Auth', needs: { identity: 'invalid' } }
        ]
      }),
      (error) => error instanceof ValidationError &&
        error.message.includes("must be 'required', 'optional', or 'none'")
    );
  });

  await t.test('accepts valid feature with needs', () => {
    const result = validateTemplateManifest({
      ...baseManifest,
      features: [
        {
          id: 'user-login',
          label: 'User Login',
          description: 'User authentication feature',
          needs: { identity: 'required', database: 'optional' }
        }
      ]
    });
    assert.equal(result.features.length, 1);
    assert.equal(result.features[0].id, 'user-login');
    assert.equal(result.features[0].label, 'User Login');
    assert.deepEqual(result.features[0].needs, { identity: 'required', database: 'optional' });
  });

  await t.test('accepts multiple features', () => {
    const result = validateTemplateManifest({
      ...baseManifest,
      features: [
        { id: 'api', label: 'API', needs: {} },
        { id: 'auth', label: 'Auth', needs: { identity: 'required' } },
        { id: 'billing', label: 'Billing', needs: { billing: 'required' } }
      ]
    });
    assert.equal(result.features.length, 3);
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
    assert('features' in result);
    assert('authorAssetsDir' in result);
    assert('placeholders' in result);
    assert('canonicalVariables' in result);
    assert('handoff' in result);
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
