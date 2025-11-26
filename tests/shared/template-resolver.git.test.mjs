#!/usr/bin/env node

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TemplateResolver } from '../../bin/create-scaffold/modules/template-resolver.mts';
import { CacheManager } from '../../bin/create-scaffold/modules/cache-manager.mts';
import { File } from '../../lib/util/file.mts';
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

  it('resolveTemplate handles GitHub shorthand with explicit branch', async (t) => {
    const { cacheDir, repo } = await setupResolver(t, 'simple-template');
    const shorthandUrl = `example/simple#${repo.branch}`;
    const repoMap = new Map([[`https://github.com/example/simple`, fileURLToPath(repo.repoUrl)]]);
    const cacheManager2 = new FixtureCacheManager(cacheDir, repoMap);
    const resolver2 = new TemplateResolver(cacheManager2);

    const result = await resolver2.resolveTemplate(shorthandUrl, { branch: repo.branch });

    assert.ok(result.templatePath.includes(cacheDir));
    assert.strictEqual(result.metadata.id, 'fixtures/simple-template');
  });

  it('resolveTemplate uses cache on second access', async (t) => {
    const { resolver, repo, remoteUrl } = await setupResolver(t, 'simple-template');

    const first = await resolver.resolveTemplate(remoteUrl, { branch: repo.branch });
    const second = await resolver.resolveTemplate(remoteUrl, { branch: repo.branch });

    assert.strictEqual(second.templatePath, first.templatePath, 'should reuse cached path');
  });

  it('validateTemplateUrl rejects null bytes', async (t) => {
    const { resolver } = await setupResolver(t, 'simple-template');

    await assert.rejects(
      () => resolver.resolveTemplate('template\0injection', {}),
      (error) => error.message.includes('null byte'),
      'should reject null bytes'
    );
  });

  it('validateTemplateUrl rejects shell metacharacters', async (t) => {
    const { resolver } = await setupResolver(t, 'simple-template');

    await assert.rejects(
      () => resolver.resolveTemplate('template;rm -rf /', {}),
      (error) => error.message.includes('not accessible'),
      'should reject semicolons'
    );

    await assert.rejects(
      () => resolver.resolveTemplate('template|cat /etc/passwd', {}),
      (error) => error.message.includes('not accessible'),
      'should reject pipes'
    );

    await assert.rejects(
      () => resolver.resolveTemplate('template&whoami', {}),
      (error) => error.message.includes('not accessible'),
      'should reject ampersands'
    );

    await assert.rejects(
      () => resolver.resolveTemplate('template`whoami`', {}),
      (error) => error.message.includes('not accessible'),
      'should reject backticks'
    );
  });

  it('validateTemplateUrl rejects path traversal attempts', async (t) => {
    const { resolver } = await setupResolver(t, 'simple-template');

    await assert.rejects(
      () => resolver.resolveTemplate('../../../etc/passwd', {}),
      (error) => error.message.includes('Invalid template path'),
      'should reject path traversal'
    );
  });

  it('parseTemplateUrl handles local paths', async (t) => {
    const { resolver } = await setupResolver(t, 'simple-template');

    const local1 = resolver.parseTemplateUrl('./my-template');
    assert.strictEqual(local1.type, 'local');
    assert.strictEqual(local1.path, './my-template');

    const local2 = resolver.parseTemplateUrl('/absolute/path/template');
    assert.strictEqual(local2.type, 'local');
    assert.strictEqual(local2.path, '/absolute/path/template');
  });

  it('parseTemplateUrl handles GitHub shorthand variations', async (t) => {
    const { resolver } = await setupResolver(t, 'simple-template');

    const shorthand1 = resolver.parseTemplateUrl('owner/repo');
    assert.strictEqual(shorthand1.type, 'github-shorthand');
    assert.strictEqual(shorthand1.owner, 'owner');
    assert.strictEqual(shorthand1.repo, 'repo');
    assert.strictEqual(shorthand1.subpath, '');

    const shorthand2 = resolver.parseTemplateUrl('owner/repo#branch');
    assert.strictEqual(shorthand2.type, 'github-shorthand');
    assert.strictEqual(shorthand2.branch, 'branch');

    const shorthand3 = resolver.parseTemplateUrl('owner/repo/path/to/template');
    assert.strictEqual(shorthand3.subpath, 'path/to/template');

    const shorthand4 = resolver.parseTemplateUrl('owner/repo.git');
    assert.strictEqual(shorthand4.repo, 'repo', 'should strip .git suffix');
  });

  it('parseTemplateUrl handles registry URLs', async (t) => {
    const { resolver } = await setupResolver(t, 'simple-template');

    const registry1 = resolver.parseTemplateUrl('registry/template-name');
    assert.strictEqual(registry1.type, 'registry');
    assert.strictEqual(registry1.namespace, 'official');
    assert.strictEqual(registry1.template, 'template-name');

    const registry2 = resolver.parseTemplateUrl('official/namespace/template-name');
    assert.strictEqual(registry2.type, 'registry');
    assert.strictEqual(registry2.namespace, 'namespace');
    assert.strictEqual(registry2.template, 'template-name');
  });

  it('parseFullUrl handles GitHub URLs with tree paths', async (t) => {
    const { resolver } = await setupResolver(t, 'simple-template');

    const treeUrl = resolver.parseFullUrl('https://github.com/owner/repo/tree/branch-name/path/to/template');
    assert.strictEqual(treeUrl.type, 'github-branch');
    assert.strictEqual(treeUrl.owner, 'owner');
    assert.strictEqual(treeUrl.repo, 'repo');
    assert.strictEqual(treeUrl.branch, 'branch-name');
    assert.strictEqual(treeUrl.subpath, 'path/to/template');
  });

  it('parseFullUrl handles GitHub URLs without tree paths', async (t) => {
    const { resolver } = await setupResolver(t, 'simple-template');

    const repoUrl = resolver.parseFullUrl('https://github.com/owner/repo');
    assert.strictEqual(repoUrl.type, 'github-repo');
    assert.strictEqual(repoUrl.owner, 'owner');
    assert.strictEqual(repoUrl.repo, 'repo');
    assert.strictEqual(repoUrl.subpath, '');
  });

  it('parseFullUrl handles tarball URLs', async (t) => {
    const { resolver } = await setupResolver(t, 'simple-template');

    const tarUrl = resolver.parseFullUrl('https://example.com/template.tar.gz');
    assert.strictEqual(tarUrl.type, 'tarball');
    assert.strictEqual(tarUrl.url, 'https://example.com/template.tar.gz');
  });

  it('resolveToPath throws on unsupported github-archive type', async (t) => {
    const { resolver } = await setupResolver(t, 'simple-template');

    await assert.rejects(
      () => resolver.resolveToPath({ type: 'github-archive' }),
      (error) => error.message.includes('archive URLs not yet supported'),
      'should reject github-archive'
    );
  });

  it('resolveToPath throws on unsupported tarball type', async (t) => {
    const { resolver } = await setupResolver(t, 'simple-template');

    await assert.rejects(
      () => resolver.resolveToPath({ type: 'tarball' }),
      (error) => error.message.includes('Tarball URLs not yet supported'),
      'should reject tarballs'
    );
  });

  it('resolveToPath throws on completely unsupported type', async (t) => {
    const { resolver } = await setupResolver(t, 'simple-template');

    await assert.rejects(
      () => resolver.resolveToPath({ type: 'unknown-type' }),
      (error) => error.message.includes('Unsupported URL type'),
      'should reject unknown types'
    );
  });

  it('resolveRegistryAlias returns original URL when no config', async (t) => {
    const { resolver } = await setupResolver(t, 'simple-template', () => ({}));

    const result = resolver.resolveRegistryAlias('fixtures/template');
    assert.strictEqual(result, 'fixtures/template');
  });

  it('resolveRegistryAlias handles legacy registries format', async (t) => {
    const config = {
      defaults: {
        registries: {
          legacy: {
            'my-template': 'https://example.com/template.git'
          }
        }
      }
    };
    const cacheDir = await createCacheDir(t);
    const resolver = new TemplateResolver(new CacheManager(cacheDir), config);

    const result = resolver.resolveRegistryAlias('legacy/my-template');
    assert.strictEqual(result, 'https://example.com/template.git');
  });

  it('resolveRegistryAlias ignores non-legacy registry formats', async (t) => {
    const config = {
      defaults: {
        registries: {
          modern: {
            type: 'git',
            url: 'https://example.com'
          }
        }
      }
    };
    const cacheDir = await createCacheDir(t);
    const resolver = new TemplateResolver(new CacheManager(cacheDir), config);

    const result = resolver.resolveRegistryAlias('modern/template');
    assert.strictEqual(result, 'modern/template', 'should not resolve non-legacy formats');
  });

  it('resolveRegistryAlias returns original when template not in alias', async (t) => {
    const config = {
      defaults: {
        templates: {
          fixtures: {
            known: 'https://example.com/known.git'
          }
        }
      }
    };
    const cacheDir = await createCacheDir(t);
    const resolver = new TemplateResolver(new CacheManager(cacheDir), config);

    const result = resolver.resolveRegistryAlias('fixtures/unknown');
    assert.strictEqual(result, 'fixtures/unknown', 'should return original for unknown templates');
  });
});
