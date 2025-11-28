#!/usr/bin/env node

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execCLI } from '../utils/cli.js';
import { detectResourceLeaks, getResourceSnapshot } from '../utils/resources.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLI_PATH = path.join(__dirname, '..', '..', 'bin', 'create', 'index.mts');

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
    args: ['scaffold', 'new', 'test-invalid-template', '--template', 'template;rm -rf /'],
    expectedMessage: /shell metacharacters|blocked for security|invalid/i
  });
});

test('temp directory cleanup on invalid repository', async () => {
  await runLeakScenario({
    name: 'invalid repository test',
    args: ['scaffold', 'new', 'test-invalid-repo', '--template', 'invalid/repo\nname'],
    expectedMessage: /Invalid template URL format/i
  });
});

test('temp directory cleanup on nonexistent repository', async () => {
  await runLeakScenario({
    name: 'nonexistent repository test',
    args: ['scaffold', 'new', 'test-nonexistent-repo', '--template', './nonexistent-resource-repo'],
    expectedMessage: /Template not accessible/i
  });
});

test('resource cleanup across multiple failure scenarios', async () => {
  const before = await getResourceSnapshot();
  const scenarios = [
    ['scaffold', 'new', 'test-multi-1', '--template', '../invalid'],
    ['scaffold', 'new', 'test-multi-2', '--template', 'invalid;chars'],
    ['scaffold', 'new', 'test-multi-3', '--template', 'basic', '--branch', 'invalid;branch']
  ];

  for (const args of scenarios) {
    const result = await execCLI(CLI_PATH, args);
    assert.equal(result.exitCode, 1, `Scenario ${args.join(' ')} should exit with code 1`);
  }

  const after = await getResourceSnapshot();
  detectResourceLeaks(before, after, 'multiple failure scenarios', { checkProjectDirs: true });
});
