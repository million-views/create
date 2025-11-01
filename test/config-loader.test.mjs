#!/usr/bin/env node

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadConfig } from '../bin/configLoader.mjs';
import { ValidationError } from '../bin/security.mjs';

async function createTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'config-loader-'));
}

test('loadConfig returns null when skipping discovery', async () => {
  const result = await loadConfig({ skip: true });
  assert.equal(result, null);
});

test('loadConfig returns null when no configuration files exist', async (t) => {
  const tmpDir = await createTempDir();
  t.after(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  const result = await loadConfig({ cwd: tmpDir, env: {} });
  assert.equal(result, null);
});

test('loadConfig loads project configuration when available', async (t) => {
  const tmpDir = await createTempDir();
  t.after(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  const filePath = path.join(tmpDir, '.m5nvrc');
  const config = {
    repo: 'example/templates',
    branch: 'main',
    author: {
      name: 'Example Dev',
      email: 'dev@example.com'
    },
    placeholders: {
      PROJECT_NAME: 'demo-app'
    }
  };

  await fs.writeFile(filePath, JSON.stringify(config), 'utf8');

  const result = await loadConfig({ cwd: tmpDir, env: {} });
  assert.ok(result);
  assert.equal(result.path, path.resolve(filePath));
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.defaults));
  assert.equal(result.defaults.repo, 'example/templates');
  assert.equal(result.defaults.branch, 'main');
  assert.deepEqual(result.defaults.author, {
    name: 'Example Dev',
    email: 'dev@example.com'
  });
  assert.ok(Object.isFrozen(result.defaults.author));
  assert.deepEqual(result.defaults.placeholders, ['PROJECT_NAME=demo-app']);
});

test('loadConfig prioritizes environment override path', async (t) => {
  const tmpDir = await createTempDir();
  const envDir = await createTempDir();

  t.after(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
    await fs.rm(envDir, { recursive: true, force: true });
  });

  const projectConfig = path.join(tmpDir, '.m5nvrc');
  await fs.writeFile(projectConfig, JSON.stringify({ repo: 'project/repo' }), 'utf8');

  const envConfig = path.join(envDir, 'config.json');
  await fs.writeFile(envConfig, JSON.stringify({ repo: 'env/repo' }), 'utf8');

  const result = await loadConfig({
    cwd: tmpDir,
    env: { CREATE_SCAFFOLD_CONFIG_PATH: envConfig }
  });

  assert.ok(result);
  assert.equal(result.path, path.resolve(envConfig));
  assert.equal(result.defaults.repo, 'env/repo');
});

test('loadConfig surfaces validation errors with context', async (t) => {
  const tmpDir = await createTempDir();
  t.after(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  const filePath = path.join(tmpDir, '.m5nvrc');
  await fs.writeFile(filePath, JSON.stringify({ repo: 'invalid repo url' }), 'utf8');

  await assert.rejects(
    () => loadConfig({ cwd: tmpDir, env: {} }),
    (error) => {
      assert.ok(error instanceof ValidationError);
      assert.match(error.message, /Configuration file/);
      assert.match(error.message, /invalid/);
      assert.match(error.message, /--no-config/);
      return true;
    }
  );
});

test('loadConfig rejects malformed JSON', async (t) => {
  const tmpDir = await createTempDir();
  t.after(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  const filePath = path.join(tmpDir, '.m5nvrc');
  await fs.writeFile(filePath, '{"repo": "example/repo",', 'utf8');

  await assert.rejects(
    () => loadConfig({ cwd: tmpDir, env: {} }),
    (error) => {
      assert.ok(error instanceof ValidationError);
      assert.match(error.message, /not valid JSON/);
      assert.match(error.message, /--no-config/);
      return true;
    }
  );
});

test('loadConfig enforces placeholder token format', async (t) => {
  const tmpDir = await createTempDir();
  t.after(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  const filePath = path.join(tmpDir, '.m5nvrc');
  await fs.writeFile(
    filePath,
    JSON.stringify({ placeholders: { 'invalid token': 'value' } }),
    'utf8'
  );

  await assert.rejects(
    () => loadConfig({ cwd: tmpDir, env: {} }),
    (error) => {
      assert.ok(error instanceof ValidationError);
      assert.match(error.message, /placeholder token/);
      return true;
    }
  );
});
