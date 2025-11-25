#!/usr/bin/env node

/**
 * L3 Integration Tests for TemplateResolver
 *
 * LAYER CLASSIFICATION: L3 (Orchestrator)
 * The TemplateResolver is an L3 orchestrator that coordinates:
 * - URL parsing and validation (L2 logic)
 * - Cache management (L3 coordination with CacheManager)
 * - Git operations (L1 wrapped)
 *
 * TEST DOUBLE USAGE:
 * TestCacheManager is a test double that implements the same interface as
 * CacheManager but with controlled behavior. This follows the zero-mock
 * philosophy because:
 * 1. It uses the constructor's dependency injection interface
 * 2. It creates REAL temp directories (not fake paths)
 * 3. It tests the TemplateResolver's CONTRACT, not implementation
 *
 * For tests requiring real Git operations, see template-resolver.git.test.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { TemplateResolver } from '../../bin/create-scaffold/modules/template-resolver.mjs';
import { ContextualError } from '../../lib/error-handler.mjs';

/**
 * Test double for CacheManager that uses real filesystem but controlled behavior.
 * Implements the CacheManager interface for testing TemplateResolver.
 */
class TestCacheManager {
  constructor() {
    this.cache = new Map();
    this.populateCalls = [];
  }

  async getCachedRepo(url, branch) {
    const key = `${url}#${branch}`;
    return this.cache.get(key) || null;
  }

  async populateCache(url, branch) {
    const key = `${url}#${branch}`;
    this.populateCalls.push({ url, branch });
    const cachePath = path.join(tmpdir(), `cache-${Date.now()}-${Math.random()}`);
    await fs.mkdir(cachePath, { recursive: true });
    this.cache.set(key, cachePath);
    return cachePath;
  }
}

describe('TemplateResolver', () => {
  describe('constructor', () => {
    it('creates instance with default cache manager', () => {
      const resolver = new TemplateResolver();
      assert(resolver.cacheManager);
      assert.deepStrictEqual(resolver.config, {});
    });

    it('creates instance with custom cache manager and config', () => {
      const testCache = new TestCacheManager();
      const config = { defaults: { branch: 'main' } };
      const resolver = new TemplateResolver(testCache, config);
      assert.strictEqual(resolver.cacheManager, testCache);
      assert.strictEqual(resolver.config, config);
    });
  });

  describe('resolveRegistryAlias', () => {
    it('returns original URL when no registries configured', () => {
      const resolver = new TemplateResolver();
      const result = resolver.resolveRegistryAlias('user/repo');
      assert.strictEqual(result, 'user/repo');
    });

    it('returns original URL when registries is not an object', () => {
      const resolver = new TemplateResolver(null, { defaults: { registries: 'invalid' } });
      const result = resolver.resolveRegistryAlias('user/repo');
      assert.strictEqual(result, 'user/repo');
    });

    it('returns original URL when no slash in template URL', () => {
      const config = {
        defaults: {
          registries: {
            'myregistry': { 'template1': 'https://github.com/user/repo.git' }
          }
        }
      };
      const resolver = new TemplateResolver(null, config);
      const result = resolver.resolveRegistryAlias('template1');
      assert.strictEqual(result, 'template1');
    });

    it('returns original URL when registry does not exist', () => {
      const config = {
        defaults: {
          registries: {
            'myregistry': { 'template1': 'https://github.com/user/repo.git' }
          }
        }
      };
      const resolver = new TemplateResolver(null, config);
      const result = resolver.resolveRegistryAlias('nonexistent/template1');
      assert.strictEqual(result, 'nonexistent/template1');
    });

    it('returns original URL when template does not exist in registry', () => {
      const config = {
        defaults: {
          registries: {
            'myregistry': { 'template1': 'https://github.com/user/repo.git' }
          }
        }
      };
      const resolver = new TemplateResolver(null, config);
      const result = resolver.resolveRegistryAlias('myregistry/nonexistent');
      assert.strictEqual(result, 'myregistry/nonexistent');
    });

    it('resolves registry alias successfully', () => {
      const config = {
        defaults: {
          registries: {
            'myregistry': { 'template1': 'https://github.com/user/repo.git' }
          }
        }
      };
      const resolver = new TemplateResolver(null, config);
      const result = resolver.resolveRegistryAlias('myregistry/template1');
      assert.strictEqual(result, 'https://github.com/user/repo.git');
    });

    it('trims whitespace from resolved URL', () => {
      const config = {
        defaults: {
          registries: {
            'myregistry': { 'template1': '  https://github.com/user/repo.git  ' }
          }
        }
      };
      const resolver = new TemplateResolver(null, config);
      const result = resolver.resolveRegistryAlias('myregistry/template1');
      assert.strictEqual(result, 'https://github.com/user/repo.git');
    });
  });

  describe('validateTemplateUrl', () => {
    it('throws on null or undefined URL', () => {
      const resolver = new TemplateResolver();
      assert.throws(() => resolver.validateTemplateUrl(null), ContextualError);
      assert.throws(() => resolver.validateTemplateUrl(undefined), ContextualError);
      assert.throws(() => resolver.validateTemplateUrl(''), ContextualError);
    });

    it('throws on non-string URL', () => {
      const resolver = new TemplateResolver();
      assert.throws(() => resolver.validateTemplateUrl(123), ContextualError);
      assert.throws(() => resolver.validateTemplateUrl({}), ContextualError);
    });

    it('throws on null bytes in URL', () => {
      const resolver = new TemplateResolver();
      assert.throws(() => resolver.validateTemplateUrl('user/repo\0'), ContextualError);
    });

    it('throws on command injection characters', () => {
      const resolver = new TemplateResolver();
      assert.throws(() => resolver.validateTemplateUrl('user/repo;rm -rf /'), ContextualError);
      assert.throws(() => resolver.validateTemplateUrl('user/repo|cat /etc/passwd'), ContextualError);
      assert.throws(() => resolver.validateTemplateUrl('user/repo&echo bad'), ContextualError);
      assert.throws(() => resolver.validateTemplateUrl('user/repo`whoami`'), ContextualError);
      assert.throws(() => resolver.validateTemplateUrl('user/repo$(rm -rf /)'), ContextualError);
      assert.throws(() => resolver.validateTemplateUrl('user/repo${USER}'), ContextualError);
    });

    it('validates local paths', () => {
      const resolver = new TemplateResolver();
      assert.strictEqual(resolver.validateTemplateUrl('./local/path'), './local/path');
      assert.strictEqual(resolver.validateTemplateUrl('~/home/path'), '~/home/path');
    });

    it('throws on path traversal in local paths', () => {
      const resolver = new TemplateResolver();
      assert.throws(() => resolver.validateTemplateUrl('../../../etc/passwd'), ContextualError);
    });

    it('validates registry URLs', () => {
      const resolver = new TemplateResolver();
      assert.strictEqual(resolver.validateTemplateUrl('registry/template'), 'registry/template');
      assert.strictEqual(resolver.validateTemplateUrl('official/template'), 'official/template');
      assert.strictEqual(resolver.validateTemplateUrl('community/template'), 'community/template');
      assert.strictEqual(resolver.validateTemplateUrl('private/template'), 'private/template');
    });

    it('validates GitHub shorthand', () => {
      const resolver = new TemplateResolver();
      assert.strictEqual(resolver.validateTemplateUrl('user/repo'), 'user/repo');
      assert.strictEqual(resolver.validateTemplateUrl('user/repo#branch'), 'user/repo#branch');
    });

    it('validates full URLs', () => {
      const resolver = new TemplateResolver();
      assert.strictEqual(resolver.validateTemplateUrl('https://github.com/user/repo'), 'https://github.com/user/repo');
      assert.strictEqual(resolver.validateTemplateUrl('https://gitlab.com/user/repo'), 'https://gitlab.com/user/repo');
    });

    it('throws on invalid URL format', () => {
      const resolver = new TemplateResolver();
      assert.throws(() => resolver.validateTemplateUrl('invalid-url-format'), ContextualError);
    });
  });

  describe('parseTemplateUrl', () => {
    it('parses local paths', () => {
      const resolver = new TemplateResolver();
      const result = resolver.parseTemplateUrl('./local/path');
      assert.deepStrictEqual(result, {
        type: 'local',
        path: './local/path',
        parameters: []
      });
    });

    it('parses absolute local paths', () => {
      const resolver = new TemplateResolver();
      const result = resolver.parseTemplateUrl('/absolute/path');
      assert.deepStrictEqual(result, {
        type: 'local',
        path: '/absolute/path',
        parameters: []
      });
    });

    it('parses home directory paths', () => {
      const resolver = new TemplateResolver();
      const result = resolver.parseTemplateUrl('~/home/path');
      assert.deepStrictEqual(result, {
        type: 'local',
        path: '~/home/path',
        parameters: []
      });
    });

    it('parses full URLs', () => {
      const resolver = new TemplateResolver();
      const result = resolver.parseTemplateUrl('https://github.com/user/repo');
      assert.deepStrictEqual(result, {
        type: 'github-repo',
        owner: 'user',
        repo: 'repo',
        subpath: '',
        parameters: []
      });
    });

    it('parses GitHub URLs with branches', () => {
      const resolver = new TemplateResolver();
      const result = resolver.parseTemplateUrl('https://github.com/user/repo/tree/main');
      assert.deepStrictEqual(result, {
        type: 'github-branch',
        owner: 'user',
        repo: 'repo',
        branch: 'main',
        subpath: '',
        parameters: []
      });
    });

    it('parses GitHub URLs with subpaths', () => {
      const resolver = new TemplateResolver();
      const result = resolver.parseTemplateUrl('https://github.com/user/repo/tree/main/templates');
      assert.deepStrictEqual(result, {
        type: 'github-branch',
        owner: 'user',
        repo: 'repo',
        branch: 'main',
        subpath: 'templates',
        parameters: []
      });
    });

    it('parses GitHub shorthand', () => {
      const resolver = new TemplateResolver();
      const result = resolver.parseTemplateUrl('user/repo');
      assert.deepStrictEqual(result, {
        type: 'github-shorthand',
        owner: 'user',
        repo: 'repo',
        subpath: '',
        branch: null,
        parameters: []
      });
    });

    it('parses GitHub shorthand with branch', () => {
      const resolver = new TemplateResolver();
      const result = resolver.parseTemplateUrl('user/repo#develop');
      assert.deepStrictEqual(result, {
        type: 'github-shorthand',
        owner: 'user',
        repo: 'repo',
        subpath: '',
        branch: 'develop',
        parameters: []
      });
    });

    it('parses GitHub shorthand with subpath', () => {
      const resolver = new TemplateResolver();
      const result = resolver.parseTemplateUrl('user/repo/templates');
      assert.deepStrictEqual(result, {
        type: 'github-shorthand',
        owner: 'user',
        repo: 'repo',
        subpath: 'templates',
        branch: null,
        parameters: []
      });
    });

    it('parses GitHub shorthand with branch and subpath', () => {
      const resolver = new TemplateResolver();
      const result = resolver.parseTemplateUrl('user/repo#develop/templates');
      assert.deepStrictEqual(result, {
        type: 'github-shorthand',
        owner: 'user',
        repo: 'repo',
        subpath: 'templates',
        branch: 'develop',
        parameters: []
      });
    });

    it('parses registry URLs with default namespace', () => {
      const resolver = new TemplateResolver();
      const result = resolver.parseTemplateUrl('registry/template');
      assert.deepStrictEqual(result, {
        type: 'registry',
        namespace: 'official',
        template: 'template',
        parameters: []
      });
    });

    it('parses registry URLs with explicit namespace', () => {
      const resolver = new TemplateResolver();
      const result = resolver.parseTemplateUrl('registry/namespace/template');
      assert.deepStrictEqual(result, {
        type: 'registry',
        namespace: 'namespace',
        template: 'template',
        parameters: []
      });
    });

    it('parses tarball URLs', () => {
      const resolver = new TemplateResolver();
      const result = resolver.parseTemplateUrl('https://example.com/template.tar.gz');
      assert.deepStrictEqual(result, {
        type: 'tarball',
        url: 'https://example.com/template.tar.gz',
        parameters: []
      });
    });

    it('parses generic URLs', () => {
      const resolver = new TemplateResolver();
      const result = resolver.parseTemplateUrl('https://example.com/repo?param=value');
      assert.deepStrictEqual(result, {
        type: 'url',
        protocol: 'https:',
        hostname: 'example.com',
        pathname: '/repo',
        searchParams: { param: 'value' },
        parameters: []
      });
    });

    it('throws on unsupported URL format', () => {
      const resolver = new TemplateResolver();
      assert.throws(() => resolver.parseTemplateUrl('invalid-format'), ContextualError);
    });
  });

  describe('parseGitHubUrl', () => {
    it('throws on invalid GitHub URL', () => {
      const resolver = new TemplateResolver();
      const url = new URL('https://github.com/user');
      assert.throws(() => resolver.parseGitHubUrl(url), ContextualError);
    });

    it('parses basic GitHub repo URL', () => {
      const resolver = new TemplateResolver();
      const url = new URL('https://github.com/user/repo');
      const result = resolver.parseGitHubUrl(url);
      assert.deepStrictEqual(result, {
        type: 'github-repo',
        owner: 'user',
        repo: 'repo',
        subpath: '',
        parameters: []
      });
    });

    it('parses GitHub repo URL with .git suffix', () => {
      const resolver = new TemplateResolver();
      const url = new URL('https://github.com/user/repo.git');
      const result = resolver.parseGitHubUrl(url);
      assert.deepStrictEqual(result, {
        type: 'github-repo',
        owner: 'user',
        repo: 'repo',
        subpath: '',
        parameters: []
      });
    });

    it('parses GitHub repo URL with subpath', () => {
      const resolver = new TemplateResolver();
      const url = new URL('https://github.com/user/repo/path/to/template');
      const result = resolver.parseGitHubUrl(url);
      assert.deepStrictEqual(result, {
        type: 'github-repo',
        owner: 'user',
        repo: 'repo',
        subpath: 'path/to/template',
        parameters: []
      });
    });

    it('parses GitHub branch URL', () => {
      const resolver = new TemplateResolver();
      const url = new URL('https://github.com/user/repo/tree/main');
      const result = resolver.parseGitHubUrl(url);
      assert.deepStrictEqual(result, {
        type: 'github-branch',
        owner: 'user',
        repo: 'repo',
        branch: 'main',
        subpath: '',
        parameters: []
      });
    });

    it('parses GitHub branch URL with subpath', () => {
      const resolver = new TemplateResolver();
      const url = new URL('https://github.com/user/repo/tree/feature/templates');
      const result = resolver.parseGitHubUrl(url);
      assert.deepStrictEqual(result, {
        type: 'github-branch',
        owner: 'user',
        repo: 'repo',
        branch: 'feature',
        subpath: 'templates',
        parameters: []
      });
    });

    it('parses GitHub archive URLs', () => {
      const resolver = new TemplateResolver();
      const url = new URL('https://github.com/user/repo/archive/refs/tags/v1.0.0.zip');
      const result = resolver.parseGitHubUrl(url);
      assert.deepStrictEqual(result, {
        type: 'github-archive',
        owner: 'user',
        repo: 'repo',
        archiveUrl: 'https://github.com/user/repo/archive/refs/tags/v1.0.0.zip',
        parameters: []
      });
    });
  });

  describe('resolveToPath', () => {
    it('resolves local paths', async () => {
      const resolver = new TemplateResolver();
      const parsed = { type: 'local', path: '/tmp/test' };
      const result = await resolver.resolveToPath(parsed);
      assert.strictEqual(result, path.resolve('/tmp/test'));
    });

    it('resolves GitHub shorthand URLs', async () => {
      const testCache = new TestCacheManager();
      const resolver = new TemplateResolver(testCache);
      const parsed = {
        type: 'github-shorthand',
        owner: 'user',
        repo: 'repo',
        subpath: '',
        branch: null
      };

      const result = await resolver.resolveToPath(parsed, { branch: 'main' });
      assert(result.startsWith(tmpdir()));
      assert(testCache.populateCalls.length > 0);
    });

    it('resolves GitHub shorthand URLs with subpath', async () => {
      const testCache = new TestCacheManager();
      const resolver = new TemplateResolver(testCache);
      const parsed = {
        type: 'github-shorthand',
        owner: 'user',
        repo: 'repo',
        subpath: 'templates',
        branch: 'develop'
      };

      const result = await resolver.resolveToPath(parsed, { branch: 'main' });
      assert(result.includes('templates'));
    });

    it('resolves GitHub repo URLs', async () => {
      const testCache = new TestCacheManager();
      const resolver = new TemplateResolver(testCache);
      const parsed = {
        type: 'github-repo',
        owner: 'user',
        repo: 'repo',
        subpath: ''
      };

      const result = await resolver.resolveToPath(parsed, { branch: 'main' });
      assert(result.startsWith(tmpdir()));
    });

    it('resolves GitHub branch URLs', async () => {
      const testCache = new TestCacheManager();
      const resolver = new TemplateResolver(testCache);
      const parsed = {
        type: 'github-branch',
        owner: 'user',
        repo: 'repo',
        branch: 'feature',
        subpath: ''
      };

      const result = await resolver.resolveToPath(parsed);
      assert(result.startsWith(tmpdir()));
    });

    it('throws on unsupported URL types', async () => {
      const resolver = new TemplateResolver();
      const parsed = { type: 'unsupported' };
      await assert.rejects(
        () => resolver.resolveToPath(parsed),
        (error) => error.message.includes('Unsupported URL type')
      );
    });

    it('throws on GitHub archive URLs', async () => {
      const resolver = new TemplateResolver();
      const parsed = { type: 'github-archive' };
      await assert.rejects(
        () => resolver.resolveToPath(parsed),
        ContextualError
      );
    });

    it('throws on tarball URLs', async () => {
      const resolver = new TemplateResolver();
      const parsed = { type: 'tarball' };
      await assert.rejects(
        () => resolver.resolveToPath(parsed),
        ContextualError
      );
    });
  });

  describe('resolveRegistryUrl', () => {
    it('resolves official registry templates', async () => {
      const testCache = new TestCacheManager();
      const resolver = new TemplateResolver(testCache);
      const parsed = {
        type: 'registry',
        namespace: 'official',
        template: 'nextjs-app'
      };

      const result = await resolver.resolveRegistryUrl(parsed);
      assert(result.startsWith(tmpdir()));
    });

    it('throws on unknown namespace', async () => {
      const resolver = new TemplateResolver();
      const parsed = {
        type: 'registry',
        namespace: 'unknown',
        template: 'template'
      };

      await assert.rejects(
        () => resolver.resolveRegistryUrl(parsed),
        ContextualError
      );
    });

    it('throws on unknown template', async () => {
      const resolver = new TemplateResolver();
      const parsed = {
        type: 'registry',
        namespace: 'official',
        template: 'unknown'
      };

      await assert.rejects(
        () => resolver.resolveRegistryUrl(parsed),
        ContextualError
      );
    });
  });

  describe('extractParameters', () => {
    it('extracts parameters from search params', () => {
      const resolver = new TemplateResolver();
      const parsed = {
        searchParams: { param1: 'value1', param2: 'value2' }
      };

      const result = resolver.extractParameters(parsed);
      assert.deepStrictEqual(result, { param1: 'value1', param2: 'value2' });
    });

    it('returns empty object when no search params', () => {
      const resolver = new TemplateResolver();
      const parsed = {};

      const result = resolver.extractParameters(parsed);
      assert.deepStrictEqual(result, {});
    });
  });

  describe('loadTemplateMetadata', () => {
    it('loads metadata from template.json', async () => {
      const tempDir = path.join(tmpdir(), 'template-metadata-test');
      const templateJsonPath = path.join(tempDir, 'template.json');
      await fs.mkdir(tempDir, { recursive: true });

      const metadata = { id: 'test-template', name: 'Test Template', version: '1.0.0' };
      await fs.writeFile(templateJsonPath, JSON.stringify(metadata));

      try {
        const resolver = new TemplateResolver();
        const result = await resolver.loadTemplateMetadata(tempDir);
        assert.deepStrictEqual(result, metadata);
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('returns default metadata when template.json not found', async () => {
      const tempDir = path.join(tmpdir(), 'template-no-metadata-test');
      await fs.mkdir(tempDir, { recursive: true });

      try {
        const resolver = new TemplateResolver();
        const result = await resolver.loadTemplateMetadata(tempDir);
        assert.deepStrictEqual(result, {
          id: 'template-no-metadata-test',
          name: 'template-no-metadata-test',
          version: '1.0.0'
        });
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('returns default metadata when template.json is invalid JSON', async () => {
      const tempDir = path.join(tmpdir(), 'template-invalid-json-test');
      const templateJsonPath = path.join(tempDir, 'template.json');
      await fs.mkdir(tempDir, { recursive: true });

      await fs.writeFile(templateJsonPath, '{ invalid json }');

      try {
        const resolver = new TemplateResolver();
        const result = await resolver.loadTemplateMetadata(tempDir);
        assert.deepStrictEqual(result, {
          id: 'template-invalid-json-test',
          name: 'template-invalid-json-test',
          version: '1.0.0'
        });
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('resolveTemplate', () => {
    it('resolves template with all components', async () => {
      const testDirName = 'test-template-dir';
      const testDir = path.join(tmpdir(), testDirName);
      const templateJsonPath = path.join(testDir, 'template.json');
      await fs.mkdir(testDir, { recursive: true });

      const metadata = { id: 'test-template', name: 'Test Template', version: '1.0.0' };
      await fs.writeFile(templateJsonPath, JSON.stringify(metadata));

      const testCache = new TestCacheManager();
      const resolver = new TemplateResolver(testCache);

      try {
        // Change to the temp directory so relative paths work
        const originalCwd = process.cwd();
        process.chdir(tmpdir());

        const result = await resolver.resolveTemplate(`./${testDirName}`, { branch: 'main' });
        // The path gets resolved to the actual filesystem path
        assert(result.templatePath.endsWith(testDirName));
        assert(result.templatePath.includes('test-template-dir'));
        assert.deepStrictEqual(result.parameters, {});
        assert.deepStrictEqual(result.metadata, metadata);

        process.chdir(originalCwd);
      } finally {
        await fs.rm(testDir, { recursive: true, force: true });
      }
    });

    it('resolves registry aliases', async () => {
      const tempDir = path.join(tmpdir(), 'registry-alias-test');
      const templateJsonPath = path.join(tempDir, 'template.json');
      await fs.mkdir(tempDir, { recursive: true });

      const metadata = { id: 'local-template', name: 'Local Template', version: '1.0.0' };
      await fs.writeFile(templateJsonPath, JSON.stringify(metadata));

      const config = {
        defaults: {
          registries: {
            'registry': { 'template1': tempDir }
          }
        }
      };

      const resolver = new TemplateResolver(null, config);

      try {
        const result = await resolver.resolveTemplate('registry/template1');
        assert.strictEqual(result.templatePath, tempDir);
        assert.deepStrictEqual(result.metadata, metadata);
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });
  });
});
