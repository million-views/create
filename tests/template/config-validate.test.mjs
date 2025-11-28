#!/usr/bin/env node

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const CLI_ENTRY = fileURLToPath(new URL('../../bin/create/index.mts', import.meta.url));
const TEST_TIMEOUT = 30000;

function execCLI(args, options = {}) {
  const command = `node ${JSON.stringify(CLI_ENTRY)} ${args.join(' ')}`.trim();
  try {
    const stdout = execSync(command, {
      encoding: 'utf8',
      timeout: TEST_TIMEOUT,
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...options.env },
      stdio: options.stdio || 'pipe'
    });

    return { exitCode: 0, stdout, stderr: '' };
  } catch (error) {
    return {
      exitCode: error.status ?? 1,
      stdout: error.stdout || '',
      stderr: error.stderr || ''
    };
  }
}

async function setupProject(t, files = []) {
  const projectDir = await mkdtemp(join(tmpdir(), 'make-template-config-'));
  for (const file of files) {
    await writeFile(join(projectDir, file.name), file.contents, 'utf8');
  }
  if (t?.after) {
    t.after(async () => {
      await rm(projectDir, { recursive: true, force: true }).catch(() => { });
    });
  }
  return projectDir;
}

const validConfig = {
  version: '1.0',
  autoDetect: true,
  rules: {
    'README.md': [
      {
        context: 'text/markdown#heading',
        selector: 'h1',
        placeholder: 'CONTENT_TITLE'
      }
    ]
  }
};

const anotherValidConfig = {
  version: '2.0',
  autoDetect: false,
  rules: {
    'package.json': [
      {
        context: 'application/json',
        path: '$.name',
        placeholder: 'PACKAGE_NAME'
      }
    ]
  }
};

const stringify = (value) => JSON.stringify(value, null, 2);

test('make-template config validate command', async (t) => {
  await t.test('validates default .templatize.json successfully', async (t) => {
    const cwd = await setupProject(t, [
      { name: '.templatize.json', contents: stringify(validConfig) }
    ]);

    const result = execCLI(['template', 'config', 'validate'], { cwd });

    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /Configuration file is valid/);
  });

  await t.test('uses positional argument for custom config path', async (t) => {
    const cwd = await setupProject(t, [
      { name: 'custom-templatize.json', contents: stringify(anotherValidConfig) }
    ]);

    const result = execCLI(['template', 'config', 'validate', 'custom-templatize.json'], { cwd });

    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /Configuration file is valid/);
  });

  await t.test('exits with failure for invalid JSON', async (t) => {
    const cwd = await setupProject(t, [
      { name: '.templatize.json', contents: '{"version": }' }
    ]);

    const result = execCLI(['template', 'config', 'validate'], { cwd });

    assert.notEqual(result.exitCode, 0);
    assert.match(result.stderr + result.stdout, /Configuration validation failed/);
  });
});
