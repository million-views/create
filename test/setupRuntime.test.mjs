#!/usr/bin/env node

import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadSetupScript, createSetupTools, SetupSandboxError } from '../bin/setupRuntime.mjs';
import { createEnvironmentObject } from '../bin/environmentFactory.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    this.tempPaths = [];
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async createTempDir(prefix = 'setup-runtime') {
    const dir = path.join(os.tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    await fs.mkdir(dir, { recursive: true });
    this.tempPaths.push(dir);
    return dir;
  }

  async cleanup() {
    for (const dir of this.tempPaths) {
      await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  }

  async run() {
    console.log('🧪 Running setupRuntime Tests\n');
    for (const { name, fn } of this.tests) {
      try {
        console.log(`  ▶ ${name}`);
        await fn();
        console.log(`  ✅ ${name}`);
        this.passed++;
      } catch (error) {
        console.log(`  ❌ ${name}`);
        console.log(`     Error: ${error.message}`);
        this.failed++;
      }
    }

    console.log('\n📊 Test Results:');
    console.log(`   Passed: ${this.passed}`);
    console.log(`   Failed: ${this.failed}`);
    console.log(`   Total:  ${this.tests.length}`);

    await this.cleanup();

    if (this.failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

const runner = new TestRunner();

runner.test('Placeholder replacement and IDE preset application', async () => {
  const baseDir = await runner.createTempDir('runtime-base');
  const projectName = 'runtime-project';
  const projectDir = path.join(baseDir, projectName);
  await fs.mkdir(projectDir, { recursive: true });
  await fs.writeFile(path.join(projectDir, 'README.md'), '# {{PROJECT_NAME}}\n');
  await fs.writeFile(path.join(projectDir, 'package.json'), JSON.stringify({ name: '{{PROJECT_NAME}}' }, null, 2));

  const setupScriptPath = path.join(projectDir, '_setup.mjs');
  await fs.writeFile(setupScriptPath, `
export default async function setup(ctx, tools) {
  await tools.placeholders.replaceAll({ PROJECT_NAME: ctx.projectName }, ['README.md', 'package.json']);
  await tools.ide.applyPreset('vscode');
  await tools.json.merge('runtime-state.json', { done: true });
}
`);

  const previousCwd = process.cwd();
  process.chdir(baseDir);
  try {
    const ctx = createEnvironmentObject({
      projectDirectory: projectName,
      projectName,
      cwd: baseDir,
      ide: 'vscode',
      options: []
    });

    const tools = await createSetupTools({
      projectDirectory: projectDir,
      projectName,
      logger: null,
      context: ctx
    });

    await loadSetupScript(setupScriptPath, ctx, tools);
  } finally {
    process.chdir(previousCwd);
  }

  const readme = await fs.readFile(path.join(projectDir, 'README.md'), 'utf8');
  if (!readme.includes(projectName)) {
    throw new Error('Placeholder replacement did not occur');
  }

  const presetPath = path.join(projectDir, '.vscode', 'settings.json');
  const settings = JSON.parse(await fs.readFile(presetPath, 'utf8'));
  if (settings['editor.formatOnSave'] !== true) {
    throw new Error('IDE preset was not applied');
  }

  const state = JSON.parse(await fs.readFile(path.join(projectDir, 'runtime-state.json'), 'utf8'));
  if (!state.done) {
    throw new Error('Runtime state file not written');
  }
});

runner.test('Sandbox blocks imports', async () => {
  const baseDir = await runner.createTempDir('runtime-sandbox');
  const projectName = 'sandbox-app';
  const projectDir = path.join(baseDir, projectName);
  await fs.mkdir(projectDir, { recursive: true });
  const setupScriptPath = path.join(projectDir, '_setup.mjs');
  await fs.writeFile(setupScriptPath, `
import fs from 'fs';

export default async function setup() {
  await fs.promises.writeFile('forbidden.txt', 'should not happen');
}
`);

  const previousCwd = process.cwd();
  process.chdir(baseDir);
  try {
    const ctx = createEnvironmentObject({
      projectDirectory: projectName,
      projectName,
      cwd: baseDir,
      ide: null,
      options: []
    });

    const tools = await createSetupTools({
      projectDirectory: projectDir,
      projectName,
      logger: null,
      context: ctx
    });

    try {
      await loadSetupScript(setupScriptPath, ctx, tools);
      throw new Error('Sandbox should have blocked import');
    } catch (error) {
      if (!(error instanceof SetupSandboxError)) {
        throw error;
      }
    }
  } finally {
    process.chdir(previousCwd);
  }
});

await runner.run();
