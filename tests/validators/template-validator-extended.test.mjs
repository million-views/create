#!/usr/bin/env node

/**
 * @fileoverview L2 Unit Tests for template-validator.mjs additional validation methods
 *
 * Coverage target: template-validator.mjs uncovered validation methods
 * Testing layer: L2 (Unit Tests - isolated module testing)
 * Philosophy: "Question before fixing" - tests validate actual SUT behavior
 */

import { strict as assert } from 'node:assert';
import test from 'node:test';

import { TemplateValidator } from '../../lib/validation/template-validator.mts';

// =============================================================================
// Test Suite: Schema Validation Methods
// =============================================================================

test('TemplateValidator - Dimensions Schema Validation', async (t) => {
  const validator = new TemplateValidator();

  await t.test('validateDimensionsSchema catches error for dimension without values', async () => {
    const template = {
      schemaVersion: '1.0.0',
      id: 'test/template',
      name: 'Test Template',
      description: 'A test template',
      dimensions: {
        deployment: { default: 'cloudflare-workers' } // Missing values/options causes error
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
        invalid_dimension: { values: ['test'] }
      }
    };

    const result = await validator.validate(template, 'strict');
    assert(!result.valid);
    assert(result.errors.some(e => e.message.includes('Unknown dimension')));
  });
});

test('TemplateValidator - Gates Schema Validation', async (t) => {
  const validator = new TemplateValidator();

  await t.test('validateGatesSchema reports missing platform', async () => {
    const template = {
      schemaVersion: '1.0.0',
      id: 'test/template',
      name: 'Test Template',
      description: 'A test template',
      gates: {
        cloudflare: { constraint: 'edge runtime' } // Missing platform
      }
    };

    const result = await validator.validate(template, 'strict');
    assert(!result.valid);
    assert(result.errors.some(e => e.message.includes('missing required field: platform')));
  });

  await t.test('validateGatesSchema reports missing constraint', async () => {
    const template = {
      schemaVersion: '1.0.0',
      id: 'test/template',
      name: 'Test Template',
      description: 'A test template',
      gates: {
        cloudflare: { platform: 'edge' } // Missing constraint
      }
    };

    const result = await validator.validate(template, 'strict');
    assert(!result.valid);
    assert(result.errors.some(e => e.message.includes('missing required field: constraint')));
  });
});

test('TemplateValidator - FeatureSpecs Schema Validation', async (t) => {
  const validator = new TemplateValidator();

  await t.test('validateFeatureSpecsSchema reports missing label', async () => {
    const template = {
      schemaVersion: '1.0.0',
      id: 'test/template',
      name: 'Test Template',
      description: 'A test template',
      featureSpecs: {
        auth: { description: 'Authentication' } // Missing label
      }
    };

    const result = await validator.validate(template, 'strict');
    assert(!result.valid);
    assert(result.errors.some(e => e.message.includes('missing required field: label')));
  });

  await t.test('validateFeatureSpecsSchema reports missing description', async () => {
    const template = {
      schemaVersion: '1.0.0',
      id: 'test/template',
      name: 'Test Template',
      description: 'A test template',
      featureSpecs: {
        auth: { label: 'Auth' } // Missing description
      }
    };

    const result = await validator.validate(template, 'strict');
    assert(!result.valid);
    assert(result.errors.some(e => e.message.includes('missing required field: description')));
  });
});

// =============================================================================
// Test Suite: Domain Validation Methods
// =============================================================================

test('TemplateValidator - Domain Validation - Dimension Values', async (t) => {
  const validator = new TemplateValidator();

  await t.test('reports empty dimension values', async () => {
    const template = {
      schemaVersion: '1.0.0',
      id: 'test/template',
      name: 'Test Template',
      description: 'A test template',
      dimensions: {
        features: { values: [] }
      }
    };

    const result = await validator.validate(template, 'strict');
    assert(!result.valid);
    assert(result.errors.some(e => e.message.includes('at least one value')));
  });

  await t.test('reports duplicate dimension values', async () => {
    const template = {
      schemaVersion: '1.0.0',
      id: 'test/template',
      name: 'Test Template',
      description: 'A test template',
      dimensions: {
        features: { values: ['auth', 'auth', 'db'] }
      }
    };

    const result = await validator.validate(template, 'strict');
    assert(!result.valid);
    assert(result.errors.some(e => e.message.includes('duplicate values')));
  });
});

test('TemplateValidator - Domain Validation - Gates Reference', async (t) => {
  const validator = new TemplateValidator();

  await t.test('reports gate allowed with invalid dimension value', async () => {
    const template = {
      schemaVersion: '1.0.0',
      id: 'test/template',
      name: 'Test Template',
      description: 'A test template',
      dimensions: {
        features: { values: ['auth', 'database'] }
      },
      gates: {
        cloudflare: {
          platform: 'edge',
          constraint: 'limited',
          allowed: {
            features: ['invalid-feature'] // Not in dimension values
          }
        }
      }
    };

    const result = await validator.validate(template, 'strict');
    assert(!result.valid);
    assert(result.errors.some(e => e.message.includes("invalid value 'invalid-feature'")));
  });

  await t.test('reports gate forbidden with invalid dimension value', async () => {
    const template = {
      schemaVersion: '1.0.0',
      id: 'test/template',
      name: 'Test Template',
      description: 'A test template',
      dimensions: {
        features: { values: ['auth', 'database'] }
      },
      gates: {
        cloudflare: {
          platform: 'edge',
          constraint: 'limited',
          forbidden: {
            features: ['nonexistent'] // Not in dimension values
          }
        }
      }
    };

    const result = await validator.validate(template, 'strict');
    assert(!result.valid);
    assert(result.errors.some(e => e.message.includes("invalid value 'nonexistent'")));
  });

  await t.test('reports gate forbidden referencing unknown dimension', async () => {
    const template = {
      schemaVersion: '1.0.0',
      id: 'test/template',
      name: 'Test Template',
      description: 'A test template',
      dimensions: {
        features: { values: ['auth', 'database'] }
      },
      gates: {
        cloudflare: {
          platform: 'edge',
          constraint: 'limited',
          forbidden: {
            unknown_dimension: ['value']
          }
        }
      }
    };

    const result = await validator.validate(template, 'strict');
    assert(!result.valid);
    assert(result.errors.some(e => e.message.includes('unknown dimension')));
  });
});

test('TemplateValidator - Domain Validation - Feature Specs Reference', async (t) => {
  const validator = new TemplateValidator();

  await t.test('reports feature spec needs with invalid dimension', async () => {
    const template = {
      schemaVersion: '1.0.0',
      id: 'test/template',
      name: 'Test Template',
      description: 'A test template',
      dimensions: {
        features: { values: ['auth'] }
      },
      featureSpecs: {
        auth: {
          label: 'Auth',
          description: 'Authentication',
          needs: {
            nonexistent: 'required' // Unknown dimension
          }
        }
      }
    };

    const result = await validator.validate(template, 'strict');
    assert(!result.valid);
    assert(result.errors.some(e => e.message.includes('needs unknown dimension')));
  });

  await t.test('reports feature spec needs with invalid requirement level', async () => {
    const template = {
      schemaVersion: '1.0.0',
      id: 'test/template',
      name: 'Test Template',
      description: 'A test template',
      dimensions: {
        features: { values: ['auth'] },
        database: { values: ['postgres'] }
      },
      featureSpecs: {
        auth: {
          label: 'Auth',
          description: 'Authentication',
          needs: {
            database: 'mandatory' // Invalid level, should be required/optional/none
          }
        }
      }
    };

    const result = await validator.validate(template, 'strict');
    assert(!result.valid);
    assert(result.errors.some(e => e.message.includes("invalid requirement 'mandatory'")));
  });
});

test('TemplateValidator - Domain Validation - All Features Have Specs', async (t) => {
  const validator = new TemplateValidator();

  await t.test('reports feature without corresponding spec', async () => {
    const template = {
      schemaVersion: '1.0.0',
      id: 'test/template',
      name: 'Test Template',
      description: 'A test template',
      dimensions: {
        features: { values: ['auth', 'database', 'api'] }
      },
      featureSpecs: {
        auth: { label: 'Auth', description: 'Authentication' }
        // Missing 'database' and 'api' specs
      }
    };

    const result = await validator.validate(template, 'strict');
    assert(!result.valid);
    assert(result.errors.some(e => e.message.includes("'database' is defined in dimensions but missing from featureSpecs")));
    assert(result.errors.some(e => e.message.includes("'api' is defined in dimensions but missing from featureSpecs")));
  });
});

test('TemplateValidator - Domain Validation - Hints Reference', async (t) => {
  const validator = new TemplateValidator();

  await t.test('reports hint needs with invalid dimension', async () => {
    const template = {
      schemaVersion: '1.0.0',
      id: 'test/template',
      name: 'Test Template',
      description: 'A test template',
      dimensions: {
        features: { values: ['auth'] }
      },
      hints: {
        features: {
          auth: {
            needs: {
              unknown_dim: 'required'
            }
          }
        }
      }
    };

    const result = await validator.validate(template, 'strict');
    assert(!result.valid);
    assert(result.errors.some(e => e.message.includes("Hint 'auth' needs unknown dimension")));
  });

  await t.test('reports hint needs with invalid requirement level', async () => {
    const template = {
      schemaVersion: '1.0.0',
      id: 'test/template',
      name: 'Test Template',
      description: 'A test template',
      dimensions: {
        features: { values: ['auth'] },
        database: { values: ['postgres'] }
      },
      hints: {
        features: {
          auth: {
            needs: {
              database: 'invalid-level'
            }
          }
        }
      }
    };

    const result = await validator.validate(template, 'strict');
    assert(!result.valid);
    assert(result.errors.some(e => e.message.includes("invalid requirement 'invalid-level'")));
  });
});

// =============================================================================
// Test Suite: Runtime Validation Methods
// =============================================================================

test('TemplateValidator - Runtime Validation - Gates Enforcement', async (t) => {
  const validator = new TemplateValidator();

  await t.test('validateGatesEnforcement returns empty for unknown gate', () => {
    const template = {
      dimensions: {
        features: { values: ['auth'] }
      },
      gates: {}
    };

    const errors = validator.validateGatesEnforcement(
      template,
      { features: 'auth' },
      'nonexistent-platform'
    );
    assert.equal(errors.length, 0);
  });

  await t.test('validateGatesEnforcement detects allowed violation', () => {
    const template = {
      dimensions: {
        features: { values: ['auth', 'database', 'storage'] }
      },
      gates: {
        cloudflare: {
          platform: 'edge',
          constraint: 'limited',
          allowed: {
            features: ['auth']
          }
        }
      }
    };

    const errors = validator.validateGatesEnforcement(
      template,
      { features: 'database' },
      'cloudflare'
    );
    assert(errors.length > 0);
    assert(errors[0].type === 'GATES_VIOLATION');
    assert(errors[0].message.includes("does not allow 'database'"));
  });

  await t.test('validateGatesEnforcement handles array values', () => {
    const template = {
      dimensions: {
        features: { values: ['auth', 'database', 'storage'] }
      },
      gates: {
        cloudflare: {
          platform: 'edge',
          constraint: 'limited',
          allowed: {
            features: ['auth']
          }
        }
      }
    };

    const errors = validator.validateGatesEnforcement(
      template,
      { features: ['auth', 'database'] },
      'cloudflare'
    );
    assert(errors.length > 0);
    assert(errors[0].message.includes("does not allow 'database'"));
  });

  await t.test('validateGatesEnforcement detects forbidden violation', () => {
    const template = {
      dimensions: {
        features: { values: ['auth', 'database', 'storage'] }
      },
      gates: {
        cloudflare: {
          platform: 'edge',
          constraint: 'limited',
          forbidden: {
            features: ['storage']
          }
        }
      }
    };

    const errors = validator.validateGatesEnforcement(
      template,
      { features: 'storage' },
      'cloudflare'
    );
    assert(errors.length > 0);
    assert(errors[0].type === 'GATES_VIOLATION');
    assert(errors[0].message.includes("forbids 'storage'"));
  });

  await t.test('validateGatesEnforcement handles array forbidden values', () => {
    const template = {
      dimensions: {
        features: { values: ['auth', 'database', 'storage'] }
      },
      gates: {
        cloudflare: {
          platform: 'edge',
          constraint: 'limited',
          forbidden: {
            features: ['storage']
          }
        }
      }
    };

    const errors = validator.validateGatesEnforcement(
      template,
      { features: ['auth', 'storage'] },
      'cloudflare'
    );
    assert(errors.length > 0);
    assert(errors[0].message.includes("forbids 'storage'"));
  });
});

test('TemplateValidator - Runtime Validation - Feature Needs', async (t) => {
  const validator = new TemplateValidator();

  await t.test('validateFeatureNeeds reports missing spec for enabled feature', () => {
    const template = {
      dimensions: {
        features: { values: ['auth'] }
      },
      featureSpecs: {}
    };

    const errors = validator.validateFeatureNeeds(
      template,
      ['auth'],
      {}
    );
    assert(errors.length > 0);
    assert(errors[0].type === 'FEATURE_NEEDS_VIOLATION');
    assert(errors[0].message.includes('has no specification defined'));
  });

  await t.test('validateFeatureNeeds reports missing required dimension', () => {
    const template = {
      dimensions: {
        features: { values: ['auth'] },
        database: { values: ['postgres'] }
      },
      featureSpecs: {
        auth: {
          label: 'Auth',
          description: 'Authentication',
          needs: {
            database: 'required'
          }
        }
      }
    };

    const errors = validator.validateFeatureNeeds(
      template,
      ['auth'],
      {} // No database selected
    );
    assert(errors.length > 0);
    assert(errors[0].type === 'FEATURE_NEEDS_VIOLATION');
    assert(errors[0].message.includes("requires dimension 'database'"));
  });

  await t.test('validateFeatureNeeds reports empty array for required dimension', () => {
    const template = {
      dimensions: {
        features: { values: ['auth'] },
        database: { values: ['postgres'] }
      },
      featureSpecs: {
        auth: {
          label: 'Auth',
          description: 'Authentication',
          needs: {
            database: 'required'
          }
        }
      }
    };

    const errors = validator.validateFeatureNeeds(
      template,
      ['auth'],
      { database: [] } // Empty array
    );
    assert(errors.length > 0);
    assert(errors[0].message.includes("requires dimension 'database'"));
  });

  await t.test('validateFeatureNeeds validates array values against dimension values', () => {
    const template = {
      dimensions: {
        features: { values: ['auth'] },
        database: { values: ['postgres', 'mysql'] }
      },
      featureSpecs: {
        auth: {
          label: 'Auth',
          description: 'Authentication',
          needs: {
            database: 'required'
          }
        }
      }
    };

    const errors = validator.validateFeatureNeeds(
      template,
      ['auth'],
      { database: ['invalid-db'] } // Invalid value
    );
    assert(errors.length > 0);
    assert(errors[0].message.includes('requires a valid value'));
  });

  await t.test('validateFeatureNeeds passes with valid required dimension', () => {
    const template = {
      dimensions: {
        features: { values: ['auth'] },
        database: { values: ['postgres', 'mysql'] }
      },
      featureSpecs: {
        auth: {
          label: 'Auth',
          description: 'Authentication',
          needs: {
            database: 'required'
          }
        }
      }
    };

    const errors = validator.validateFeatureNeeds(
      template,
      ['auth'],
      { database: 'postgres' }
    );
    assert.equal(errors.length, 0);
  });
});

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

  await t.test('reports auth feature without database', () => {
    const template = {};
    const errors = validator.validateCrossDimensionCompatibility(
      template,
      { features: ['auth'], database: 'none' }
    );
    assert(errors.length > 0);
    assert(errors.some(e => e.message.includes('requires a database')));
  });

  await t.test('reports auth feature with missing database', () => {
    const template = {};
    const errors = validator.validateCrossDimensionCompatibility(
      template,
      { features: ['auth'] }
    );
    assert(errors.length > 0);
    assert(errors.some(e => e.message.includes('requires a database')));
  });

  await t.test('reports payments feature without auth', () => {
    const template = {};
    const errors = validator.validateCrossDimensionCompatibility(
      template,
      { features: ['payments'] }
    );
    assert(errors.length > 0);
    assert(errors.some(e => e.message.includes('Payments feature requires authentication')));
  });

  await t.test('passes with compatible selections', () => {
    const template = {};
    const errors = validator.validateCrossDimensionCompatibility(
      template,
      { deployment: 'vercel', database: 'postgres', features: ['auth'], storage: 's3' }
    );
    assert.equal(errors.length, 0);
  });
});

test('TemplateValidator - Runtime Validation - Hints Consistency', async (t) => {
  const validator = new TemplateValidator();

  await t.test('reports hint for nonexistent feature spec', () => {
    const template = {
      hints: {
        features: {
          auth: { label: 'Auth', description: 'Authentication' }
        }
      },
      featureSpecs: {}
    };

    const errors = validator.validateHintsConsistency(template);
    assert(errors.length > 0);
    assert(errors[0].type === 'HINTS_CONSISTENCY_VIOLATION');
    assert(errors[0].message.includes('no feature spec exists'));
  });

  await t.test('reports hint with mismatched needs requirement', () => {
    const template = {
      hints: {
        features: {
          auth: {
            label: 'Auth',
            description: 'Authentication',
            needs: {
              database: 'optional'
            }
          }
        }
      },
      featureSpecs: {
        auth: {
          label: 'Auth',
          description: 'Authentication',
          needs: {
            database: 'required' // Different from hint
          }
        }
      }
    };

    const errors = validator.validateHintsConsistency(template);
    assert(errors.length > 0);
    assert(errors.some(e => e.message.includes('different requirement')));
  });

  await t.test('reports hint missing label', () => {
    const template = {
      hints: {
        features: {
          auth: {
            description: 'Authentication'
            // Missing label
          }
        }
      },
      featureSpecs: {
        auth: {
          label: 'Auth',
          description: 'Authentication'
        }
      }
    };

    const errors = validator.validateHintsConsistency(template);
    assert(errors.length > 0);
    assert(errors.some(e => e.message.includes("missing required 'label'")));
  });

  await t.test('reports hint missing description', () => {
    const template = {
      hints: {
        features: {
          auth: {
            label: 'Auth'
            // Missing description
          }
        }
      },
      featureSpecs: {
        auth: {
          label: 'Auth',
          description: 'Authentication'
        }
      }
    };

    const errors = validator.validateHintsConsistency(template);
    assert(errors.length > 0);
    assert(errors.some(e => e.message.includes("missing required 'description'")));
  });

  await t.test('returns empty array when no hints or featureSpecs', () => {
    const errors = validator.validateHintsConsistency({});
    assert.equal(errors.length, 0);
  });
});

test('TemplateValidator - Runtime Validation - Full Runtime Validation', async (t) => {
  const validator = new TemplateValidator();

  await t.test('validateRuntime returns combined results', () => {
    const template = {
      dimensions: {
        features: { values: ['auth', 'database'] }
      },
      gates: {
        cloudflare: {
          platform: 'edge',
          constraint: 'limited',
          forbidden: {
            features: ['database']
          }
        }
      },
      featureSpecs: {
        auth: {
          label: 'Auth',
          description: 'Authentication',
          needs: {}
        }
      },
      hints: {
        features: {
          auth: { description: 'Some auth hint' } // Missing label
        }
      }
    };

    const result = validator.validateRuntime(
      template,
      { features: ['auth', 'database'] },
      'cloudflare',
      ['auth']
    );

    assert(!result.valid); // Should have errors
    assert(result.errors.length > 0);
    assert(result.errors.some(e => e.type === 'GATES_VIOLATION'));
    assert(result.warnings.length > 0);
    assert(result.warnings.some(e => e.type === 'HINTS_CONSISTENCY_VIOLATION'));
  });

  await t.test('validateRuntime skips gates enforcement without deploymentTarget', () => {
    const template = {};
    const result = validator.validateRuntime(
      template,
      {},
      null, // No deployment target
      []
    );
    assert(result.valid);
  });

  await t.test('validateRuntime skips feature needs without enabled features', () => {
    const template = {};
    const result = validator.validateRuntime(
      template,
      {},
      null,
      null // No enabled features
    );
    assert(result.valid);
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
