#!/usr/bin/env node

/**
 * L2 Tests for Environment Tools API
 *
 * This tests L2 (Environment) - the tools API provided to template setup scripts.
 * The sandbox execution is tested separately in create-scaffold/setup-runtime.test.mjs
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
import { createTestTools } from '../helpers/environment-fixtures.mts';
import { SetupSandboxError } from '@m5nv/create/lib/environment/utils.mts';
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

async function createProjectFixture(prefix = 'tools-test-project') {
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

test.describe('tools.files API', () => {
  test('copy() copies files and directories', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      await mkdir(path.join(projectDir, 'src'), { recursive: true });
      await writeFile(path.join(projectDir, 'src', 'main.js'), 'console.log("hello")');
      await tools.files.copy('src/main.js', 'dist/main.js');

      const content = await tools.files.read('dist/main.js');
      assert.strictEqual(content, 'console.log("hello")');
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('move() renames files', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      await writeFile(path.join(projectDir, 'old.txt'), 'content');
      await tools.files.move('old.txt', 'new.txt');

      const exists = await tools.files.exists('old.txt');
      assert.strictEqual(exists, false);

      const content = await tools.files.read('new.txt');
      assert.strictEqual(content, 'content');
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('remove() deletes files', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      await writeFile(path.join(projectDir, 'temp.txt'), 'temp');
      const existsBefore = await tools.files.exists('temp.txt');
      assert.strictEqual(existsBefore, true);

      await tools.files.remove('temp.txt');

      const existsAfter = await tools.files.exists('temp.txt');
      assert.strictEqual(existsAfter, false);
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('write() creates new files', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      await tools.files.write('notes.txt', 'Hello World');

      const content = await tools.files.read('notes.txt');
      assert.strictEqual(content, 'Hello World');
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });
});

test.describe('tools.json API', () => {
  test('read() returns parsed JSON', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      const pkg = await tools.json.read('package.json');
      assert.strictEqual(pkg.name, 'starter-app');
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('set() updates nested paths', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      await tools.json.set('package.json', 'scripts.build', 'node build.js');

      const pkg = await tools.json.read('package.json');
      assert.strictEqual(pkg.scripts.build, 'node build.js');
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('set() supports array index notation in path', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      // Set up a file with an array
      await tools.json.write('config.json', {
        contributors: [
          { name: 'Alice', role: 'developer' },
          { name: 'Bob', role: 'designer' }
        ]
      });

      // Update nested property using array notation
      await tools.json.set('config.json', 'contributors[0].role', 'lead developer');

      const config = await tools.json.read('config.json');
      assert.strictEqual(config.contributors[0].role, 'lead developer');
      assert.strictEqual(config.contributors[0].name, 'Alice');
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('addToArray() appends items', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      await tools.json.set('package.json', 'keywords', []);
      await tools.json.addToArray('package.json', 'keywords', ['node', 'cli']);

      const pkg = await tools.json.read('package.json');
      assert.deepStrictEqual(pkg.keywords, ['node', 'cli']);
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('remove() deletes JSON keys', async () => {
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

  test('update() applies transform function', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      await tools.json.update('package.json', (data) => {
        data.version = '1.0.0';
        return data;
      });

      const pkg = await tools.json.read('package.json');
      assert.strictEqual(pkg.version, '1.0.0');
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('mergeArray() merges array items by key', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      await writeFile(path.join(projectDir, 'data.json'), JSON.stringify({
        items: [{ id: 1, value: 'old' }]
      }));

      await tools.json.mergeArray('data.json', 'items', [{ id: 1, value: 'new' }, { id: 2, value: 'added' }], 'id');

      const data = await tools.json.read('data.json');
      assert.deepStrictEqual(data.items, [
        { id: 1, value: 'new' },
        { id: 2, value: 'added' }
      ]);
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });
});

test.describe('tools.text API', () => {
  test('replace() substitutes content', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      await tools.text.replace({
        file: 'README.md',
        search: 'Starter',
        replace: TEST_PROJECT_NAME,
        ensureMatch: true
      });

      const content = await tools.files.read('README.md');
      assert(content.includes('runtime-app'));
      assert(!content.includes('Starter'));
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('insertAfter() inserts content after marker', async () => {
    const projectDir = await createProjectFixture();
    try {
      const tools = await buildTools(projectDir);

      await writeFile(path.join(projectDir, 'doc.md'), '# Header\n\n## Section');
      await tools.text.insertAfter({
        file: 'doc.md',
        marker: '# Header',
        block: 'Description here'
      });

      const content = await tools.files.read('doc.md');
      // insertAfter handles newlines at boundaries automatically
      assert(content.includes('# Header\n'));
      assert(content.includes('Description here'));
      assert(content.includes('## Section'));
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
      // V1.0.0: All dimensions are single-select, use valid dimension name
      const tools = await buildTools(projectDir, {
        dimensions: {
          deployment: {
            options: [
              { id: 'cloudflare-workers', label: 'Cloudflare Workers' },
              { id: 'deno-deploy', label: 'Deno Deploy' }
            ],
            default: 'cloudflare-workers'
          }
        },
        options: {
          raw: ['deployment=cloudflare-workers'],
          byDimension: { deployment: 'cloudflare-workers' }
        }
      });

      let executed = false;
      await tools.options.when('cloudflare-workers', async () => {
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
      // V1.0.0: All dimensions are single-select
      const tools = await buildTools(projectDir, {
        dimensions: {
          deployment: {
            options: [
              { id: 'cloudflare-workers', label: 'Cloudflare Workers' },
              { id: 'deno-deploy', label: 'Deno Deploy' }
            ],
            default: 'cloudflare-workers'
          }
        },
        options: {
          raw: ['deployment=cloudflare-workers'],
          byDimension: { deployment: 'cloudflare-workers' }
        }
      });

      let executed = false;
      await tools.options.when('deno-deploy', async () => {
        executed = true;
      });

      assert.strictEqual(executed, false);
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('has() checks if any dimension includes value', async () => {
    const projectDir = await createProjectFixture();
    try {
      // V1.0.0: All dimensions are single-select
      const tools = await buildTools(projectDir, {
        dimensions: {
          deployment: {
            options: [
              { id: 'cloudflare-workers', label: 'Cloudflare Workers' },
              { id: 'deno-deploy', label: 'Deno Deploy' }
            ],
            default: 'cloudflare-workers'
          }
        },
        options: {
          raw: ['deployment=cloudflare-workers'],
          byDimension: { deployment: 'cloudflare-workers' }
        }
      });

      assert.strictEqual(tools.options.has('cloudflare-workers'), true);
      assert.strictEqual(tools.options.has('deno-deploy'), false);
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('in() checks if dimension includes value', async () => {
    const projectDir = await createProjectFixture();
    try {
      // V1.0.0: All dimensions are single-select with options array
      const tools = await buildTools(projectDir, {
        dimensions: {
          deployment: {
            options: [
              { id: 'cloudflare-workers', label: 'Cloudflare Workers' },
              { id: 'linode', label: 'Linode' }
            ]
          }
        },
        options: {
          raw: ['deployment=cloudflare-workers'],
          byDimension: { deployment: 'cloudflare-workers' }
        }
      });

      assert.strictEqual(tools.options.in('deployment', 'cloudflare-workers'), true);
      assert.strictEqual(tools.options.in('deployment', 'linode'), false);
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('require() throws if value not selected', async () => {
    const projectDir = await createProjectFixture();
    try {
      // V1.0.0: All dimensions are single-select
      const tools = await buildTools(projectDir, {
        dimensions: {
          deployment: {
            options: [
              { id: 'cloudflare-workers', label: 'Cloudflare Workers' },
              { id: 'deno-deploy', label: 'Deno Deploy' }
            ],
            default: 'cloudflare-workers'
          }
        },
        options: {
          raw: ['deployment=cloudflare-workers'],
          byDimension: { deployment: 'cloudflare-workers' }
        }
      });

      // V1.0.0: require() needs dimension and value
      tools.options.require('deployment', 'cloudflare-workers'); // Should not throw

      assert.throws(
        () => tools.options.require('deployment', 'deno-deploy'),
        (error) => error instanceof SetupSandboxError
      );
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('list() returns option for dimension', async () => {
    const projectDir = await createProjectFixture();
    try {
      // V1.0.0: All dimensions are single-select
      const tools = await buildTools(projectDir, {
        dimensions: {
          deployment: {
            options: [
              { id: 'cloudflare-workers', label: 'Cloudflare Workers' },
              { id: 'deno-deploy', label: 'Deno Deploy' }
            ],
            default: 'cloudflare-workers'
          }
        },
        options: {
          raw: ['deployment=cloudflare-workers'],
          byDimension: { deployment: 'cloudflare-workers' }
        }
      });

      // V1.0.0: list() returns single value for single-select dimensions
      const deployment = tools.options.list('deployment');
      assert.strictEqual(deployment, 'cloudflare-workers');

      const raw = tools.options.list();
      assert.deepStrictEqual(raw, ['deployment=cloudflare-workers']);
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('raw() returns raw option strings', async () => {
    const projectDir = await createProjectFixture();
    try {
      // V1.0.0: All dimensions are single-select
      const tools = await buildTools(projectDir, {
        dimensions: {
          deployment: {
            options: [
              { id: 'cloudflare-workers', label: 'Cloudflare Workers' }
            ]
          },
          database: {
            options: [
              { id: 'd1', label: 'Cloudflare D1' }
            ]
          }
        },
        options: {
          raw: ['deployment=cloudflare-workers', 'database=d1'],
          byDimension: { deployment: 'cloudflare-workers', database: 'd1' }
        }
      });

      const raw = tools.options.raw();
      assert.deepStrictEqual(raw, ['deployment=cloudflare-workers', 'database=d1']);
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  test('dimensions() returns byDimension clone', async () => {
    const projectDir = await createProjectFixture();
    try {
      // V1.0.0: All dimensions are single-select
      const tools = await buildTools(projectDir, {
        dimensions: {
          deployment: {
            options: [
              { id: 'cloudflare-workers', label: 'Cloudflare Workers' }
            ],
            default: 'cloudflare-workers'
          }
        },
        options: {
          raw: ['deployment=cloudflare-workers'],
          byDimension: { deployment: 'cloudflare-workers' }
        }
      });

      const dims = tools.options.dimensions();
      assert.deepStrictEqual(dims, { deployment: 'cloudflare-workers' });
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });
});
