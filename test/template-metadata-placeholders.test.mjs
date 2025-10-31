#!/usr/bin/env node

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadTemplateMetadataFromPath } from '../bin/templateMetadata.mjs';

async function withTempDir(fn) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'placeholder-metadata-'));
  try {
    await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

test('normalizes metadata.placeholders into placeholder specs', async () => {
  await withTempDir(async (dir) => {
    const templateJson = {
      name: 'demo',
      description: 'Demo template',
      metadata: {
        placeholders: [
          { name: '{{PROJECT_NAME}}', required: true },
          { name: '{{AUTHOR}}', default: 'Unknown', description: 'Maintainer' }
        ]
      }
    };

    await fs.writeFile(
      path.join(dir, 'template.json'),
      JSON.stringify(templateJson, null, 2)
    );

    const metadata = await loadTemplateMetadataFromPath(dir);

    assert.ok(Array.isArray(metadata.placeholders));
    assert.equal(metadata.placeholders.length, 2);
    assert.deepEqual(metadata.placeholders[0], {
      token: 'PROJECT_NAME',
      raw: '{{PROJECT_NAME}}',
      description: null,
      required: true,
      defaultValue: null,
      sensitive: false,
      type: 'string'
    });
    assert.equal(metadata.placeholders[1].token, 'AUTHOR');
    assert.equal(metadata.placeholders[1].defaultValue, 'Unknown');
    assert.equal(metadata.placeholders[1].description, 'Maintainer');
  });
});
