#!/usr/bin/env node

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
  createSetupTools,
  loadSetupScript,
  SetupSandboxError
} from '../../bin/create-scaffold/modules/setup-runtime.mjs';

const loggerStub = {
  info: () => { },
  warn: () => { }
};

async function createProjectFixture(prefix = 'setup-runtime-project-') {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), prefix));
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
  return {
    projectName: 'runtime-app',
    projectDir,
    cwd: projectDir,
    authoring: 'wysiwyg',
    inputs: {
      PACKAGE_NAME: 'runtime-app',
      ...overrides.inputs
    },
    constants: {
      org: 'Million Views',
      ...overrides.constants
    },
    authorAssetsDir: '__scaffold__',
    options: overrides.options ?? { raw: [], byDimension: {} }
  };
}

async function buildTools(projectDir, extra = {}) {
  return createSetupTools({
    projectDirectory: projectDir,
    projectName: 'runtime-app',
    logger: loggerStub,
    templateContext: {
      inputs: {
        PACKAGE_NAME: 'runtime-app'
      },
      constants: {
        org: 'Million Views'
      },
      authorAssetsDir: '__scaffold__',
      placeholderFormat: 'unicode'
    },
    dimensions: extra.dimensions ?? {
      features: {
        type: 'multi',
        values: ['docs', 'tests']
      }
    },
    options: extra.options ?? {
      raw: ['features=docs'],
      byDimension: {
        features: ['docs']
      }
    }
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

      const readme = await readFile(path.join(projectDir, 'README.md'), 'utf8');
      assert(readme.includes('runtime-app'));

      const pkg = JSON.parse(await readFile(path.join(projectDir, 'package.json'), 'utf8'));
      assert.equal(pkg.scripts.test, 'node test.js');

      const notes = await readFile(path.join(projectDir, 'docs', 'info.txt'), 'utf8');
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
});
