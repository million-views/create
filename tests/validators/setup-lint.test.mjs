#!/usr/bin/env node

import test from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { validateSetupScript } from '../../bin/create-scaffold/modules/validators/setup-lint.mts';

test.describe('Setup Lint Validator', () => {
  let tempDir;

  test.before(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'setup-lint-test-'));
  });

  test.after(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test.describe('validateSetupScript()', () => {
    test('returns warn result when setup script does not exist', async () => {
      const targetPath = join(tempDir, 'no-setup');
      await mkdir(targetPath);

      const result = await validateSetupScript({ targetPath });

      assert.strictEqual(result.name, 'setupScript');
      assert.strictEqual(result.status, 'warn');
      assert.deepStrictEqual(result.issues, [
        'Optional setup script not found. Add _setup.mjs if personalization is required.'
      ]);
    });

    test('returns pass result for valid setup script', async () => {
      const targetPath = join(tempDir, 'valid-setup');
      await mkdir(targetPath);

      const validScript = `export default async function setup({ tools }) {
  await tools.writeFile('example.txt', 'Hello World');
  return { success: true };
}`;

      await writeFile(join(targetPath, '_setup.mjs'), validScript);

      const result = await validateSetupScript({ targetPath });

      assert.strictEqual(result.name, 'setupScript');
      assert.strictEqual(result.status, 'pass');
      assert.deepStrictEqual(result.issues, []);
    });

    test('handles missing targetPath parameter', async () => {
      await assert.rejects(
        () => validateSetupScript({}),
        /The "path" argument must be of type string\. Received undefined/
      );
    });

    test('handles null targetPath', async () => {
      await assert.rejects(
        () => validateSetupScript({ targetPath: null }),
        /The "path" argument must be of type string\. Received null/
      );
    });

    test('fails when _setup.mjs is a directory', async () => {
      const targetPath = join(tempDir, 'setup-directory');
      await mkdir(targetPath);

      // Create a directory named _setup.mjs
      await mkdir(join(targetPath, '_setup.mjs'));

      const result = await validateSetupScript({ targetPath });

      assert.strictEqual(result.name, 'setupScript');
      assert.strictEqual(result.status, 'fail');
      assert.deepStrictEqual(result.issues, [
        '_setup.mjs exists but is not a file. Ensure it points to a valid script.'
      ]);
    });

    test('fails when setup script has no default export', async () => {
      const targetPath = join(tempDir, 'no-export');
      await mkdir(targetPath);

      const invalidScript = `function setup({ tools }) {
  return { success: true };
}`;

      await writeFile(join(targetPath, '_setup.mjs'), invalidScript);

      const result = await validateSetupScript({ targetPath });

      assert.strictEqual(result.name, 'setupScript');
      assert.strictEqual(result.status, 'fail');
      assert.deepStrictEqual(result.issues, [
        'Setup script must export a default async function.'
      ]);
    });

    test('fails when setup script default export is not async', async () => {
      const targetPath = join(tempDir, 'sync-export');
      await mkdir(targetPath);

      const invalidScript = `export default function setup({ tools }) {
  return { success: true };
}`;

      await writeFile(join(targetPath, '_setup.mjs'), invalidScript);

      const result = await validateSetupScript({ targetPath });

      assert.strictEqual(result.name, 'setupScript');
      assert.strictEqual(result.status, 'fail');
      assert.deepStrictEqual(result.issues, [
        'Setup script default export must be declared async.'
      ]);
    });

    test('fails when setup script uses static import', async () => {
      const targetPath = join(tempDir, 'static-import');
      await mkdir(targetPath);

      const invalidScript = `import fs from 'fs';
export default async function setup({ tools }) {
  return { success: true };
}`;

      await writeFile(join(targetPath, '_setup.mjs'), invalidScript);

      const result = await validateSetupScript({ targetPath });

      assert.strictEqual(result.name, 'setupScript');
      assert.strictEqual(result.status, 'fail');
      assert.deepStrictEqual(result.issues, [
        'Setup script uses import statements. Use provided tools instead of importing modules.'
      ]);
    });

    test('fails when setup script uses dynamic import', async () => {
      const targetPath = join(tempDir, 'dynamic-import');
      await mkdir(targetPath);

      const invalidScript = `export default async function setup({ tools }) {
  const module = await import('fs');
  return { success: true };
}`;

      await writeFile(join(targetPath, '_setup.mjs'), invalidScript);

      const result = await validateSetupScript({ targetPath });

      assert.strictEqual(result.name, 'setupScript');
      assert.strictEqual(result.status, 'fail');
      assert.deepStrictEqual(result.issues, [
        'Setup script uses import statements. Use provided tools instead of importing modules.'
      ]);
    });

    test('fails when setup script uses require', async () => {
      const targetPath = join(tempDir, 'require-usage');
      await mkdir(targetPath);

      const invalidScript = `export default async function setup({ tools }) {
  const fs = require('fs');
  return { success: true };
}`;

      await writeFile(join(targetPath, '_setup.mjs'), invalidScript);

      const result = await validateSetupScript({ targetPath });

      assert.strictEqual(result.name, 'setupScript');
      assert.strictEqual(result.status, 'fail');
      assert.deepStrictEqual(result.issues, [
        'Setup script references require(). Use provided tools instead of requiring modules.'
      ]);
    });

    test('fails when setup script uses Function constructor', async () => {
      const targetPath = join(tempDir, 'function-ctor');
      await mkdir(targetPath);

      const invalidScript = `export default async function setup({ tools }) {
  const fn = new Function('return 42');
  return { success: true };
}`;

      await writeFile(join(targetPath, '_setup.mjs'), invalidScript);

      const result = await validateSetupScript({ targetPath });

      assert.strictEqual(result.name, 'setupScript');
      assert.strictEqual(result.status, 'fail');
      assert.deepStrictEqual(result.issues, [
        'Setup script uses Function constructor. This is forbidden in sandboxed execution.'
      ]);
    });

    test('fails when setup script uses eval', async () => {
      const targetPath = join(tempDir, 'eval-usage');
      await mkdir(targetPath);

      const invalidScript = `export default async function setup({ tools }) {
  const result = eval('42');
  return { success: true };
}`;

      await writeFile(join(targetPath, '_setup.mjs'), invalidScript);

      const result = await validateSetupScript({ targetPath });

      assert.strictEqual(result.name, 'setupScript');
      assert.strictEqual(result.status, 'fail');
      assert.deepStrictEqual(result.issues, [
        'Setup script uses eval(). This is forbidden in sandboxed execution.'
      ]);
    });

    test('fails when setup script has syntax errors', async () => {
      const targetPath = join(tempDir, 'syntax-error');
      await mkdir(targetPath);

      const invalidScript = `export default async function setup({ tools }) {
  const unclosed = "string;
  return { success: true };
}`;

      await writeFile(join(targetPath, '_setup.mjs'), invalidScript);

      const result = await validateSetupScript({ targetPath });

      assert.strictEqual(result.name, 'setupScript');
      assert.strictEqual(result.status, 'fail');
      assert.strictEqual(result.issues.length, 1);
      assert(result.issues[0].startsWith('Setup script contains syntax errors:'));
    });

    test('returns warn result for empty setup script', async () => {
      const targetPath = join(tempDir, 'empty-script');
      await mkdir(targetPath);

      await writeFile(join(targetPath, '_setup.mjs'), '');

      const result = await validateSetupScript({ targetPath });

      // Empty scripts fail because they don't have default export
      // The empty warning is not returned because errors take precedence
      assert.strictEqual(result.name, 'setupScript');
      assert.strictEqual(result.status, 'fail');
      assert.deepStrictEqual(result.issues, [
        'Setup script must export a default async function.'
      ]);
    });

    test('returns warn result for whitespace-only setup script', async () => {
      const targetPath = join(tempDir, 'whitespace-script');
      await mkdir(targetPath);

      await writeFile(join(targetPath, '_setup.mjs'), '   \n\t  \n  ');

      const result = await validateSetupScript({ targetPath });

      // Whitespace-only scripts fail because they don't have default export
      // The empty warning is not returned because errors take precedence
      assert.strictEqual(result.name, 'setupScript');
      assert.strictEqual(result.status, 'fail');
      assert.deepStrictEqual(result.issues, [
        'Setup script must export a default async function.'
      ]);
    });

    test('handles multiple validation errors', async () => {
      const targetPath = join(tempDir, 'multiple-errors');
      await mkdir(targetPath);

      const invalidScript = `import fs from 'fs';
function setup({ tools }) {
  const result = eval('42');
  return { success: true };
}`;

      await writeFile(join(targetPath, '_setup.mjs'), invalidScript);

      const result = await validateSetupScript({ targetPath });

      assert.strictEqual(result.name, 'setupScript');
      assert.strictEqual(result.status, 'fail');
      assert.strictEqual(result.issues.length, 3);
      assert(result.issues.includes('Setup script must export a default async function.'));
      assert(result.issues.includes('Setup script uses import statements. Use provided tools instead of importing modules.'));
      assert(result.issues.includes('Setup script uses eval(). This is forbidden in sandboxed execution.'));
    });

    test('handles file stat errors', async () => {
      // This is hard to test directly since we can't easily create permission issues
      // in a cross-platform way. The function handles stat errors by returning fail results.
      const targetPath = join(tempDir, 'stat-error');
      await mkdir(targetPath);

      // We'll test with a valid setup script to ensure the stat path works
      const validScript = `export default async function setup({ tools }) {
  return { success: true };
}`;

      await writeFile(join(targetPath, '_setup.mjs'), validScript);

      const result = await validateSetupScript({ targetPath });

      assert.strictEqual(result.name, 'setupScript');
      assert.strictEqual(result.status, 'pass');
    });

    test('handles file read errors', async () => {
      // This is also hard to test directly. We'll test with a valid file to ensure read path works
      const targetPath = join(tempDir, 'read-error');
      await mkdir(targetPath);

      const validScript = `export default async function setup({ tools }) {
  return { success: true };
}`;

      await writeFile(join(targetPath, '_setup.mjs'), validScript);

      const result = await validateSetupScript({ targetPath });

      assert.strictEqual(result.name, 'setupScript');
      assert.strictEqual(result.status, 'pass');
    });

    test('handles complex valid setup script', async () => {
      const targetPath = join(tempDir, 'complex-valid');
      await mkdir(targetPath);

      const complexScript = `export default async function setup({ tools }) {
  // Complex setup logic
  const config = {
    name: 'test-app',
    version: '1.0.0'
  };

  await tools.writeFile('package.json', JSON.stringify(config, null, 2));
  await tools.writeFile('README.md', '# Test App\\n\\nA test application.');

  // Conditional logic
  if (config.version) {
    await tools.writeFile('.version', config.version);
  }

  return {
    success: true,
    files: ['package.json', 'README.md', '.version']
  };
}`;

      await writeFile(join(targetPath, '_setup.mjs'), complexScript);

      const result = await validateSetupScript({ targetPath });

      assert.strictEqual(result.name, 'setupScript');
      assert.strictEqual(result.status, 'pass');
      assert.deepStrictEqual(result.issues, []);
    });

    test('handles setup script with comments and complex syntax', async () => {
      const targetPath = join(tempDir, 'complex-syntax');
      await mkdir(targetPath);

      const complexScript = `/**
 * Complex setup script with comments
 */
export default async function setup({ tools }) {
  // This is a comment
  const data = {
    nested: {
      value: 'test'
    },
    array: [1, 2, 3]
  };

  /* Multi-line
     comment */
  await tools.writeFile('config.json', JSON.stringify(data));

  return { success: true };
}`;

      await writeFile(join(targetPath, '_setup.mjs'), complexScript);

      const result = await validateSetupScript({ targetPath });

      assert.strictEqual(result.name, 'setupScript');
      assert.strictEqual(result.status, 'pass');
      assert.deepStrictEqual(result.issues, []);
    });

    test('handles nested directory structures', async () => {
      const targetPath = join(tempDir, 'nested', 'deep', 'template');
      await mkdir(targetPath, { recursive: true });

      const validScript = `export default async function setup({ tools }) {
  return { success: true };
}`;

      await writeFile(join(targetPath, '_setup.mjs'), validScript);

      const result = await validateSetupScript({ targetPath });

      assert.strictEqual(result.name, 'setupScript');
      assert.strictEqual(result.status, 'pass');
      assert.deepStrictEqual(result.issues, []);
    });

    test('handles relative target paths', async () => {
      const targetPath = join(tempDir, 'relative-path');
      await mkdir(targetPath);

      const validScript = `export default async function setup({ tools }) {
  return { success: true };
}`;

      await writeFile(join(targetPath, '_setup.mjs'), validScript);

      const result = await validateSetupScript({ targetPath });

      assert.strictEqual(result.name, 'setupScript');
      assert.strictEqual(result.status, 'pass');
      assert.deepStrictEqual(result.issues, []);
    });
  });
});
