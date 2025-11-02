import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadSetupScript, createSetupTools, SetupSandboxError } from '../../bin/create-scaffold/setup-runtime.mjs';
import { createEnvironmentObject } from '../../bin/create-scaffold/environment-factory.mjs';

function randomSuffix() {
  return Math.random().toString(36).slice(2, 10);
}

async function createTempDir(t, prefix) {
  const dir = path.join(os.tmpdir(), `${prefix}-${Date.now()}-${randomSuffix()}`);
  await fs.mkdir(dir, { recursive: true });
  t.after(async () => {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => { });
  });
  return dir;
}

function buildContext(baseDir, projectName, overrides = {}) {
  return createEnvironmentObject({
    projectDirectory: projectName,
    projectName,
    cwd: baseDir,
    ide: null,
    authoringMode: 'composable',
    options: { raw: [], byDimension: {} },
    ...overrides
  });
}

function buildTools(projectDir, projectName, context, overrides = {}) {
  const { dimensions = {}, logger = null } = overrides;
  return createSetupTools({
    projectDirectory: projectDir,
    projectName,
    logger,
    context,
    dimensions
  });
}

// Ensure the process cwd is restored even if a setup script throws.
async function withProjectCwd(baseDir, fn) {
  const previousCwd = process.cwd();
  process.chdir(baseDir);
  try {
    return await fn();
  } finally {
    process.chdir(previousCwd);
  }
}

test('Placeholder replacement and IDE preset application', async (t) => {
  const baseDir = await createTempDir(t, 'runtime-base');
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

  await withProjectCwd(baseDir, async () => {
    const ctx = buildContext(baseDir, projectName, { ide: 'vscode' });
    const tools = await buildTools(projectDir, projectName, ctx);
    await loadSetupScript(setupScriptPath, ctx, tools);
  });

  const readme = await fs.readFile(path.join(projectDir, 'README.md'), 'utf8');
  assert.ok(readme.includes(projectName), 'Placeholder replacement did not occur');

  const presetPath = path.join(projectDir, '.vscode', 'settings.json');
  const settings = JSON.parse(await fs.readFile(presetPath, 'utf8'));
  assert.equal(settings['editor.formatOnSave'], true, 'IDE preset was not applied');

  const state = JSON.parse(await fs.readFile(path.join(projectDir, 'runtime-state.json'), 'utf8'));
  assert.equal(state.done, true, 'Runtime state file not written');
});

test('Setup scripts using positional arguments fail fast', async (t) => {
  const baseDir = await createTempDir(t, 'runtime-guard');
  const projectName = 'guard-demo';
  const projectDir = path.join(baseDir, projectName);
  await fs.mkdir(projectDir, { recursive: true });

  const setupScriptPath = path.join(projectDir, '_setup.mjs');
  await fs.writeFile(setupScriptPath, `
export default async function setup(ctx, tools) {
  return tools.logger?.info?.('legacy signature');
}
`);

  await assert.rejects(
    withProjectCwd(baseDir, async () => {
      const ctx = buildContext(baseDir, projectName, { authoringMode: 'wysiwyg' });
      const tools = await buildTools(projectDir, projectName, ctx);
      await loadSetupScript(setupScriptPath, ctx, tools);
    }),
    (error) => {
      assert.ok(error instanceof SetupSandboxError, 'Expected sandbox guard to throw SetupSandboxError');
      assert.match(error.message, /Environment object/i, 'Unexpected guard message');
      return true;
    }
  );
});

test('Sandbox blocks imports', async (t) => {
  const baseDir = await createTempDir(t, 'runtime-sandbox');
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

  await assert.rejects(
    withProjectCwd(baseDir, async () => {
      const ctx = buildContext(baseDir, projectName, { authoringMode: 'wysiwyg' });
      const tools = await buildTools(projectDir, projectName, ctx);
      await loadSetupScript(setupScriptPath, ctx, tools);
    }),
    (error) => {
      assert.ok(error instanceof SetupSandboxError, 'Sandbox should block module imports');
      return true;
    }
  );
});

test('files copy helpers skip undo artifacts', async (t) => {
  const baseDir = await createTempDir(t, 'runtime-files-copy');
  const projectName = 'files-project';
  const projectDir = path.join(baseDir, projectName);
  await fs.mkdir(projectDir, { recursive: true });

  const templatePartsDir = path.join(projectDir, 'template-parts', 'feature');
  await fs.mkdir(templatePartsDir, { recursive: true });
  await fs.writeFile(path.join(templatePartsDir, 'keep.txt'), 'keep me');
  await fs.writeFile(path.join(templatePartsDir, '.template-undo.json'), JSON.stringify({ files: [] }));

  await withProjectCwd(baseDir, async () => {
    const ctx = buildContext(baseDir, projectName, { authoringMode: 'wysiwyg' });
    const tools = await buildTools(projectDir, projectName, ctx);
    await tools.files.copy('template-parts/feature', 'copied-by-copy');
    await tools.files.copyTemplateDir('template-parts/feature', 'copied-by-template-dir');
  });

  const copyKeep = await fs.readFile(path.join(projectDir, 'copied-by-copy', 'keep.txt'), 'utf8');
  assert.ok(copyKeep.includes('keep'), 'files.copy should copy regular files');

  const templateKeep = await fs.readFile(path.join(projectDir, 'copied-by-template-dir', 'keep.txt'), 'utf8');
  assert.ok(templateKeep.includes('keep'), 'files.copyTemplateDir should copy regular files');

  for (const target of ['copied-by-copy', 'copied-by-template-dir']) {
    try {
      await fs.access(path.join(projectDir, target, '.template-undo.json'));
      assert.fail(`files helper should not copy undo artifact into ${target}`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }
});

test('Text and JSON helpers perform structured updates', async (t) => {
  const baseDir = await createTempDir(t, 'runtime-helpers');
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

  await withProjectCwd(baseDir, async () => {
    const ctx = buildContext(baseDir, projectName);
    const tools = await buildTools(projectDir, projectName, ctx);
    await loadSetupScript(setupScriptPath, ctx, tools);
  });

  const notes = await fs.readFile(path.join(projectDir, 'notes.txt'), 'utf8');
  assert.ok(notes.includes('Second line'), 'files.write did not write expected content');

  const layout = await fs.readFile(path.join(projectDir, 'layout.md'), 'utf8');
  assert.ok(layout.includes('Intro section'), 'text.insertAfter did not inject block');
  assert.ok(layout.includes('Fresh content'), 'text.replaceBetween did not replace block');
  assert.ok(layout.includes('Final append'), 'text.appendLines/replace did not update content');

  const pkg = JSON.parse(await fs.readFile(path.join(projectDir, 'package.json'), 'utf8'));
  assert.equal(pkg.unused, undefined, 'json.remove failed to delete property');
  assert.equal(pkg.scripts.test, 'node test.js', 'json.set failed to assign value');
  assert.ok(Array.isArray(pkg.keywords), 'keywords should remain an array');
  const helperCount = pkg.keywords.filter((entry) => entry === 'helpers').length;
  assert.equal(helperCount, 1, 'json helpers should enforce uniqueness');
});

test('inputs API exposes resolved placeholder values and applyInputs helper', async (t) => {
  const baseDir = await createTempDir(t, 'runtime-inputs');
  const projectName = 'inputs-demo';
  const projectDir = path.join(baseDir, projectName);
  await fs.mkdir(projectDir, { recursive: true });

  const templateFile = path.join(projectDir, 'README.md');
  await fs.writeFile(templateFile, '# {{PROJECT_NAME}}\nToken: {{API_TOKEN}}\nCount: {{COUNT}}\nExtra: {{EXTRA}}\n');

  const componentDir = path.join(projectDir, 'src');
  await fs.mkdir(componentDir, { recursive: true });
  const componentFile = path.join(componentDir, 'App.jsx');
  await fs.writeFile(componentFile, "export default function App() {\n  return <h1>{{TITLE}}</h1>;\n}\n");

  const ctx = buildContext(baseDir, projectName, {
    inputs: Object.freeze({
      API_TOKEN: 's3cr3t',
      COUNT: 7
    })
  });

  assert.ok(Object.isFrozen(ctx.inputs), 'ctx.inputs should be frozen');
  assert.equal(ctx.inputs.API_TOKEN, 's3cr3t');

  const tools = await buildTools(projectDir, projectName, ctx);

  const allInputs = tools.inputs.all();
  assert.ok(Object.isFrozen(allInputs), 'inputs.all() should return frozen object');
  assert.equal(allInputs.API_TOKEN, 's3cr3t');
  assert.equal(tools.inputs.get('COUNT'), 7);
  assert.equal(tools.inputs.get('MISSING', 'fallback'), 'fallback');

  await tools.placeholders.applyInputs(undefined, { EXTRA: 'value', TITLE: 'Dashboard' });

  const contents = await fs.readFile(templateFile, 'utf8');
  assert.ok(contents.includes('# inputs-demo'), 'applyInputs should consider projectName fallback');
  assert.ok(contents.includes('Token: s3cr3t'), 'applyInputs should use ctx.inputs values');
  assert.ok(contents.includes('Count: 7'), 'applyInputs should stringify non-string inputs');
  assert.ok(contents.includes('Extra: value'), 'applyInputs should merge additional replacements');

  const jsxContents = await fs.readFile(componentFile, 'utf8');
  assert.ok(jsxContents.includes('<h1>Dashboard</h1>'), 'applyInputs should update nested JSX files via default selector');
});

test('options API exposes dimension-aware helpers', async (t) => {
  const baseDir = await createTempDir(t, 'runtime-options');
  const projectName = 'options-demo';
  const projectDir = path.join(baseDir, projectName);
  await fs.mkdir(projectDir, { recursive: true });

  const ctx = buildContext(baseDir, projectName, {
    options: {
      raw: ['capabilities=auth', 'capabilities=testing', 'stack=react-vite'],
      byDimension: {
        capabilities: ['auth', 'testing'],
        stack: 'react-vite'
      }
    }
  });

  const tools = await buildTools(projectDir, projectName, ctx, {
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

  assert.ok(tools.options.has('auth'), 'Expected default has() to resolve capabilities dimension');
  assert.ok(tools.options.in('stack', 'react-vite'), 'Expected stack dimension to reflect selected value');

  const capabilities = tools.options.list('capabilities');
  assert.ok(Array.isArray(capabilities), 'Capabilities list should be an array');
  assert.equal(capabilities.length, 2, 'Expected capabilities list to include selected values');

  tools.options.require('capabilities', 'auth');
  assert.throws(() => tools.options.require('capabilities', 'logging'), SetupSandboxError, 'require() should throw for missing value');
});
