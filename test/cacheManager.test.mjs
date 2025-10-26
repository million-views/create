#!/usr/bin/env node

import { strict as assert } from 'assert';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { CacheManager } from '../bin/cacheManager.mjs';

/**
 * Test suite for Cache Manager module
 * Tests cache directory structure, metadata handling, and repository hashing
 */

class CacheManagerTestSuite {
  constructor() {
    this.tempPaths = [];
    this.testCount = 0;
    this.passedCount = 0;
  }

  async createTempDir(suffix = '') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 9);
    const dirName = `cache-test-${timestamp}-${random}${suffix}`;
    const tempPath = path.join(os.tmpdir(), dirName);
    await fs.mkdir(tempPath, { recursive: true });
    this.tempPaths.push(tempPath);
    return tempPath;
  }

  async cleanup() {
    for (const tempPath of this.tempPaths) {
      try {
        await fs.rm(tempPath, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
    this.tempPaths = [];
  }

  async test(description, testFn) {
    this.testCount++;
    try {
      await testFn();
      console.log(`✅ ${description}`);
      this.passedCount++;
    } catch (error) {
      console.error(`❌ ${description}`);
      console.error(`   Error: ${error.message}`);
      if (error.stack) {
        console.error(`   Stack: ${error.stack.split('\n').slice(1, 3).join('\n')}`);
      }
    }
  }

  async runTests() {
    console.log('🧪 Running Cache Manager Tests\n');

    try {
      // Test 2.1: Cache directory structure and metadata handling
      await this.testCacheDirectoryCreation();
      await this.testRepositoryHashing();
      await this.testMetadataHandling();

      // Test 2.2: Core cache operations
      await this.testCoreOperations();

      // Test 2.3: Cache corruption recovery and cleanup
      await this.testCorruptionRecovery();
      await this.testCacheCleanup();

      console.log(`\n📊 Test Results: ${this.passedCount}/${this.testCount} passed`);
      
      if (this.passedCount === this.testCount) {
        console.log('🎉 All tests passed!');
        process.exit(0);
      } else {
        console.log('💥 Some tests failed!');
        process.exit(1);
      }
    } finally {
      await this.cleanup();
    }
  }

  async testCacheDirectoryCreation() {
    console.log('📁 Testing cache directory creation...');

    await this.test('Creates cache directory with proper permissions', async () => {
      const tempCacheDir = await this.createTempDir('-cache');
      const cacheManager = new CacheManager(tempCacheDir);
      
      // This should create the cache directory structure
      await cacheManager.ensureCacheDirectory();
      
      // Verify directory exists
      const stats = await fs.stat(tempCacheDir);
      assert(stats.isDirectory(), 'Cache directory should be created');
      
      // Verify permissions (should be readable/writable by owner)
      const mode = stats.mode & parseInt('777', 8);
      assert(mode >= parseInt('700', 8), 'Cache directory should have proper permissions');
    });

    await this.test('Creates nested cache structure for repository storage', async () => {
      const tempCacheDir = await this.createTempDir('-nested');
      const cacheManager = new CacheManager(tempCacheDir);
      
      const repoHash = 'abc123def456';
      await cacheManager.ensureRepoDirectory(repoHash);
      
      const repoDir = path.join(tempCacheDir, repoHash);
      const stats = await fs.stat(repoDir);
      assert(stats.isDirectory(), 'Repository directory should be created');
    });
  }

  async testRepositoryHashing() {
    console.log('🔐 Testing repository hashing...');

    await this.test('Generates consistent hash for same repo URL and branch', async () => {
      const cacheManager = new CacheManager();
      
      const repoUrl = 'https://github.com/user/repo.git';
      const branchName = 'main';
      
      const hash1 = cacheManager.generateRepoHash(repoUrl, branchName);
      const hash2 = cacheManager.generateRepoHash(repoUrl, branchName);
      
      assert.strictEqual(hash1, hash2, 'Hash should be consistent for same inputs');
      assert(typeof hash1 === 'string', 'Hash should be a string');
      assert(hash1.length > 0, 'Hash should not be empty');
    });

    await this.test('Generates different hashes for different repositories', async () => {
      const cacheManager = new CacheManager();
      
      const hash1 = cacheManager.generateRepoHash('https://github.com/user1/repo.git', 'main');
      const hash2 = cacheManager.generateRepoHash('https://github.com/user2/repo.git', 'main');
      
      assert.notStrictEqual(hash1, hash2, 'Different repos should have different hashes');
    });

    await this.test('Generates different hashes for different branches', async () => {
      const cacheManager = new CacheManager();
      
      const repoUrl = 'https://github.com/user/repo.git';
      const hash1 = cacheManager.generateRepoHash(repoUrl, 'main');
      const hash2 = cacheManager.generateRepoHash(repoUrl, 'develop');
      
      assert.notStrictEqual(hash1, hash2, 'Different branches should have different hashes');
    });

    await this.test('Handles user/repo format correctly', async () => {
      const cacheManager = new CacheManager();
      
      const hash1 = cacheManager.generateRepoHash('user/repo', 'main');
      const hash2 = cacheManager.generateRepoHash('https://github.com/user/repo.git', 'main');
      
      // These should be the same since user/repo gets normalized to GitHub URL
      assert.strictEqual(hash1, hash2, 'user/repo format should normalize to GitHub URL');
    });
  }

  async testMetadataHandling() {
    console.log('📋 Testing metadata handling...');

    await this.test('Stores and retrieves cache metadata', async () => {
      const tempCacheDir = await this.createTempDir('-metadata');
      const cacheManager = new CacheManager(tempCacheDir);
      
      const repoHash = 'test123hash';
      const metadata = {
        repoUrl: 'https://github.com/user/repo.git',
        branchName: 'main',
        lastUpdated: new Date().toISOString(),
        ttlHours: 24,
        repoHash: repoHash,
        size: 1024000,
        templateCount: 3
      };
      
      await cacheManager.updateCacheMetadata(repoHash, metadata);
      const retrieved = await cacheManager.getCacheMetadata(repoHash);
      
      assert.deepStrictEqual(retrieved, metadata, 'Metadata should be stored and retrieved correctly');
    });

    await this.test('Returns null for non-existent metadata', async () => {
      const tempCacheDir = await this.createTempDir('-nonexistent');
      const cacheManager = new CacheManager(tempCacheDir);
      
      const retrieved = await cacheManager.getCacheMetadata('nonexistent-hash');
      assert.strictEqual(retrieved, null, 'Should return null for non-existent metadata');
    });

    await this.test('Handles metadata serialization correctly', async () => {
      const tempCacheDir = await this.createTempDir('-serialization');
      const cacheManager = new CacheManager(tempCacheDir);
      
      const repoHash = 'serialize123';
      const metadata = {
        repoUrl: 'https://github.com/test/repo.git',
        branchName: 'feature/test',
        lastUpdated: '2024-10-26T10:30:00.000Z',
        ttlHours: 48,
        repoHash: repoHash,
        size: 2048000,
        templateCount: 5
      };
      
      await cacheManager.updateCacheMetadata(repoHash, metadata);
      
      // Read the raw file to verify JSON serialization
      const metadataPath = path.join(tempCacheDir, repoHash, 'metadata.json');
      const rawData = await fs.readFile(metadataPath, 'utf8');
      const parsedData = JSON.parse(rawData);
      
      assert.deepStrictEqual(parsedData, metadata, 'Metadata should be properly serialized as JSON');
    });
  }

  async testCoreOperations() {
    console.log('⚙️ Testing core cache operations...');

    await this.test('getCachedRepo returns cached repository path when cache exists and is fresh', async () => {
      const tempCacheDir = await this.createTempDir('-cached-repo');
      const cacheManager = new CacheManager(tempCacheDir);
      
      const repoUrl = 'https://github.com/user/repo.git';
      const branchName = 'main';
      const repoHash = cacheManager.generateRepoHash(repoUrl, branchName);
      
      // Create mock cached repository
      const repoDir = path.join(tempCacheDir, repoHash);
      await fs.mkdir(repoDir, { recursive: true });
      await fs.writeFile(path.join(repoDir, 'test.txt'), 'cached content');
      
      // Create fresh metadata (within TTL)
      const metadata = {
        repoUrl,
        branchName,
        lastUpdated: new Date().toISOString(),
        ttlHours: 24,
        repoHash,
        size: 1024,
        templateCount: 1
      };
      await cacheManager.updateCacheMetadata(repoHash, metadata);
      
      const cachedPath = await cacheManager.getCachedRepo(repoUrl, branchName);
      assert.strictEqual(cachedPath, repoDir, 'Should return cached repository path');
      
      // Verify cached content exists
      const content = await fs.readFile(path.join(cachedPath, 'test.txt'), 'utf8');
      assert.strictEqual(content, 'cached content', 'Cached content should be accessible');
    });

    await this.test('getCachedRepo returns null when cache does not exist', async () => {
      const tempCacheDir = await this.createTempDir('-no-cache');
      const cacheManager = new CacheManager(tempCacheDir);
      
      const cachedPath = await cacheManager.getCachedRepo('https://github.com/nonexistent/repo.git', 'main');
      assert.strictEqual(cachedPath, null, 'Should return null when cache does not exist');
    });

    await this.test('getCachedRepo returns null when cache is expired', async () => {
      const tempCacheDir = await this.createTempDir('-expired');
      const cacheManager = new CacheManager(tempCacheDir);
      
      const repoUrl = 'https://github.com/user/repo.git';
      const branchName = 'main';
      const repoHash = cacheManager.generateRepoHash(repoUrl, branchName);
      
      // Create mock cached repository
      const repoDir = path.join(tempCacheDir, repoHash);
      await fs.mkdir(repoDir, { recursive: true });
      
      // Create expired metadata (older than TTL)
      const expiredDate = new Date();
      expiredDate.setHours(expiredDate.getHours() - 25); // 25 hours ago
      
      const metadata = {
        repoUrl,
        branchName,
        lastUpdated: expiredDate.toISOString(),
        ttlHours: 24,
        repoHash,
        size: 1024,
        templateCount: 1
      };
      await cacheManager.updateCacheMetadata(repoHash, metadata);
      
      const cachedPath = await cacheManager.getCachedRepo(repoUrl, branchName);
      assert.strictEqual(cachedPath, null, 'Should return null when cache is expired');
    });

    await this.test('getCachedRepo respects --no-cache flag', async () => {
      const tempCacheDir = await this.createTempDir('-no-cache-flag');
      const cacheManager = new CacheManager(tempCacheDir);
      
      const repoUrl = 'https://github.com/user/repo.git';
      const branchName = 'main';
      const repoHash = cacheManager.generateRepoHash(repoUrl, branchName);
      
      // Create mock cached repository
      const repoDir = path.join(tempCacheDir, repoHash);
      await fs.mkdir(repoDir, { recursive: true });
      
      // Create fresh metadata
      const metadata = {
        repoUrl,
        branchName,
        lastUpdated: new Date().toISOString(),
        ttlHours: 24,
        repoHash,
        size: 1024,
        templateCount: 1
      };
      await cacheManager.updateCacheMetadata(repoHash, metadata);
      
      // Test with noCache option
      const cachedPath = await cacheManager.getCachedRepo(repoUrl, branchName, { noCache: true });
      assert.strictEqual(cachedPath, null, 'Should return null when noCache option is true');
    });

    await this.test('isExpired correctly identifies expired cache entries', async () => {
      const cacheManager = new CacheManager();
      
      // Fresh metadata
      const freshMetadata = {
        lastUpdated: new Date().toISOString(),
        ttlHours: 24
      };
      assert.strictEqual(cacheManager.isExpired(freshMetadata), false, 'Fresh cache should not be expired');
      
      // Expired metadata
      const expiredDate = new Date();
      expiredDate.setHours(expiredDate.getHours() - 25);
      const expiredMetadata = {
        lastUpdated: expiredDate.toISOString(),
        ttlHours: 24
      };
      assert.strictEqual(cacheManager.isExpired(expiredMetadata), true, 'Old cache should be expired');
    });

    await this.test('isExpired respects custom TTL values', async () => {
      const cacheManager = new CacheManager();
      
      // Metadata with custom TTL
      const customDate = new Date();
      customDate.setHours(customDate.getHours() - 10); // 10 hours ago
      
      const customMetadata = {
        lastUpdated: customDate.toISOString(),
        ttlHours: 48 // 48 hour TTL
      };
      
      assert.strictEqual(cacheManager.isExpired(customMetadata), false, 'Should not be expired with custom TTL');
      
      // Test with override TTL parameter
      assert.strictEqual(cacheManager.isExpired(customMetadata, 8), true, 'Should be expired with shorter TTL override');
    });
  }

  async testCorruptionRecovery() {
    console.log('🔧 Testing cache corruption recovery...');

    await this.test('detectCacheCorruption identifies corrupted cache entries', async () => {
      const tempCacheDir = await this.createTempDir('-corruption');
      const cacheManager = new CacheManager(tempCacheDir);
      
      const repoHash = 'corrupt123';
      const repoDir = path.join(tempCacheDir, repoHash);
      
      // Create repository directory but with corrupted metadata
      await fs.mkdir(repoDir, { recursive: true });
      await fs.writeFile(path.join(repoDir, 'some-file.txt'), 'content');
      
      // Write invalid JSON metadata
      const metadataPath = path.join(repoDir, 'metadata.json');
      await fs.writeFile(metadataPath, 'invalid json content');
      
      const isCorrupted = await cacheManager.detectCacheCorruption(repoHash);
      assert.strictEqual(isCorrupted, true, 'Should detect corrupted metadata');
    });

    await this.test('detectCacheCorruption identifies missing repository directory', async () => {
      const tempCacheDir = await this.createTempDir('-missing-repo');
      const cacheManager = new CacheManager(tempCacheDir);
      
      const repoHash = 'missing123';
      
      // Create metadata but no repository directory
      const metadata = {
        repoUrl: 'https://github.com/user/repo.git',
        branchName: 'main',
        lastUpdated: new Date().toISOString(),
        ttlHours: 24,
        repoHash,
        size: 1024,
        templateCount: 1
      };
      await cacheManager.updateCacheMetadata(repoHash, metadata);
      
      // Remove the repository directory
      const repoDir = path.join(tempCacheDir, repoHash);
      await fs.rm(repoDir, { recursive: true, force: true });
      
      const isCorrupted = await cacheManager.detectCacheCorruption(repoHash);
      assert.strictEqual(isCorrupted, true, 'Should detect missing repository directory');
    });

    await this.test('detectCacheCorruption returns false for valid cache', async () => {
      const tempCacheDir = await this.createTempDir('-valid-cache');
      const cacheManager = new CacheManager(tempCacheDir);
      
      const repoHash = 'valid123';
      const repoDir = path.join(tempCacheDir, repoHash);
      
      // Create valid cache structure
      await fs.mkdir(repoDir, { recursive: true });
      await fs.writeFile(path.join(repoDir, 'template.txt'), 'template content');
      
      const metadata = {
        repoUrl: 'https://github.com/user/repo.git',
        branchName: 'main',
        lastUpdated: new Date().toISOString(),
        ttlHours: 24,
        repoHash,
        size: 1024,
        templateCount: 1
      };
      await cacheManager.updateCacheMetadata(repoHash, metadata);
      
      const isCorrupted = await cacheManager.detectCacheCorruption(repoHash);
      assert.strictEqual(isCorrupted, false, 'Should not detect corruption for valid cache');
    });

    await this.test('handleCacheCorruption removes corrupted cache entry', async () => {
      const tempCacheDir = await this.createTempDir('-handle-corruption');
      const cacheManager = new CacheManager(tempCacheDir);
      
      const repoHash = 'handle123';
      const repoDir = path.join(tempCacheDir, repoHash);
      
      // Create corrupted cache
      await fs.mkdir(repoDir, { recursive: true });
      await fs.writeFile(path.join(repoDir, 'file.txt'), 'content');
      await fs.writeFile(path.join(repoDir, 'metadata.json'), 'invalid json');
      
      await cacheManager.handleCacheCorruption(repoHash);
      
      // Verify cache directory is removed
      try {
        await fs.stat(repoDir);
        assert.fail('Corrupted cache directory should be removed');
      } catch (error) {
        assert.strictEqual(error.code, 'ENOENT', 'Cache directory should not exist after corruption handling');
      }
    });
  }

  async testCacheCleanup() {
    console.log('🧹 Testing cache cleanup...');

    await this.test('clearExpiredEntries removes expired cache entries', async () => {
      const tempCacheDir = await this.createTempDir('-cleanup');
      const cacheManager = new CacheManager(tempCacheDir);
      
      // Create fresh cache entry
      const freshHash = 'fresh123';
      const freshDir = path.join(tempCacheDir, freshHash);
      await fs.mkdir(freshDir, { recursive: true });
      await fs.writeFile(path.join(freshDir, 'fresh.txt'), 'fresh content');
      
      const freshMetadata = {
        repoUrl: 'https://github.com/user/fresh.git',
        branchName: 'main',
        lastUpdated: new Date().toISOString(),
        ttlHours: 24,
        repoHash: freshHash,
        size: 1024,
        templateCount: 1
      };
      await cacheManager.updateCacheMetadata(freshHash, freshMetadata);
      
      // Create expired cache entry
      const expiredHash = 'expired123';
      const expiredDir = path.join(tempCacheDir, expiredHash);
      await fs.mkdir(expiredDir, { recursive: true });
      await fs.writeFile(path.join(expiredDir, 'expired.txt'), 'expired content');
      
      const expiredDate = new Date();
      expiredDate.setHours(expiredDate.getHours() - 25); // 25 hours ago
      
      const expiredMetadata = {
        repoUrl: 'https://github.com/user/expired.git',
        branchName: 'main',
        lastUpdated: expiredDate.toISOString(),
        ttlHours: 24,
        repoHash: expiredHash,
        size: 1024,
        templateCount: 1
      };
      await cacheManager.updateCacheMetadata(expiredHash, expiredMetadata);
      
      // Run cleanup
      const removedCount = await cacheManager.clearExpiredEntries();
      assert.strictEqual(removedCount, 1, 'Should remove one expired entry');
      
      // Verify fresh cache still exists
      const freshStats = await fs.stat(freshDir);
      assert(freshStats.isDirectory(), 'Fresh cache should still exist');
      
      // Verify expired cache is removed
      try {
        await fs.stat(expiredDir);
        assert.fail('Expired cache should be removed');
      } catch (error) {
        assert.strictEqual(error.code, 'ENOENT', 'Expired cache should not exist');
      }
    });

    await this.test('clearExpiredEntries handles errors gracefully', async () => {
      const tempCacheDir = await this.createTempDir('-cleanup-errors');
      const cacheManager = new CacheManager(tempCacheDir);
      
      // Create cache entry with metadata but no directory (simulates partial corruption)
      const problemHash = 'problem123';
      const problemMetadata = {
        repoUrl: 'https://github.com/user/problem.git',
        branchName: 'main',
        lastUpdated: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
        ttlHours: 24,
        repoHash: problemHash,
        size: 1024,
        templateCount: 1
      };
      
      // Create metadata file directly without repository directory
      const metadataDir = path.join(tempCacheDir, problemHash);
      await fs.mkdir(metadataDir, { recursive: true });
      await cacheManager.updateCacheMetadata(problemHash, problemMetadata);
      await fs.rm(metadataDir, { recursive: true, force: true });
      
      // This should not throw an error
      const removedCount = await cacheManager.clearExpiredEntries();
      assert(typeof removedCount === 'number', 'Should return a number even with errors');
    });
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const testSuite = new CacheManagerTestSuite();
  await testSuite.runTests();
}

export { CacheManagerTestSuite };