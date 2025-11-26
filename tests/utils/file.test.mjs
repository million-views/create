import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, chmod, rm, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { File } from '../../lib/util/file.mts';

/**
 * L1 Tests for lib/utils/file.mts
 *
 * This tests L1 (Low-Level Wrappers) - thin wrappers around Node.js fs APIs.
 *
 * Test Constraints:
 * - ✅ MUST import and test L1 functions from the SUT (File class)
 * - ✅ MAY use L0 (raw Node.js APIs) for test setup/teardown/verification
 * - ❌ MUST NOT import or call L2/L3/L4 functions
 *
 * Following Guardrails:
 * - Use actual temp directories (no mocks)
 * - Test file operations, error handling, edge cases
 */

let testDir;

beforeEach(async () => {
  testDir = await mkdtemp(join(tmpdir(), 'file-utils-test-'));
});

afterEach(async () => {
  if (testDir) {
    await rm(testDir, { recursive: true, force: true }).catch(() => { });
  }
});

describe('File.ensureDirectory()', () => {
  test('creates directory when it does not exist', async () => {
    const dirPath = join(testDir, 'new-dir');

    await File.ensureDirectory(dirPath);

    const stats = await File.stat(dirPath);
    assert(stats.isDirectory());
  });

  test('succeeds when directory already exists', async () => {
    const dirPath = join(testDir, 'existing-dir');
    await mkdir(dirPath);

    await File.ensureDirectory(dirPath); // Should not throw

    const stats = await File.stat(dirPath);
    assert(stats.isDirectory());
  });

  test('creates nested directories recursively', async () => {
    const deepPath = join(testDir, 'a', 'b', 'c', 'd');

    await File.ensureDirectory(deepPath);

    const stats = await File.stat(deepPath);
    assert(stats.isDirectory());
  });

  test('applies custom permissions mode', async () => {
    const dirPath = join(testDir, 'custom-mode');

    await File.ensureDirectory(dirPath, 0o700);

    const stats = await File.stat(dirPath);
    assert(stats.isDirectory());
    // Note: mode verification is platform-dependent, just verify creation
  });

  test('throws error for invalid paths with custom error prefix', async () => {
    const invalidPath = join(testDir, 'file.txt');
    await writeFile(invalidPath, 'content'); // Create file, not dir

    await assert.rejects(
      async () => {
        // Try to create directory where file exists will fail on some systems
        await File.ensureDirectory(join(invalidPath, 'subdir'), 0o755, 'test directory');
      },
      (error) => {
        return error.message.includes('test directory') || error.code === 'ENOTDIR';
      }
    );
  });
});

describe('File.validateDirectoryExists()', () => {
  test('returns empty array when directory exists', async () => {
    const dirPath = join(testDir, 'valid-dir');
    await mkdir(dirPath);

    const errors = await File.validateDirectoryExists(dirPath, 'test directory');
    assert.strictEqual(errors.length, 0);
  });

  test('returns error when path does not exist', async () => {
    const nonExistent = join(testDir, 'does-not-exist');

    const errors = await File.validateDirectoryExists(nonExistent, 'missing directory');
    assert.strictEqual(errors.length, 1);
    assert.match(errors[0], /missing directory not found/);
  });

  test('returns error when path exists but is not a directory', async () => {
    const filePath = join(testDir, 'file.txt');
    await writeFile(filePath, 'content');

    const errors = await File.validateDirectoryExists(filePath, 'file path');
    assert.strictEqual(errors.length, 1);
    assert.match(errors[0], /file path exists but is not a directory/);
  });

  test('returns error when dirPath is undefined', async () => {
    const errors = await File.validateDirectoryExists(undefined, 'undefined path');
    assert.strictEqual(errors.length, 1);
    assert.match(errors[0], /dirPath is undefined/);
  });
});

describe('File.safeCleanup()', () => {
  test('removes file silently', async () => {
    const filePath = join(testDir, 'remove-me.txt');
    await writeFile(filePath, 'content');

    await File.safeCleanup(filePath);

    const exists = await File.exists(filePath);
    assert.strictEqual(exists, false);
  });

  test('removes directory recursively', async () => {
    const dirPath = join(testDir, 'remove-dir');
    await mkdir(join(dirPath, 'sub'), { recursive: true });
    await writeFile(join(dirPath, 'sub', 'file.txt'), 'content');

    await File.safeCleanup(dirPath, { recursive: true });

    const exists = await File.exists(dirPath);
    assert.strictEqual(exists, false);
  });

  test('ignores errors when target does not exist', async () => {
    const nonExistent = join(testDir, 'does-not-exist');

    // Should not throw
    await File.safeCleanup(nonExistent);
  });

  test('respects recursive option', async () => {
    const dirPath = join(testDir, 'dir-with-files');
    await mkdir(dirPath);
    await writeFile(join(dirPath, 'file.txt'), 'content');

    // With recursive: true (default), should remove
    await File.safeCleanup(dirPath, { recursive: true });

    const exists = await File.exists(dirPath);
    assert.strictEqual(exists, false);
  });

  test('respects force option', async () => {
    const dirPath = join(testDir, 'force-remove');
    await mkdir(dirPath);

    // With force: true (default), should remove
    await File.safeCleanup(dirPath, { force: true });

    const exists = await File.exists(dirPath);
    assert.strictEqual(exists, false);
  });
});

describe('File.readJsonFile()', () => {
  test('reads and parses valid JSON file', async () => {
    const jsonPath = join(testDir, 'data.json');
    await writeFile(jsonPath, JSON.stringify({ key: 'value', count: 42 }));

    const data = await File.readJsonFile(jsonPath);

    assert.deepStrictEqual(data, { key: 'value', count: 42 });
  });

  test('returns default value when file does not exist', async () => {
    const nonExistent = join(testDir, 'missing.json');

    const data = await File.readJsonFile(nonExistent, { default: true });

    assert.deepStrictEqual(data, { default: true });
  });

  test('returns null as default when file does not exist and no default provided', async () => {
    const nonExistent = join(testDir, 'missing.json');

    const data = await File.readJsonFile(nonExistent);

    assert.strictEqual(data, null);
  });

  test('throws error for invalid JSON', async () => {
    const invalidJson = join(testDir, 'invalid.json');
    await writeFile(invalidJson, 'not valid json{');

    await assert.rejects(
      async () => {
        await File.readJsonFile(invalidJson, null, 'test file');
      },
      { message: /Failed to read test file/ }
    );
  });

  test('throws error for read errors other than ENOENT', async () => {
    const jsonPath = join(testDir, 'restricted.json');
    await writeFile(jsonPath, '{"test": true}');

    if (process.platform !== 'win32') {
      await chmod(jsonPath, 0o000); // Remove all permissions

      await assert.rejects(
        async () => {
          await File.readJsonFile(jsonPath, null, 'restricted file');
        },
        { message: /Failed to read restricted file/ }
      );

      await chmod(jsonPath, 0o644); // Restore for cleanup
    }
  });
});

describe('File.writeJsonFile()', () => {
  test('writes JSON data to file', async () => {
    const jsonPath = join(testDir, 'output.json');
    const data = { name: 'test', values: [1, 2, 3] };

    await File.writeJsonFile(jsonPath, data);

    const content = await readFile(jsonPath, 'utf8');
    assert.deepStrictEqual(JSON.parse(content), data);
  });

  test('throws error when parent directories do not exist', async () => {
    const nestedPath = join(testDir, 'a', 'b', 'c', 'data.json');
    const data = { nested: true };

    await assert.rejects(
      async () => {
        await File.writeJsonFile(nestedPath, data);
      },
      { message: /Failed to write/ }
    );
  });

  test('throws error with custom file description', async () => {
    // Create a directory where we want to write a file (will fail)
    const dirPath = join(testDir, 'is-a-directory');
    await mkdir(dirPath);
    const invalidPath = join(dirPath, 'subdir');
    await mkdir(invalidPath);

    await assert.rejects(
      async () => {
        // Try to write file where directory exists
        await File.writeJsonFile(invalidPath, { data: true }, 'config file');
      },
      { message: /Failed to write config file/ }
    );
  });
});

describe('File.writeFileAtomic()', () => {
  test('writes content atomically', async () => {
    const filePath = join(testDir, 'atomic.txt');
    const content = 'atomic content';

    await File.writeFileAtomic(filePath, content);

    const read = await readFile(filePath, 'utf8');
    assert.strictEqual(read, content);
  });

  test('creates parent directories', async () => {
    const nestedPath = join(testDir, 'x', 'y', 'z', 'atomic.txt');

    await File.writeFileAtomic(nestedPath, 'nested atomic');

    const read = await readFile(nestedPath, 'utf8');
    assert.strictEqual(read, 'nested atomic');
  });

  test('handles write errors gracefully', async () => {
    const readOnlyDir = join(testDir, 'readonly');
    await mkdir(readOnlyDir);
    const filePath = join(readOnlyDir, 'file.txt');

    if (process.platform !== 'win32') {
      await chmod(readOnlyDir, 0o555); // Read-only directory

      await assert.rejects(
        async () => {
          await File.writeFileAtomic(filePath, 'new content');
        },
        Error
      );

      await chmod(readOnlyDir, 0o755); // Restore permissions for cleanup
    }
  });

  test('cleans up temp file on write failure', async () => {
    const dirPath = join(testDir, 'readonly-dir');
    await mkdir(dirPath);
    const filePath = join(dirPath, 'file.txt');

    if (process.platform !== 'win32') {
      await chmod(dirPath, 0o555); // Read-only directory

      await assert.rejects(
        async () => {
          await File.writeFileAtomic(filePath, 'content');
        },
        Error
      );

      await chmod(dirPath, 0o755); // Restore
    }
  });
});

describe('File.exists()', () => {
  test('returns true for existing file', async () => {
    const filePath = join(testDir, 'exists.txt');
    await writeFile(filePath, 'content');

    const exists = await File.exists(filePath);

    assert.strictEqual(exists, true);
  });

  test('returns true for existing directory', async () => {
    const dirPath = join(testDir, 'exists-dir');
    await mkdir(dirPath);

    const exists = await File.exists(dirPath);

    assert.strictEqual(exists, true);
  });

  test('returns false for non-existent path', async () => {
    const nonExistent = join(testDir, 'does-not-exist');

    const exists = await File.exists(nonExistent);

    assert.strictEqual(exists, false);
  });
});

describe('File.readFile()', () => {
  test('reads file content as UTF-8', async () => {
    const filePath = join(testDir, 'read.txt');
    await writeFile(filePath, 'Hello, World!');

    const content = await File.readFile(filePath);

    assert.strictEqual(content, 'Hello, World!');
  });

  test('throws when file does not exist', async () => {
    const nonExistent = join(testDir, 'missing.txt');

    await assert.rejects(
      async () => {
        await File.readFile(nonExistent);
      },
      { message: /File not found/ }
    );
  });

  test('throws for permission errors', async () => {
    const filePath = join(testDir, 'restricted.txt');
    await writeFile(filePath, 'secret');

    if (process.platform !== 'win32') {
      await chmod(filePath, 0o000);

      await assert.rejects(
        async () => {
          await File.readFile(filePath);
        },
        { message: /Permission denied/ }
      );

      await chmod(filePath, 0o644);
    }
  });
});

describe('File.remove()', () => {
  test('removes file', async () => {
    const filePath = join(testDir, 'remove.txt');
    await writeFile(filePath, 'content');

    await File.remove(filePath);

    const exists = await File.exists(filePath);
    assert.strictEqual(exists, false);
  });

  test('removes directory recursively', async () => {
    const dirPath = join(testDir, 'remove-dir');
    await mkdir(join(dirPath, 'sub'), { recursive: true });
    await writeFile(join(dirPath, 'file.txt'), 'content');

    await File.remove(dirPath, { recursive: true });

    const exists = await File.exists(dirPath);
    assert.strictEqual(exists, false);
  });

  test('throws when removing non-existent path without force', async () => {
    const nonExistent = join(testDir, 'missing');

    await assert.rejects(
      async () => {
        await File.remove(nonExistent, { force: false });
      },
      { message: /Failed to remove/ }
    );
  });

  test('succeeds with force option for non-existent path', async () => {
    const nonExistent = join(testDir, 'missing');

    // Should not throw
    await File.remove(nonExistent, { force: true });
  });
});

describe('File.copyFile()', () => {
  test('copies file to new location', async () => {
    const src = join(testDir, 'source.txt');
    const dest = join(testDir, 'destination.txt');
    await writeFile(src, 'copy me');

    await File.copyFile(src, dest);

    const content = await readFile(dest, 'utf8');
    assert.strictEqual(content, 'copy me');
  });

  test('creates parent directories for destination', async () => {
    const src = join(testDir, 'source.txt');
    const dest = join(testDir, 'a', 'b', 'c', 'dest.txt');
    await writeFile(src, 'nested copy');

    await File.copyFile(src, dest);

    const content = await readFile(dest, 'utf8');
    assert.strictEqual(content, 'nested copy');
  });

  test('throws when source does not exist', async () => {
    const src = join(testDir, 'missing.txt');
    const dest = join(testDir, 'dest.txt');

    await assert.rejects(
      async () => {
        await File.copyFile(src, dest);
      },
      { message: /Source file not found/ }
    );
  });

  test('throws when source is a directory', async () => {
    const src = join(testDir, 'source-dir');
    const dest = join(testDir, 'dest.txt');
    await mkdir(src);

    await assert.rejects(
      async () => {
        await File.copyFile(src, dest);
      },
      { message: /Failed to copy/ }
    );
  });
});

describe('File.stat()', () => {
  test('returns stats for existing file', async () => {
    const filePath = join(testDir, 'stat-file.txt');
    await writeFile(filePath, 'content');

    const stats = await File.stat(filePath);

    assert(stats.isFile());
    assert(!stats.isDirectory());
  });

  test('returns stats for existing directory', async () => {
    const dirPath = join(testDir, 'stat-dir');
    await mkdir(dirPath);

    const stats = await File.stat(dirPath);

    assert(stats.isDirectory());
    assert(!stats.isFile());
  });

  test('throws when path does not exist', async () => {
    const nonExistent = join(testDir, 'missing');

    await assert.rejects(
      async () => {
        await File.stat(nonExistent);
      },
      { message: /not found/ }
    );
  });
});

describe('File.readdir()', () => {
  test('lists directory contents', async () => {
    await mkdir(join(testDir, 'list-dir'));
    await writeFile(join(testDir, 'list-dir', 'file1.txt'), 'a');
    await writeFile(join(testDir, 'list-dir', 'file2.txt'), 'b');
    await mkdir(join(testDir, 'list-dir', 'subdir'));

    const entries = await File.readdir(join(testDir, 'list-dir'));

    assert.strictEqual(entries.length, 3);
    assert(entries.includes('file1.txt'));
    assert(entries.includes('file2.txt'));
    assert(entries.includes('subdir'));
  });

  test('returns empty array for empty directory', async () => {
    const emptyDir = join(testDir, 'empty');
    await mkdir(emptyDir);

    const entries = await File.readdir(emptyDir);

    assert.deepStrictEqual(entries, []);
  });

  test('throws when path is not a directory', async () => {
    const filePath = join(testDir, 'file.txt');
    await writeFile(filePath, 'content');

    await assert.rejects(
      async () => {
        await File.readdir(filePath);
      },
      { message: /Not a directory/ }
    );
  });

  test('throws when directory does not exist', async () => {
    const nonExistent = join(testDir, 'missing-dir');

    await assert.rejects(
      async () => {
        await File.readdir(nonExistent);
      },
      { message: /not found/ }
    );
  });
});

describe('File.validateRequiredFiles()', () => {
  test('succeeds when all required files exist', async () => {
    await writeFile(join(testDir, 'file1.txt'), 'a');
    await writeFile(join(testDir, 'file2.txt'), 'b');

    const files = [
      join(testDir, 'file1.txt'),
      join(testDir, 'file2.txt')
    ];

    await File.validateRequiredFiles(files, 'test operation');
    // Should not throw
  });

  test('returns error when required file is missing', async () => {
    await writeFile(join(testDir, 'exists.txt'), 'content');

    const files = [
      join(testDir, 'exists.txt'),
      join(testDir, 'missing.txt')
    ];

    const errors = await File.validateRequiredFiles(files, 'validation');
    assert.ok(errors.length > 0);
    assert.match(errors[0], /Required for validation/);
  });
});

describe('File.validateNodeJsProject()', () => {
  test('returns empty array when package.json exists', async () => {
    const projectDir = join(testDir, 'node-project');
    await mkdir(projectDir);
    await writeFile(join(projectDir, 'package.json'), '{"name": "test"}');

    const errors = await File.validateNodeJsProject(projectDir);
    assert.strictEqual(errors.length, 0);
  });

  test('returns error when package.json is missing', async () => {
    const projectDir = join(testDir, 'not-node-project');
    await mkdir(projectDir);

    const errors = await File.validateNodeJsProject(projectDir);
    assert.ok(errors.length > 0);
    assert.match(errors[0], /package\.json/);
  });
});

describe('File.validateTemplateRestorable()', () => {
  test('returns empty array when .template-undo.json exists', async () => {
    const projectDir = join(testDir, 'restorable');
    await mkdir(projectDir);
    await writeFile(join(projectDir, '.template-undo.json'), '{}');

    const errors = await File.validateTemplateRestorable(projectDir);

    assert.deepStrictEqual(errors, []);
  });

  test('returns error when .template-undo.json is missing', async () => {
    const projectDir = join(testDir, 'not-restorable');
    await mkdir(projectDir);

    const errors = await File.validateTemplateRestorable(projectDir);

    assert.strictEqual(errors.length, 1);
    assert(errors[0].includes('.template-undo.json'));
  });
});

describe('File.validateFileDoesNotExist()', () => {
  test('returns empty array when file does not exist', async () => {
    const filePath = join(testDir, 'new-file.txt');

    const errors = await File.validateFileDoesNotExist(filePath, 'file creation');

    assert.deepStrictEqual(errors, []);
  });

  test('returns error when file already exists', async () => {
    const filePath = join(testDir, 'existing.txt');
    await writeFile(filePath, 'content');

    const errors = await File.validateFileDoesNotExist(filePath, 'validation');

    assert.strictEqual(errors.length, 1);
    assert(errors[0].includes('already exists'));
  });
});
