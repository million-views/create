#!/usr/bin/env node

import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { strict as assert } from 'node:assert';
import { mkdir, mkdtemp, readFile, writeFile, cp } from 'node:fs/promises';
import test from 'node:test';

import { buildTemplateSchema } from '../../scripts/build-template-schema.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

async function createIsolatedWorkspace() {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'schema-build-'));
  await mkdir(path.join(tmpDir, 'schema'), { recursive: true });
  await cp(path.join(repoRoot, 'schema', 'template.v1.json'), path.join(tmpDir, 'schema', 'template.v1.json'));
  await cp(path.join(repoRoot, 'schema', 'template.json'), path.join(tmpDir, 'schema', 'template.json'));
  await cp(path.join(repoRoot, 'schema', 'selection.v1.json'), path.join(tmpDir, 'schema', 'selection.v1.json'));
  await cp(path.join(repoRoot, 'schema', 'selection.json'), path.join(tmpDir, 'schema', 'selection.json'));
  return tmpDir;
}

test('buildTemplateSchema generates TypeScript artifacts', async () => {
  const workspace = await createIsolatedWorkspace();
  await buildTemplateSchema({ rootDir: workspace });

  // Template schema files
  const templateTsPath = path.join(workspace, 'types', 'template-schema.ts');
  const templateDtsPath = path.join(workspace, 'types', 'template-schema.d.ts');
  const templateMjsPath = path.join(workspace, 'types', 'template-schema.mjs');

  // Selection schema files
  const selectionTsPath = path.join(workspace, 'types', 'selection-schema.ts');
  const selectionDtsPath = path.join(workspace, 'types', 'selection-schema.d.ts');
  const selectionMjsPath = path.join(workspace, 'types', 'selection-schema.mjs');

  const templateTsContent = await readFile(templateTsPath, 'utf8');
  const templateDtsContent = await readFile(templateDtsPath, 'utf8');
  const templateMjsContent = await readFile(templateMjsPath, 'utf8');

  const selectionTsContent = await readFile(selectionTsPath, 'utf8');
  const selectionDtsContent = await readFile(selectionDtsPath, 'utf8');
  const selectionMjsContent = await readFile(selectionMjsPath, 'utf8');

  // Template schema checks (v1.0 - Registry Model)
  assert.match(templateTsContent, /export interface TemplateManifest/);
  // New schema v1.0: No authoring mode enum anymore, validate basic structure instead
  assert.match(templateTsContent, /export interface TemplateCanonicalVariable/);
  assert.match(templateTsContent, /variables\?: TemplateCanonicalVariable\[];/);
  // .ts file should have 'as const' assertions
  assert.match(templateTsContent, /export const TEMPLATE_SCHEMA_VERSION = '[^']+' as const;/);
  assert.match(templateTsContent, /export const TEMPLATE_SCHEMA_PATH = '[^']+' as const;/);
  // .d.ts file should NOT have 'as const' assertions (ambient context restriction)
  assert.match(templateDtsContent, /export const TEMPLATE_SCHEMA_VERSION = '[^']+';$/m);
  assert.match(templateDtsContent, /export const TEMPLATE_SCHEMA_PATH = '[^']+';$/m);
  assert.match(templateMjsContent, /exports nothing at runtime/);
  assert.match(templateMjsContent, /export \{\};/);

  // Selection schema checks (v1.0 - Generic choices/placeholders structure)
  assert.match(selectionTsContent, /export interface SelectionManifest/);
  // New schema v1.0: Choices are generic, validate structure instead of specific deployment targets
  assert.match(selectionTsContent, /export interface SelectionChoices/);
  assert.match(selectionTsContent, /export interface SelectionPlaceholders/);
  // .ts file should have 'as const' assertions
  assert.match(selectionTsContent, /export const SELECTION_SCHEMA_VERSION = '[^']+' as const;/);
  assert.match(selectionTsContent, /export const SELECTION_SCHEMA_PATH = '[^']+' as const;/);
  // .d.ts file should NOT have 'as const' assertions (ambient context restriction)
  assert.match(selectionDtsContent, /export const SELECTION_SCHEMA_VERSION = '[^']+';$/m);
  assert.match(selectionDtsContent, /export const SELECTION_SCHEMA_PATH = '[^']+';$/m);
  assert.match(selectionMjsContent, /exports nothing at runtime/);
  assert.match(selectionMjsContent, /export \{\};/);
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
