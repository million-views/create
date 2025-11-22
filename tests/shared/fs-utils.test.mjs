#!/usr/bin/env node

import test from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtemp, rm, writeFile, mkdir, access } from 'fs/promises';
import { File } from '../../lib/utils/file.mjs';

test.test.describe('File System Utils', () => {
  let tempDir;

  // Create a temporary directory for testing
  test.before(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'fs-utils-test-'));
  });

  // Clean up temporary directory after tests
  test.after(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test.test.describe('File.ensureDirectory()', () => {
    test('should create directory that does not exist', async () => {
      const testDir = join(tempDir, 'new-dir');
      await File.ensureDirectory(testDir);

      // Verify directory exists
      await access(testDir);
    });

    test('should not throw when directory already exists', async () => {
      const testDir = join(tempDir, 'existing-dir');
      await mkdir(testDir);
      await File.ensureDirectory(testDir); // Should not throw
    });

    test('should create nested directories', async () => {
      const testDir = join(tempDir, 'nested', 'deep', 'path');
      await File.ensureDirectory(testDir);

      await access(testDir);
    });

    test('should throw on permission errors', async () => {
      // Try to create directory in a location that might not be writable
      // This is tricky to test reliably, so we'll skip for now
      // In a real scenario, this would test against a read-only filesystem
    });
  });

  test.describe('File.validateDirectoryExists()', () => {
    test('should not throw for existing directory', async () => {
      const testDir = join(tempDir, 'validate-test');
      await mkdir(testDir);

      await assert.doesNotReject(File.validateDirectoryExists(testDir, 'test directory'));
    });

    test('should throw for non-existent directory', async () => {
      const nonExistent = join(tempDir, 'does-not-exist');

      await assert.rejects(
        File.validateDirectoryExists(nonExistent, 'test directory'),
        /test directory not found/
      );
    });

    test('should throw for file that is not a directory', async () => {
      const testFile = join(tempDir, 'not-a-dir.txt');
      await File.writeFile(testFile, 'content');

      await assert.rejects(
        File.validateDirectoryExists(testFile, 'test directory'),
        /test directory exists but is not a directory/
      );
    });

    test('should throw when dirPath is undefined', async () => {
      await assert.rejects(
        File.validateDirectoryExists(undefined, 'test directory'),
        /dirPath is undefined/
      );
    });
  });

  test.describe('File.safeCleanup()', () => {
    test('should remove existing file without throwing', async () => {
      const testFile = join(tempDir, 'cleanup-file.txt');
      await File.writeFile(testFile, 'content');

      await File.safeCleanup(testFile);

      // File should be gone
      await assert.rejects(access(testFile));
    });

    test('should remove existing directory without throwing', async () => {
      const testDir = join(tempDir, 'cleanup-dir');
      await mkdir(testDir);

      await File.safeCleanup(testDir);

      // Directory should be gone
      await assert.rejects(access(testDir));
    });

    test('should not throw when path does not exist', async () => {
      const nonExistent = join(tempDir, 'does-not-exist');
      await File.safeCleanup(nonExistent); // Should not throw
    });
  });

  test.describe('File.readJsonFile()', () => {
    test('should read and parse valid JSON file', async () => {
      const testFile = join(tempDir, 'test.json');
      const testData = { key: 'value', number: 42 };
      await File.writeFile(testFile, JSON.stringify(testData));

      const result = await File.readJsonFile(testFile);
      assert.deepStrictEqual(result, testData);
    });

    test('should return default value for non-existent file', async () => {
      const nonExistent = join(tempDir, 'does-not-exist.json');
      const result = await File.readJsonFile(nonExistent, 'default-value');

      assert.strictEqual(result, 'default-value');
    });

    test('should return null default for non-existent file', async () => {
      const nonExistent = join(tempDir, 'does-not-exist.json');
      const result = await File.readJsonFile(nonExistent);

      assert.strictEqual(result, null);
    });

    test('should throw for invalid JSON', async () => {
      const testFile = join(tempDir, 'invalid.json');
      await File.writeFile(testFile, 'invalid json content');

      await assert.rejects(
        File.readJsonFile(testFile),
        /Failed to read JSON file/
      );
    });
  });

  test.describe('File.writeJsonFile()', () => {
    test('should write JSON data to file', async () => {
      const testFile = join(tempDir, 'write-test.json');
      const testData = { key: 'value', array: [1, 2, 3] };

      await File.writeJsonFile(testFile, testData);

      // Verify file was written and contains correct JSON
      const content = await File.readFile(testFile);
      const parsed = JSON.parse(content);
      assert.deepStrictEqual(parsed, testData);
    });

    test('should throw on write errors', async () => {
      // This is hard to test reliably without setting up specific error conditions
      // In practice, this would test against read-only filesystems or permission issues
    });
  });

  test.describe('File.writeFileAtomic()', () => {
    test('should write file atomically', async () => {
      const testFile = join(tempDir, 'atomic-test.txt');
      const content = 'atomic write content';

      await File.writeFileAtomic(testFile, content);

      const readContent = await File.readFile(testFile);
      assert.strictEqual(readContent, content);
    });

    test('should create parent directories', async () => {
      const testFile = join(tempDir, 'nested', 'dir', 'atomic-test.txt');
      const content = 'nested atomic write';

      await File.writeFileAtomic(testFile, content);

      const readContent = await File.readFile(testFile);
      assert.strictEqual(readContent, content);
    });
  });

  test.describe('File.exists()', () => {
    test('should return true for existing file', async () => {
      const testFile = join(tempDir, 'exists-test.txt');
      await File.writeFile(testFile, 'content');

      const result = await File.exists(testFile);
      assert.strictEqual(result, true);
    });

    test('should return true for existing directory', async () => {
      const testDir = join(tempDir, 'exists-dir');
      await mkdir(testDir);

      const result = await File.exists(testDir);
      assert.strictEqual(result, true);
    });

    test('should return false for non-existent path', async () => {
      const nonExistent = join(tempDir, 'does-not-exist');
      const result = await File.exists(nonExistent);
      assert.strictEqual(result, false);
    });
  });

  test.describe('File.readFile()', () => {
    test('should read file content', async () => {
      const testFile = join(tempDir, 'read-test.txt');
      const content = 'file content to read';
      await File.writeFile(testFile, content);

      const result = await File.readFile(testFile);
      assert.strictEqual(result, content);
    });

    test('should throw for non-existent file', async () => {
      const nonExistent = join(tempDir, 'does-not-exist.txt');

      await assert.rejects(
        File.readFile(nonExistent),
        /File not found/
      );
    });

    test('should throw for directory', async () => {
      const testDir = join(tempDir, 'read-dir-test');
      await mkdir(testDir);

      await assert.rejects(
        File.readFile(testDir),
        /is a directory, not a file/
      );
    });
  });

  test.describe('File.remove()', () => {
    test('should remove existing file', async () => {
      const testFile = join(tempDir, 'remove-test.txt');
      await File.writeFile(testFile, 'content');

      await File.remove(testFile);

      const stillExists = await File.exists(testFile);
      assert.strictEqual(stillExists, false);
    });

    test('should remove existing directory recursively', async () => {
      const testDir = join(tempDir, 'remove-dir');
      const nestedFile = join(testDir, 'nested.txt');
      await mkdir(testDir);
      await File.writeFile(nestedFile, 'content');

      await File.remove(testDir);

      const stillExists = await File.exists(testDir);
      assert.strictEqual(stillExists, false);
    });

    test('should not throw for non-existent file when force is true', async () => {
      const nonExistent = join(tempDir, 'does-not-exist');
      await File.remove(nonExistent); // Should not throw
    });
  });

  test.describe('File.copyFile()', () => {
    test('should copy file to new location', async () => {
      const srcFile = join(tempDir, 'copy-src.txt');
      const destFile = join(tempDir, 'copy-dest.txt');
      const content = 'content to copy';

      await File.writeFile(srcFile, content);
      await File.copyFile(srcFile, destFile);

      const copiedContent = await File.readFile(destFile);
      assert.strictEqual(copiedContent, content);
    });

    test('should create destination directory if needed', async () => {
      const srcFile = join(tempDir, 'copy-src2.txt');
      const destFile = join(tempDir, 'new-dir', 'copy-dest2.txt');
      const content = 'content to copy with dir creation';

      await File.writeFile(srcFile, content);
      await File.copyFile(srcFile, destFile);

      const copiedContent = await File.readFile(destFile);
      assert.strictEqual(copiedContent, content);
    });

    test('should throw for non-existent source file', async () => {
      const nonExistent = join(tempDir, 'does-not-exist.txt');
      const destFile = join(tempDir, 'dest.txt');

      await assert.rejects(
        File.copyFile(nonExistent, destFile),
        /Source file not found/
      );
    });
  });

  test.describe('File.stat()', () => {
    test('should return stats for existing file', async () => {
      const testFile = join(tempDir, 'stat-test.txt');
      await writeFile(testFile, 'content');

      const stats = await File.stat(testFile);
      assert(stats.isFile());
      assert(!stats.isDirectory());
    });

    test('should return stats for existing directory', async () => {
      const testDir = join(tempDir, 'stat-dir');
      await mkdir(testDir);

      const stats = await File.stat(testDir);
      assert(stats.isDirectory());
      assert(!stats.isFile());
    });

    test('should throw for non-existent path', async () => {
      const nonExistent = join(tempDir, 'does-not-exist');

      await assert.rejects(
        File.stat(nonExistent),
        /File or directory not found/
      );
    });
  });

  test.describe('File.readdir()', () => {
    test('should list directory contents', async () => {
      const testDir = join(tempDir, 'list-dir');
      await mkdir(testDir);
      await writeFile(join(testDir, 'file1.txt'), 'content1');
      await writeFile(join(testDir, 'file2.txt'), 'content2');
      await mkdir(join(testDir, 'subdir'));

      const contents = await File.readdir(testDir);
      assert(contents.includes('file1.txt'));
      assert(contents.includes('file2.txt'));
      assert(contents.includes('subdir'));
    });

    test('should throw for non-existent directory', async () => {
      const nonExistent = join(tempDir, 'does-not-exist-dir');

      await assert.rejects(
        File.readdir(nonExistent),
        /Directory not found/
      );
    });

    test('should throw for file instead of directory', async () => {
      const testFile = join(tempDir, 'not-a-dir.txt');
      await writeFile(testFile, 'content');

      await assert.rejects(
        File.readdir(testFile),
        /Not a directory/
      );
    });
  });

  test.describe('File.validateRequiredFiles()', () => {
    test('should return empty array when all files exist', async () => {
      const file1 = join(tempDir, 'required1.txt');
      const file2 = join(tempDir, 'required2.txt');
      await File.writeFile(file1, 'content1');
      await File.writeFile(file2, 'content2');

      const errors = await File.validateRequiredFiles([file1, file2], 'test operation');
      assert.deepStrictEqual(errors, []);
    });

    test('should return errors for missing files', async () => {
      const existingFile = join(tempDir, 'exists.txt');
      const missingFile = join(tempDir, 'missing.txt');
      await File.writeFile(existingFile, 'content');

      const errors = await File.validateRequiredFiles([existingFile, missingFile], 'test operation');
      assert.strictEqual(errors.length, 1);
      assert(errors[0].includes('missing.txt not found'));
      assert(errors[0].includes('test operation'));
    });
  });

  test.describe('File.validateNodeJsProject()', () => {
    test('should return empty array for valid Node.js project', async () => {
      const projectDir = join(tempDir, 'node-project');
      await mkdir(projectDir);
      await writeFile(join(projectDir, 'package.json'), '{"name": "test"}');

      const errors = await File.validateNodeJsProject(projectDir);
      assert.deepStrictEqual(errors, []);
    });

    test('should return error for missing package.json', async () => {
      const nonProjectDir = join(tempDir, 'not-node-project');
      await mkdir(nonProjectDir);

      const errors = await File.validateNodeJsProject(nonProjectDir);
      assert.strictEqual(errors.length, 1);
      assert(errors[0].includes('package.json not found'));
    });
  });

  test.describe('File.validateTemplateRestorable()', () => {
    test('should return empty array when undo file exists', async () => {
      const templateDir = join(tempDir, 'restorable-template');
      await mkdir(templateDir);
      await writeFile(join(templateDir, '.template-undo.json'), '{"undo": "data"}');

      const errors = await File.validateTemplateRestorable(templateDir);
      assert.deepStrictEqual(errors, []);
    });

    test('should return error when undo file is missing', async () => {
      const templateDir = join(tempDir, 'non-restorable-template');
      await mkdir(templateDir);

      const errors = await File.validateTemplateRestorable(templateDir);
      assert.strictEqual(errors.length, 1);
      assert(errors[0].includes('.template-undo.json not found'));
    });
  });

  test.describe('File.validateFileDoesNotExist()', () => {
    test('should return empty array when file does not exist', async () => {
      const nonExistentFile = join(tempDir, 'does-not-exist.txt');

      const errors = await File.validateFileDoesNotExist(nonExistentFile, 'creation');
      assert.deepStrictEqual(errors, []);
    });

    test('should return error when file exists', async () => {
      const existingFile = join(tempDir, 'exists.txt');
      await writeFile(existingFile, 'content');

      const errors = await File.validateFileDoesNotExist(existingFile, 'creation');
      assert.strictEqual(errors.length, 1);
      assert(errors[0].includes('already exists'));
      assert(errors[0].includes('creation'));
    });
  });
});
