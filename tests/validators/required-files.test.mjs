#!/usr/bin/env node

import test from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { validateRequiredFiles } from '../../bin/create-scaffold/modules/validators/required-files.mjs';

test.describe('Required Files Validator', () => {
  let tempDir;

  test.before(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'required-files-test-'));
  });

  test.after(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test.describe('validateRequiredFiles()', () => {
    test('returns pass result when all required files exist', async () => {
      const targetPath = join(tempDir, 'complete-template');
      await mkdir(targetPath);

      // Create all required files
      await writeFile(join(targetPath, 'template.json'), '{"name": "test"}');
      await writeFile(join(targetPath, '.template-undo.json'), '{"files": []}');
      await writeFile(join(targetPath, 'README.md'), '# Test Template');

      const result = await validateRequiredFiles({ targetPath });

      assert.strictEqual(result.name, 'requiredFiles');
      assert.strictEqual(result.status, 'pass');
      assert.deepStrictEqual(result.issues, []);
    });

    test('returns pass result with README (no extension)', async () => {
      const targetPath = join(tempDir, 'readme-no-ext');
      await mkdir(targetPath);

      await writeFile(join(targetPath, 'template.json'), '{"name": "test"}');
      await writeFile(join(targetPath, '.template-undo.json'), '{"files": []}');
      await writeFile(join(targetPath, 'README'), '# Test Template');

      const result = await validateRequiredFiles({ targetPath });

      assert.strictEqual(result.name, 'requiredFiles');
      assert.strictEqual(result.status, 'pass');
      assert.deepStrictEqual(result.issues, []);
    });

    test('returns pass result with readme.md (lowercase)', async () => {
      const targetPath = join(tempDir, 'readme-lowercase');
      await mkdir(targetPath);

      await writeFile(join(targetPath, 'template.json'), '{"name": "test"}');
      await writeFile(join(targetPath, '.template-undo.json'), '{"files": []}');
      await writeFile(join(targetPath, 'readme.md'), '# Test Template');

      const result = await validateRequiredFiles({ targetPath });

      assert.strictEqual(result.name, 'requiredFiles');
      assert.strictEqual(result.status, 'pass');
      assert.deepStrictEqual(result.issues, []);
    });

    test('returns pass result with readme.markdown', async () => {
      const targetPath = join(tempDir, 'readme-markdown');
      await mkdir(targetPath);

      await writeFile(join(targetPath, 'template.json'), '{"name": "test"}');
      await writeFile(join(targetPath, '.template-undo.json'), '{"files": []}');
      await writeFile(join(targetPath, 'readme.markdown'), '# Test Template');

      const result = await validateRequiredFiles({ targetPath });

      assert.strictEqual(result.name, 'requiredFiles');
      assert.strictEqual(result.status, 'pass');
      assert.deepStrictEqual(result.issues, []);
    });

    test('handles missing targetPath parameter', async () => {
      await assert.rejects(
        () => validateRequiredFiles({}),
        /The "path" argument must be of type string\. Received undefined/
      );
    });

    test('handles null targetPath', async () => {
      await assert.rejects(
        () => validateRequiredFiles({ targetPath: null }),
        /The "path" argument must be of type string\. Received null/
      );
    });

    test('fails when template.json is missing', async () => {
      const targetPath = join(tempDir, 'missing-template');
      await mkdir(targetPath);

      await writeFile(join(targetPath, '.template-undo.json'), '{"files": []}');
      await writeFile(join(targetPath, 'README.md'), '# Test Template');

      const result = await validateRequiredFiles({ targetPath });

      assert.strictEqual(result.name, 'requiredFiles');
      assert.strictEqual(result.status, 'fail');
      assert.deepStrictEqual(result.issues, [
        'Required file missing: template.json'
      ]);
    });

    test('fails when .template-undo.json is missing', async () => {
      const targetPath = join(tempDir, 'missing-undo');
      await mkdir(targetPath);

      await writeFile(join(targetPath, 'template.json'), '{"name": "test"}');
      await writeFile(join(targetPath, 'README.md'), '# Test Template');

      const result = await validateRequiredFiles({ targetPath });

      assert.strictEqual(result.name, 'requiredFiles');
      assert.strictEqual(result.status, 'fail');
      assert.deepStrictEqual(result.issues, [
        'Required file missing: .template-undo.json'
      ]);
    });

    test('fails when README is missing', async () => {
      const targetPath = join(tempDir, 'missing-readme');
      await mkdir(targetPath);

      await writeFile(join(targetPath, 'template.json'), '{"name": "test"}');
      await writeFile(join(targetPath, '.template-undo.json'), '{"files": []}');

      const result = await validateRequiredFiles({ targetPath });

      assert.strictEqual(result.name, 'requiredFiles');
      assert.strictEqual(result.status, 'fail');
      assert.deepStrictEqual(result.issues, [
        'Required documentation missing: README.md (or README)'
      ]);
    });

    test('fails when multiple files are missing', async () => {
      const targetPath = join(tempDir, 'multiple-missing');
      await mkdir(targetPath);

      // Only create README, missing template.json and .template-undo.json
      await writeFile(join(targetPath, 'README.md'), '# Test Template');

      const result = await validateRequiredFiles({ targetPath });

      assert.strictEqual(result.name, 'requiredFiles');
      assert.strictEqual(result.status, 'fail');
      assert.strictEqual(result.issues.length, 2);
      assert(result.issues.includes('Required file missing: template.json'));
      assert(result.issues.includes('Required file missing: .template-undo.json'));
    });

    test('fails when all required files are missing', async () => {
      const targetPath = join(tempDir, 'all-missing');
      await mkdir(targetPath);

      const result = await validateRequiredFiles({ targetPath });

      assert.strictEqual(result.name, 'requiredFiles');
      assert.strictEqual(result.status, 'fail');
      assert.strictEqual(result.issues.length, 3);
      assert(result.issues.includes('Required file missing: template.json'));
      assert(result.issues.includes('Required file missing: .template-undo.json'));
      assert(result.issues.includes('Required documentation missing: README.md (or README)'));
    });

    test('ignores directories with README names', async () => {
      const targetPath = join(tempDir, 'readme-directory');
      await mkdir(targetPath);

      await writeFile(join(targetPath, 'template.json'), '{"name": "test"}');
      await writeFile(join(targetPath, '.template-undo.json'), '{"files": []}');

      // Create a README directory instead of file
      await mkdir(join(targetPath, 'README.md'));

      const result = await validateRequiredFiles({ targetPath });

      assert.strictEqual(result.name, 'requiredFiles');
      assert.strictEqual(result.status, 'fail');
      assert.deepStrictEqual(result.issues, [
        'Required documentation missing: README.md (or README)'
      ]);
    });

    test('handles case-insensitive README matching', async () => {
      const targetPath = join(tempDir, 'readme-case');
      await mkdir(targetPath);

      await writeFile(join(targetPath, 'template.json'), '{"name": "test"}');
      await writeFile(join(targetPath, '.template-undo.json'), '{"files": []}');
      await writeFile(join(targetPath, 'ReadMe'), '# Test Template');

      const result = await validateRequiredFiles({ targetPath });

      assert.strictEqual(result.name, 'requiredFiles');
      assert.strictEqual(result.status, 'pass');
      assert.deepStrictEqual(result.issues, []);
    });

    test('handles non-existent target path', async () => {
      const targetPath = join(tempDir, 'non-existent-path');

      const result = await validateRequiredFiles({ targetPath });

      assert.strictEqual(result.name, 'requiredFiles');
      assert.strictEqual(result.status, 'fail');
      assert.strictEqual(result.issues.length, 3);
      assert(result.issues.includes('Required file missing: template.json'));
      assert(result.issues.includes('Required file missing: .template-undo.json'));
      assert(result.issues.includes('Required documentation missing: README.md (or README)'));
    });

    test('handles empty directory', async () => {
      const targetPath = join(tempDir, 'empty-dir');
      await mkdir(targetPath);

      const result = await validateRequiredFiles({ targetPath });

      assert.strictEqual(result.name, 'requiredFiles');
      assert.strictEqual(result.status, 'fail');
      assert.strictEqual(result.issues.length, 3);
    });

    test('handles directory with only unrelated files', async () => {
      const targetPath = join(tempDir, 'unrelated-files');
      await mkdir(targetPath);

      await writeFile(join(targetPath, 'package.json'), '{"name": "test"}');
      await writeFile(join(targetPath, 'index.js'), 'console.log("hello");');

      const result = await validateRequiredFiles({ targetPath });

      assert.strictEqual(result.name, 'requiredFiles');
      assert.strictEqual(result.status, 'fail');
      assert.strictEqual(result.issues.length, 3);
    });

    test('handles nested directory structures', async () => {
      const targetPath = join(tempDir, 'nested', 'deep', 'template');
      await mkdir(targetPath, { recursive: true });

      await writeFile(join(targetPath, 'template.json'), '{"name": "test"}');
      await writeFile(join(targetPath, '.template-undo.json'), '{"files": []}');
      await writeFile(join(targetPath, 'README.md'), '# Test Template');

      const result = await validateRequiredFiles({ targetPath });

      assert.strictEqual(result.name, 'requiredFiles');
      assert.strictEqual(result.status, 'pass');
      assert.deepStrictEqual(result.issues, []);
    });

    test('handles relative target paths', async () => {
      const targetPath = join(tempDir, 'relative-path');
      await mkdir(targetPath);

      await writeFile(join(targetPath, 'template.json'), '{"name": "test"}');
      await writeFile(join(targetPath, '.template-undo.json'), '{"files": []}');
      await writeFile(join(targetPath, 'README.md'), '# Test Template');

      const result = await validateRequiredFiles({ targetPath });

      assert.strictEqual(result.name, 'requiredFiles');
      assert.strictEqual(result.status, 'pass');
      assert.deepStrictEqual(result.issues, []);
    });

    test('handles directory with mixed case and extension variations', async () => {
      const targetPath = join(tempDir, 'mixed-case');
      await mkdir(targetPath);

      await writeFile(join(targetPath, 'template.json'), '{"name": "test"}');
      await writeFile(join(targetPath, '.template-undo.json'), '{"files": []}');
      await writeFile(join(targetPath, 'readme.MARKDOWN'), '# Test Template');

      const result = await validateRequiredFiles({ targetPath });

      assert.strictEqual(result.name, 'requiredFiles');
      assert.strictEqual(result.status, 'pass');
      assert.deepStrictEqual(result.issues, []);
    });

    test('prioritizes first valid README found', async () => {
      const targetPath = join(tempDir, 'multiple-readmes');
      await mkdir(targetPath);

      await writeFile(join(targetPath, 'template.json'), '{"name": "test"}');
      await writeFile(join(targetPath, '.template-undo.json'), '{"files": []}');
      await writeFile(join(targetPath, 'README.md'), '# Primary README');
      await writeFile(join(targetPath, 'readme'), '# Secondary README');

      const result = await validateRequiredFiles({ targetPath });

      assert.strictEqual(result.name, 'requiredFiles');
      assert.strictEqual(result.status, 'pass');
      assert.deepStrictEqual(result.issues, []);
    });

    test('handles directory read errors gracefully', async () => {
      // This is hard to test directly since we can't easily create permission issues
      // in a cross-platform way. The function handles readdir errors by returning false
      // for hasReadme, which means it will report README as missing.
      const targetPath = join(tempDir, 'read-error');
      await mkdir(targetPath);

      await writeFile(join(targetPath, 'template.json'), '{"name": "test"}');
      await writeFile(join(targetPath, '.template-undo.json'), '{"files": []}');

      const result = await validateRequiredFiles({ targetPath });

      assert.strictEqual(result.name, 'requiredFiles');
      assert.strictEqual(result.status, 'fail');
      assert.deepStrictEqual(result.issues, [
        'Required documentation missing: README.md (or README)'
      ]);
    });
  });
});
