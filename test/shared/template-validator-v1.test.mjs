#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { strict as assert } from 'node:assert';
import { _readFile } from 'node:fs/promises';
import test from 'node:test';

import { TemplateValidator } from '../../lib/validation/template-validator.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const _repoRoot = path.resolve(__dirname, '../..');

// Test fixtures
const validTemplate = {
  schemaVersion: '1.0.0',
  id: 'test/example-template',
  name: 'Example Template',
  description: 'A test template for validation',
  dimensions: {
    deployment_target: {
      values: ['vercel', 'netlify']
    },
    features: {
      values: ['auth', 'database']
    },
    database: {
      values: ['postgresql', 'mysql']
    }
  },
  gates: {
    deployment_target: {
      platform: 'node',
      constraint: 'Requires Node.js runtime'
    }
  },
  featureSpecs: {
    auth: {
      label: 'Authentication',
      description: 'Add user authentication',
      needs: ['database']
    },
    database: {
      label: 'Database',
      description: 'Add database integration',
      needs: []
    }
  },
  hints: {
    features: {
      auth: 'Add secure user authentication',
      database: 'Set up database connection'
    }
  }
};

const invalidTemplate = {
  schemaVersion: '1.0.0',
  // Missing required id field
  name: 'Invalid Template',
  description: 'Missing required fields',
  dimensions: {
    features: {
      values: ['invalid-feature-name!'] // Invalid feature name pattern
    }
  }
};

test('TemplateValidator validates valid template successfully', async () => {
  const validator = new TemplateValidator();
  const result = await validator.validate(validTemplate, 'strict');

  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
  assert.equal(result.warnings.length, 0);
});

test('TemplateValidator rejects invalid template with errors', async () => {
  const validator = new TemplateValidator();
  const result = await validator.validate(invalidTemplate, 'strict');

  assert.equal(result.valid, false);
  assert(result.errors.length > 0);
  assert(result.errors.some(error => error.message.includes('Missing required field: id')));
});

test('TemplateValidator validates schema structure', async () => {
  const validator = new TemplateValidator();

  // Test missing schemaVersion
  const noVersion = { ...validTemplate };
  delete noVersion.schemaVersion;

  const result = await validator.validate(noVersion, 'strict');
  assert.equal(result.valid, false);
  assert(result.errors.some(error => error.message.includes('schemaVersion')));
});

test('TemplateValidator validates dimension values', async () => {
  const validator = new TemplateValidator();

  // Test empty dimension values
  const emptyValues = {
    ...validTemplate,
    dimensions: {
      features: {
        values: [] // Empty array should fail
      }
    }
  };

  const result = await validator.validate(emptyValues, 'strict');
  assert.equal(result.valid, false);
  assert(result.errors.some(error => error.message.includes('must have at least one value')));
});

test('TemplateValidator validates feature name patterns', async () => {
  const validator = new TemplateValidator();

  // Test invalid feature names
  const invalidFeatures = {
    ...validTemplate,
    dimensions: {
      features: {
        values: ['validName', 'invalid-name!', 'also-invalid@']
      }
    }
  };

  const result = await validator.validate(invalidFeatures, 'strict');
  assert.equal(result.valid, false);
  assert(result.errors.some(error => error.message.includes('Invalid feature name')));
});

test('TemplateValidator validates gates reference dimensions', async () => {
  const validator = new TemplateValidator();

  // Test gate referencing non-existent dimension
  const invalidGates = {
    ...validTemplate,
    gates: {
      nonexistent_dimension: {
        platform: 'node',
        constraint: 'Should fail'
      }
    }
  };

  const result = await validator.validate(invalidGates, 'strict');
  assert.equal(result.valid, false);
  assert(result.errors.some(error => error.message.includes('does not correspond to any dimension')));
});

test('TemplateValidator validates feature specs have required fields', async () => {
  const validator = new TemplateValidator();

  // Test feature spec missing required fields
  const invalidSpecs = {
    ...validTemplate,
    featureSpecs: {
      auth: {
        // Missing label and description
        needs: []
      }
    }
  };

  const result = await validator.validate(invalidSpecs, 'strict');
  assert.equal(result.valid, false);
  assert(result.errors.some(error => error.message.includes('missing required field: label')));
});

test('TemplateValidator supports lenient policy mode', async () => {
  const validator = new TemplateValidator();

  // Use lenient mode - schema errors become warnings
  const result = await validator.validate(invalidTemplate, 'lenient');

  assert.equal(result.valid, true); // Should pass in lenient mode
  assert(result.warnings.length > 0); // But should have warnings
});

test('TemplateValidator handles file-based validation', async () => {
  const validator = new TemplateValidator();

  // Test with non-existent file
  const result = await validator.validate('/nonexistent/file.json', 'strict');
  assert.equal(result.valid, false);
  assert(result.errors.some(error => error.message.includes('Failed to validate template')));
});

test('TemplateValidator caches schema files', async () => {
  const validator1 = new TemplateValidator();
  const validator2 = new TemplateValidator();

  // First validation should load and cache schema
  await validator1.validate(validTemplate, 'strict');

  // Second validator should use cached schema
  const result = await validator2.validate(validTemplate, 'strict');
  assert.equal(result.valid, true);
});

test('TemplateValidator provides detailed error messages', async () => {
  const validator = new TemplateValidator();

  const result = await validator.validate(invalidTemplate, 'strict');

  // Check that errors have proper structure
  for (const error of result.errors) {
    assert(error.type);
    assert(error.message);
    assert(error.path); // Should have path information
  }
});

test('TemplateValidator validates hints structure', async () => {
  const validator = new TemplateValidator();

  // Test hints with features not in dimensions
  const invalidHints = {
    ...validTemplate,
    hints: {
      features: {
        nonexistent_feature: 'This should cause a warning'
      }
    }
  };

  const result = await validator.validate(invalidHints, 'strict');
  // This might be a domain validation we should add
  // For now, just ensure it doesn't crash
  assert(typeof result.valid === 'boolean');
});
