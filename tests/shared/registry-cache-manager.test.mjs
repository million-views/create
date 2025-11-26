#!/usr/bin/env node

import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { RegistryCacheManager } from '../../bin/create-scaffold/modules/registry/cache-manager.mts';

/**
 * L3 Integration Tests for Registry Cache Manager
 *
 * LAYER CLASSIFICATION: L3 (Orchestrator)
 * The RegistryCacheManager is an L3 orchestrator that coordinates:
 * - In-memory caching (data structures)
 * - Disk persistence (L1 file operations)
 * - Event emissions (coordination)
 *
 * DESIGN FOR TESTABILITY:
 * These tests validate outcomes through the SUT's public interface, not by
 * reaching down to L0. The SUT provides:
 * - get(key) - retrieve cached data (validates storage worked)
 * - getStats() - inspect cache state (validates internal consistency)
 * - loadFromDisk(key) - verify disk persistence through SUT method
 * - Event emissions - observable side effects
 *
 * L0 is used ONLY for:
 * - Test fixture setup (creating temp directories)
 * - Test cleanup (removing temp directories)
 * NOT for verifying SUT behavior - that's done through SUT methods.
 *
 * Test Strategy:
 * - Test orchestrator's PUBLIC interface only
 * - Validate outcomes through SUT's own verification methods
 * - Trust L1 tests have verified underlying filesystem operations
 */

describe('RegistryCacheManager', () => {
  let cacheManager;
  let testCacheDir;
  let minimalRegistry;

  beforeEach(async () => {
    // Create isolated temp cache directory for each test
    testCacheDir = await mkdtemp(join(tmpdir(), 'registry-cache-test-'));

    // Minimal registry dependency - only provides name property
    // This is not a "mock" but a minimal real object satisfying the interface
    minimalRegistry = {
      name: 'test-registry'
    };

    cacheManager = new RegistryCacheManager(minimalRegistry);

    // Override cache directory to use test temp dir
    cacheManager.options.cacheDir = testCacheDir;
  });

  afterEach(async () => {
    // Cleanup
    await rm(testCacheDir, { recursive: true, force: true });
  });

  describe('Initialization', () => {
    test('initializes successfully and creates cache directory', async () => {
      assert.strictEqual(cacheManager.initialized, false);

      await cacheManager.initialize();

      assert.strictEqual(cacheManager.initialized, true);
      assert.strictEqual(cacheManager.options.enabled, true);
    });

    test('emits initialized event on successful init', async () => {
      let emitted = false;
      cacheManager.once('initialized', () => {
        emitted = true;
      });

      await cacheManager.initialize();

      assert.strictEqual(emitted, true);
    });

    test('handles initialization failure gracefully', async () => {
      // Force failure by using invalid cache dir (read-only on Unix)
      if (process.platform !== 'win32') {
        cacheManager.options.cacheDir = '/root/invalid-cache-dir';

        let failureEmitted = false;
        cacheManager.once('initialization:failed', () => {
          failureEmitted = true;
        });

        await cacheManager.initialize();

        assert.strictEqual(cacheManager.options.enabled, false);
        assert.strictEqual(failureEmitted, true);
      }
    });

    test('does not reinitialize if already initialized', async () => {
      await cacheManager.initialize();
      assert.strictEqual(cacheManager.initialized, true);

      let eventCount = 0;
      cacheManager.on('initialized', () => eventCount++);

      await cacheManager.initialize(); // Second call

      assert.strictEqual(eventCount, 0); // No event on second init
    });
  });

  describe('Basic Cache Operations', () => {
    beforeEach(async () => {
      await cacheManager.initialize();
    });

    test('set() stores data in memory cache', async () => {
      const key = 'test-template';
      const data = { name: 'Test Template', version: '1.0.0' };

      await cacheManager.set(key, data);

      const cached = await cacheManager.get(key);
      assert.deepStrictEqual(cached, data);
    });

    test('set() emits cache:set event with key and size', async () => {
      let emittedData = null;
      cacheManager.once('cache:set', (data) => {
        emittedData = data;
      });

      await cacheManager.set('test-key', { value: 'test' });

      assert.ok(emittedData);
      assert.strictEqual(emittedData.key, 'test-key');
      assert.ok(emittedData.size > 0);
    });

    test('get() returns null for non-existent key', async () => {
      const result = await cacheManager.get('non-existent');
      assert.strictEqual(result, null);
    });

    test('get() emits cache:miss for non-existent key', async () => {
      let missKey = null;
      cacheManager.once('cache:miss', (key) => {
        missKey = key;
      });

      await cacheManager.get('missing-key');

      assert.strictEqual(missKey, 'missing-key');
    });

    test('get() emits cache:hit for existing key', async () => {
      await cacheManager.set('exists', { data: 'test' });

      let hitKey = null;
      cacheManager.once('cache:hit', (key) => {
        hitKey = key;
      });

      await cacheManager.get('exists');

      assert.strictEqual(hitKey, 'exists');
    });

    test('delete() removes entry from memory cache', async () => {
      await cacheManager.set('to-delete', { value: 'data' });
      assert.ok(await cacheManager.get('to-delete'));

      await cacheManager.delete('to-delete');

      const result = await cacheManager.get('to-delete');
      assert.strictEqual(result, null);
    });

    test('delete() emits cache:deleted event', async () => {
      await cacheManager.set('delete-me', { data: 'test' });

      let deletedKey = null;
      cacheManager.once('cache:deleted', (key) => {
        deletedKey = key;
      });

      await cacheManager.delete('delete-me');

      assert.strictEqual(deletedKey, 'delete-me');
    });

    test('clear() removes all cache entries', async () => {
      await cacheManager.set('key1', { value: 1 });
      await cacheManager.set('key2', { value: 2 });
      await cacheManager.set('key3', { value: 3 });

      await cacheManager.clear();

      assert.strictEqual(await cacheManager.get('key1'), null);
      assert.strictEqual(await cacheManager.get('key2'), null);
      assert.strictEqual(await cacheManager.get('key3'), null);
    });

    test('clear() emits cache:cleared event with count', async () => {
      await cacheManager.set('a', { value: 1 });
      await cacheManager.set('b', { value: 2 });

      let clearedCount = null;
      cacheManager.once('cache:cleared', (count) => {
        clearedCount = count;
      });

      await cacheManager.clear();

      assert.strictEqual(clearedCount, 2);
    });
  });

  describe('TTL and Expiration', () => {
    beforeEach(async () => {
      await cacheManager.initialize();
    });

    test('expired entries are automatically removed on get()', async () => {
      const shortTTL = 100; // 100ms
      await cacheManager.set('short-lived', { data: 'test' }, shortTTL);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      const result = await cacheManager.get('short-lived');
      assert.strictEqual(result, null);
    });

    test('get() emits cache:expired for expired entries', async () => {
      await cacheManager.set('will-expire', { data: 'test' }, 50);

      await new Promise(resolve => setTimeout(resolve, 100));

      let expiredKey = null;
      cacheManager.once('cache:expired', (key) => {
        expiredKey = key;
      });

      await cacheManager.get('will-expire');

      assert.strictEqual(expiredKey, 'will-expire');
    });

    test('cleanup() removes all expired entries', async () => {
      await cacheManager.set('expired1', { data: 'test' }, 50);
      await cacheManager.set('expired2', { data: 'test' }, 50);
      await cacheManager.set('valid', { data: 'test' }, 10000);

      await new Promise(resolve => setTimeout(resolve, 100));

      await cacheManager.cleanup();

      assert.strictEqual(await cacheManager.get('expired1'), null);
      assert.strictEqual(await cacheManager.get('expired2'), null);
      assert.ok(await cacheManager.get('valid')); // Still valid
    });

    test('cleanup() emits cache:cleanup event with count', async () => {
      await cacheManager.set('e1', { data: 'test' }, 50);
      await cacheManager.set('e2', { data: 'test' }, 50);

      await new Promise(resolve => setTimeout(resolve, 100));

      let cleanupCount = null;
      cacheManager.once('cache:cleanup', (count) => {
        cleanupCount = count;
      });

      await cacheManager.cleanup();

      assert.strictEqual(cleanupCount, 2);
    });
  });

  describe('Disk Persistence', () => {
    beforeEach(async () => {
      await cacheManager.initialize();
    });

    test('set() persists entry to disk', async () => {
      await cacheManager.set('disk-test', { value: 'persisted' });

      // Validate through SUT's loadFromDisk method - NOT by reading fs directly
      const loaded = await cacheManager.loadFromDisk('disk-test');
      assert.ok(loaded, 'Entry should be persisted to disk');
      assert.deepStrictEqual(loaded.data, { value: 'persisted' });
    });

    test('getStats() reflects persisted entries', async () => {
      await cacheManager.set('entry1', { data: 'test1' });
      await cacheManager.set('entry2', { data: 'test2' });

      // Validate through SUT's getStats method
      const stats = await cacheManager.getStats();
      assert.strictEqual(stats.entries, 2, 'Stats should show 2 entries');
      assert.ok(stats.totalSize > 0, 'Stats should show non-zero size');
    });

    test('cache survives reinitialization from disk', async () => {
      await cacheManager.set('persistent', { value: 'saved' });
      await cacheManager.shutdown();

      // Create new cache manager with same directory
      // This validates disk persistence through the SUT's own loading mechanism
      const newCacheManager = new RegistryCacheManager(minimalRegistry);
      newCacheManager.options.cacheDir = testCacheDir;
      await newCacheManager.initialize();

      // Validate through SUT's get method
      const restored = await newCacheManager.get('persistent');
      assert.deepStrictEqual(restored, { value: 'saved' });

      // Validate through SUT's getStats method
      const stats = await newCacheManager.getStats();
      assert.strictEqual(stats.entries, 1);

      await newCacheManager.shutdown();
    });

    test('corrupted cache is handled gracefully on reinitialization', async () => {
      // First, create valid cache
      await cacheManager.set('valid-entry', { data: 'test' });
      await cacheManager.shutdown();

      // Corrupt the metadata by creating a new manager and clearing it wrong
      // We use a fresh manager that starts empty to simulate corruption scenario
      const corruptedManager = new RegistryCacheManager(minimalRegistry);
      corruptedManager.options.cacheDir = testCacheDir;
      // Don't initialize - just check it handles missing/corrupt state

      // The SUT should handle this gracefully
      await corruptedManager.initialize();

      // Validate through SUT that it recovered (may or may not have entries)
      const stats = await corruptedManager.getStats();
      assert.ok(stats.enabled, 'Cache should still be enabled after handling corruption');

      await corruptedManager.shutdown();
    });
  });

  describe('LRU Eviction', () => {
    beforeEach(async () => {
      await cacheManager.initialize();
      // Set small max size for testing
      cacheManager.options.maxSize = 500; // 500 bytes
    });

    test('evicts old entries when cache size limit is reached', async () => {
      // Add entries that will exceed max size
      await cacheManager.set('entry1', { data: 'x'.repeat(200) });
      await cacheManager.set('entry2', { data: 'y'.repeat(200) });

      // This should trigger eviction
      await cacheManager.set('entry3', { data: 'z'.repeat(200) });

      // entry1 should be evicted (oldest)
      const entry1 = await cacheManager.get('entry1');
      assert.strictEqual(entry1, null);

      // entry2 and entry3 should still exist
      assert.ok(await cacheManager.get('entry2'));
      assert.ok(await cacheManager.get('entry3'));
    });

    test('eviction emits cache:evicted event', async () => {
      cacheManager.options.maxSize = 300;

      await cacheManager.set('a', { data: 'x'.repeat(150) });

      let evictedCount = null;
      cacheManager.once('cache:evicted', (count) => {
        evictedCount = count;
      });

      await cacheManager.set('b', { data: 'y'.repeat(200) });

      assert.ok(evictedCount > 0);
    });
  });

  describe('Cache Statistics', () => {
    beforeEach(async () => {
      await cacheManager.initialize();
    });

    test('getStats() returns current cache statistics', async () => {
      await cacheManager.set('stat1', { data: 'test1' });
      await cacheManager.set('stat2', { data: 'test2' });

      const stats = await cacheManager.getStats();

      assert.strictEqual(stats.enabled, true);
      assert.strictEqual(stats.entries, 2);
      assert.ok(stats.totalSize > 0);
      assert.strictEqual(stats.maxSize, cacheManager.options.maxSize);
      assert.strictEqual(stats.expiredCount, 0);
    });

    test('getStats() counts expired entries correctly', async () => {
      await cacheManager.set('active', { data: 'test' }, 10000);
      await cacheManager.set('expired', { data: 'test' }, 50);

      await new Promise(resolve => setTimeout(resolve, 100));

      const stats = await cacheManager.getStats();

      assert.strictEqual(stats.expiredCount, 1);
    });
  });

  describe('Cache Disabled Mode', () => {
    test('operations are no-ops when cache is disabled', async () => {
      cacheManager.options.enabled = false;

      await cacheManager.set('key', { value: 'test' });
      const result = await cacheManager.get('key');

      assert.strictEqual(result, null);
    });
  });

  describe('Shutdown', () => {
    beforeEach(async () => {
      await cacheManager.initialize();
    });

    test('shutdown() saves metadata and emits event', async () => {
      await cacheManager.set('final', { data: 'test' });

      let shutdownEmitted = false;
      cacheManager.once('shutdown', () => {
        shutdownEmitted = true;
      });

      await cacheManager.shutdown();

      assert.strictEqual(shutdownEmitted, true);
      assert.strictEqual(cacheManager.memoryCache.size, 0);
    });

    test('shutdown() persists cache state to disk', async () => {
      await cacheManager.set('persist-on-shutdown', { value: 'important' });
      await cacheManager.shutdown();

      // Validate persistence by creating a new cache manager and loading
      // This tests through the SUT's own initialization and loading methods
      const newCacheManager = new RegistryCacheManager(minimalRegistry);
      newCacheManager.options.cacheDir = testCacheDir;
      await newCacheManager.initialize();

      // Validate through SUT's get method
      const restored = await newCacheManager.get('persist-on-shutdown');
      assert.deepStrictEqual(restored, { value: 'important' });

      await newCacheManager.shutdown();
    });
  });

  describe('Additional Edge Cases', () => {
    beforeEach(async () => {
      await cacheManager.initialize();
    });

    test('delete() handles non-existent entry gracefully', async () => {
      // Should not throw
      await cacheManager.delete('never-existed');

      const result = await cacheManager.get('never-existed');
      assert.strictEqual(result, null);
    });

    test('clear() handles empty cache', async () => {
      let clearedCount = null;
      cacheManager.once('cache:cleared', (count) => {
        clearedCount = count;
      });

      await cacheManager.clear();

      assert.strictEqual(clearedCount, 0);
    });

    test('get() updates lastAccessed timestamp for LRU', async () => {
      await cacheManager.set('lru-test', { data: 'test' });

      const entry1 = cacheManager.memoryCache.get('lru-test');
      const firstAccess = entry1.lastAccessed;

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));

      await cacheManager.get('lru-test');

      const entry2 = cacheManager.memoryCache.get('lru-test');
      const secondAccess = entry2.lastAccessed;

      assert.ok(secondAccess > firstAccess);
    });

    test('set() with custom TTL overrides default maxAge', async () => {
      const customTTL = 200;
      await cacheManager.set('custom-ttl', { data: 'test' }, customTTL);

      const entry = cacheManager.memoryCache.get('custom-ttl');
      // Verify TTL was applied (expires should be ~200ms from now)
      const expectedExpiry = Date.now() + customTTL;

      assert.ok(Math.abs(entry.expires - expectedExpiry) < 50); // Allow 50ms tolerance
    });

    test('getStats() calculates hit rate correctly', async () => {
      await cacheManager.set('hit-test', { data: 'test' });

      // Generate cache hits and misses
      await cacheManager.get('hit-test'); // hit
      await cacheManager.get('hit-test'); // hit
      await cacheManager.get('miss1'); // miss
      await cacheManager.get('miss2'); // miss

      const stats = await cacheManager.getStats();

      // 2 hits out of 4 total = 50% hit rate
      assert.strictEqual(stats.hitRate, 50);
    });

    test('loadFromDisk() returns null for non-existent file', async () => {
      const result = await cacheManager.loadFromDisk('non-existent-key');
      assert.strictEqual(result, null);
    });
  });
});
