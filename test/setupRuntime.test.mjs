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
export default async function setup({ ctx, tools }) {
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
      options: { raw: [], byDimension: {} },
      authoringMode: 'composable'
    });

    const tools = await createSetupTools({
      projectDirectory: projectDir,
      projectName,
      logger: null,
      context: ctx,
      dimensions: {}
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

runner.test('Setup scripts using positional arguments fail fast', async () => {
  const baseDir = await runner.createTempDir('runtime-guard');
  const projectName = 'guard-demo';
  const projectDir = path.join(baseDir, projectName);
  await fs.mkdir(projectDir, { recursive: true });

  const setupScriptPath = path.join(projectDir, '_setup.mjs');
  await fs.writeFile(setupScriptPath, `
export default async function setup(ctx, tools) {
  return tools.logger?.info?.('legacy signature');
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
      options: { raw: [], byDimension: {} },
      authoringMode: 'wysiwyg'
    });

    const tools = await createSetupTools({
      projectDirectory: projectDir,
      projectName,
      logger: null,
      context: ctx,
      dimensions: {}
    });

    try {
      await loadSetupScript(setupScriptPath, ctx, tools);
      throw new Error('Legacy positional signature should have been rejected');
    } catch (error) {
      if (!(error instanceof SetupSandboxError)) {
        throw error;
      }
      if (!error.message.includes('Environment object')) {
        throw new Error(`Unexpected guard message: ${error.message}`);
      }
    }
  } finally {
    process.chdir(previousCwd);
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
      options: { raw: [], byDimension: {} },
      authoringMode: 'wysiwyg'
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

runner.test('files copy helpers skip undo artifacts', async () => {
  const baseDir = await runner.createTempDir('runtime-files-copy');
  const projectName = 'files-project';
  const projectDir = path.join(baseDir, projectName);
  await fs.mkdir(projectDir, { recursive: true });

  const templatePartsDir = path.join(projectDir, 'template-parts', 'feature');
  await fs.mkdir(templatePartsDir, { recursive: true });
  await fs.writeFile(path.join(templatePartsDir, 'keep.txt'), 'keep me');
  await fs.writeFile(path.join(templatePartsDir, '.template-undo.json'), JSON.stringify({ files: [] }));

  const previousCwd = process.cwd();
  process.chdir(baseDir);
  try {
    const ctx = createEnvironmentObject({
      projectDirectory: projectName,
      projectName,
      cwd: baseDir,
      ide: null,
      options: { raw: [], byDimension: {} },
      authoringMode: 'wysiwyg'
    });

    const tools = await createSetupTools({
      projectDirectory: projectDir,
      projectName,
      logger: null,
      context: ctx,
      dimensions: {}
    });

    await tools.files.copy('template-parts/feature', 'copied-by-copy');
    await tools.files.copyTemplateDir('template-parts/feature', 'copied-by-template-dir');
  } finally {
    process.chdir(previousCwd);
  }

  const copyKeep = await fs.readFile(path.join(projectDir, 'copied-by-copy', 'keep.txt'), 'utf8');
  if (!copyKeep.includes('keep')) {
    throw new Error('files.copy should copy regular files');
  }

  const templateKeep = await fs.readFile(path.join(projectDir, 'copied-by-template-dir', 'keep.txt'), 'utf8');
  if (!templateKeep.includes('keep')) {
    throw new Error('files.copyTemplateDir should copy regular files');
  }

  for (const target of ['copied-by-copy', 'copied-by-template-dir']) {
    try {
      await fs.access(path.join(projectDir, target, '.template-undo.json'));
      throw new Error(`files helper should not copy undo artifact into ${target}`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }
});

runner.test('Text and JSON helpers perform structured updates', async () => {
  const baseDir = await runner.createTempDir('runtime-helpers');
  const projectName = 'helper-demo';
  const projectDir = path.join(baseDir, projectName);
  await fs.mkdir(projectDir, { recursive: true });

  await fs.writeFile(path.join(projectDir, 'layout.md'), '# Header\n<!-- tools:start -->\nOld block\n<!-- tools:end -->\n# Footer\n');
  await fs.writeFile(path.join(projectDir, 'package.json'), JSON.stringify({
    name: 'helper-demo',
    keywords: ['scaffold'],
    unused: true
  }, null, 2));

  const setupScriptPath = path.join(projectDir, '_setup.mjs');
  await fs.writeFile(setupScriptPath, `
export default async function setup({ ctx, tools }) {
  await tools.files.write('notes.txt', ['First line', 'Second line']);
  await tools.text.insertAfter({
    file: 'layout.md',
    marker: '# Header',
    block: ['Intro section', '- item 1']
  });
  await tools.text.replaceBetween({
    file: 'layout.md',
    start: '<!-- tools:start -->',
    end: '<!-- tools:end -->',
    block: ['Fresh content', 'Configured via tools.text']
  });
  await tools.text.appendLines({ file: 'layout.md', lines: 'Appended line' });
  await tools.text.replace({
    file: 'layout.md',
    search: 'Appended line',
    replace: 'Final append',
    ensureMatch: true
  });

  await tools.json.set('package.json', 'scripts.test', 'node test.js');
  await tools.json.addToArray('package.json', 'keywords', 'helpers', { unique: true });
  await tools.json.mergeArray('package.json', 'keywords', ['helpers', 'scaffold'], { unique: true });
  await tools.json.remove('package.json', 'unused');
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
      options: { raw: [], byDimension: {} },
      authoringMode: 'composable'
    });

    const tools = await createSetupTools({
      projectDirectory: projectDir,
      projectName,
      logger: null,
      context: ctx,
      dimensions: {}
    });

    await loadSetupScript(setupScriptPath, ctx, tools);
  } finally {
    process.chdir(previousCwd);
  }

  const notes = await fs.readFile(path.join(projectDir, 'notes.txt'), 'utf8');
  if (!notes.includes('Second line')) {
    throw new Error('files.write did not write expected content');
  }

  const layout = await fs.readFile(path.join(projectDir, 'layout.md'), 'utf8');
  if (!layout.includes('Intro section')) {
    throw new Error('text.insertAfter did not inject block');
  }
  if (!layout.includes('Fresh content')) {
    throw new Error('text.replaceBetween did not replace block');
  }
  if (!layout.includes('Final append')) {
    throw new Error('text.appendLines/replace did not update content');
  }

  const pkg = JSON.parse(await fs.readFile(path.join(projectDir, 'package.json'), 'utf8'));
  if (pkg.unused !== undefined) {
    throw new Error('json.remove failed to delete property');
  }
  if (pkg.scripts.test !== 'node test.js') {
    throw new Error('json.set failed to assign value');
  }
  if (!Array.isArray(pkg.keywords) || pkg.keywords.filter(k => k === 'helpers').length !== 1) {
    throw new Error('json.addToArray/json.mergeArray failed to manage array');
  }
});

runner.test('options API exposes dimension-aware helpers', async () => {
  const baseDir = await runner.createTempDir('runtime-options');
  const projectName = 'options-demo';
  const projectDir = path.join(baseDir, projectName);
  await fs.mkdir(projectDir, { recursive: true });

  const ctx = createEnvironmentObject({
    projectDirectory: projectName,
    projectName,
    cwd: baseDir,
    ide: null,
    authoringMode: 'composable',
    options: {
      raw: ['capabilities=auth', 'capabilities=testing', 'stack=react-vite'],
      byDimension: {
        capabilities: ['auth', 'testing'],
        stack: 'react-vite'
      }
    }
  });

  const tools = await createSetupTools({
    projectDirectory: projectDir,
    projectName,
    logger: null,
    context: ctx,
    dimensions: {
      capabilities: Object.freeze({
        type: 'multi',
        values: Object.freeze(['auth', 'testing', 'logging']),
        default: Object.freeze([]),
        requires: Object.freeze({}),
        conflicts: Object.freeze({}),
        policy: 'strict',
        builtIn: false,
        description: null
      }),
      stack: Object.freeze({
        type: 'single',
        values: Object.freeze(['react-vite', 'express']),
        default: 'react-vite',
        requires: Object.freeze({}),
        conflicts: Object.freeze({}),
        policy: 'strict',
        builtIn: false,
        description: null
      })
    }
  });

  if (!tools.options.has('auth')) {
    throw new Error('Expected default has() to resolve capabilities dimension');
  }

  if (!tools.options.in('stack', 'react-vite')) {
    throw new Error('Expected stack dimension to reflect selected value');
  }

  const capabilities = tools.options.list('capabilities');
  if (!Array.isArray(capabilities) || capabilities.length !== 2) {
    throw new Error('Expected capabilities list to include selected values');
  }

  tools.options.require('capabilities', 'auth');

  try {
    tools.options.require('capabilities', 'logging');
    throw new Error('require() should have thrown for missing value');
  } catch (error) {
    if (!(error instanceof SetupSandboxError)) {
      throw error;
    }
  }
});

await runner.run();
