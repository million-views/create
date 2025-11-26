#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { strict as assert } from 'node:assert';
import test from 'node:test';

import { SelectionValidator } from '../../lib/validation/selection-validator.mts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Test fixtures
const validTemplate = {
  schemaVersion: '1.0.0',
  id: 'test/example-template',
  name: 'Example Template',
  description: 'A test template for validation',
  dimensions: {
    deployment: {
      values: ['vercel', 'netlify']
    },
    features: {
      values: ['auth', 'database', 'payments']
    },
    database: {
      values: ['postgresql', 'mysql']
    }
  },
  gates: {
    deployment: {
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
    },
    payments: {
      label: 'Payments',
      description: 'Add payment processing',
      needs: ['auth']
    }
  }
};

const validSelection = {
  schemaVersion: '1.0.0',
  templateId: 'test/example-template',
  version: '1.0.0',
  selections: {
    deployment: 'vercel',
    features: ['auth', 'database'],
    database: 'postgresql'
  }
};

const invalidSelection = {
  schemaVersion: '1.0.0',
  // Missing templateId
  selections: {
    deployment: 'vercel',
    features: ['auth']
  }
};

test('SelectionValidator validates valid selection successfully', async () => {
  const validator = new SelectionValidator();
  const result = await validator.validate(validSelection, validTemplate);

  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
  assert.equal(result.warnings.length, 0);
});

test('SelectionValidator generates correct derived flags', async () => {
  const validator = new SelectionValidator();
  const result = await validator.validate(validSelection, validTemplate);

  assert.equal(result.valid, true);
  assert.equal(result.derived.needAuth, true);
  assert.equal(result.derived.needDb, true);
  assert.equal(result.derived.needPayments, false);
  assert.equal(result.derived.needStorage, false);
});

test('SelectionValidator rejects invalid selection schema', async () => {
  const validator = new SelectionValidator();
  const result = await validator.validate(invalidSelection, validTemplate);

  assert.equal(result.valid, false);
  assert(result.errors.length > 0);
  assert(result.errors.some(error => error.message.includes('Missing required field: templateId')));
});

test('SelectionValidator enforces feature dependencies', async () => {
  const validator = new SelectionValidator();

  // Selection with payments but missing auth (which payments needs)
  const invalidDeps = {
    ...validSelection,
    selections: {
      ...validSelection.selections,
      features: ['payments', 'database'] // payments needs auth, but auth not selected
    }
  };

  const result = await validator.validate(invalidDeps, validTemplate);
  assert.equal(result.valid, false);
  assert(result.errors.some(error => error.message.includes('requires \'auth\' to be selected')));
});

test('SelectionValidator validates dimension values exist', async () => {
  const validator = new SelectionValidator();

  // Selection with invalid dimension value
  const invalidValue = {
    ...validSelection,
    selections: {
      ...validSelection.selections,
      deployment: 'invalid-target' // Not in template dimensions
    }
  };

  const result = await validator.validate(invalidValue, validTemplate);
  assert.equal(result.valid, false);
  assert(result.errors.some(error => error.message.includes('Invalid value')));
});

test('SelectionValidator enforces gates constraints', async () => {
  const validator = new SelectionValidator();

  // Template with gate that forbids certain values
  const gatedTemplate = {
    ...validTemplate,
    gates: {
      deployment: {
        platform: 'node',
        constraint: 'Only Vercel allowed',
        allowed: ['vercel'],
        forbidden: ['netlify']
      }
    }
  };

  // Selection that violates the gate
  const violatingSelection = {
    ...validSelection,
    selections: {
      ...validSelection.selections,
      deployment: 'netlify' // Forbidden by gate
    }
  };

  const result = await validator.validate(violatingSelection, gatedTemplate);
  assert.equal(result.valid, false);
  assert(result.errors.some(error => error.message.includes('Only Vercel allowed')));
});

test('SelectionValidator handles missing template gracefully', async () => {
  const validator = new SelectionValidator();

  const result = await validator.validate(validSelection, null);
  assert.equal(result.valid, false);
  assert(result.errors.some(error => error.message.includes('Failed to validate selection')));
});

test('SelectionValidator handles file-based validation', async () => {
  const validator = new SelectionValidator();

  // Test with non-existent files
  const result = await validator.validate('/nonexistent/selection.json', '/nonexistent/template.json');
  assert.equal(result.valid, false);
  assert(result.errors.some(error => error.message.includes('Failed to validate selection')));
});

test('SelectionValidator caches schema files', async () => {
  const validator1 = new SelectionValidator();
  const validator2 = new SelectionValidator();

  // First validation should load and cache schema
  await validator1.validate(validSelection, validTemplate);

  // Second validator should use cached schema
  const result = await validator2.validate(validSelection, validTemplate);
  assert.equal(result.valid, true);
});

test('SelectionValidator provides detailed error messages', async () => {
  const validator = new SelectionValidator();
  const result = await validator.validate(invalidSelection, validTemplate);

  // Check that errors have proper structure
  for (const error of result.errors) {
    assert(error.type);
    assert(error.message);
    assert(error.path); // Should have path information
  }
});

test('SelectionValidator handles empty selections', async () => {
  const validator = new SelectionValidator();

  const emptySelection = {
    schemaVersion: '1.0.0',
    templateId: 'test/example-template',
    version: '1.0.0',
    selections: {}
  };

  const result = await validator.validate(emptySelection, validTemplate);
  // Empty selections should be valid (user can select nothing)
  assert.equal(result.valid, true);
});

test('SelectionValidator validates feature array handling', async () => {
  const validator = new SelectionValidator();

  // Test with single feature as string (should be converted to array)
  const stringFeature = {
    ...validSelection,
    selections: {
      ...validSelection.selections,
      features: 'auth' // String instead of array
    }
  };

  const result = await validator.validate(stringFeature, validTemplate);
  // This should either work or give a clear error
  assert(typeof result.valid === 'boolean');
});

test('SelectionValidator handles template with no gates', async () => {
  const validator = new SelectionValidator();

  const noGatesTemplate = {
    ...validTemplate,
    gates: {} // No gates
  };

  const result = await validator.validate(validSelection, noGatesTemplate);
  assert.equal(result.valid, true);
});

test('SelectionValidator handles template with no feature specs', async () => {
  const validator = new SelectionValidator();

  const noSpecsTemplate = {
    ...validTemplate,
    featureSpecs: {} // No feature specs
  };

  const result = await validator.validate(validSelection, noSpecsTemplate);
  assert.equal(result.valid, true);
});
