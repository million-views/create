#!/usr/bin/env node

/**
 * @fileoverview L2 Unit Tests for template-validator.mjs additional validation methods
 *
 * Coverage target: template-validator.mjs uncovered validation methods
 * Testing layer: L2 (Unit Tests - isolated module testing)
 * Philosophy: "Question before fixing" - tests validate actual SUT behavior
 *
 * V1.0.0 Schema Compliance:
 * - 7 fixed dimensions: deployment, database, storage, identity, billing, analytics, monitoring
 * - dimensions use 'options' array with {id, label} objects
 * - features is a top-level array with {id, label, needs} objects
 * - gates keyed by dimension → option ID → constraint objects
 */

import { strict as assert } from 'node:assert';
import test from 'node:test';

import { TemplateValidator } from '../../lib/validation/template-validator.mts';

// =============================================================================
// Test Suite: Schema Validation Methods (V1.0.0 Compliant)
// =============================================================================

test('TemplateValidator - Dimensions Schema Validation', async (t) => {
  const validator = new TemplateValidator();

  await t.test('validateDimensionsSchema catches error for dimension without options', async () => {
    const template = {
      schemaVersion: '1.0.0',
      id: 'test/template',
      name: 'Test Template',
      description: 'A test template',
      dimensions: {
        deployment: { default: 'cloudflare-workers' } // Missing options array
      }
    };

    const result = await validator.validate(template, 'strict');
    assert(!result.valid);
    assert(result.errors.some(e => e.message.includes('must have') || e.message.includes('options')));
  });

  await t.test('reports unknown dimension type', async () => {
    const template = {
      schemaVersion: '1.0.0',
      id: 'test/template',
      name: 'Test Template',
      description: 'A test template',
      dimensions: {
        invalid_dimension: {
          options: [{ id: 'test', label: 'Test' }]
        }
      }
    };

    const result = await validator.validate(template, 'strict');
    assert(!result.valid);
    assert(result.errors.some(e => e.message.includes('Unknown dimension')));
  });
});

test('TemplateValidator - Gates Schema Validation (V1.0.0)', async (t) => {
  const validator = new TemplateValidator();

  await t.test('validateGatesSchema reports invalid gate dimension', async () => {
    const template = {
      schemaVersion: '1.0.0',
      id: 'test/template',
      name: 'Test Template',
      description: 'A test template',
      dimensions: {
        deployment: {
          options: [{ id: 'cloudflare-workers', label: 'Cloudflare Workers' }]
        }
      },
      gates: {
        invalid_dimension: {  // Not a valid dimension
          'some-option': {
            database: ['d1']
          }
        }
      }
    };

    const result = await validator.validate(template, 'strict');
    assert(!result.valid);
    assert(result.errors.some(e => e.message.includes('not a valid dimension')));
  });

  await t.test('validateGatesSchema validates constraint structure', async () => {
    const template = {
      schemaVersion: '1.0.0',
      id: 'test/template',
      name: 'Test Template',
      description: 'A test template',
      dimensions: {
        deployment: {
          options: [{ id: 'cloudflare-workers', label: 'Cloudflare Workers' }]
        },
        database: {
          options: [
            { id: 'd1', label: 'D1' },
            { id: 'none', label: 'None' }
          ]
        }
      },
      gates: {
        deployment: {
          'cloudflare-workers': {
            database: ['d1', 'none']  // Valid V1.0.0 constraint structure
          }
        }
      }
    };

    const result = await validator.validate(template, 'strict');
    assert(result.valid, 'Template with valid gates should be valid');
  });

  await t.test('validateGatesSchema reports invalid constraint target dimension', async () => {
    const template = {
      schemaVersion: '1.0.0',
      id: 'test/template',
      name: 'Test Template',
      description: 'A test template',
      dimensions: {
        deployment: {
          options: [{ id: 'cloudflare-workers', label: 'Cloudflare Workers' }]
        }
      },
      gates: {
        deployment: {
          'cloudflare-workers': {
            invalid_target: ['value']  // Invalid target dimension
          }
        }
      }
    };

    const result = await validator.validate(template, 'strict');
    assert(!result.valid);
    assert(result.errors.some(e => e.message.includes('not a valid dimension')));
  });
});

test('TemplateValidator - Features Schema Validation (V1.0.0)', async (t) => {
  const validator = new TemplateValidator();

  await t.test('validateFeaturesSchema reports missing id', async () => {
    const template = {
      schemaVersion: '1.0.0',
      id: 'test/template',
      name: 'Test Template',
      description: 'A test template',
      features: [
        { label: 'Auth', needs: { database: 'required' } }  // Missing id
      ]
    };

    const result = await validator.validate(template, 'strict');
    assert(!result.valid);
    assert(result.errors.some(e => e.message.includes('id')));
  });

  await t.test('validateFeaturesSchema reports missing label', async () => {
    const template = {
      schemaVersion: '1.0.0',
      id: 'test/template',
      name: 'Test Template',
      description: 'A test template',
      features: [
        { id: 'auth', needs: { database: 'required' } }  // Missing label
      ]
    };

    const result = await validator.validate(template, 'strict');
    assert(!result.valid);
    assert(result.errors.some(e => e.message.includes('label')));
  });

  await t.test('validateFeaturesSchema reports missing needs', async () => {
    const template = {
      schemaVersion: '1.0.0',
      id: 'test/template',
      name: 'Test Template',
      description: 'A test template',
      features: [
        { id: 'auth', label: 'Authentication' }  // Missing needs
      ]
    };

    const result = await validator.validate(template, 'strict');
    assert(!result.valid);
    assert(result.errors.some(e => e.message.includes('needs')));
  });

  await t.test('validateFeaturesSchema reports invalid needs dimension', async () => {
    const template = {
      schemaVersion: '1.0.0',
      id: 'test/template',
      name: 'Test Template',
      description: 'A test template',
      features: [
        {
          id: 'auth',
          label: 'Authentication',
          needs: {
            invalid_dimension: 'required'  // Invalid dimension
          }
        }
      ]
    };

    const result = await validator.validate(template, 'strict');
    assert(!result.valid);
    assert(result.errors.some(e => e.message.includes('invalid dimension')));
  });

  await t.test('validateFeaturesSchema reports invalid needs level', async () => {
    const template = {
      schemaVersion: '1.0.0',
      id: 'test/template',
      name: 'Test Template',
      description: 'A test template',
      features: [
        {
          id: 'auth',
          label: 'Authentication',
          needs: {
            database: 'mandatory'  // Invalid level, should be required/optional/none
          }
        }
      ]
    };

    const result = await validator.validate(template, 'strict');
    assert(!result.valid);
    assert(result.errors.some(e => e.message.includes("'required', 'optional', or 'none'")));
  });

  await t.test('validateFeaturesSchema passes with valid features array', async () => {
    const template = {
      schemaVersion: '1.0.0',
      id: 'test/template',
      name: 'Test Template',
      description: 'A test template',
      dimensions: {
        database: {
          options: [{ id: 'postgres', label: 'PostgreSQL' }]
        },
        identity: {
          options: [{ id: 'auth0', label: 'Auth0' }]
        }
      },
      features: [
        {
          id: 'auth',
          label: 'Authentication',
          needs: {
            database: 'required',
            identity: 'optional'
          }
        }
      ]
    };

    const result = await validator.validate(template, 'strict');
    assert(result.valid, 'Template with valid features should be valid');
  });
});

// =============================================================================
// Test Suite: Domain Validation Methods (V1.0.0 Compliant)
// =============================================================================

test('TemplateValidator - Domain Validation - Dimension Options', async (t) => {
  const validator = new TemplateValidator();

  await t.test('reports empty options array', async () => {
    const template = {
      schemaVersion: '1.0.0',
      id: 'test/template',
      name: 'Test Template',
      description: 'A test template',
      dimensions: {
        deployment: {
          options: []  // Empty options
        }
      }
    };

    const result = await validator.validate(template, 'strict');
    assert(!result.valid);
    assert(result.errors.some(e =>
      e.message.includes('at least one') ||
      e.message.includes('options') ||
      e.message.includes('empty')
    ));
  });

  await t.test('reports option missing id', async () => {
    const template = {
      schemaVersion: '1.0.0',
      id: 'test/template',
      name: 'Test Template',
      description: 'A test template',
      dimensions: {
        deployment: {
          options: [
            { label: 'Workers' }  // Missing id
          ]
        }
      }
    };

    const result = await validator.validate(template, 'strict');
    assert(!result.valid);
    assert(result.errors.some(e => e.message.includes('id')));
  });
});

test('TemplateValidator - Domain Validation - Gates Reference', async (t) => {
  const validator = new TemplateValidator();

  await t.test('reports gate referencing unknown dimension', async () => {
    const template = {
      schemaVersion: '1.0.0',
      id: 'test/template',
      name: 'Test Template',
      description: 'A test template',
      dimensions: {
        deployment: {
          options: [{ id: 'cloudflare-workers', label: 'Cloudflare Workers' }]
        }
      },
      gates: {
        unknown_dimension: {  // Not in valid dimensions
          'option': {
            database: ['d1']
          }
        }
      }
    };

    const result = await validator.validate(template, 'strict');
    assert(!result.valid);
    assert(result.errors.some(e => e.message.includes('not a valid dimension')));
  });

  await t.test('validates gate constraint target is valid dimension', async () => {
    const template = {
      schemaVersion: '1.0.0',
      id: 'test/template',
      name: 'Test Template',
      description: 'A test template',
      dimensions: {
        deployment: {
          options: [{ id: 'cloudflare-workers', label: 'Cloudflare Workers' }]
        },
        database: {
          options: [{ id: 'd1', label: 'D1' }]
        }
      },
      gates: {
        deployment: {
          'cloudflare-workers': {
            unknown_target: ['value']  // Unknown target dimension
          }
        }
      }
    };

    const result = await validator.validate(template, 'strict');
    assert(!result.valid);
    assert(result.errors.some(e => e.message.includes('not a valid dimension')));
  });
});

test('TemplateValidator - Domain Validation - Features Reference', async (t) => {
  const validator = new TemplateValidator();

  await t.test('reports feature needs with invalid dimension', async () => {
    const template = {
      schemaVersion: '1.0.0',
      id: 'test/template',
      name: 'Test Template',
      description: 'A test template',
      features: [
        {
          id: 'auth',
          label: 'Auth',
          needs: {
            nonexistent: 'required'  // Unknown dimension
          }
        }
      ]
    };

    const result = await validator.validate(template, 'strict');
    assert(!result.valid);
    assert(result.errors.some(e => e.message.includes('invalid dimension')));
  });

  await t.test('reports feature needs with invalid requirement level', async () => {
    const template = {
      schemaVersion: '1.0.0',
      id: 'test/template',
      name: 'Test Template',
      description: 'A test template',
      features: [
        {
          id: 'auth',
          label: 'Auth',
          needs: {
            database: 'mandatory'  // Invalid level
          }
        }
      ]
    };

    const result = await validator.validate(template, 'strict');
    assert(!result.valid);
    assert(result.errors.some(e => e.message.includes("'required', 'optional', or 'none'")));
  });
});

// =============================================================================
// Test Suite: Runtime Validation - Cross-Dimension Compatibility
// =============================================================================

test('TemplateValidator - Runtime Validation - Cross-Dimension Compatibility', async (t) => {
  const validator = new TemplateValidator();

  await t.test('reports cloudflare-workers + postgresql incompatibility', () => {
    const template = {};
    const errors = validator.validateCrossDimensionCompatibility(
      template,
      { deployment: 'cloudflare-workers', database: 'postgresql' }
    );
    assert(errors.length > 0);
    assert(errors[0].type === 'CROSS_DIMENSION_VIOLATION');
    assert(errors[0].message.includes('not compatible with PostgreSQL'));
  });

  await t.test('reports edge deployment + local storage incompatibility', () => {
    const template = {};
    const errors = validator.validateCrossDimensionCompatibility(
      template,
      { deployment: 'cloudflare-workers', storage: 'local' }
    );
    assert(errors.length > 0);
    assert(errors.some(e => e.message.includes('cannot use local file storage')));
  });

  await t.test('reports deno-deploy + local storage incompatibility', () => {
    const template = {};
    const errors = validator.validateCrossDimensionCompatibility(
      template,
      { deployment: 'deno-deploy', storage: 'local' }
    );
    assert(errors.length > 0);
    assert(errors.some(e => e.message.includes('cannot use local file storage')));
  });

  await t.test('passes with compatible selections', () => {
    const template = {};
    const errors = validator.validateCrossDimensionCompatibility(
      template,
      { deployment: 'vercel', database: 'postgres', storage: 's3' }
    );
    assert.equal(errors.length, 0);
  });
});

// =============================================================================
// Test Suite: Console Output Methods
// =============================================================================

test('TemplateValidator - Console Output', async (t) => {
  const validator = new TemplateValidator();

  await t.test('outputToConsole with json option - valid template', async () => {
    const template = {
      schemaVersion: '1.0.0',
      id: 'test/template',
      name: 'Test',
      description: 'Test template'
    };

    const result = await validator.validate(template, 'strict', {
      mode: 'consumption',
      output: 'console',
      json: true
    });

    // The function returns the result and also logs to console
    assert(result.valid);
  });

  await t.test('outputToConsole with json option - invalid template', async () => {
    const template = {
      // Missing required fields
    };

    const result = await validator.validate(template, 'strict', {
      mode: 'consumption',
      output: 'console',
      json: true
    });

    assert(!result.valid);
  });

  await t.test('outputToConsole with suggest option', async () => {
    const template = {
      // Missing required fields
    };

    const result = await validator.validate(template, 'strict', {
      mode: 'consumption',
      output: 'console',
      suggest: true
    });

    assert(!result.valid);
    assert(result.errors.length > 0);
  });

  await t.test('outputToConsole with valid template - success message', async () => {
    const template = {
      schemaVersion: '1.0.0',
      id: 'test/template',
      name: 'Test',
      description: 'Test template'
    };

    const result = await validator.validate(template, 'strict', {
      mode: 'consumption',
      output: 'console'
    });

    assert(result.valid);
  });

  await t.test('handles file path string input', async () => {
    // This will throw because the file doesn't exist
    const result = await validator.validate('/nonexistent/path/template.json', 'strict');
    assert(!result.valid);
    assert(result.errors[0].message.includes('Failed to validate'));
  });

  await t.test('handles JSON parse errors with console output', async () => {
    // Create a mock file read scenario by passing a string that won't parse
    const result = await validator.validate('/invalid/path.json', 'strict', {
      output: 'console',
      json: true
    });
    assert(!result.valid);
    assert(result.errors.length > 0);
  });
});
