#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { validateTemplateManifest } from '../../lib/shared/utils/template-validator.mjs';
import { ValidationError } from '../../lib/shared/security.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

async function loadFixture(name) {
  const filePath = path.join(repoRoot, 'test', 'fixtures', name, 'template.json');
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

test('validateTemplateManifest returns normalized values for valid template', async () => {
  const manifest = await loadFixture('placeholder-template');
  const result = validateTemplateManifest(manifest);

  assert.equal(result.authoringMode, 'wysiwyg');
  assert.equal(result.authorAssetsDir, '__scaffold__');
  assert.equal(result.handoffSteps.length, 1);
  assert.equal(result.placeholders.length, manifest.metadata.placeholders.length);
  assert.deepEqual(result.supportedOptions, []);
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
