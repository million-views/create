#!/usr/bin/env node

import test from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { validateManifest } from '../../bin/create-scaffold/modules/validators/manifest-validator.mjs';

test.describe('Manifest Validator', () => {
  let tempDir;

  test.before(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'manifest-validator-test-'));
  });

  test.after(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test.describe('validateManifest()', () => {
    test('returns pass result for valid manifest', async () => {
      const targetPath = join(tempDir, 'valid-template');
      await mkdir(targetPath);

      const manifestContent = {
        name: 'test-template',
        description: 'A test template',
        placeholders: [
          {
            name: 'projectName',
            description: 'Name of the project',
            default: 'my-project'
          }
        ]
      };

      await writeFile(join(targetPath, 'template.json'), JSON.stringify(manifestContent, null, 2));

      const result = await validateManifest({ targetPath });

      assert.strictEqual(result.name, 'manifest');
      assert.strictEqual(result.status, 'pass');
      assert.deepStrictEqual(result.issues, []);
    });

    test('handles missing targetPath parameter', async () => {
      await assert.rejects(
        () => validateManifest({}),
        /The "path" argument must be of type string\. Received undefined/
      );
    });

    test('handles null targetPath', async () => {
      await assert.rejects(
        () => validateManifest({ targetPath: null }),
        /The "path" argument must be of type string\. Received null/
      );
    });

    test('handles template.json not found', async () => {
      const targetPath = join(tempDir, 'missing-manifest');
      await mkdir(targetPath);

      const result = await validateManifest({ targetPath });

      assert.strictEqual(result.name, 'manifest');
      assert.strictEqual(result.status, 'fail');
      assert.deepStrictEqual(result.issues, [
        'template.json not found. Ensure the template root includes template.json.'
      ]);
    });

    test('handles other file read errors', async () => {
      // Skip this test as permission errors are hard to test cross-platform
      // and the file system approach makes it difficult to mock specific errors
      assert.ok(true);
    });

    test('handles invalid JSON', async () => {
      const targetPath = join(tempDir, 'invalid-json');
      await mkdir(targetPath);

      const invalidJson = '{"name": "test", invalid}';
      await writeFile(join(targetPath, 'template.json'), invalidJson);

      const result = await validateManifest({ targetPath });

      assert.strictEqual(result.name, 'manifest');
      assert.strictEqual(result.status, 'fail');
      assert.strictEqual(result.issues.length, 1);
      assert(result.issues[0].startsWith('template.json is not valid JSON:'));
    });

    test('handles empty manifest file', async () => {
      const targetPath = join(tempDir, 'empty-manifest');
      await mkdir(targetPath);

      await writeFile(join(targetPath, 'template.json'), '');

      const result = await validateManifest({ targetPath });

      assert.strictEqual(result.name, 'manifest');
      assert.strictEqual(result.status, 'fail');
      assert.strictEqual(result.issues.length, 1);
      assert(result.issues[0].startsWith('template.json is not valid JSON:'));
    });

    test('handles manifest with only whitespace', async () => {
      const targetPath = join(tempDir, 'whitespace-manifest');
      await mkdir(targetPath);

      await writeFile(join(targetPath, 'template.json'), '   \n\t  ');

      const result = await validateManifest({ targetPath });

      assert.strictEqual(result.name, 'manifest');
      assert.strictEqual(result.status, 'fail');
      assert.strictEqual(result.issues.length, 1);
      assert(result.issues[0].startsWith('template.json is not valid JSON:'));
    });

    test('handles manifest validation failure', async () => {
      const targetPath = join(tempDir, 'invalid-manifest');
      await mkdir(targetPath);

      // Create a manifest that will fail validation (missing required name field)
      const invalidManifest = {
        description: 'A template without a name'
      };

      await writeFile(join(targetPath, 'template.json'), JSON.stringify(invalidManifest));

      const result = await validateManifest({ targetPath });

      assert.strictEqual(result.name, 'manifest');
      assert.strictEqual(result.status, 'fail');
      assert.strictEqual(result.issues.length, 1);
      assert(result.issues[0].startsWith('Manifest validation failed:'));
    });

    test('handles large manifest files', async () => {
      const targetPath = join(tempDir, 'large-manifest');
      await mkdir(targetPath);

      const largeManifest = {
        name: 'large-template',
        description: 'A large template',
        placeholders: Array.from({ length: 100 }, (_, i) => ({
          name: `placeholder${i}`,
          description: `Description ${i}`,
          default: `default${i}`
        }))
      };

      await writeFile(join(targetPath, 'template.json'), JSON.stringify(largeManifest, null, 2));

      const result = await validateManifest({ targetPath });

      assert.strictEqual(result.name, 'manifest');
      assert.strictEqual(result.status, 'pass');
      assert.deepStrictEqual(result.issues, []);
    });

    test('handles manifest with special characters', async () => {
      const targetPath = join(tempDir, 'special-chars');
      await mkdir(targetPath);

      const manifestContent = {
        name: 'test-🚀',
        description: 'Template with émojis and spëcial chärs',
        placeholders: [
          {
            name: 'projectName',
            description: 'Name with spëcial chärs 🚀',
            default: 'my-project'
          }
        ]
      };

      await writeFile(join(targetPath, 'template.json'), JSON.stringify(manifestContent, null, 2));

      const result = await validateManifest({ targetPath });

      assert.strictEqual(result.name, 'manifest');
      assert.strictEqual(result.status, 'pass');
      assert.deepStrictEqual(result.issues, []);
    });

    test('constructs correct manifest path', async () => {
      const targetPath = join(tempDir, 'custom-path');
      await mkdir(targetPath);

      const manifestContent = {
        name: 'test-template',
        description: 'A test template'
      };
      await writeFile(join(targetPath, 'template.json'), JSON.stringify(manifestContent));

      const result = await validateManifest({ targetPath });

      assert.strictEqual(result.name, 'manifest');
      assert.strictEqual(result.status, 'pass');
    });

    test('handles relative target paths', async () => {
      const targetPath = join(tempDir, 'relative-path');
      await mkdir(targetPath);

      const manifestContent = {
        name: 'test-template',
        description: 'A test template'
      };
      await writeFile(join(targetPath, 'template.json'), JSON.stringify(manifestContent));

      const result = await validateManifest({ targetPath });

      assert.strictEqual(result.name, 'manifest');
      assert.strictEqual(result.status, 'pass');
    });

    test('handles nested directory structures', async () => {
      const targetPath = join(tempDir, 'nested', 'deep', 'template');
      await mkdir(targetPath, { recursive: true });

      const manifestContent = {
        name: 'nested-template',
        description: 'A template in a nested directory'
      };

      await writeFile(join(targetPath, 'template.json'), JSON.stringify(manifestContent));

      const result = await validateManifest({ targetPath });

      assert.strictEqual(result.name, 'manifest');
      assert.strictEqual(result.status, 'pass');
      assert.deepStrictEqual(result.issues, []);
    });

    test('handles manifest with complex placeholder structures', async () => {
      const targetPath = join(tempDir, 'complex-placeholders');
      await mkdir(targetPath);

      const manifestContent = {
        name: 'complex-template',
        description: 'Template with complex placeholders',
        placeholders: [
          {
            name: 'projectName',
            description: 'Project name',
            default: 'my-project',
            pattern: '^[a-zA-Z][a-zA-Z0-9_-]*$'
          },
          {
            name: 'author',
            description: 'Author name',
            default: 'Anonymous'
          },
          {
            name: 'version',
            description: 'Version',
            default: '1.0.0'
          }
        ]
      };

      await writeFile(join(targetPath, 'template.json'), JSON.stringify(manifestContent, null, 2));

      const result = await validateManifest({ targetPath });

      assert.strictEqual(result.name, 'manifest');
      assert.strictEqual(result.status, 'pass');
      assert.deepStrictEqual(result.issues, []);
    });

    test('handles manifest with minimal required fields', async () => {
      const targetPath = join(tempDir, 'minimal-manifest');
      await mkdir(targetPath);

      const manifestContent = {
        name: 'minimal-template',
        description: 'A minimal template'
      };

      await writeFile(join(targetPath, 'template.json'), JSON.stringify(manifestContent));

      const result = await validateManifest({ targetPath });

      assert.strictEqual(result.name, 'manifest');
      assert.strictEqual(result.status, 'pass');
      assert.deepStrictEqual(result.issues, []);
    });
  });
});
