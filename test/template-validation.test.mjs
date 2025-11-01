#!/usr/bin/env node

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { validateManifest } from '../bin/validators/manifestValidator.mjs';
import { validateSetupScript } from '../bin/validators/setupLint.mjs';
import { validateRequiredFiles } from '../bin/validators/requiredFiles.mjs';

async function createTempTemplate(structure = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'template-validation-'));

  // Apply structure entries: object mapping relative path -> string contents
  const entries = Object.entries(structure);
  await Promise.all(entries.map(async ([relative, contents]) => {
    const absolute = path.join(dir, relative);
    await fs.mkdir(path.dirname(absolute), { recursive: true, mode: 0o755 });
    await fs.writeFile(absolute, contents, 'utf8');
  }));

  return dir;
}

function validManifest() {
  return JSON.stringify({
    name: 'example-template',
    description: 'Demo template',
    metadata: {
      placeholders: []
    }
  });
}

test('validateManifest passes for well-formed template.json', async (t) => {
  const dir = await createTempTemplate({
    'template.json': validManifest()
  });
  t.after(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  const result = await validateManifest({ targetPath: dir });
  assert.equal(result.name, 'manifest');
  assert.equal(result.status, 'pass');
  assert.deepEqual(result.issues, []);
});

test('validateManifest fails when template.json missing', async (t) => {
  const dir = await createTempTemplate();
  t.after(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  const result = await validateManifest({ targetPath: dir });
  assert.equal(result.status, 'fail');
  assert.ok(result.issues.some((issue) => issue.includes('template.json')));
});

test('validateManifest fails when template.json invalid', async (t) => {
  const dir = await createTempTemplate({
    'template.json': JSON.stringify({ description: 'Missing name' })
  });
  t.after(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  const result = await validateManifest({ targetPath: dir });
  assert.equal(result.status, 'fail');
  assert.ok(result.issues.length > 0);
  assert.ok(result.issues[0].toLowerCase().includes('name'));
});

test('validateSetupScript warns when missing', async (t) => {
  const dir = await createTempTemplate();
  t.after(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  const result = await validateSetupScript({ targetPath: dir });
  assert.equal(result.status, 'warn');
  assert.ok(result.issues.some((issue) => issue.toLowerCase().includes('optional')));
});

test('validateSetupScript warns when script is empty', async (t) => {
  const dir = await createTempTemplate({
    '_setup.mjs': ''
  });
  t.after(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  const result = await validateSetupScript({ targetPath: dir });
  assert.equal(result.status, 'warn');
  assert.ok(result.issues.some((issue) => issue.toLowerCase().includes('empty')));
});

test('validateSetupScript fails on forbidden globals', async (t) => {
  const dir = await createTempTemplate({
    '_setup.mjs': 'export default async function setup() { require("fs"); }'
  });
  t.after(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  const result = await validateSetupScript({ targetPath: dir });
  assert.equal(result.status, 'fail');
  assert.ok(result.issues.some((issue) => issue.toLowerCase().includes('forbidden')));
});

test('validateSetupScript fails when default export missing', async (t) => {
  const dir = await createTempTemplate({
    '_setup.mjs': 'console.log("no export");'
  });
  t.after(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  const result = await validateSetupScript({ targetPath: dir });
  assert.equal(result.status, 'fail');
  assert.ok(result.issues.some((issue) => issue.toLowerCase().includes('default export')));
});

test('validateSetupScript passes for compliant script', async (t) => {
  const dir = await createTempTemplate({
    '_setup.mjs': 'export default async function setup() { return true; }'
  });
  t.after(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  const result = await validateSetupScript({ targetPath: dir });
  assert.equal(result.status, 'pass');
  assert.deepEqual(result.issues, []);
});

test('validateRequiredFiles passes when README and undo file exist', async (t) => {
  const dir = await createTempTemplate({
    'template.json': validManifest(),
    '.template-undo.json': '{}',
    'README.md': '# Template'
  });
  t.after(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  const result = await validateRequiredFiles({ targetPath: dir });
  assert.equal(result.status, 'pass');
  assert.deepEqual(result.issues, []);
});

test('validateRequiredFiles fails when README missing', async (t) => {
  const dir = await createTempTemplate({
    'template.json': validManifest(),
    '.template-undo.json': '{}'
  });
  t.after(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  const result = await validateRequiredFiles({ targetPath: dir });
  assert.equal(result.status, 'fail');
  assert.ok(result.issues.some((issue) => issue.toLowerCase().includes('readme')));
});

test('validateRequiredFiles fails when undo file missing', async (t) => {
  const dir = await createTempTemplate({
    'template.json': validManifest(),
    'README.md': '# Template'
  });
  t.after(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  const result = await validateRequiredFiles({ targetPath: dir });
  assert.equal(result.status, 'fail');
  assert.ok(result.issues.some((issue) => issue.includes('.template-undo.json')));
});
