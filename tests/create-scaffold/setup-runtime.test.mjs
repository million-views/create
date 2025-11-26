#!/usr/bin/env node

/**
 * L3 Tests for setup-runtime sandbox and script execution
 *
 * This tests L3 (Orchestrator) - the sandbox that executes template setup scripts.
 * The tools API is tested separately in tests/environment/tools.test.mjs
 *
 * Test Constraints:
 * - ✅ MUST use SUT methods (tools.files.read, tools.json.read) for verification
 * - ✅ MAY use L0 (raw Node.js APIs) for fixture setup only (writeFile before SUT)
 * - ❌ MUST NOT use L0 for verification after calling SUT
 *
 * Following Guardrails:
 * - No mocks - uses actual temp directories
 * - Design for Testability: SUT exposes read/exists methods for verification
 * - Uses Environment module test utilities for ctx/tools construction
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rm, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import {
  loadSetupScript,
  SetupSandboxError
} from '../../bin/create-scaffold/modules/setup-runtime.mts';
import { createTestContext, createTestTools } from '@m5nv/create-scaffold/lib/environment/testing.mts';
import { createTempDir } from '../helpers/temp-dir.mjs';

// Default test values for this test suite
const TEST_PROJECT_NAME = 'runtime-app';
const TEST_INPUTS = { PACKAGE_NAME: 'runtime-app' };
const TEST_CONSTANTS = { org: 'Million Views' };
const TEST_DIMENSIONS = {
  features: {
    type: 'multi',
    values: ['docs', 'tests']
  }
};
const TEST_OPTIONS = {
  raw: ['features=docs'],
  byDimension: { features: ['docs'] }
};

async function createProjectFixture(prefix = 'setup-runtime-project') {
  const projectDir = await createTempDir(prefix, 'unit-tests');
  await writeFile(path.join(projectDir, 'README.md'), '# Starter\n');
  await writeFile(path.join(projectDir, 'package.json'), JSON.stringify({
    name: 'starter-app',
    version: '0.0.1',
    scripts: {
      start: 'node index.js'
    }
  }, null, 2));
  await mkdir(path.join(projectDir, '__scaffold__'), { recursive: true });
  return projectDir;
}

function buildCtx(projectDir, overrides = {}) {
  return createTestContext({
    projectName: TEST_PROJECT_NAME,
    projectDirectory: projectDir,
    inputs: { ...TEST_INPUTS, ...overrides.inputs },
    constants: { ...TEST_CONSTANTS, ...overrides.constants },
    options: overrides.options ?? TEST_OPTIONS
  });
}

async function buildTools(projectDir, extra = {}) {
  return createTestTools({
    projectDirectory: projectDir,
    projectName: TEST_PROJECT_NAME,
    inputs: TEST_INPUTS,
    constants: TEST_CONSTANTS,
    dimensions: extra.dimensions ?? TEST_DIMENSIONS,
    options: extra.options ?? TEST_OPTIONS
  });
}

test.describe('setup-runtime loader', () => {
  test('executes setup script with Environment contract', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);
      const ctx = buildCtx(projectDir);
      const scriptPath = path.join(projectDir, '_setup.mjs');

      const script = `export default async function setup({ ctx, tools }) {
        await tools.files.ensureDirs(['docs']);
        await tools.files.write('docs/info.txt', 'Project: ' + ctx.projectName);
        await tools.json.merge('package.json', { scripts: { test: 'node test.js' } });
        await tools.text.replace({
          file: 'README.md',
          search: 'Starter',
          replace: ctx.projectName,
          ensureMatch: true
        });
      }`;

      await writeFile(scriptPath, script);

      await loadSetupScript(scriptPath, ctx, tools);

      // Verify using SUT methods (design for testability)
      const readme = await tools.files.read('README.md');
      assert(readme.includes('runtime-app'));

      const pkg = await tools.json.read('package.json');
      assert.equal(pkg.scripts.test, 'node test.js');

      const notes = await tools.files.read('docs/info.txt');
      assert.equal(notes.trim(), 'Project: runtime-app');
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('rejects setup functions that declare multiple parameters', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);
      const ctx = buildCtx(projectDir);
      const scriptPath = path.join(projectDir, '_setup.mjs');

      await writeFile(scriptPath, 'export default async function setup(ctx, tools) { return tools; }');

      await assert.rejects(
        () => loadSetupScript(scriptPath, ctx, tools),
        (error) => error instanceof SetupSandboxError && error.message.includes('Environment object')
      );
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('blocks import statements inside setup scripts', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);
      const ctx = buildCtx(projectDir);
      const scriptPath = path.join(projectDir, '_setup.mjs');

      await writeFile(scriptPath, 'import fs from "node:fs";\nexport default async function setup({ tools }) { return tools; }');

      await assert.rejects(
        () => loadSetupScript(scriptPath, ctx, tools),
        (error) => error instanceof SetupSandboxError && error.message.includes('Import is disabled')
      );
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('blocks require() inside setup scripts', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);
      const ctx = buildCtx(projectDir);
      const scriptPath = path.join(projectDir, '_setup.mjs');

      await writeFile(scriptPath, 'export default async function setup({ ctx }) { require("fs"); }');

      await assert.rejects(
        () => loadSetupScript(scriptPath, ctx, tools),
        (error) => error instanceof SetupSandboxError
      );
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('blocks eval() inside setup scripts', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);
      const ctx = buildCtx(projectDir);
      const scriptPath = path.join(projectDir, '_setup.mjs');

      await writeFile(scriptPath, 'export default async function setup({ ctx }) { eval("1+1"); }');

      await assert.rejects(
        () => loadSetupScript(scriptPath, ctx, tools),
        (error) => error instanceof SetupSandboxError
      );
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('blocks Function constructor inside setup scripts', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);
      const ctx = buildCtx(projectDir);
      const scriptPath = path.join(projectDir, '_setup.mjs');

      await writeFile(scriptPath, 'export default async function setup({ ctx }) { new Function("return 1")(); }');

      await assert.rejects(
        () => loadSetupScript(scriptPath, ctx, tools),
        (error) => error instanceof SetupSandboxError
      );
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('text.replace enforces string or RegExp search values', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      await assert.rejects(
        () => tools.text.replace({ file: 'README.md', search: 42, replace: 'noop' }),
        (error) => error instanceof SetupSandboxError && error.message.includes('text.replace requires search')
      );
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('rejects non-function default exports', async () => {
    const projectDir = await createProjectFixture();
    const setupPath = path.join(projectDir, '_setup.mjs');
    try {
      await writeFile(setupPath, 'export default { notAFunction: true };');

      const tools = await buildTools(projectDir);
      await assert.rejects(
        async () => await loadSetupScript(setupPath, {}, tools),
        { message: /must export a default async function/ }
      );
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('catches syntax errors in setup scripts', async () => {
    const projectDir = await createProjectFixture();
    const setupPath = path.join(projectDir, '_setup.mjs');
    try {
      await writeFile(setupPath, `
        export default async function setup({ ctx, tools }) {
          const broken = "unclosed string
        }
      `);

      const tools = await buildTools(projectDir);
      await assert.rejects(
        async () => await loadSetupScript(setupPath, {}, tools),
        (error) => error instanceof SetupSandboxError
      );
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });
});
