#!/usr/bin/env node

import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execCLI } from '../utils/cli.js';
import { GitFixtureManager } from '../helpers/git-fixtures.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const CLI_ENTRY = path.join(ROOT_DIR, 'bin', 'create-scaffold', 'index.mts');
const LOCAL_TEMPLATE = path.join(ROOT_DIR, 'tests', 'fixtures', 'features-demo-template');

async function assertPathMissing(targetPath) {
  try {
    await fs.access(targetPath);
    assert.fail(`Expected path to be absent: ${targetPath}`);
  } catch (error) {
    assert.strictEqual(error.code, 'ENOENT');
  }
}

test('dry-run CLI preview with local template path', async (t) => {
  const workingDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dry-run-local-workdir-'));
  const projectName = `dryrunlocal${Date.now()}`;
  const projectDir = path.join(workingDir, projectName);
  const m5nvHome = await fs.mkdtemp(path.join(os.tmpdir(), 'm5nv-home-local-'));

  t.after(async () => {
    await fs.rm(workingDir, { recursive: true, force: true }).catch(() => { });
    await fs.rm(m5nvHome, { recursive: true, force: true }).catch(() => { });
  });

  const result = await execCLI(CLI_ENTRY, [
    'new',
    projectName,
    '--template', LOCAL_TEMPLATE,
    '--dry-run'
  ], {
    cwd: workingDir,
    env: { M5NV_HOME: m5nvHome }
  });

  assert.strictEqual(result.exitCode, 0, `CLI exited with ${result.exitCode}\n${result.stderr}`);
  assert.match(result.stdout, /DRY RUN - Preview Mode/);
  assert.match(result.stdout, /Files:\s+\d+/);
  await assertPathMissing(projectDir);
});

test('dry-run CLI preview with cached repository template', async (t) => {
  const fixtureManager = await GitFixtureManager.create(t);
  const repo = await fixtureManager.createBareRepo('simple-template');
  const workingDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dry-run-remote-workdir-'));
  const projectName = `dryrunremote${Date.now()}`;
  const projectDir = path.join(workingDir, projectName);
  const m5nvHome = await fs.mkdtemp(path.join(os.tmpdir(), 'm5nv-home-remote-'));
  const remoteUrl = `https://example.com/templates/${path.basename(fileURLToPath(repo.repoUrl))}`;
  const gitConfigPath = path.join(workingDir, 'gitconfig');
  const gitConfigContent = `[url "${repo.repoUrl}"]\n\tinsteadOf = ${remoteUrl}\n`;
  await fs.writeFile(gitConfigPath, gitConfigContent);

  t.after(async () => {
    await fs.rm(workingDir, { recursive: true, force: true }).catch(() => { });
    await fs.rm(m5nvHome, { recursive: true, force: true }).catch(() => { });
  });

  const result = await execCLI(CLI_ENTRY, [
    'new',
    projectName,
    '--template', remoteUrl,
    '--dry-run'
  ], {
    cwd: workingDir,
    env: { M5NV_HOME: m5nvHome, GIT_CONFIG_GLOBAL: gitConfigPath }
  });

  assert.strictEqual(result.exitCode, 0, `CLI exited with ${result.exitCode}\n${result.stderr}`);
  assert.match(result.stdout, /DRY RUN - Preview Mode/);
  await assertPathMissing(projectDir);

  const cacheProtocolDir = path.join(m5nvHome, 'cache', 'https');
  const cacheExists = await fs.readdir(cacheProtocolDir).catch(() => []);
  assert(cacheExists.length > 0, 'Expected cached repository to exist for https:// protocol');
});
