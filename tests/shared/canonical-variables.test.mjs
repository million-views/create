#!/usr/bin/env node

import test from 'node:test';
import { strict as assert } from 'node:assert';

import { ValidationError } from '../../lib/security.mjs';
import {
  normalizeCanonicalVariables,
  mergeCanonicalPlaceholders,
  CANONICAL_VARIABLES
} from '../../bin/create-scaffold/modules/utils/canonical-variables.mjs';
import { normalizePlaceholders } from '../../bin/create-scaffold/modules/utils/placeholder-schema.mjs';

test('normalizeCanonicalVariables returns canonical defaults', () => {
  const result = normalizeCanonicalVariables([{ name: 'license' }]);

  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'license');
  assert.equal(result[0].placeholder.token, CANONICAL_VARIABLES.license.token);
  assert.equal(result[0].placeholder.type, CANONICAL_VARIABLES.license.type);
  assert.equal(result[0].placeholder.defaultValue, CANONICAL_VARIABLES.license.defaultValue);
  assert.equal(result[0].placeholder.required, CANONICAL_VARIABLES.license.required);
  assert.ok((result[0].placeholder.description || '').toLowerCase().includes('license'));
});

test('mergeCanonicalPlaceholders merges author metadata without duplication', () => {
  const canonical = normalizeCanonicalVariables([{ name: 'author' }]);
  const placeholders = normalizePlaceholders([
    {
      name: '{{AUTHOR}}',
      description: 'Preferred author credit line',
      required: false
    },
    {
      name: '{{PROJECT_NAME}}',
      description: 'Project name',
      required: true
    }
  ]);

  const merged = mergeCanonicalPlaceholders({ canonical, placeholders });

  const authorEntry = merged.find((entry) => entry.token === 'AUTHOR');
  assert.ok(authorEntry, 'canonical placeholder should be included');
  assert.equal(authorEntry.required, false, 'author placeholder required flag should respect template definition');
  assert.equal(authorEntry.defaultValue, CANONICAL_VARIABLES.author.defaultValue ?? null);
  assert.equal(authorEntry.description, 'Preferred author credit line');

  const projectEntry = merged.find((entry) => entry.token === 'PROJECT_NAME');
  assert.ok(projectEntry, 'non-canonical placeholder should be preserved');
});

test('normalizeCanonicalVariables rejects unknown names', () => {
  assert.throws(
    () => normalizeCanonicalVariables([{ name: 'repository' }]),
    (error) => error instanceof ValidationError && error.field === 'metadata.variables'
  );
});
