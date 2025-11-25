#!/usr/bin/env node

/**
 * L3 Tests for setup-runtime sandbox and script execution
 *
 * This tests L3 (Orchestrator) - the sandbox that executes template setup scripts.
 * The tools API is tested via the Environment module at L2.
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
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
  loadSetupScript,
  SetupSandboxError
} from '../../bin/create-scaffold/modules/setup-runtime.mjs';
import {
  createTestContext,
  createTestTools
} from '../../lib/environment/index.mjs';

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

test.describe('tools.files API', () => {
  test('copy() copies files and directories', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      await writeFile(path.join(projectDir, 'source.txt'), 'original content');
      await tools.files.copy('source.txt', 'dest.txt');

      const content = await tools.files.read('dest.txt');
      assert.strictEqual(content, 'original content');
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('copy() respects overwrite option', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      await writeFile(path.join(projectDir, 'existing.txt'), 'old');
      await writeFile(path.join(projectDir, 'new.txt'), 'new content');

      await assert.rejects(
        () => tools.files.copy('new.txt', 'existing.txt'),
        (error) => error instanceof SetupSandboxError
      );

      await tools.files.copy('new.txt', 'existing.txt', { overwrite: true });
      const content = await tools.files.read('existing.txt');
      assert.strictEqual(content, 'new content');
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('move() relocates files', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      await writeFile(path.join(projectDir, 'moveme.txt'), 'content');
      await tools.files.move('moveme.txt', 'moved.txt');

      const content = await tools.files.read('moved.txt');
      assert.strictEqual(content, 'content');

      const sourceExists = await tools.files.exists('moveme.txt');
      assert.strictEqual(sourceExists, false);
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('remove() deletes files and directories', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      await writeFile(path.join(projectDir, 'deleteme.txt'), 'content');
      await tools.files.remove('deleteme.txt');

      const exists = await tools.files.exists('deleteme.txt');
      assert.strictEqual(exists, false);
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('write() with array content joins lines', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      await tools.files.write('lines.txt', ['line 1', 'line 2', 'line 3']);
      const content = await tools.files.read('lines.txt');
      assert.strictEqual(content, 'line 1\nline 2\nline 3');
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('write() rejects non-existent paths that escape project', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      await assert.rejects(
        () => tools.files.write('../escape.txt', 'bad'),
        (error) => error instanceof SetupSandboxError && error.message.includes('within the project')
      );
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });
});

test.describe('tools.json API', () => {
  test('read() parses JSON file', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      const pkg = await tools.json.read('package.json');
      assert.strictEqual(pkg.name, 'starter-app');
      assert.strictEqual(pkg.version, '0.0.1');
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('set() creates nested paths', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      await tools.json.set('package.json', 'scripts.build', 'tsc');
      const pkg = await tools.json.read('package.json');
      assert.strictEqual(pkg.scripts.build, 'tsc');
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('set() works with array indices', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      await writeFile(path.join(projectDir, 'data.json'), JSON.stringify({ items: ['a', 'b'] }));
      await tools.json.set('data.json', 'items[1]', 'replaced');

      const data = await tools.json.read('data.json');
      assert.deepStrictEqual(data.items, ['a', 'replaced']);
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('addToArray() adds items to arrays', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      await tools.json.addToArray('package.json', 'keywords', 'test-keyword');
      const pkg = await tools.json.read('package.json');
      assert(pkg.keywords.includes('test-keyword'));
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('addToArray() respects unique flag', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      await writeFile(path.join(projectDir, 'data.json'), JSON.stringify({ tags: ['existing'] }));
      await tools.json.addToArray('data.json', 'tags', 'existing', { unique: true });
      await tools.json.addToArray('data.json', 'tags', 'new', { unique: true });

      const data = await tools.json.read('data.json');
      assert.deepStrictEqual(data.tags, ['existing', 'new']);
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('remove() deletes JSON paths', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      await tools.json.remove('package.json', 'scripts.start');
      const pkg = await tools.json.read('package.json');
      assert.strictEqual(pkg.scripts.start, undefined);
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('update() transforms JSON with callback', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      await tools.json.update('package.json', (draft) => {
        draft.version = '2.0.0';
        draft.scripts.custom = 'echo custom';
        return draft;
      });

      const pkg = await tools.json.read('package.json');
      assert.strictEqual(pkg.version, '2.0.0');
      assert.strictEqual(pkg.scripts.custom, 'echo custom');
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('mergeArray() merges arrays with unique constraint', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      await writeFile(path.join(projectDir, 'data.json'), JSON.stringify({ items: ['a', 'b'] }));
      await tools.json.mergeArray('data.json', 'items', ['b', 'c'], { unique: true });

      const data = await tools.json.read('data.json');
      assert.deepStrictEqual(data.items, ['a', 'b', 'c']);
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });
});

test.describe('tools.text API', () => {
  test('insertAfter() adds content after marker', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      await writeFile(path.join(projectDir, 'doc.md'), '# Header\n\nSome content');
      await tools.text.insertAfter({
        file: 'doc.md',
        marker: '# Header',
        block: ['## Subheader', 'New paragraph']
      });

      const content = await tools.files.read('doc.md');
      assert(content.includes('# Header\n## Subheader\nNew paragraph'));
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('insertAfter() requires non-empty marker', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      await assert.rejects(
        async () => {
          await tools.text.insertAfter({
            file: 'doc.md',
            marker: '',  // Invalid: empty marker
            block: 'content'
          });
        },
        { message: /non-empty marker string/ }
      );
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('insertAfter() throws when target file not found', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      await assert.rejects(
        async () => {
          await tools.text.insertAfter({
            file: 'nonexistent.md',
            marker: '# Header',
            block: 'content'
          });
        },
        { message: /not found/ }
      );
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('insertAfter() throws when marker not found', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      await writeFile(path.join(projectDir, 'doc.md'), '# Existing Content');
      await assert.rejects(
        async () => {
          await tools.text.insertAfter({
            file: 'doc.md',
            marker: 'NonexistentMarker',
            block: 'content'
          });
        },
        { message: /Marker.*not found/ }
      );
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('replaceBetween() replaces content between markers', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      await writeFile(path.join(projectDir, 'doc.md'), '# Docs\n\n<!-- START -->\nOld\n<!-- END -->');
      await tools.text.replaceBetween({
        file: 'doc.md',
        start: '<!-- START -->',
        end: '<!-- END -->',
        block: 'New content'
      });

      const content = await tools.files.read('doc.md');
      assert(content.includes('<!-- START -->\nNew content\n<!-- END -->'));
      assert(!content.includes('Old'));
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('replaceBetween() requires non-empty start and end markers', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      await writeFile(path.join(projectDir, 'doc.md'), 'content');
      await assert.rejects(
        async () => {
          await tools.text.replaceBetween({
            file: 'doc.md',
            start: '',  // Invalid: empty marker
            end: '<!-- END -->',
            block: 'new'
          });
        },
        { message: /non-empty start and end markers/ }
      );
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('replaceBetween() throws when start marker not found', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      await writeFile(path.join(projectDir, 'doc.md'), 'content');
      await assert.rejects(
        async () => {
          await tools.text.replaceBetween({
            file: 'doc.md',
            start: 'START',
            end: 'END',
            block: 'new'
          });
        },
        { message: /Start marker.*not found/ }
      );
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('replaceBetween() throws when end marker not found', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      await writeFile(path.join(projectDir, 'doc.md'), 'START content');
      await assert.rejects(
        async () => {
          await tools.text.replaceBetween({
            file: 'doc.md',
            start: 'START',
            end: 'END',
            block: 'new'
          });
        },
        { message: /End marker.*not found/ }
      );
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('ensureBlock() is idempotent', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      await writeFile(path.join(projectDir, 'doc.md'), '# Header\n');
      await tools.text.ensureBlock({
        file: 'doc.md',
        marker: '# Header',
        block: '## Section'
      });

      let content = await tools.files.read('doc.md');
      assert(content.includes('## Section'));

      // Call again - should not duplicate
      await tools.text.ensureBlock({
        file: 'doc.md',
        marker: '# Header',
        block: '## Section'
      });

      content = await tools.files.read('doc.md');
      const count = (content.match(/## Section/g) || []).length;
      assert.strictEqual(count, 1);
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('appendLines() adds lines to file', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      await writeFile(path.join(projectDir, 'notes.txt'), 'Line 1');
      await tools.text.appendLines({
        file: 'notes.txt',
        lines: ['Line 2', 'Line 3']
      });

      const content = await tools.files.read('notes.txt');
      assert(content.includes('Line 1\nLine 2\nLine 3'));
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('insertAfter() requires block entries to be strings', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      await writeFile(path.join(projectDir, 'doc.md'), '# Header');
      await assert.rejects(
        async () => {
          await tools.text.insertAfter({
            file: 'doc.md',
            marker: '# Header',
            block: ['valid string', 123, 'another string']  // Invalid: number in array
          });
        },
        { message: /must be strings/ }
      );
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('replaceBetween() requires block to be string or string array', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      await writeFile(path.join(projectDir, 'doc.md'), '<!-- START -->\nold\n<!-- END -->');
      await assert.rejects(
        async () => {
          await tools.text.replaceBetween({
            file: 'doc.md',
            start: '<!-- START -->',
            end: '<!-- END -->',
            block: 123  // Invalid: number instead of string/array
          });
        },
        { message: /must be a string or array/ }
      );
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('replace() with ensureMatch throws if no match found', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      await writeFile(path.join(projectDir, 'data.txt'), 'original content');

      await assert.rejects(
        async () => {
          await tools.text.replace({
            file: 'data.txt',
            search: 'nonexistent',
            replace: 'replacement',
            ensureMatch: true
          });
        },
        { message: /could not find a match/ }
      );
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('replace() allows no match when ensureMatch is false', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      await writeFile(path.join(projectDir, 'data.txt'), 'original content');

      // Should not throw when no match and ensureMatch is false (default)
      await tools.text.replace({
        file: 'data.txt',
        search: 'nonexistent',
        replace: 'replacement'
      });

      const content = await tools.files.read('data.txt');
      assert.strictEqual(content, 'original content'); // File unchanged
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('replace() requires replacement value to be a string', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      await writeFile(path.join(projectDir, 'data.txt'), 'content');

      await assert.rejects(
        async () => {
          await tools.text.replace({
            file: 'data.txt',
            search: 'content',
            replace: 42  // Invalid: number instead of string
          });
        },
        { message: /replacement value to be a string/ }
      );
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('replace() handles file not found errors', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      await assert.rejects(
        async () => {
          await tools.text.replace({
            file: 'nonexistent.txt',
            search: 'anything',
            replace: 'replacement'
          });
        },
        { message: /not found/ }
      );
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });
});

test.describe('tools.templates API', () => {
  test('renderString() applies placeholder replacements', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      const result = tools.templates.renderString('Hello ⦃NAME⦄', { NAME: 'World' });
      assert.strictEqual(result, 'Hello World');
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('renderFile() renders template with data', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      await writeFile(path.join(projectDir, '__scaffold__', 'template.tpl'), 'Project: ⦃PROJECT⦄');
      await tools.templates.renderFile('template.tpl', 'output.txt', { PROJECT: 'MyApp' });

      const content = await tools.files.read('output.txt');
      assert.strictEqual(content, 'Project: MyApp');
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('copy() copies template assets to project', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      await mkdir(path.join(projectDir, '__scaffold__', 'configs'), { recursive: true });
      await writeFile(path.join(projectDir, '__scaffold__', 'configs', 'app.json'), '{"env":"dev"}');
      await writeFile(path.join(projectDir, '__scaffold__', 'configs', 'db.json'), '{"host":"localhost"}');

      await tools.templates.copy('configs', 'src/configs');

      const appConfig = await tools.files.read('src/configs/app.json');
      const dbConfig = await tools.files.read('src/configs/db.json');
      assert.strictEqual(appConfig, '{"env":"dev"}');
      assert.strictEqual(dbConfig, '{"host":"localhost"}');
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('renderString() requires template string', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      assert.throws(
        () => tools.templates.renderString(null, { KEY: 'value' }),
        { message: /template string input/ }
      );
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('renderString() requires data object', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      assert.throws(
        () => tools.templates.renderString('⦃KEY⦄', null),
        { message: /data object/ }
      );
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('renderFile() requires data object', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      await assert.rejects(
        async () => {
          await tools.templates.renderFile('template.tpl', 'output.txt', null);
        },
        { message: /data object/ }
      );
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });
});

test.describe('tools.placeholders API', () => {
  test('applyInputs() replaces placeholders in files', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      await writeFile(path.join(projectDir, 'config.txt'), 'Package: ⦃PACKAGE_NAME⦄');
      await tools.placeholders.applyInputs(['config.txt']);

      const content = await tools.files.read('config.txt');
      assert.strictEqual(content, 'Package: runtime-app');
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('replaceAll() replaces custom placeholders', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      await writeFile(path.join(projectDir, 'info.txt'), 'Email: ⦃SUPPORT_EMAIL⦄');
      await tools.placeholders.replaceAll({ SUPPORT_EMAIL: 'help@example.com' }, ['info.txt']);

      const content = await tools.files.read('info.txt');
      assert.strictEqual(content, 'Email: help@example.com');
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('replaceInFile() replaces placeholders in single file', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      await writeFile(path.join(projectDir, 'doc.txt'), 'Version: ⦃VERSION⦄');
      await tools.placeholders.replaceInFile('doc.txt', { VERSION: '1.0.0' });

      const content = await tools.files.read('doc.txt');
      assert.strictEqual(content, 'Version: 1.0.0');
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('replaceAll() requires replacements object', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      await writeFile(path.join(projectDir, 'file.txt'), 'content');
      await assert.rejects(
        async () => {
          await tools.placeholders.replaceAll(null, ['file.txt']);
        },
        { message: /object map/ }
      );
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('replaceAll() requires string replacement values', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      await writeFile(path.join(projectDir, 'file.txt'), 'content');
      await assert.rejects(
        async () => {
          await tools.placeholders.replaceAll({ KEY: 123 }, ['file.txt']);
        },
        { message: /must be a string/ }
      );
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });
});

test.describe('tools.inputs API', () => {
  test('get() returns input value with fallback', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      const packageName = tools.inputs.get('PACKAGE_NAME');
      assert.strictEqual(packageName, 'runtime-app');

      const missing = tools.inputs.get('MISSING_KEY', 'default-value');
      assert.strictEqual(missing, 'default-value');
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('all() returns frozen clone of all inputs', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      const inputs = tools.inputs.all();
      assert.strictEqual(inputs.PACKAGE_NAME, 'runtime-app');
      assert.throws(() => {
        inputs.PACKAGE_NAME = 'modified';
      });
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });
});

test.describe('tools.options API', () => {
  test('when() executes callback if option enabled', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir, {
        options: {
          raw: ['features=docs'],
          byDimension: { features: ['docs'] }
        }
      });

      let executed = false;
      await tools.options.when('docs', async () => {
        executed = true;
      });

      assert.strictEqual(executed, true);
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('when() skips callback if option not enabled', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir, {
        options: {
          raw: ['features=docs'],
          byDimension: { features: ['docs'] }
        }
      });

      let executed = false;
      await tools.options.when('tests', async () => {
        executed = true;
      });

      assert.strictEqual(executed, false);
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('has() checks if default dimension includes value', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir, {
        options: {
          raw: ['features=docs'],
          byDimension: { features: ['docs'] }
        }
      });

      assert.strictEqual(tools.options.has('docs'), true);
      assert.strictEqual(tools.options.has('tests'), false);
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('in() checks if dimension includes value', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir, {
        dimensions: {
          deployment: { type: 'single', values: ['cloudflare', 'linode'] }
        },
        options: {
          raw: ['deployment=cloudflare'],
          byDimension: { deployment: 'cloudflare' }
        }
      });

      assert.strictEqual(tools.options.in('deployment', 'cloudflare'), true);
      assert.strictEqual(tools.options.in('deployment', 'linode'), false);
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('require() throws if value not selected', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir, {
        options: {
          raw: ['features=docs'],
          byDimension: { features: ['docs'] }
        }
      });

      tools.options.require('docs'); // Should not throw

      assert.throws(
        () => tools.options.require('tests'),
        (error) => error instanceof SetupSandboxError
      );
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('list() returns options for dimension', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir, {
        options: {
          raw: ['features=docs'],
          byDimension: { features: ['docs', 'tests'] }
        }
      });

      const features = tools.options.list('features');
      assert.deepStrictEqual(features, ['docs', 'tests']);

      const raw = tools.options.list();
      assert.deepStrictEqual(raw, ['features=docs']);
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('raw() returns raw option strings', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir, {
        options: {
          raw: ['features=docs', 'features=tests'],
          byDimension: { features: ['docs', 'tests'] }
        }
      });

      const raw = tools.options.raw();
      assert.deepStrictEqual(raw, ['features=docs', 'features=tests']);
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('dimensions() returns byDimension clone', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir, {
        options: {
          raw: ['features=docs'],
          byDimension: { features: ['docs'] }
        }
      });

      const dims = tools.options.dimensions();
      assert.deepStrictEqual(dims, { features: ['docs'] });
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });
});
