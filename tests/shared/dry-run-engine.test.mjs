#!/usr/bin/env node

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { DryRunEngine } from '../../bin/create-scaffold/modules/dry-run-engine.mjs';

// Mock CacheManager for testing
class MockCacheManager {
  constructor() {
    this.cache = new Map();
    this.getCachedRepoCalls = [];
    this.populateCacheCalls = [];
  }

  async getCachedRepo(url, branch) {
    const key = `${url}#${branch}`;
    this.getCachedRepoCalls.push({ url, branch });
    return this.cache.get(key) || null;
  }

  async populateCache(url, branch) {
    const key = `${url}#${branch}`;
    this.populateCacheCalls.push({ url, branch });
    const cachePath = path.join(tmpdir(), `cache-${Date.now()}-${Math.random()}`);
    await fs.promises.mkdir(cachePath, { recursive: true });
    this.cache.set(key, cachePath);
    return cachePath;
  }
}

// Mock Logger for testing
class MockLogger {
  constructor() {
    this.operations = [];
    this.warnings = [];
  }

  async logOperation(operation, data) {
    this.operations.push({ operation, data });
  }

  warn(message) {
    this.warnings.push(message);
  }
}

describe('DryRunEngine', () => {
  describe('constructor', () => {
    it('creates instance with cache manager and logger', () => {
      const mockCache = new MockCacheManager();
      const mockLogger = new MockLogger();
      const engine = new DryRunEngine(mockCache, mockLogger);
      assert.strictEqual(engine.cacheManager, mockCache);
      assert.strictEqual(engine.logger, mockLogger);
    });

    it('creates instance without logger', () => {
      const mockCache = new MockCacheManager();
      const engine = new DryRunEngine(mockCache);
      assert.strictEqual(engine.cacheManager, mockCache);
      assert.strictEqual(engine.logger, undefined);
    });
  });

  describe('previewScaffolding', () => {
    it('previews scaffolding from repository URL', async () => {
      const mockCache = new MockCacheManager();
      const mockLogger = new MockLogger();
      const engine = new DryRunEngine(mockCache, mockLogger);

      // Create a temporary template directory with template.json
      const tempDir = path.join(tmpdir(), `template-${Date.now()}`);
      fs.mkdirSync(tempDir, { recursive: true });
      fs.mkdirSync(path.join(tempDir, 'template-name'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'template-name', 'template.json'), '{"name": "test-template", "description": "A test template", "version": "1.0.0"}');
      fs.writeFileSync(path.join(tempDir, 'template-name', 'package.json'), '{"name": "test"}');

      // Mock cache to return our temp directory
      mockCache.cache.set('https://github.com/user/repo#main', tempDir);

      const result = await engine.previewScaffolding(
        'https://github.com/user/repo',
        'main',
        'template-name',
        '/target/project'
      );

      assert.strictEqual(result.templatePath, path.join(tempDir, 'template-name'));
      assert.strictEqual(result.projectDir, '/target/project');
      assert(result.metadata);
      assert(Array.isArray(result.files));
      assert(Array.isArray(result.directories));
      assert(Array.isArray(result.placeholders));
      assert(Array.isArray(result.operations));
      assert(result.summary);
      assert.strictEqual(typeof result.summary.fileCount, 'number');
      assert.strictEqual(typeof result.summary.directoryCount, 'number');

      // Check that logger was called
      assert(mockLogger.operations.length > 0);
      assert(mockLogger.operations.some(op => op.operation === 'dry_run_preview'));

      // Cleanup
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('handles missing cached repository gracefully', async () => {
      const mockCache = new MockCacheManager();
      const mockLogger = new MockLogger();
      const engine = new DryRunEngine(mockCache, mockLogger);

      // This should fail when the repository is not cached
      await assert.rejects(
        async () => {
          await engine.previewScaffolding(
            'https://github.com/user/repo',
            'main',
            'template-name',
            '/target/project'
          );
        },
        /Repository https:\/\/github\.com\/user\/repo \(main\) is not cached/
      );
    });

    it('works without logger', async () => {
      const mockCache = new MockCacheManager();
      const engine = new DryRunEngine(mockCache);

      // Create a temporary template directory
      const tempDir = path.join(tmpdir(), `template-${Date.now()}`);
      fs.mkdirSync(tempDir, { recursive: true });
      fs.mkdirSync(path.join(tempDir, 'template-name'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'template-name', 'template.json'), '{"name": "test", "description": "Test template"}');

      mockCache.cache.set('https://github.com/user/repo#main', tempDir);

      const result = await engine.previewScaffolding(
        'https://github.com/user/repo',
        'main',
        'template-name',
        '/target/project'
      );

      assert(result);
      assert(result.files.length >= 1); // At least template.json

      // Cleanup
      fs.rmSync(tempDir, { recursive: true, force: true });
    });
  });

  describe('previewScaffoldingFromPath', () => {
    it('previews scaffolding from local path', async () => {
      const mockCache = new MockCacheManager();
      const mockLogger = new MockLogger();
      const engine = new DryRunEngine(mockCache, mockLogger);

      // Create a temporary template directory structure
      const tempDir = path.join(tmpdir(), `template-${Date.now()}`);
      fs.mkdirSync(tempDir, { recursive: true });
      fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'template.json'), '{"name": "test-template", "description": "Test template", "version": "1.0.0"}');
      fs.writeFileSync(path.join(tempDir, 'package.json'), '{"name": "test"}');
      fs.writeFileSync(path.join(tempDir, 'src', 'index.js'), 'console.log("{{NAME}}");');
      fs.writeFileSync(path.join(tempDir, 'README.md'), '# {{NAME}}');

      const result = await engine.previewScaffoldingFromPath(tempDir, '/target/project');

      assert.strictEqual(result.templatePath, tempDir);
      assert.strictEqual(result.projectDir, '/target/project');
      assert(result.metadata);
      assert.strictEqual(result.files.length, 4); // template.json, package.json, src/index.js, README.md
      assert.strictEqual(result.directories.length, 1); // src/
      assert(result.placeholders.includes('NAME'));
      assert(result.operations.length > 0);

      // Check operations structure
      const fileOps = result.operations.filter(op => op.type === 'file_copy');
      const dirOps = result.operations.filter(op => op.type === 'directory_create');
      assert.strictEqual(fileOps.length, 4);
      assert.strictEqual(dirOps.length, 1);

      // Cleanup
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('accepts pre-loaded metadata', async () => {
      const mockCache = new MockCacheManager();
      const engine = new DryRunEngine(mockCache);

      // Create a temporary template directory
      const tempDir = path.join(tmpdir(), `template-${Date.now()}`);
      fs.mkdirSync(tempDir, { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'package.json'), '{"name": "test"}');

      const customMetadata = {
        name: 'custom-template',
        description: 'Custom description',
        version: '2.0.0'
      };

      const result = await engine.previewScaffoldingFromPath(tempDir, '/target/project', customMetadata);

      assert.strictEqual(result.metadata.name, 'custom-template');
      assert.strictEqual(result.metadata.version, '2.0.0');

      // Cleanup
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('handles non-existent template path', async () => {
      const mockCache = new MockCacheManager();
      const engine = new DryRunEngine(mockCache);

      await assert.rejects(
        async () => {
          await engine.previewScaffoldingFromPath('/non/existent/path', '/target/project');
        },
        /Template directory not found/
      );
    });

    it('ignores standard ignored files and directories', async () => {
      const mockCache = new MockCacheManager();
      const engine = new DryRunEngine(mockCache);

      // Create a temporary template directory with ignored files
      const tempDir = path.join(tmpdir(), `template-${Date.now()}`);
      fs.mkdirSync(tempDir, { recursive: true });
      fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
      fs.mkdirSync(path.join(tempDir, 'node_modules'), { recursive: true });
      fs.mkdirSync(path.join(tempDir, '.git'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'template.json'), '{"name": "test", "description": "Test template"}');
      fs.writeFileSync(path.join(tempDir, 'package.json'), '{"name": "test"}');
      fs.writeFileSync(path.join(tempDir, 'src', 'index.js'), 'console.log("hello");');
      fs.writeFileSync(path.join(tempDir, 'node_modules', 'dep.js'), 'module.exports = {};');
      fs.writeFileSync(path.join(tempDir, '.git', 'config'), '[core]');
      fs.writeFileSync(path.join(tempDir, '.DS_Store'), 'ignored file');

      const result = await engine.previewScaffoldingFromPath(tempDir, '/target/project');

      // Should only include template.json, package.json, src/index.js, node_modules/dep.js, .DS_Store
      // .git should be ignored
      assert.strictEqual(result.files.length, 5);
      assert.strictEqual(result.directories.length, 2); // src/, node_modules/
      assert(result.ignored.length > 0);

      // Cleanup
      fs.rmSync(tempDir, { recursive: true, force: true });
    });
  });

  describe('collectTemplateFiles', () => {
    it('recursively collects files and directories', () => {
      const mockCache = new MockCacheManager();
      const engine = new DryRunEngine(mockCache);

      // Create a temporary template directory structure
      const tempDir = path.join(tmpdir(), `template-${Date.now()}`);
      fs.mkdirSync(tempDir, { recursive: true });
      fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
      fs.mkdirSync(path.join(tempDir, 'src', 'components'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'package.json'), '{"name": "test"}');
      fs.writeFileSync(path.join(tempDir, 'src', 'index.js'), 'console.log("hello");');
      fs.writeFileSync(path.join(tempDir, 'src', 'components', 'Button.js'), 'export default Button;');

      const ignoreSet = new Set();
      const results = engine.collectTemplateFiles(tempDir, ignoreSet);

      const files = results.filter(item => item.type === 'file');
      const directories = results.filter(item => item.type === 'directory');

      assert.strictEqual(files.length, 3);
      assert.strictEqual(directories.length, 2); // src/, src/components/

      // Check file paths are absolute
      assert(files.every(f => path.isAbsolute(f.path)));
      assert(directories.every(d => path.isAbsolute(d.path)));

      // Check relative paths
      assert(files.some(f => f.relative === 'package.json'));
      assert(files.some(f => f.relative === 'src/index.js'));
      assert(files.some(f => f.relative === 'src/components/Button.js'));

      // Cleanup
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('respects ignore set', () => {
      const mockCache = new MockCacheManager();
      const engine = new DryRunEngine(mockCache);

      // Create a temporary template directory
      const tempDir = path.join(tmpdir(), `template-${Date.now()}`);
      fs.mkdirSync(tempDir, { recursive: true });
      fs.mkdirSync(path.join(tempDir, '.git'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'package.json'), '{"name": "test"}');
      fs.writeFileSync(path.join(tempDir, '.git', 'config'), '[core]');

      const ignoreSet = new Set(['.git']);
      const results = engine.collectTemplateFiles(tempDir, ignoreSet);

      // Should only include package.json, not .git files
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].type, 'file');
      assert.strictEqual(results[0].relative, 'package.json');

      // Cleanup
      fs.rmSync(tempDir, { recursive: true, force: true });
    });
  });

  describe('extractPlaceholders', () => {
    it('extracts placeholders from files', () => {
      const mockCache = new MockCacheManager();
      const mockLogger = new MockLogger();
      const engine = new DryRunEngine(mockCache, mockLogger);

      // Create temporary files with placeholders
      const tempDir = path.join(tmpdir(), `template-${Date.now()}`);
      fs.mkdirSync(tempDir, { recursive: true });

      const file1 = path.join(tempDir, 'file1.js');
      const file2 = path.join(tempDir, 'file2.md');
      const file3 = path.join(tempDir, 'file3.txt');

      fs.writeFileSync(file1, 'console.log("{{NAME}} and {{VERSION}}");');
      fs.writeFileSync(file2, '# {{TITLE}}\n{{DESCRIPTION}}');
      fs.writeFileSync(file3, 'No placeholders here');

      const files = [
        { path: file1 },
        { path: file2 },
        { path: file3 }
      ];

      const placeholders = engine.extractPlaceholders(files, tempDir);

      assert.deepStrictEqual(placeholders.sort(), ['DESCRIPTION', 'NAME', 'TITLE', 'VERSION']);

      // Cleanup
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('handles files that cannot be read', () => {
      const mockCache = new MockCacheManager();
      const mockLogger = new MockLogger();
      const engine = new DryRunEngine(mockCache, mockLogger);

      const files = [
        { path: '/non/existent/file.js' }
      ];

      const placeholders = engine.extractPlaceholders(files, '/template/path');

      assert.deepStrictEqual(placeholders, []);
      assert(mockLogger.warnings.length > 0);
      assert(mockLogger.warnings[0].includes('Could not read file'));
    });

    it('handles empty file list', () => {
      const mockCache = new MockCacheManager();
      const engine = new DryRunEngine(mockCache);

      const placeholders = engine.extractPlaceholders([], '/template/path');

      assert.deepStrictEqual(placeholders, []);
    });

    it('handles duplicate placeholders', () => {
      const mockCache = new MockCacheManager();
      const engine = new DryRunEngine(mockCache);

      // Create temporary files
      const tempDir = path.join(tmpdir(), `template-${Date.now()}`);
      fs.mkdirSync(tempDir, { recursive: true });

      const file1 = path.join(tempDir, 'file1.js');
      const file2 = path.join(tempDir, 'file2.js');

      fs.writeFileSync(file1, '{{NAME}} {{VERSION}}');
      fs.writeFileSync(file2, '{{NAME}} {{DESCRIPTION}}');

      const files = [
        { path: file1 },
        { path: file2 }
      ];

      const placeholders = engine.extractPlaceholders(files, tempDir);

      // Should deduplicate and sort
      assert.deepStrictEqual(placeholders, ['DESCRIPTION', 'NAME', 'VERSION']);

      // Cleanup
      fs.rmSync(tempDir, { recursive: true, force: true });
    });
  });

  describe('validatePreview', () => {
    it('validates complete preview structure', () => {
      const mockCache = new MockCacheManager();
      const engine = new DryRunEngine(mockCache);

      const validPreview = {
        templatePath: '/template',
        projectDir: '/project',
        metadata: { name: 'test' },
        files: [
          { source: '/template/file1.js', relative: 'file1.js', target: '/project/file1.js' }
        ],
        directories: [
          { source: '/template/src', relative: 'src', target: '/project/src' }
        ],
        ignored: ['.git'],
        placeholders: ['NAME'],
        operations: [
          { type: 'directory_create', path: '/project/src', relativePath: 'src' },
          { type: 'file_copy', source: '/template/file1.js', destination: '/project/file1.js', relativePath: 'file1.js' }
        ],
        summary: {
          fileCount: 1,
          directoryCount: 1,
          totalOperations: 2
        }
      };

      const errors = engine.validatePreview(validPreview);
      assert.deepStrictEqual(errors, []);
    });

    it('detects missing required properties', () => {
      const mockCache = new MockCacheManager();
      const engine = new DryRunEngine(mockCache);

      const invalidPreview = {
        // Missing templatePath, projectDir, metadata
        files: [],
        directories: [],
        ignored: [],
        placeholders: []
      };

      const errors = engine.validatePreview(invalidPreview);
      assert(errors.includes('Missing templatePath'));
      assert(errors.includes('Missing projectDir'));
      assert(errors.includes('Missing metadata'));
    });

    it('validates file entries', () => {
      const mockCache = new MockCacheManager();
      const engine = new DryRunEngine(mockCache);

      const invalidPreview = {
        templatePath: '/template',
        projectDir: '/project',
        metadata: { name: 'test' },
        files: [
          { source: '/template/file1.js' }, // Missing relative and target
          { relative: 'file2.js', target: '/project/file2.js' }, // Missing source
          {} // Completely empty
        ],
        directories: [],
        ignored: [],
        placeholders: []
      };

      const errors = engine.validatePreview(invalidPreview);
      assert.strictEqual(errors.length, 3); // One error for each invalid file entry
      assert(errors.every(error => error.startsWith('Invalid file entry')));
    });

    it('validates directory entries', () => {
      const mockCache = new MockCacheManager();
      const engine = new DryRunEngine(mockCache);

      const invalidPreview = {
        templatePath: '/template',
        projectDir: '/project',
        metadata: { name: 'test' },
        files: [],
        directories: [
          { source: '/template/src' }, // Missing relative and target
          { relative: 'lib', target: '/project/lib' } // Missing source
        ],
        ignored: [],
        placeholders: []
      };

      const errors = engine.validatePreview(invalidPreview);
      assert.strictEqual(errors.length, 2); // One error for each invalid directory entry
      assert(errors.every(error => error.startsWith('Invalid directory entry')));
    });
  });
});
