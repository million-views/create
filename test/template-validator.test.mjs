#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { validateTemplateManifest } from '../bin/utils/templateValidator.mjs';
import { ValidationError } from '../bin/security.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

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
