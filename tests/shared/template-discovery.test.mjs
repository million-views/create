#!/usr/bin/env node

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { tmpdir } from 'os';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { TemplateDiscovery, loadTemplateMetadataFromPath } from '../../bin/create-scaffold/modules/utils/template-discovery.mjs';

// Mock CacheManager for testing
class MockCacheManager {
  constructor() {
    this.cache = new Map();
  }

  async getCachedRepo(repoUrl, branchName = 'main') {
    return this.cache.get(`${repoUrl}:${branchName}`) || null;
  }

  setCachedRepo(repoUrl, branchName, repoPath) {
    this.cache.set(`${repoUrl}:${branchName}`, repoPath);
  }
}

describe('Template Discovery', () => {
  let tempDir;
  let mockCacheManager;

  before(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'template-discovery-test-'));
    mockCacheManager = new MockCacheManager();
  });

  after(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('TemplateDiscovery Class', () => {
    let discovery;

    beforeEach(() => {
      discovery = new TemplateDiscovery(mockCacheManager);
    });

    it('constructor sets cacheManager', () => {
      assert.strictEqual(discovery.cacheManager, mockCacheManager);
    });

    describe('listTemplates()', () => {
      it('throws error when repository is not cached', async () => {
        await assert.rejects(
          discovery.listTemplates('https://github.com/user/repo'),
          /Repository https:\/\/github\.com\/user\/repo \(main\) is not cached/
        );
      });

      it('returns templates when repository is cached', async () => {
        const repoPath = path.join(tempDir, 'cached-repo');
        await mkdir(repoPath);
        mockCacheManager.setCachedRepo('https://github.com/user/repo', 'main', repoPath);

        // Create a mock template directory
        const templatePath = path.join(repoPath, 'my-template');
        await mkdir(templatePath);
        await writeFile(path.join(templatePath, 'package.json'), '{"name": "my-template"}');

        const templates = await discovery.listTemplates('https://github.com/user/repo');
        assert.strictEqual(templates.length, 1);
        assert.strictEqual(templates[0].name, 'my-template');
      });

      it('uses specified branch name', async () => {
        const repoPath = path.join(tempDir, 'cached-repo-branch');
        await mkdir(repoPath);
        mockCacheManager.setCachedRepo('https://github.com/user/repo', 'develop', repoPath);

        const templates = await discovery.listTemplates('https://github.com/user/repo', 'develop');
        assert(Array.isArray(templates));
      });
    });

    describe('listTemplatesFromPath()', () => {
      it('throws error for non-existent path', async () => {
        const nonExistentPath = path.join(tempDir, 'does-not-exist');
        await assert.rejects(
          discovery.listTemplatesFromPath(nonExistentPath),
          /Repository path not found/
        );
      });

      it('returns empty array for directory with no templates', async () => {
        const emptyRepoPath = path.join(tempDir, 'empty-repo');
        await mkdir(emptyRepoPath);

        const templates = await discovery.listTemplatesFromPath(emptyRepoPath);
        assert.deepStrictEqual(templates, []);
      });

      it('discovers templates with package.json', async () => {
        const repoPath = path.join(tempDir, 'repo-with-templates');
        await mkdir(repoPath);

        // Create template directory
        const templatePath = path.join(repoPath, 'template1');
        await mkdir(templatePath);
        await writeFile(path.join(templatePath, 'package.json'), '{"name": "template1", "description": "A template"}');

        // Create non-template directory
        const nonTemplatePath = path.join(repoPath, 'not-a-template');
        await mkdir(nonTemplatePath);
        await writeFile(path.join(nonTemplatePath, 'readme.txt'), 'not a template');

        const templates = await discovery.listTemplatesFromPath(repoPath);
        assert.strictEqual(templates.length, 1);
        assert.strictEqual(templates[0].name, 'template1');
        assert.strictEqual(templates[0].description, 'A template');
      });

      it('skips common non-template directories', async () => {
        const repoPath = path.join(tempDir, 'repo-with-skip-dirs');
        await mkdir(repoPath);

        // Create directories that should be skipped
        const skipDirs = ['.git', 'node_modules', '.github', '.vscode', '.kiro', '.hidden'];
        for (const dir of skipDirs) {
          await mkdir(path.join(repoPath, dir));
          await writeFile(path.join(repoPath, dir, 'package.json'), '{"name": "should-be-skipped"}');
        }

        const templates = await discovery.listTemplatesFromPath(repoPath);
        assert.strictEqual(templates.length, 0);
      });

      it('handles multiple templates', async () => {
        const repoPath = path.join(tempDir, 'repo-multi-templates');
        await mkdir(repoPath);

        // Create multiple template directories
        for (let i = 1; i <= 3; i++) {
          const templatePath = path.join(repoPath, `template${i}`);
          await mkdir(templatePath);
          await writeFile(path.join(templatePath, 'package.json'), `{"name": "template${i}"}`);
        }

        const templates = await discovery.listTemplatesFromPath(repoPath);
        assert.strictEqual(templates.length, 3);
        const names = templates.map(t => t.name).sort();
        assert.deepStrictEqual(names, ['template1', 'template2', 'template3']);
      });
    });

    describe('isTemplateDirectory()', () => {
      it('returns true for directory with package.json', async () => {
        const templatePath = path.join(tempDir, 'template-with-package');
        await mkdir(templatePath);
        await writeFile(path.join(templatePath, 'package.json'), '{"name": "test"}');

        const result = await discovery.isTemplateDirectory(templatePath);
        assert.strictEqual(result, true);
      });

      it('returns true for directory with index.js', async () => {
        const templatePath = path.join(tempDir, 'template-with-index');
        await mkdir(templatePath);
        await writeFile(path.join(templatePath, 'index.js'), 'console.log("hello");');

        const result = await discovery.isTemplateDirectory(templatePath);
        assert.strictEqual(result, true);
      });

      it('returns true for directory with src folder', async () => {
        const templatePath = path.join(tempDir, 'template-with-src');
        await mkdir(templatePath);
        await mkdir(path.join(templatePath, 'src'));

        const result = await discovery.isTemplateDirectory(templatePath);
        assert.strictEqual(result, true);
      });

      it('returns false for directory without template indicators', async () => {
        const nonTemplatePath = path.join(tempDir, 'not-a-template');
        await mkdir(nonTemplatePath);
        await writeFile(path.join(nonTemplatePath, 'readme.txt'), 'just a readme');

        const result = await discovery.isTemplateDirectory(nonTemplatePath);
        assert.strictEqual(result, false);
      });

      it('returns false for non-existent directory', async () => {
        const nonExistentPath = path.join(tempDir, 'does-not-exist');
        const result = await discovery.isTemplateDirectory(nonExistentPath);
        assert.strictEqual(result, false);
      });
    });

    describe('getTemplateMetadata()', () => {
      it('returns basic metadata for template directory', async () => {
        const templatePath = path.join(tempDir, 'basic-template');
        await mkdir(templatePath);

        const metadata = await discovery.getTemplateMetadata(templatePath);
        assert.strictEqual(metadata.name, 'basic-template');
        assert.strictEqual(metadata.handle, 'basic-template');
        assert.strictEqual(metadata.description, 'No description available');
        assert.strictEqual(metadata.version, null);
        assert.strictEqual(metadata.author, null);
        assert.deepStrictEqual(metadata.tags, []);
      });

      it('loads metadata from template.json', async () => {
        const templatePath = path.join(tempDir, 'template-json-template');
        await mkdir(templatePath);
        await writeFile(path.join(templatePath, 'template.json'), JSON.stringify({
          name: 'Custom Name',
          description: 'Custom description',
          version: '1.0.0',
          author: 'Test Author',
          tags: ['tag1', 'tag2']
        }));

        const metadata = await discovery.getTemplateMetadata(templatePath);
        assert.strictEqual(metadata.name, 'Custom Name');
        assert.strictEqual(metadata.description, 'Custom description');
        assert.strictEqual(metadata.version, '1.0.0');
        assert.strictEqual(metadata.author, 'Test Author');
        assert.deepStrictEqual(metadata.tags, ['tag1', 'tag2']);
      });

      it('supplements metadata from package.json', async () => {
        const templatePath = path.join(tempDir, 'package-json-template');
        await mkdir(templatePath);
        await writeFile(path.join(templatePath, 'package.json'), JSON.stringify({
          name: 'package-name',
          description: 'Package description',
          version: '2.0.0',
          author: 'Package Author',
          keywords: ['keyword1', 'keyword2']
        }));

        const metadata = await discovery.getTemplateMetadata(templatePath);
        assert.strictEqual(metadata.name, 'package-name');
        assert.strictEqual(metadata.description, 'Package description');
        assert.strictEqual(metadata.version, '2.0.0');
        assert.strictEqual(metadata.author, 'Package Author');
        assert.deepStrictEqual(metadata.tags, ['keyword1', 'keyword2']);
      });

      it('template.json takes priority over package.json', async () => {
        const templatePath = path.join(tempDir, 'priority-template');
        await mkdir(templatePath);
        await writeFile(path.join(templatePath, 'template.json'), JSON.stringify({
          name: 'Template Name',
          description: 'Template description'
        }));
        await writeFile(path.join(templatePath, 'package.json'), JSON.stringify({
          name: 'Package Name',
          description: 'Package description'
        }));

        const metadata = await discovery.getTemplateMetadata(templatePath);
        assert.strictEqual(metadata.name, 'Template Name');
        assert.strictEqual(metadata.description, 'Template description');
      });
    });

    describe('parseTemplateJson()', () => {
      it('returns parsed JSON from template.json', async () => {
        const templatePath = path.join(tempDir, 'parse-template-json');
        await mkdir(templatePath);
        const templateData = { name: 'test', version: '1.0.0' };
        await writeFile(path.join(templatePath, 'template.json'), JSON.stringify(templateData));

        const result = await discovery.parseTemplateJson(templatePath);
        assert.deepStrictEqual(result, templateData);
      });

      it('returns null when template.json does not exist', async () => {
        const templatePath = path.join(tempDir, 'no-template-json');
        await mkdir(templatePath);

        const result = await discovery.parseTemplateJson(templatePath);
        assert.strictEqual(result, null);
      });

      it('returns null when template.json contains invalid JSON', async () => {
        const templatePath = path.join(tempDir, 'invalid-template-json');
        await mkdir(templatePath);
        await writeFile(path.join(templatePath, 'template.json'), 'invalid json content');

        const result = await discovery.parseTemplateJson(templatePath);
        assert.strictEqual(result, null);
      });
    });

    describe('parsePackageJson()', () => {
      it('returns parsed JSON from package.json', async () => {
        const templatePath = path.join(tempDir, 'parse-package-json');
        await mkdir(templatePath);
        const packageData = { name: 'test-package', version: '1.0.0' };
        await writeFile(path.join(templatePath, 'package.json'), JSON.stringify(packageData));

        const result = await discovery.parsePackageJson(templatePath);
        assert.deepStrictEqual(result, packageData);
      });

      it('returns null when package.json does not exist', async () => {
        const templatePath = path.join(tempDir, 'no-package-json');
        await mkdir(templatePath);

        const result = await discovery.parsePackageJson(templatePath);
        assert.strictEqual(result, null);
      });
    });

    describe('normalizePackageAuthor()', () => {
      it('returns string author unchanged', () => {
        const result = discovery.normalizePackageAuthor('John Doe');
        assert.strictEqual(result, 'John Doe');
      });

      it('formats object author correctly', () => {
        const author = { name: 'John Doe', email: 'john@example.com', url: 'https://example.com' };
        const result = discovery.normalizePackageAuthor(author);
        assert.strictEqual(result, 'John Doe <john@example.com> https://example.com');
      });

      it('handles partial object author', () => {
        const author = { name: 'John Doe', email: 'john@example.com' };
        const result = discovery.normalizePackageAuthor(author);
        assert.strictEqual(result, 'John Doe <john@example.com>');
      });

      it('returns null for falsy values', () => {
        assert.strictEqual(discovery.normalizePackageAuthor(null), null);
        assert.strictEqual(discovery.normalizePackageAuthor(undefined), null);
        assert.strictEqual(discovery.normalizePackageAuthor(''), null);
      });

      it('returns null for invalid author types', () => {
        assert.strictEqual(discovery.normalizePackageAuthor(123), null);
        assert.strictEqual(discovery.normalizePackageAuthor([]), null);
      });
    });

    describe('parseReadmeFrontmatter()', () => {
      it('parses valid frontmatter', async () => {
        const templatePath = path.join(tempDir, 'frontmatter-template');
        await mkdir(templatePath);
        const readmeContent = `---
name: Frontmatter Name
description: Frontmatter description
version: 1.0.0
tags:
  - tag1
  - tag2
---

# Template README
`;
        await writeFile(path.join(templatePath, 'README.md'), readmeContent);

        const result = await discovery.parseReadmeFrontmatter(templatePath);
        assert.deepStrictEqual(result, {
          name: 'Frontmatter Name',
          description: 'Frontmatter description',
          version: '1.0.0',
          tags: ['tag1', 'tag2']
        });
      });

      it('returns null when README.md does not exist', async () => {
        const templatePath = path.join(tempDir, 'no-readme');
        await mkdir(templatePath);

        const result = await discovery.parseReadmeFrontmatter(templatePath);
        assert.strictEqual(result, null);
      });

      it('returns null when README.md has no frontmatter', async () => {
        const templatePath = path.join(tempDir, 'no-frontmatter');
        await mkdir(templatePath);
        await writeFile(path.join(templatePath, 'README.md'), '# Just a regular README');

        const result = await discovery.parseReadmeFrontmatter(templatePath);
        assert.strictEqual(result, null);
      });

      it('returns null when frontmatter is malformed', async () => {
        const templatePath = path.join(tempDir, 'malformed-frontmatter');
        await mkdir(templatePath);
        await writeFile(path.join(templatePath, 'README.md'), '---\nname: test\n(no closing delimiter)');

        const result = await discovery.parseReadmeFrontmatter(templatePath);
        assert.strictEqual(result, null);
      });
    });

    describe('parseSimpleYaml()', () => {
      it('parses simple key-value pairs', () => {
        const yaml = 'name: Test Name\ndescription: Test Description\nversion: 1.0.0';
        const result = discovery.parseSimpleYaml(yaml);

        assert.deepStrictEqual(result, {
          name: 'Test Name',
          description: 'Test Description',
          version: '1.0.0'
        });
      });

      it('parses arrays', () => {
        const yaml = 'tags:\n  - tag1\n  - tag2\n  - tag3';
        const result = discovery.parseSimpleYaml(yaml);

        assert.deepStrictEqual(result, {
          tags: ['tag1', 'tag2', 'tag3']
        });
      });

      it('ignores comments and empty lines', () => {
        const yaml = '# This is a comment\n\nname: Test\n\n# Another comment\ndescription: Desc';
        const result = discovery.parseSimpleYaml(yaml);

        assert.deepStrictEqual(result, {
          name: 'Test',
          description: 'Desc'
        });
      });
    });

    describe('formatTemplateList()', () => {
      it('formats empty template list', () => {
        const result = discovery.formatTemplateList([]);
        assert(result.includes('No templates found'));
      });

      it('formats single template', () => {
        const templates = [{
          name: 'test-template',
          description: 'A test template',
          version: '1.0.0',
          author: 'Test Author',
          tags: ['tag1', 'tag2']
        }];

        const result = discovery.formatTemplateList(templates);
        assert(result.includes('Found 1 template'));
        assert(result.includes('📦 test-template'));
        assert(result.includes('A test template'));
        assert(result.includes('v1.0.0'));
        assert(result.includes('by Test Author'));
        assert(result.includes('tags: tag1, tag2'));
      });

      it('formats multiple templates with separators', () => {
        const templates = [
          { name: 'template1', description: 'First template' },
          { name: 'template2', description: 'Second template' }
        ];

        const result = discovery.formatTemplateList(templates);
        assert(result.includes('Found 2 templates'));
        assert(result.includes('template1'));
        assert(result.includes('template2'));
        assert(result.includes('─'.repeat(60))); // Separator
      });
    });

    describe('formatTemplateEntry()', () => {
      it('formats template with all metadata', () => {
        const template = {
          name: 'Test Template',
          handle: 'test-handle',
          description: 'A test template',
          version: '1.0.0',
          author: 'Test Author',
          tags: ['tag1', 'tag2']
        };

        const result = discovery.formatTemplateEntry(template);
        assert(result.includes('📦 Test Template (test-handle)'));
        assert(result.includes('A test template'));
        assert(result.includes('v1.0.0 • by Test Author • tags: tag1, tag2'));
      });

      it('formats template with minimal metadata', () => {
        const template = {
          name: 'Minimal Template',
          description: 'No description available'
        };

        const result = discovery.formatTemplateEntry(template);
        assert(result.includes('📦 Minimal Template'));
        assert(result.includes('No description available'));
      });
    });

    describe('formatTemplateOptions()', () => {
      it('formats templates for interactive selection', () => {
        const templates = [
          {
            name: 'Template 1',
            handle: 'handle1',
            description: 'Description 1',
            tags: ['tag1'],
            canonicalVariables: ['var1'],
            handoff: ['step1'],
            placeholders: ['placeholder1']
          },
          {
            name: 'Template 2',
            handle: 'handle2',
            description: 'Description 2',
            tags: [],
            canonicalVariables: [],
            handoff: [],
            placeholders: []
          }
        ];

        const result = discovery.formatTemplateOptions(templates);

        assert.strictEqual(result.length, 2);
        assert.strictEqual(result[0].id, 1);
        assert.strictEqual(result[0].name, 'Template 1');
        assert.strictEqual(result[0].handle, 'handle1');
        assert.strictEqual(result[0].description, 'Description 1');
        assert.deepStrictEqual(result[0].tags, ['tag1']);
        assert.deepStrictEqual(result[0].canonicalVariables, ['var1']);
        assert.deepStrictEqual(result[0].handoff, ['step1']);
        assert.deepStrictEqual(result[0].placeholders, ['placeholder1']);

        assert.strictEqual(result[1].id, 2);
        assert.strictEqual(result[1].name, 'Template 2');
        assert.strictEqual(result[1].handle, 'handle2');
        assert.strictEqual(result[1].description, 'Description 2');
        assert.deepStrictEqual(result[1].tags, []);
        assert.deepStrictEqual(result[1].canonicalVariables, []);
        assert.deepStrictEqual(result[1].handoff, []);
        assert.deepStrictEqual(result[1].placeholders, []);
      });

      it('handles templates with missing arrays', () => {
        const templates = [
          {
            name: 'Template',
            description: 'Description'
            // missing tags, canonicalVariables, handoff, placeholders
          }
        ];

        const result = discovery.formatTemplateOptions(templates);

        assert.deepStrictEqual(result[0].tags, []);
        assert.deepStrictEqual(result[0].canonicalVariables, []);
        assert.deepStrictEqual(result[0].handoff, []);
        assert.deepStrictEqual(result[0].placeholders, []);
      });
    });
  });

  describe('loadTemplateMetadataFromPath()', () => {
    it('returns default metadata when template.json does not exist', async () => {
      const templatePath = path.join(tempDir, 'no-template-json-unique');
      await mkdir(templatePath);

      const result = await loadTemplateMetadataFromPath(templatePath);

      assert.strictEqual(result.raw, null);
      assert.strictEqual(result.name, null);
      assert.strictEqual(result.description, null);
      assert.strictEqual(result.version, null);
      assert.deepStrictEqual(result.handoff, []);
      assert.deepStrictEqual(result.placeholders, []);
      assert.deepStrictEqual(result.canonicalVariables, []);
    });

    it('throws error for invalid JSON in template.json', async () => {
      const templatePath = path.join(tempDir, 'invalid-json');
      await mkdir(templatePath);
      await writeFile(path.join(templatePath, 'template.json'), 'invalid json');

      await assert.rejects(
        loadTemplateMetadataFromPath(templatePath),
        /template\.json contains invalid JSON/
      );
    });

    it('handles old schema format', async () => {
      const templatePath = path.join(tempDir, 'old-schema');
      await mkdir(templatePath);
      const templateData = {
        name: 'Old Schema Template',
        description: 'Old format',
        version: '1.0.0'
      };
      await writeFile(path.join(templatePath, 'template.json'), JSON.stringify(templateData));

      const result = await loadTemplateMetadataFromPath(templatePath);

      assert.deepStrictEqual(result.raw, templateData);
      assert.strictEqual(result.name, 'Old Schema Template');
      assert.strictEqual(result.description, 'Old format');
      assert.strictEqual(result.version, '1.0.0');
    });

    // Note: Testing new schema format (v1.0.0) would require more complex mocking
    // of the TemplateValidator and related dependencies, which is beyond the scope
    // of this basic test suite.
  });
});
