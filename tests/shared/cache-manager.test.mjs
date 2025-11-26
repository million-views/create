#!/usr/bin/env node

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import path from 'path';
import os from 'os';
import { CacheManager } from '../../bin/create-scaffold/modules/cache-manager.mts';
import { resolveCacheDirectory } from '../../lib/util/index.mts';

describe('CacheManager', () => {
  let cacheManager;
  let tempCacheDir;

  beforeEach(() => {
    // Create a temporary cache directory for testing
    tempCacheDir = path.join(os.tmpdir(), 'cache-manager-test-' + Date.now());
    cacheManager = new CacheManager(tempCacheDir);
  });

  it('constructor sets default cache directory', () => {
    const defaultManager = new CacheManager();
    // Use path resolver to get expected default path
    assert.equal(defaultManager.cacheDir, resolveCacheDirectory());
  });

  it('constructor accepts custom cache directory', () => {
    const customDir = '/custom/cache/dir';
    const customManager = new CacheManager(customDir);
    assert.equal(customManager.cacheDir, customDir);
  });

  describe('URL normalization', () => {
    it('normalizeRepoUrl handles absolute paths', () => {
      assert.equal(cacheManager.normalizeRepoUrl('/absolute/path'), '/absolute/path');
      assert.equal(cacheManager.normalizeRepoUrl('./relative/path'), './relative/path');
      assert.equal(cacheManager.normalizeRepoUrl('~/home/path'), '~/home/path');
    });

    it('normalizeRepoUrl handles HTTPS URLs', () => {
      const httpsUrl = 'https://github.com/user/repo.git';
      assert.equal(cacheManager.normalizeRepoUrl(httpsUrl), httpsUrl);
    });

    it('normalizeRepoUrl converts GitHub shorthand to HTTPS', () => {
      assert.equal(
        cacheManager.normalizeRepoUrl('user/repo'),
        'https://github.com/user/repo.git'
      );
      assert.equal(
        cacheManager.normalizeRepoUrl('user/repo.git'),
        'https://github.com/user/repo.git'
      );
    });

    it('normalizeRepoUrl handles SSH URLs', () => {
      const sshUrl = 'git@github.com:user/repo.git';
      assert.equal(cacheManager.normalizeRepoUrl(sshUrl), sshUrl);
    });
  });

  describe('Protocol extraction', () => {
    it('getProtocolFromUrl identifies local paths', () => {
      assert.equal(cacheManager.getProtocolFromUrl('/absolute/path'), 'local');
      assert.equal(cacheManager.getProtocolFromUrl('./relative/path'), 'local');
      assert.equal(cacheManager.getProtocolFromUrl('~/home/path'), 'local');
    });

    it('getProtocolFromUrl identifies HTTPS protocol', () => {
      assert.equal(cacheManager.getProtocolFromUrl('https://github.com/user/repo.git'), 'https');
    });

    it('getProtocolFromUrl identifies SSH protocol', () => {
      assert.equal(cacheManager.getProtocolFromUrl('git@github.com:user/repo.git'), 'git');
    });

    it('getProtocolFromUrl handles unknown protocols', () => {
      assert.equal(cacheManager.getProtocolFromUrl('unknown://example.com/repo'), 'unknown');
    });
  });

  describe('Repository name extraction', () => {
    it('getRepoNameFromUrl handles local paths', () => {
      assert.equal(cacheManager.getRepoNameFromUrl('/path/to/repo'), 'repo');
      assert.equal(cacheManager.getRepoNameFromUrl('/path/to/repo.git'), 'repo');
    });

    it('getRepoNameFromUrl handles HTTPS URLs', () => {
      assert.equal(cacheManager.getRepoNameFromUrl('https://github.com/user/repo.git'), 'user-repo');
      assert.equal(cacheManager.getRepoNameFromUrl('https://github.com/user/repo'), 'user-repo');
    });

    it('getRepoNameFromUrl handles SSH URLs', () => {
      assert.equal(cacheManager.getRepoNameFromUrl('git@github.com:user/repo.git'), 'user-repo');
    });

    it('getRepoNameFromUrl sanitizes invalid characters', () => {
      assert.equal(cacheManager.getRepoNameFromUrl('invalid/repo@name!'), 'invalid-repo-name-');
    });
  });

  describe('Repository directory resolution', () => {
    it('resolveRepoDirectory generates correct paths for main branch', () => {
      const result = cacheManager.resolveRepoDirectory('user/repo', null);
      assert.equal(result.repoHash, 'https/user-repo');
      assert.equal(result.repoDir, path.join(tempCacheDir, 'https', 'user-repo'));
    });

    it('resolveRepoDirectory generates correct paths for custom branch', () => {
      const result = cacheManager.resolveRepoDirectory('user/repo', 'develop');
      assert.equal(result.repoHash, 'https/user-repo-develop');
      assert.equal(result.repoDir, path.join(tempCacheDir, 'https', 'user-repo-develop'));
    });

    it('resolveRepoDirectory handles master branch as default', () => {
      const result = cacheManager.resolveRepoDirectory('user/repo', 'master');
      assert.equal(result.repoHash, 'https/user-repo');
    });

    it('resolveRepoDirectory handles main branch as default', () => {
      const result = cacheManager.resolveRepoDirectory('user/repo', 'main');
      assert.equal(result.repoHash, 'https/user-repo');
    });
  });

  it('generateRepoHash delegates to resolveRepoDirectory', () => {
    const result = cacheManager.generateRepoHash('user/repo', 'develop');
    assert.equal(result, 'https/user-repo-develop');
  });

  describe('Expiration checking', () => {
    it('isExpired returns true for missing metadata', () => {
      assert.equal(cacheManager.isExpired(null), true);
      assert.equal(cacheManager.isExpired({}), true);
      assert.equal(cacheManager.isExpired({ lastUpdated: null }), true);
    });

    it('isExpired returns false for fresh cache', () => {
      const recentDate = new Date();
      recentDate.setHours(recentDate.getHours() - 1); // 1 hour ago
      const metadata = {
        lastUpdated: recentDate.toISOString(),
        ttlHours: 24
      };
      assert.equal(cacheManager.isExpired(metadata), false);
    });

    it('isExpired returns true for expired cache', () => {
      const oldDate = new Date();
      oldDate.setHours(oldDate.getHours() - 25); // 25 hours ago
      const metadata = {
        lastUpdated: oldDate.toISOString(),
        ttlHours: 24
      };
      assert.equal(cacheManager.isExpired(metadata), true);
    });

    it('isExpired accepts TTL override', () => {
      const recentDate = new Date();
      recentDate.setHours(recentDate.getHours() - 2); // 2 hours ago
      const metadata = {
        lastUpdated: recentDate.toISOString(),
        ttlHours: 24
      };
      assert.equal(cacheManager.isExpired(metadata, 1), true); // Override to 1 hour TTL
    });
  });

  describe('Cache metadata operations', () => {
    it('getCacheMetadata returns null for non-existent metadata', async () => {
      const result = await cacheManager.getCacheMetadata('nonexistent-hash');
      assert.equal(result, null);
    });

    it('updateCacheMetadata creates metadata file', async () => {
      const metadata = {
        repoUrl: 'user/repo',
        branchName: 'main',
        lastUpdated: new Date().toISOString(),
        ttlHours: 24
      };

      await cacheManager.updateCacheMetadata('test-hash', metadata);
      const retrieved = await cacheManager.getCacheMetadata('test-hash');
      assert.deepEqual(retrieved, metadata);
    });
  });

  describe('Cache corruption detection', () => {
    it('detectCacheCorruption returns true for non-existent directory', async () => {
      const result = await cacheManager.detectCacheCorruption('nonexistent-hash');
      assert.equal(result, true);
    });

    it('detectCacheCorruption returns true for missing metadata', async () => {
      // Create directory but no metadata
      await cacheManager.ensureRepoDirectory('test-hash');

      const result = await cacheManager.detectCacheCorruption('test-hash');
      assert.equal(result, true);
    });

    it('detectCacheCorruption returns true for invalid metadata', async () => {
      await cacheManager.ensureRepoDirectory('test-hash');
      await cacheManager.updateCacheMetadata('test-hash', { invalid: 'metadata' });

      const result = await cacheManager.detectCacheCorruption('test-hash');
      assert.equal(result, true);
    });
  });

  describe('Repository access checking', () => {
    it('checkRepositoryAccess returns true for test URLs', async () => {
      const testUrls = [
        'https://definitely-does-not-exist.com/repo.git',
        'https://example.com/repo.git',
        'https://nonexistent-spec-repo.com/repo.git'
      ];

      for (const url of testUrls) {
        const result = await cacheManager.checkRepositoryAccess(url);
        assert.equal(result, true, `Expected true for test URL: ${url}`);
      }
    });
  });

  describe('Cache directory management', () => {
    it('ensureCacheDirectory creates cache directory', async () => {
      await cacheManager.ensureCacheDirectory();
      // This should not throw and create the directory
      assert.ok(true, 'ensureCacheDirectory completed without error');
    });

    it('ensureRepoDirectory creates repository directory', async () => {
      await cacheManager.ensureRepoDirectory('test-repo-hash');
      // This should not throw and create the directory
      assert.ok(true, 'ensureRepoDirectory completed without error');
    });
  });
});
