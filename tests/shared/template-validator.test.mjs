#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { validateTemplateManifest } from '../../bin/create-scaffold/modules/utils/template-validator.mjs';
import { ValidationError } from '../../bin/create-scaffold/modules/security.mjs';
import { TemplateValidator } from '../../lib/validation/template-validator.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

async function loadFixture(name) {
  const filePath = path.join(repoRoot, 'tests', 'fixtures', name, 'template.json');
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

test('TemplateValidator comprehensive validation', async (t) => {
  const validator = new TemplateValidator();

  await t.test('validates complete v1.0.0 template successfully', async () => {
    const template = {
      schemaVersion: '1.0.0',
      id: 'test/valid-template',
      name: 'Valid Template',
      description: 'A valid template for testing',
      dimensions: {
        features: {
          values: ['auth', 'database', 'api'],
          default: []
        },
        deployment: {
          values: ['vercel', 'netlify'],
          default: 'vercel'
        }
      },
      gates: {
        features: {
          platform: 'node',
          constraint: 'version >= 18'
        }
      },
      featureSpecs: {
        auth: {
          label: 'Authentication',
          description: 'User authentication system'
        },
        database: {
          label: 'Database',
          description: 'Database integration'
        },
        api: {
          label: 'API',
          description: 'API endpoints'
        }
      },
      hints: {
        features: {
          auth: 'Recommended for most applications'
        }
      },
      handoff: ['npm install']
    };

    const result = await validator.validate(template, 'strict');
    assert(result.valid, 'Template should be valid');
    assert(result.errors.length === 0, 'Should have no errors');
    assert(result.warnings.length === 0, 'Should have no warnings');
  });

  await t.test('rejects templates with invalid schema version', async () => {
    const template = {
      schemaVersion: '2.0.0',
      id: 'test/invalid',
      name: 'Invalid Version',
      description: 'Template with invalid schema version'
    };

    const result = await validator.validate(template, 'strict');
    assert(!result.valid, 'Template should be invalid');
    assert(result.errors.some(e => e.message.includes('Unsupported schema version')), 'Should report schema version error');
  });

  await t.test('rejects templates with invalid ID format', async () => {
    const template = {
      schemaVersion: '1.0.0',
      id: 'invalid-id-format',
      name: 'Invalid ID',
      description: 'Template with invalid ID format'
    };

    const result = await validator.validate(template, 'strict');
    assert(!result.valid, 'Template should be invalid');
    assert(result.errors.some(e => e.message.includes('Invalid ID format')), 'Should report ID format error');
  });

  await t.test('validates dimensions schema correctly', async () => {
    const template = {
      schemaVersion: '1.0.0',
      id: 'test/dimensions',
      name: 'Dimensions Test',
      description: 'Testing dimensions validation',
      dimensions: {
        invalid_dimension: {
          values: ['test']
        }
      }
    };

    const result = await validator.validate(template, 'strict');
    assert(!result.valid, 'Template should be invalid');
    assert(result.errors.some(e => e.message.includes('Unknown dimension')), 'Should report unknown dimension');
  });

  await t.test('validates gates reference existing dimensions', async () => {
    const template = {
      schemaVersion: '1.0.0',
      id: 'test/gates',
      name: 'Gates Test',
      description: 'Testing gates validation',
      dimensions: {
        features: {
          values: ['auth']
        },
        database: {
          values: ['postgres']
        }
      },
      gates: {
        cloudflare: {
          platform: 'edge',
          constraint: 'Limited capabilities',
          allowed: {
            nonexistent: ['value'] // references unknown dimension
          }
        }
      }
    };

    const result = await validator.validate(template, 'strict');
    assert(!result.valid, 'Template should be invalid');
    assert(result.errors.some(e => e.message.includes('references unknown dimension')), 'Should report unknown dimension reference');
  });

  await t.test('validates feature specs reference existing features', async () => {
    const template = {
      schemaVersion: '1.0.0',
      id: 'test/features',
      name: 'Features Test',
      description: 'Testing feature specs validation',
      dimensions: {
        features: {
          values: ['auth']
        }
      },
      featureSpecs: {
        nonexistent: {
          label: 'Nonexistent Feature',
          description: 'This feature does not exist'
        }
      }
    };

    const result = await validator.validate(template, 'strict');
    assert(!result.valid, 'Template should be invalid');
    assert(result.errors.some(e => e.message.includes('does not correspond to any feature')), 'Should report feature spec mismatch');
  });

  await t.test('validates feature names follow pattern', async () => {
    const template = {
      schemaVersion: '1.0.0',
      id: 'test/feature-names',
      name: 'Feature Names Test',
      description: 'Testing feature name validation',
      dimensions: {
        features: {
          values: ['INVALID_FEATURE', 'valid-feature', 'ValidFeature']
        }
      }
    };

    const result = await validator.validate(template, 'strict');
    assert(!result.valid, 'Template should be invalid');
    assert(result.errors.some(e => e.message.includes('Invalid feature name')), 'Should report invalid feature names');
  });

  await t.test('validates hints reference existing features', async () => {
    const template = {
      schemaVersion: '1.0.0',
      id: 'test/hints',
      name: 'Hints Test',
      description: 'Testing hints validation',
      dimensions: {
        features: {
          values: ['auth']
        }
      },
      hints: {
        features: {
          nonexistent: 'This hint references a nonexistent feature'
        }
      }
    };

    const result = await validator.validate(template, 'strict');
    assert(!result.valid, 'Template should be invalid');
    assert(result.errors.some(e => e.message.includes('does not correspond to any feature')), 'Should report hint mismatch');
  });

  await t.test('validates lenient policy allows schema errors', async () => {
    const template = {
      schemaVersion: '1.0.0',
      id: 'test/lenient',
      name: 'Lenient Test',
      // Missing description
      dimensions: {
        invalid_dimension: {
          values: ['test']
        }
      }
    };

    const result = await validator.validate(template, 'lenient');
    assert(result.valid, 'Template should be valid in lenient mode');
    assert(result.warnings.length > 0, 'Should have warnings in lenient mode');
  });

  await t.test('handles malformed template gracefully', async () => {
    const result = await validator.validate(null, 'strict');
    assert(!result.valid, 'Null template should be invalid');
    assert(result.errors.length > 0, 'Should have errors for null template');
  });
});

test('validateTemplateManifest returns normalized values for valid template', async () => {
  const manifest = await loadFixture('placeholder-template');
  const result = validateTemplateManifest(manifest);

  assert.equal(result.authoring, 'wysiwyg');
  assert.equal(result.authorAssetsDir, '__scaffold__');
  assert.equal(result.handoffSteps.length, 1);
  assert.equal(result.placeholders.length, manifest.metadata.placeholders.length);
  assert.deepEqual(result.dimensions, {});
  assert.deepEqual(result.canonicalVariables, []);
});

test('validateTemplateManifest throws when name is missing', () => {
  assert.throws(
    () => validateTemplateManifest({ description: 'Missing name' }),
    (error) => error instanceof ValidationError && error.field === 'name'
  );
});

test('validateTemplateManifest enforces placeholder pattern', () => {
  const manifest = {
    name: 'broken',
    description: 'broken template',
    metadata: {
      placeholders: [{ name: 'TOKEN' }]
    }
  };

  assert.throws(
    () => validateTemplateManifest(manifest),
    (error) => error instanceof ValidationError && error.field === 'metadata.placeholders'
  );
});

test('validateTemplateManifest rejects non-array placeholder metadata', () => {
  const manifest = {
    name: 'invalid',
    description: 'invalid metadata',
    metadata: {
      placeholders: 'not-an-array'
    }
  };

  assert.throws(
    () => validateTemplateManifest(manifest),
    (error) => error instanceof ValidationError && error.field === 'metadata.placeholders'
  );
});

test('validateTemplateManifest adds canonical placeholders without duplication', () => {
  const manifest = {
    name: 'canonical-test',
    description: 'manifest with canonical variable',
    metadata: {
      variables: [{ name: 'license' }]
    }
  };

  const result = validateTemplateManifest(manifest);
  const licensePlaceholder = result.placeholders.find((placeholder) => placeholder.token === 'LICENSE');

  assert.ok(licensePlaceholder, 'expected canonical placeholder to be present');
  assert.equal(licensePlaceholder.defaultValue, 'MIT');
  assert.equal(licensePlaceholder.type, 'string');
  assert.equal(licensePlaceholder.required, false);
  assert.equal(result.canonicalVariables.length, 1);
  assert.equal(result.canonicalVariables[0].id, 'license');
  assert.equal(result.canonicalVariables[0].defaultValue, 'MIT');
});

test('validateTemplateManifest merges canonical and template placeholder metadata', () => {
  const manifest = {
    name: 'merge-test',
    description: 'manifest with overrides',
    metadata: {
      variables: [{ name: 'author' }],
      placeholders: [
        {
          name: '{{AUTHOR}}',
          description: 'Custom author prompt',
          required: false
        }
      ]
    }
  };

  const result = validateTemplateManifest(manifest);
  const authorPlaceholders = result.placeholders.filter((placeholder) => placeholder.token === 'AUTHOR');

  assert.equal(authorPlaceholders.length, 1);
  assert.equal(authorPlaceholders[0].required, false);
  assert.equal(authorPlaceholders[0].description, 'Custom author prompt');
  assert.equal(result.canonicalVariables.length, 1);
  assert.equal(result.canonicalVariables[0].id, 'author');
});

test('validateTemplateManifest rejects unknown canonical variables', () => {
  const manifest = {
    name: 'bad-canonical',
    description: 'invalid',
    metadata: {
      variables: [{ name: 'repository' }]
    }
  };

  assert.throws(
    () => validateTemplateManifest(manifest),
    (error) => error instanceof ValidationError && error.field === 'metadata.variables'
  );
});
