#!/usr/bin/env node

import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { strict as assert } from 'node:assert';
import { mkdir, mkdtemp, readFile, writeFile, cp } from 'node:fs/promises';
import test from 'node:test';

import { buildTemplateSchema } from '../scripts/build-template-schema.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

async function createIsolatedWorkspace() {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'schema-build-'));
  await mkdir(path.join(tmpDir, 'schema'), { recursive: true });
  await cp(path.join(repoRoot, 'schema', 'template.v1.json'), path.join(tmpDir, 'schema', 'template.v1.json'));
  await cp(path.join(repoRoot, 'schema', 'template.json'), path.join(tmpDir, 'schema', 'template.json'));
  return tmpDir;
}

test('buildTemplateSchema generates TypeScript artifacts', async () => {
  const workspace = await createIsolatedWorkspace();
  await buildTemplateSchema({ rootDir: workspace });

  const tsPath = path.join(workspace, 'types', 'template-schema.ts');
  const dtsPath = path.join(workspace, 'types', 'template-schema.d.ts');
  const mjsPath = path.join(workspace, 'types', 'template-schema.mjs');

  const tsContent = await readFile(tsPath, 'utf8');
  const dtsContent = await readFile(dtsPath, 'utf8');
  const mjsContent = await readFile(mjsPath, 'utf8');

  assert.match(tsContent, /export interface TemplateManifest/);
  assert.match(tsContent, /type TemplateAuthoringMode = 'wysiwyg' \| 'composable';/);
  assert.equal(tsContent, dtsContent);
  assert.match(mjsContent, /exports nothing at runtime/);
  assert.match(mjsContent, /export \{\};/);
});

test('buildTemplateSchema --check detects drift', async () => {
  const workspace = await createIsolatedWorkspace();
  await buildTemplateSchema({ rootDir: workspace });
  await buildTemplateSchema({ rootDir: workspace, check: true });

  const tsPath = path.join(workspace, 'types', 'template-schema.ts');
  await writeFile(tsPath, `${await readFile(tsPath, 'utf8')}\n// mutated`);

  await assert.rejects(
    () => buildTemplateSchema({ rootDir: workspace, check: true }),
    /template-schema.ts is out of date/
  );
});
