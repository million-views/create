#!/usr/bin/env node

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { CacheManager } from '../../bin/create-scaffold/modules/cache-manager.mts';
import { File } from '../../lib/util/file.mts';
import { GitFixtureManager } from '../helpers/git-fixtures.mjs';

async function createCacheManager(testContext) {
  const cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cache-manager-git-cache-'));
  if (testContext?.after) {
    testContext.after(async () => {
      await File.safeCleanup(cacheDir);
    });
  }
  return {
    cacheManager: new CacheManager(cacheDir),
    cacheDir
  };
}

async function createFixtureRepo(testContext, fixtureName = 'simple-template') {
  const manager = await GitFixtureManager.create(testContext);
  return manager.createBareRepo(fixtureName);
}

function makeLogger() {
  return {
    events: [],
    logOperation(name, payload) {
      this.events.push({ name, payload });
    }
  };
}

describe('CacheManager - git-backed operations', () => {
  it('populateCache clones repo and writes metadata', async (t) => {
    const { cacheManager } = await createCacheManager(t);
    const repo = await createFixtureRepo(t);

    const repoPath = await cacheManager.populateCache(repo.repoUrl, repo.branch, { ttlHours: 6 });

    const repoStats = await fs.stat(repoPath);
    assert.ok(repoStats.isDirectory(), 'populateCache should clone repository into cache');

    const repoHash = cacheManager.generateRepoHash(repo.repoUrl, repo.branch);
    const metadata = await cacheManager.getCacheMetadata(repoHash);

    assert.strictEqual(metadata.repoUrl, repo.repoUrl);
    assert.strictEqual(metadata.branchName, repo.branch);
    assert.strictEqual(metadata.ttlHours, 6);
    assert.ok(metadata.lastUpdated, 'metadata should record lastUpdated timestamp');
    assert.ok(await File.exists(path.join(repoPath, 'template.json')));
  });

  it('ensureRepositoryCached reuses cached clone and logs cache hits', async (t) => {
    const { cacheManager } = await createCacheManager(t);
    const repo = await createFixtureRepo(t);
    const logger = makeLogger();

    const firstPath = await cacheManager.ensureRepositoryCached(repo.repoUrl, repo.branch, {}, logger);
    const secondPath = await cacheManager.ensureRepositoryCached(repo.repoUrl, repo.branch, {}, logger);

    assert.strictEqual(secondPath, firstPath, 'cached path should be reused when TTL is valid');
    assert.deepStrictEqual(logger.events.map(event => event.name), ['cache_miss', 'cache_hit']);
  });

  it('refreshCache re-clones repository and preserves TTL configuration', async (t) => {
    const { cacheManager } = await createCacheManager(t);
    const repo = await createFixtureRepo(t);

    await cacheManager.populateCache(repo.repoUrl, repo.branch, { ttlHours: 12 });
    const repoHash = cacheManager.generateRepoHash(repo.repoUrl, repo.branch);
    const beforeMetadata = await cacheManager.getCacheMetadata(repoHash);

    await new Promise((resolve) => setTimeout(resolve, 25));
    await cacheManager.refreshCache(repo.repoUrl, repo.branch);

    const afterMetadata = await cacheManager.getCacheMetadata(repoHash);
    assert.strictEqual(afterMetadata.ttlHours, beforeMetadata.ttlHours, 'refreshCache should keep existing TTL');
    assert.notStrictEqual(afterMetadata.lastUpdated, beforeMetadata.lastUpdated, 'refreshCache should update lastUpdated timestamp');
  });

  it('getCachedRepo returns null when cache entry is expired', async (t) => {
    const { cacheManager, cacheDir } = await createCacheManager(t);
    const repo = await createFixtureRepo(t);

    await cacheManager.populateCache(repo.repoUrl, repo.branch, { ttlHours: 1 });
    const repoHash = cacheManager.generateRepoHash(repo.repoUrl, repo.branch);
    const metadataPath = path.join(cacheDir, repoHash, 'metadata.json');
    const metadata = await cacheManager.getCacheMetadata(repoHash);

    metadata.lastUpdated = new Date(Date.now() - (48 * 60 * 60 * 1000)).toISOString();
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    const cachedPath = await cacheManager.getCachedRepo(repo.repoUrl, repo.branch);
    assert.strictEqual(cachedPath, null, 'expired cache entries should be ignored');
  });

  it('clearExpiredEntries removes expired and corrupted caches', async (t) => {
    const { cacheManager, cacheDir } = await createCacheManager(t);
    const repo = await createFixtureRepo(t);

    await cacheManager.populateCache(repo.repoUrl, repo.branch, { ttlHours: 1 });
    const repoHash = cacheManager.generateRepoHash(repo.repoUrl, repo.branch);
    const metadataPath = path.join(cacheDir, repoHash, 'metadata.json');
    const metadata = await cacheManager.getCacheMetadata(repoHash);
    metadata.lastUpdated = new Date(Date.now() - (72 * 60 * 60 * 1000)).toISOString();
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    const orphanHash = 'orphan-entry';
    await cacheManager.ensureRepoDirectory(orphanHash);
    await File.safeCleanup(path.join(cacheDir, orphanHash, 'metadata.json'));

    const removed = await cacheManager.clearExpiredEntries();
    assert.strictEqual(removed, 2, 'should remove both expired and corrupted entries');
    assert.strictEqual(await File.exists(path.join(cacheDir, repoHash)), false);
    assert.strictEqual(await File.exists(path.join(cacheDir, orphanHash)), false);
  });
});
