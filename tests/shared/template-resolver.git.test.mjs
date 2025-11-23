#!/usr/bin/env node

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TemplateResolver } from '../../bin/create-scaffold/modules/template-resolver.mjs';
import { CacheManager } from '../../bin/create-scaffold/modules/cache-manager.mjs';
import { File } from '../../lib/utils/file.mjs';
import { GitFixtureManager } from '../helpers/git-fixtures.mjs';

class FixtureCacheManager extends CacheManager {
  constructor(cacheDir, repoMap) {
    super(cacheDir);
    this.repoMap = repoMap;
  }

  normalizeRepoUrl(repoUrl) {
    if (this.repoMap.has(repoUrl)) {
      return this.repoMap.get(repoUrl);
    }
    return super.normalizeRepoUrl(repoUrl);
  }

  async checkRepositoryAccess(repoUrl) {
    if (this.repoMap.has(repoUrl)) {
      return true;
    }
    return super.checkRepositoryAccess(repoUrl);
  }
}

async function createCacheDir(testContext) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'template-resolver-git-cache-'));
  if (testContext?.after) {
    testContext.after(async () => {
      await File.safeCleanup(dir);
    });
  }
  return dir;
}

function buildRemoteUrl(fixtureName) {
  return `https://example.com/${fixtureName}-${Date.now()}.git`;
}

async function setupResolver(testContext, fixtureName, configBuilder = () => ({})) {
  const cacheDir = await createCacheDir(testContext);
  const fixtureManager = await GitFixtureManager.create(testContext);
  const repo = await fixtureManager.createBareRepo(fixtureName);
  const remoteUrl = buildRemoteUrl(fixtureName);
  const repoPath = fileURLToPath(repo.repoUrl);
  const repoMap = new Map([[remoteUrl, repoPath]]);
  const cacheManager = new FixtureCacheManager(cacheDir, repoMap);
  const config = typeof configBuilder === 'function'
    ? configBuilder({ repo, remoteUrl })
    : (configBuilder ?? {});
  const resolver = new TemplateResolver(cacheManager, config);
  return { resolver, cacheManager, cacheDir, repo, remoteUrl };
}

describe('TemplateResolver - git-backed integration', () => {
  it('resolveTemplate clones git repositories via direct URLs and reads metadata', async (t) => {
    const { resolver, cacheManager, cacheDir, repo, remoteUrl } = await setupResolver(t, 'simple-template');

    const result = await resolver.resolveTemplate(remoteUrl, { branch: repo.branch });

    const { repoHash } = cacheManager.resolveRepoDirectory(remoteUrl, repo.branch);
    const expectedPath = path.join(cacheDir, repoHash);

    assert.strictEqual(result.templatePath, expectedPath, 'template path should match cached clone');
    assert.strictEqual(result.metadata.id, 'fixtures/simple-template');
    assert.strictEqual(result.metadata.name, 'Simple Template');
    assert.ok(await File.exists(path.join(expectedPath, 'template.json')));
    assert.ok(await File.exists(path.join(expectedPath, 'metadata.json')));
  });

  it('resolveTemplate refreshes expired caches when resolving registry aliases', async (t) => {
    const { resolver, cacheManager, cacheDir, repo, remoteUrl } = await setupResolver(
      t,
      'simple-template',
      ({ remoteUrl: aliasUrl }) => ({
        defaults: {
          templates: {
            fixtures: {
              simple: aliasUrl
            }
          }
        }
      })
    );

    const first = await resolver.resolveTemplate('fixtures/simple', { branch: repo.branch });
    const { repoHash } = cacheManager.resolveRepoDirectory(remoteUrl, repo.branch);
    const metadataPath = path.join(cacheDir, repoHash, 'metadata.json');
    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));

    metadata.lastUpdated = new Date(Date.now() - (72 * 60 * 60 * 1000)).toISOString();
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    const second = await resolver.resolveTemplate('fixtures/simple', { branch: repo.branch });
    const updatedMetadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));

    assert.strictEqual(second.templatePath, first.templatePath, 'cache directory should be reused');
    assert.ok(
      new Date(updatedMetadata.lastUpdated) > new Date(metadata.lastUpdated),
      'metadata lastUpdated timestamp should advance after refresh'
    );
  });
});
