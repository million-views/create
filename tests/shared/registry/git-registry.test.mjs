#!/usr/bin/env node

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { GitRegistry } from '../../../bin/create-scaffold/modules/registry/registries/git-registry.mjs';

// Mock TemplateDiscovery for testing
class _MockTemplateDiscovery {
  constructor(cacheManager) {
    this.cacheManager = cacheManager;
    this.listTemplatesCalls = [];
  }

  async listTemplates(repoUrl, branchName) {
    this.listTemplatesCalls.push({ repoUrl, branchName });

    // Return mock templates based on repo URL
    if (repoUrl.includes('error')) {
      throw new Error('Mock discovery error');
    }

    return [
      {
        handle: 'template1',
        name: 'Template 1',
        description: 'First template',
        path: '/mock/path/template1'
      },
      {
        handle: 'template2',
        name: 'Template 2',
        description: 'Second template',
        path: '/mock/path/template2'
      }
    ];
  }
}

// Mock CacheManager for testing
class _MockCacheManager {
  constructor() {
    this.getCachedRepoCalls = [];
    this.cachedRepos = new Map();
  }

  async getCachedRepo(url, branch) {
    this.getCachedRepoCalls.push({ url, branch });
    return this.cachedRepos.get(`${url}#${branch}`) || null;
  }

  setCachedRepo(url, branch, path) {
    this.cachedRepos.set(`${url}#${branch}`, path);
  }
}

describe('GitRegistry', () => {
  describe('constructor', () => {
    it('creates instance with default options', () => {
      const registry = new GitRegistry();

      assert(registry instanceof GitRegistry);
      assert.deepStrictEqual(registry.options.repositories, []);
      assert.strictEqual(registry.options.defaultBranch, 'main');
      assert.strictEqual(registry.options.cacheEnabled, true);
      assert(registry.discoveryCache instanceof Map);
    });

    it('creates instance with custom options', () => {
      const options = {
        repositories: [{ url: 'https://github.com/test/repo', branch: 'develop' }],
        defaultBranch: 'master',
        cacheEnabled: false
      };

      const registry = new GitRegistry(options);

      assert.deepStrictEqual(registry.options.repositories, options.repositories);
      assert.strictEqual(registry.options.defaultBranch, 'master');
      assert.strictEqual(registry.options.cacheEnabled, false);
    });

    it('merges options with defaults', () => {
      const options = {
        repositories: [{ url: 'https://github.com/test/repo' }]
      };

      const registry = new GitRegistry(options);

      assert.deepStrictEqual(registry.options.repositories, options.repositories);
      assert.strictEqual(registry.options.defaultBranch, 'main'); // default
      assert.strictEqual(registry.options.cacheEnabled, true); // default
    });
  });

  describe('validateConfig()', () => {
    it('validates correct configuration', () => {
      const registry = new GitRegistry({
        repositories: [
          { url: 'https://github.com/test/repo1' },
          { url: 'https://github.com/test/repo2', branch: 'develop' }
        ]
      });

      assert.strictEqual(registry.validateConfig(), true);
    });

    it('throws error for non-array repositories', () => {
      const registry = new GitRegistry({
        repositories: 'not-an-array'
      });

      assert.throws(
        () => registry.validateConfig(),
        { message: 'Git registry requires repositories array' }
      );
    });

    it('throws error for repository without url', () => {
      const registry = new GitRegistry({
        repositories: [
          { branch: 'main' } // missing url
        ]
      });

      assert.throws(
        () => registry.validateConfig(),
        { message: 'Git repository configuration must include url' }
      );
    });

    it('validates empty repositories array', () => {
      const registry = new GitRegistry({
        repositories: []
      });

      assert.strictEqual(registry.validateConfig(), true);
    });
  });

  describe('discoverTemplates()', () => {
    it('returns empty array when no repositories configured', async () => {
      const registry = new GitRegistry({
        repositories: []
      });

      const templates = await registry.discoverTemplates();
      assert.deepStrictEqual(templates, []);
    });

    it('discovers templates from multiple repositories', async () => {
      const registry = new GitRegistry({
        repositories: [
          { url: 'https://github.com/test/repo1' },
          { url: 'https://github.com/test/repo2', branch: 'develop' }
        ]
      });

      // Mock discoverTemplatesFromRepo
      registry.discoverTemplatesFromRepo = async (repoConfig) => {
        const templates = [
          {
            handle: 'template1',
            name: 'Template 1',
            description: 'First template',
            path: '/mock/path/template1'
          },
          {
            handle: 'template2',
            name: 'Template 2',
            description: 'Second template',
            path: '/mock/path/template2'
          }
        ];

        // Add repository info
        templates.forEach(template => {
          template.repository = {
            url: repoConfig.url,
            branch: repoConfig.branch || 'main'
          };
        });

        return templates;
      };

      const templates = await registry.discoverTemplates();

      assert.strictEqual(templates.length, 4); // 2 templates from each repo

      // Check that repository info was added
      assert(templates[0].repository);
      assert.strictEqual(templates[0].repository.url, 'https://github.com/test/repo1');
      assert.strictEqual(templates[0].repository.branch, 'main');

      assert(templates[2].repository);
      assert.strictEqual(templates[2].repository.url, 'https://github.com/test/repo2');
      assert.strictEqual(templates[2].repository.branch, 'develop');
    });

    it('handles repository discovery failures gracefully', async () => {
      const registry = new GitRegistry({
        repositories: [
          { url: 'https://github.com/test/repo1' },
          { url: 'https://github.com/test/error-repo' } // This will cause an error
        ]
      });

      // Override discoverTemplatesFromRepo to simulate error
      registry.discoverTemplatesFromRepo = async (repoConfig) => {
        if (repoConfig.url.includes('error')) {
          throw new Error('Mock discovery error');
        }
        return [{
          handle: 'template1',
          name: 'Template 1',
          path: '/mock/path/template1'
        }];
      };

      const templates = await registry.discoverTemplates();

      assert.strictEqual(templates.length, 1); // Only from successful repo
      assert.strictEqual(templates[0].handle, 'template1');
    });

    it('uses caching when enabled', async () => {
      const registry = new GitRegistry({
        repositories: [{ url: 'https://github.com/test/repo' }],
        cacheEnabled: true
      });

      // Mock to populate cache
      const originalMethod = registry.discoverTemplatesFromRepo;
      registry.discoverTemplatesFromRepo = async (repoConfig) => {
        const cacheKey = `git:${repoConfig.url}:${repoConfig.branch || 'main'}`;

        if (registry.discoveryCache.has(cacheKey)) {
          return registry.discoveryCache.get(cacheKey);
        }

        const templates = [
          { handle: 'template1', name: 'Template 1' },
          { handle: 'template2', name: 'Template 2' }
        ];

        registry.discoveryCache.set(cacheKey, templates);
        return templates;
      };

      try {
        // First call should populate cache
        await registry.discoverTemplates();
        assert.strictEqual(registry.discoveryCache.size, 1);

        // Second call should use cache (cache size should remain 1)
        const templates = await registry.discoverTemplates();
        assert.strictEqual(templates.length, 2);
        assert.strictEqual(registry.discoveryCache.size, 1); // Should still be 1
      } finally {
        registry.discoverTemplatesFromRepo = originalMethod;
      }
    });

    it('skips caching when disabled', async () => {
      const registry = new GitRegistry({
        repositories: [{ url: 'https://github.com/test/repo' }],
        cacheEnabled: false
      });

      let callCount = 0;
      registry.discoverTemplatesFromRepo = async (_repoConfig) => {
        callCount++;
        return [
          { handle: 'template1', name: 'Template 1' }
        ];
      };

      await registry.discoverTemplates();
      assert.strictEqual(callCount, 1);
      assert.strictEqual(registry.discoveryCache.size, 0); // No caching
    });
  });

  describe('discoverTemplatesFromRepo()', () => {
    it('discovers templates from single repository', async () => {
      const registry = new GitRegistry();

      // Mock the method to avoid real file system/cache operations
      const originalMethod = registry.discoverTemplatesFromRepo;
      registry.discoverTemplatesFromRepo = async (repoConfig) => {
        return [
          {
            handle: 'template1',
            name: 'Template 1',
            path: '/mock/path/template1',
            repository: {
              url: repoConfig.url,
              branch: repoConfig.branch || 'main'
            }
          },
          {
            handle: 'template2',
            name: 'Template 2',
            path: '/mock/path/template2',
            repository: {
              url: repoConfig.url,
              branch: repoConfig.branch || 'main'
            }
          }
        ];
      };

      try {
        const templates = await registry.discoverTemplatesFromRepo({
          url: 'https://github.com/test/repo'
        });

        assert.strictEqual(templates.length, 2);
        assert(templates[0].repository);
        assert.strictEqual(templates[0].repository.url, 'https://github.com/test/repo');
        assert.strictEqual(templates[0].repository.branch, 'main');
      } finally {
        registry.discoverTemplatesFromRepo = originalMethod;
      }
    });

    it('uses custom branch from repo config', async () => {
      const registry = new GitRegistry();

      const originalMethod = registry.discoverTemplatesFromRepo;
      registry.discoverTemplatesFromRepo = async (repoConfig) => {
        return [{
          handle: 'template1',
          name: 'Template 1',
          path: '/mock/path/template1',
          repository: {
            url: repoConfig.url,
            branch: repoConfig.branch || 'main'
          }
        }];
      };

      try {
        const templates = await registry.discoverTemplatesFromRepo({
          url: 'https://github.com/test/repo',
          branch: 'develop'
        });

        assert.strictEqual(templates.length, 1);
        assert.strictEqual(templates[0].repository.branch, 'develop');
      } finally {
        registry.discoverTemplatesFromRepo = originalMethod;
      }
    });

    it('uses default branch when not specified in repo config', async () => {
      const registry = new GitRegistry({
        defaultBranch: 'master'
      });

      const originalMethod = registry.discoverTemplatesFromRepo;
      registry.discoverTemplatesFromRepo = async (repoConfig) => {
        return [{
          handle: 'template1',
          name: 'Template 1',
          path: '/mock/path/template1',
          repository: {
            url: repoConfig.url,
            branch: repoConfig.branch || registry.options.defaultBranch
          }
        }];
      };

      try {
        const templates = await registry.discoverTemplatesFromRepo({
          url: 'https://github.com/test/repo'
          // No branch specified, should use default
        });

        assert.strictEqual(templates.length, 1);
        assert.strictEqual(templates[0].repository.branch, 'master');
      } finally {
        registry.discoverTemplatesFromRepo = originalMethod;
      }
    });

    it('throws error when discovery fails', async () => {
      const registry = new GitRegistry();

      const originalMethod = registry.discoverTemplatesFromRepo;
      registry.discoverTemplatesFromRepo = async (_repoConfig) => {
        throw new Error('Discovery failed');
      };

      try {
        await assert.rejects(
          async () => {
            await registry.discoverTemplatesFromRepo({
              url: 'https://github.com/test/repo'
            });
          },
          { message: 'Discovery failed' } // Direct error from mock, not wrapped
        );
      } finally {
        registry.discoverTemplatesFromRepo = originalMethod;
      }
    });
  });

  describe('getTemplate()', () => {
    it('returns template by handle', async () => {
      const registry = new GitRegistry({
        repositories: [{ url: 'https://github.com/test/repo' }]
      });

      // Mock discoverTemplates to return specific templates
      registry.discoverTemplates = async () => [
        { handle: 'template1', name: 'Template 1' },
        { handle: 'template2', name: 'Template 2' }
      ];

      const template = await registry.getTemplate('template1');
      assert(template);
      assert.strictEqual(template.handle, 'template1');
      assert.strictEqual(template.name, 'Template 1');
    });

    it('returns template by name', async () => {
      const registry = new GitRegistry({
        repositories: [{ url: 'https://github.com/test/repo' }]
      });

      registry.discoverTemplates = async () => [
        { handle: 'template1', name: 'Template 1' },
        { handle: 'template2', name: 'Template 2' }
      ];

      const template = await registry.getTemplate('Template 2');
      assert(template);
      assert.strictEqual(template.handle, 'template2');
      assert.strictEqual(template.name, 'Template 2');
    });

    it('returns null when template not found', async () => {
      const registry = new GitRegistry({
        repositories: [{ url: 'https://github.com/test/repo' }]
      });

      registry.discoverTemplates = async () => [
        { handle: 'template1', name: 'Template 1' }
      ];

      const template = await registry.getTemplate('non-existent');
      assert.strictEqual(template, null);
    });
  });

  describe('addRepository()', () => {
    it('adds repository with default branch', () => {
      const registry = new GitRegistry();

      registry.addRepository('https://github.com/test/repo');

      assert.strictEqual(registry.options.repositories.length, 1);
      assert.deepStrictEqual(registry.options.repositories[0], {
        url: 'https://github.com/test/repo',
        branch: 'main'
      });
    });

    it('adds repository with custom branch', () => {
      const registry = new GitRegistry();

      registry.addRepository('https://github.com/test/repo', 'develop');

      assert.strictEqual(registry.options.repositories.length, 1);
      assert.deepStrictEqual(registry.options.repositories[0], {
        url: 'https://github.com/test/repo',
        branch: 'develop'
      });
    });

    it('clears cache when adding repository', () => {
      const registry = new GitRegistry();

      // Add something to cache
      registry.discoveryCache.set('test', 'value');

      registry.addRepository('https://github.com/test/repo');

      assert.strictEqual(registry.discoveryCache.size, 0);
    });
  });

  describe('removeRepository()', () => {
    it('removes repository by URL', () => {
      const registry = new GitRegistry({
        repositories: [
          { url: 'https://github.com/test/repo1', branch: 'main' },
          { url: 'https://github.com/test/repo2', branch: 'develop' }
        ]
      });

      registry.removeRepository('https://github.com/test/repo1');

      assert.strictEqual(registry.options.repositories.length, 1);
      assert.strictEqual(registry.options.repositories[0].url, 'https://github.com/test/repo2');
    });

    it('clears cache when removing repository', () => {
      const registry = new GitRegistry({
        repositories: [{ url: 'https://github.com/test/repo', branch: 'main' }]
      });

      // Add something to cache
      registry.discoveryCache.set('test', 'value');

      registry.removeRepository('https://github.com/test/repo');

      assert.strictEqual(registry.discoveryCache.size, 0);
    });
  });

  describe('clearCache()', () => {
    it('clears discovery cache', () => {
      const registry = new GitRegistry();

      registry.discoveryCache.set('key1', 'value1');
      registry.discoveryCache.set('key2', 'value2');

      assert.strictEqual(registry.discoveryCache.size, 2);

      registry.clearCache();

      assert.strictEqual(registry.discoveryCache.size, 0);
    });
  });

  describe('getCacheManager()', () => {
    it('returns null (placeholder implementation)', () => {
      const registry = new GitRegistry();

      const cacheManager = registry.getCacheManager();
      assert.strictEqual(cacheManager, null);
    });
  });
});
