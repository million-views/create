#!/usr/bin/env node

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execCLI } from '../utils/cli.js';
import { detectResourceLeaks, getResourceSnapshot } from '../utils/resources.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLI_PATH = path.join(__dirname, '..', '..', 'bin', 'create-scaffold', 'index.mjs');

async function runLeakScenario({ name, args, expectedMessage }) {
  const before = await getResourceSnapshot();
  const result = await execCLI(CLI_PATH, args);

  assert.equal(result.exitCode, 1, `${name} should exit with code 1`);
  assert.match(result.stderr, expectedMessage, `${name} should surface expected error message`);

  const after = await getResourceSnapshot();
  detectResourceLeaks(before, after, name, { checkProjectDirs: true });
}

test('temp directory cleanup on invalid template', async () => {
  await runLeakScenario({
    name: 'invalid template test',
    args: ['test-invalid-template', '--template', '../invalid-template'],
    expectedMessage: /Template directory not found/i
  });
});

test('temp directory cleanup on invalid repository', async () => {
  await runLeakScenario({
    name: 'invalid repository test',
    args: ['test-invalid-repo', '--template', 'invalid-repo-format!'],
    expectedMessage: /Template name contains invalid characters/i
  });
});

test('temp directory cleanup on nonexistent repository', async () => {
  await runLeakScenario({
    name: 'nonexistent repository test',
    args: ['test-nonexistent-repo', '--template', './nonexistent-resource-repo'],
    expectedMessage: /Template directory not found/i
  });
});

test('resource cleanup across multiple failure scenarios', async () => {
  const before = await getResourceSnapshot();
  const scenarios = [
    ['test-multi-1', '--from-template', '../invalid'],
    ['test-multi-2', '--from-template', 'basic', '--repo', 'invalid!'],
    ['test-multi-3', '--from-template', 'basic', '--branch', 'invalid; branch']
  ];

  for (const args of scenarios) {
    const result = await execCLI(CLI_PATH, args);
    assert.equal(result.exitCode, 1, `Scenario ${args[0]} should exit with code 1`);
  }

  const after = await getResourceSnapshot();
  detectResourceLeaks(before, after, 'multiple failure scenarios', { checkProjectDirs: true });
});
