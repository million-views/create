#!/usr/bin/env node

import { strict as assert } from 'assert';
import fs from '../../promises';
import path from 'path';
import os from 'os';
import { TemplateDiscovery } from '../../bin/create-scaffold/template-discovery.mjs';
import { CacheManager } from '../../bin/create-scaffold/cache-manager.mjs';

/**
 * Test suite for Template Discovery module
 * Tests template metadata parsing, formatted output generation, and cache integration
 */

class TemplateDiscoveryTestSuite {
  constructor() {
    this.tempPaths = [];
    this.testCount = 0;
    this.passedCount = 0;
  }

  async createTempDir(suffix = '') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 9);
    const dirName = `template-discovery-test-${timestamp}-${random}${suffix}`;
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
    console.log('🧪 Running Template Discovery Tests\n');

    try {
      // Test 4.2: Template metadata parsing
      await this.testTemplateMetadataParsing();

      // Test 4.1: Template listing functionality
      await this.testTemplateListingFunctionality();

      // Test 4.3: Cache system integration
      await this.testCacheSystemIntegration();

      // Test formatted output generation and error handling
      await this.testFormattedOutputGeneration();
      await this.testErrorHandling();

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

  async testTemplateMetadataParsing() {
    console.log('📋 Testing template metadata parsing...');

    await this.test('parseTemplateJson parses valid template.json files', async () => {
      const tempDir = await this.createTempDir('-template-json');
      const cacheManager = new CacheManager(tempDir);
      const discovery = new TemplateDiscovery(cacheManager);

      // Create template directory with template.json
      const templateDir = path.join(tempDir, 'react-app');
      await fs.mkdir(templateDir, { recursive: true });

      const templateMetadata = {
        name: 'react-typescript',
        description: 'React application with TypeScript and modern tooling',
        version: '1.0.0',
        author: 'Million Views',
        tags: ['react', 'typescript', 'vite'],
        requirements: {
          node: '>=18.0.0'
        }
      };

      await fs.writeFile(
        path.join(templateDir, 'template.json'),
        JSON.stringify(templateMetadata, null, 2)
      );

      const parsed = await discovery.parseTemplateJson(templateDir);

      assert.deepStrictEqual(parsed, templateMetadata, 'Should parse template.json correctly');
    });

    await this.test('parseTemplateJson handles missing template.json files', async () => {
      const tempDir = await this.createTempDir('-missing-template-json');
      const cacheManager = new CacheManager(tempDir);
      const discovery = new TemplateDiscovery(cacheManager);

      // Create template directory without template.json
      const templateDir = path.join(tempDir, 'simple-app');
      await fs.mkdir(templateDir, { recursive: true });

      const parsed = await discovery.parseTemplateJson(templateDir);

      assert.strictEqual(parsed, null, 'Should return null for missing template.json');
    });

    await this.test('parseTemplateJson handles malformed JSON gracefully', async () => {
      const tempDir = await this.createTempDir('-malformed-json');
      const cacheManager = new CacheManager(tempDir);
      const discovery = new TemplateDiscovery(cacheManager);

      // Create template directory with malformed template.json
      const templateDir = path.join(tempDir, 'broken-app');
      await fs.mkdir(templateDir, { recursive: true });

      await fs.writeFile(
        path.join(templateDir, 'template.json'),
        '{ invalid json content'
      );

      const parsed = await discovery.parseTemplateJson(templateDir);

      assert.strictEqual(parsed, null, 'Should return null for malformed JSON');
    });

    await this.test('parseReadmeFrontmatter extracts frontmatter from README files', async () => {
      const tempDir = await this.createTempDir('-readme-frontmatter');
      const cacheManager = new CacheManager(tempDir);
      const discovery = new TemplateDiscovery(cacheManager);

      // Create template directory with README containing frontmatter
      const templateDir = path.join(tempDir, 'vue-app');
      await fs.mkdir(templateDir, { recursive: true });

      const readmeContent = `---
name: Vue 3 Application
description: Modern Vue 3 app with Composition API and TypeScript
version: 2.1.0
tags:
  - vue
  - typescript
  - composition-api
---

# Vue 3 Application Template

This template provides a modern Vue 3 application setup.
`;

      await fs.writeFile(path.join(templateDir, 'README.md'), readmeContent);

      const parsed = await discovery.parseReadmeFrontmatter(templateDir);

      assert.strictEqual(parsed.name, 'Vue 3 Application', 'Should extract name from frontmatter');
      assert.strictEqual(parsed.description, 'Modern Vue 3 app with Composition API and TypeScript', 'Should extract description');
      assert.strictEqual(parsed.version, '2.1.0', 'Should extract version');
      assert.deepStrictEqual(parsed.tags, ['vue', 'typescript', 'composition-api'], 'Should extract tags array');
    });

    await this.test('parseReadmeFrontmatter handles README without frontmatter', async () => {
      const tempDir = await this.createTempDir('-no-frontmatter');
      const cacheManager = new CacheManager(tempDir);
      const discovery = new TemplateDiscovery(cacheManager);

      // Create template directory with README without frontmatter
      const templateDir = path.join(tempDir, 'plain-app');
      await fs.mkdir(templateDir, { recursive: true });

      const readmeContent = `# Plain Application Template

This is a simple template without frontmatter.
`;

      await fs.writeFile(path.join(templateDir, 'README.md'), readmeContent);

      const parsed = await discovery.parseReadmeFrontmatter(templateDir);

      assert.strictEqual(parsed, null, 'Should return null for README without frontmatter');
    });

    await this.test('parseReadmeFrontmatter handles missing README files', async () => {
      const tempDir = await this.createTempDir('-missing-readme');
      const cacheManager = new CacheManager(tempDir);
      const discovery = new TemplateDiscovery(cacheManager);

      // Create template directory without README
      const templateDir = path.join(tempDir, 'no-readme-app');
      await fs.mkdir(templateDir, { recursive: true });

      const parsed = await discovery.parseReadmeFrontmatter(templateDir);

      assert.strictEqual(parsed, null, 'Should return null for missing README');
    });

    await this.test('getTemplateMetadata combines template.json and README frontmatter', async () => {
      const tempDir = await this.createTempDir('-combined-metadata');
      const cacheManager = new CacheManager(tempDir);
      const discovery = new TemplateDiscovery(cacheManager);

      // Create template directory with both template.json and README frontmatter
      const templateDir = path.join(tempDir, 'combined-app');
      await fs.mkdir(templateDir, { recursive: true });

      // template.json has priority
      const templateJson = {
        name: 'Combined App',
        description: 'App with both JSON and frontmatter',
        version: '1.0.0'
      };

      await fs.writeFile(
        path.join(templateDir, 'template.json'),
        JSON.stringify(templateJson, null, 2)
      );

      // README frontmatter provides additional info
      const readmeContent = `---
author: Test Author
tags:
  - combined
  - test
---

# Combined App Template
`;

      await fs.writeFile(path.join(templateDir, 'README.md'), readmeContent);

      const metadata = await discovery.getTemplateMetadata(templateDir);

      assert.strictEqual(metadata.name, 'Combined App', 'Should use template.json name');
      assert.strictEqual(metadata.description, 'App with both JSON and frontmatter', 'Should use template.json description');
      assert.strictEqual(metadata.version, '1.0.0', 'Should use template.json version');
      assert.strictEqual(metadata.author, 'Test Author', 'Should include README frontmatter author');
      assert.deepStrictEqual(metadata.tags, ['combined', 'test'], 'Should include README frontmatter tags');
    });

    await this.test('getTemplateMetadata provides fallback for templates without metadata', async () => {
      const tempDir = await this.createTempDir('-no-metadata');
      const cacheManager = new CacheManager(tempDir);
      const discovery = new TemplateDiscovery(cacheManager);

      // Create template directory without any metadata files
      const templateDir = path.join(tempDir, 'minimal-app');
      await fs.mkdir(templateDir, { recursive: true });
      await fs.writeFile(path.join(templateDir, 'index.js'), 'console.log("Hello");');

      const metadata = await discovery.getTemplateMetadata(templateDir);

      assert.strictEqual(metadata.name, 'minimal-app', 'Should use directory name as fallback');
      assert.strictEqual(metadata.description, 'No description available', 'Should provide fallback description');
      assert.strictEqual(metadata.version, null, 'Should have null version');
      assert.strictEqual(metadata.author, null, 'Should have null author');
      assert.deepStrictEqual(metadata.tags, [], 'Should have empty tags array');
    });
  }

  async testTemplateListingFunctionality() {
    console.log('📂 Testing template listing functionality...');

    await this.test('listTemplates discovers all templates in cached repository', async () => {
      const tempCacheDir = await this.createTempDir('-list-templates');
      const cacheManager = new CacheManager(tempCacheDir);
      const discovery = new TemplateDiscovery(cacheManager);

      // Create mock cached repository with multiple templates
      const repoUrl = 'https://github.com/user/templates.git';
      const branchName = 'main';
      const repoHash = cacheManager.generateRepoHash(repoUrl, branchName);
      const repoDir = path.join(tempCacheDir, repoHash);

      // Create template directories
      const templates = ['react-app', 'vue-app', 'node-api'];
      for (const templateName of templates) {
        const templateDir = path.join(repoDir, templateName);
        await fs.mkdir(templateDir, { recursive: true });

        // Add some files to make it look like a real template
        await fs.writeFile(path.join(templateDir, 'package.json'), '{}');
        await fs.writeFile(path.join(templateDir, 'index.js'), 'console.log("Hello");');
      }

      // Create cache metadata
      const metadata = {
        repoUrl,
        branchName,
        lastUpdated: new Date().toISOString(),
        ttlHours: 24,
        repoHash,
        size: 1024000,
        templateCount: templates.length
      };
      await cacheManager.updateCacheMetadata(repoHash, metadata);

      const templateList = await discovery.listTemplates(repoUrl, branchName);

      assert.strictEqual(templateList.length, 3, 'Should discover all three templates');

      const templateNames = templateList.map(t => t.name);
      assert(templateNames.includes('react-app'), 'Should include react-app template');
      assert(templateNames.includes('vue-app'), 'Should include vue-app template');
      assert(templateNames.includes('node-api'), 'Should include node-api template');
    });

    await this.test('listTemplates includes template metadata when available', async () => {
      const tempCacheDir = await this.createTempDir('-list-with-metadata');
      const cacheManager = new CacheManager(tempCacheDir);
      const discovery = new TemplateDiscovery(cacheManager);

      // Create mock cached repository with template containing metadata
      const repoUrl = 'https://github.com/user/templates.git';
      const branchName = 'main';
      const repoHash = cacheManager.generateRepoHash(repoUrl, branchName);
      const repoDir = path.join(tempCacheDir, repoHash);

      // Create template with template.json
      const templateDir = path.join(repoDir, 'express-api');
      await fs.mkdir(templateDir, { recursive: true });

      const templateMetadata = {
        name: 'Express REST API',
        description: 'RESTful API built with Express.js and TypeScript',
        version: '2.0.0',
        author: 'API Team',
        tags: ['express', 'typescript', 'rest', 'api']
      };

      await fs.writeFile(
        path.join(templateDir, 'template.json'),
        JSON.stringify(templateMetadata, null, 2)
      );

      // Create cache metadata
      const cacheMetadata = {
        repoUrl,
        branchName,
        lastUpdated: new Date().toISOString(),
        ttlHours: 24,
        repoHash,
        size: 1024000,
        templateCount: 1
      };
      await cacheManager.updateCacheMetadata(repoHash, cacheMetadata);

      const templateList = await discovery.listTemplates(repoUrl, branchName);

      assert.strictEqual(templateList.length, 1, 'Should find one template');

      const template = templateList[0];
      assert.strictEqual(template.name, 'Express REST API', 'Should use metadata name');
      assert.strictEqual(template.description, 'RESTful API built with Express.js and TypeScript', 'Should include description');
      assert.strictEqual(template.version, '2.0.0', 'Should include version');
      assert.strictEqual(template.author, 'API Team', 'Should include author');
      assert.deepStrictEqual(template.tags, ['express', 'typescript', 'rest', 'api'], 'Should include tags');
    });

    await this.test('listTemplates falls back to package.json metadata when template.json missing', async () => {
      const tempCacheDir = await this.createTempDir('-pkg-metadata');
      const cacheManager = new CacheManager(tempCacheDir);
      const discovery = new TemplateDiscovery(cacheManager);

      const repoUrl = 'https://github.com/user/templates.git';
      const branchName = 'main';
      const repoHash = cacheManager.generateRepoHash(repoUrl, branchName);
      const repoDir = path.join(tempCacheDir, repoHash);

      const templateDir = path.join(repoDir, 'next-app');
      await fs.mkdir(templateDir, { recursive: true });

      const packageMetadata = {
        name: '@samples/next-app',
        description: 'Next.js starter with Tailwind and TypeScript',
        version: '3.4.5',
        author: {
          name: 'Template Team',
          email: 'templates@example.com'
        },
        keywords: ['nextjs', 'typescript', 'tailwind']
      };

      await fs.writeFile(
        path.join(templateDir, 'package.json'),
        JSON.stringify(packageMetadata, null, 2)
      );

      const cacheMetadata = {
        repoUrl,
        branchName,
        lastUpdated: new Date().toISOString(),
        ttlHours: 24,
        repoHash,
        size: 2048000,
        templateCount: 1
      };
      await cacheManager.updateCacheMetadata(repoHash, cacheMetadata);

      const templateList = await discovery.listTemplates(repoUrl, branchName);
      assert.strictEqual(templateList.length, 1, 'Should find one template');

      const template = templateList[0];
      assert.strictEqual(template.description, 'Next.js starter with Tailwind and TypeScript', 'Should use package.json description');
      assert.strictEqual(template.version, '3.4.5', 'Should use package.json version');
      assert.strictEqual(template.author, 'Template Team <templates@example.com>', 'Should normalize package.json author');
      assert.deepStrictEqual(template.tags, ['nextjs', 'typescript', 'tailwind'], 'Should use package.json keywords for tags');
    });

    await this.test('listTemplates handles empty repositories gracefully', async () => {
      const tempCacheDir = await this.createTempDir('-empty-repo');
      const cacheManager = new CacheManager(tempCacheDir);
      const discovery = new TemplateDiscovery(cacheManager);

      // Create mock cached repository with no templates
      const repoUrl = 'https://github.com/user/empty.git';
      const branchName = 'main';
      const repoHash = cacheManager.generateRepoHash(repoUrl, branchName);
      const repoDir = path.join(tempCacheDir, repoHash);

      // Create empty repository directory
      await fs.mkdir(repoDir, { recursive: true });
      await fs.writeFile(path.join(repoDir, 'README.md'), '# Empty Repository');

      // Create cache metadata
      const metadata = {
        repoUrl,
        branchName,
        lastUpdated: new Date().toISOString(),
        ttlHours: 24,
        repoHash,
        size: 1024,
        templateCount: 0
      };
      await cacheManager.updateCacheMetadata(repoHash, metadata);

      const templateList = await discovery.listTemplates(repoUrl, branchName);

      assert.strictEqual(templateList.length, 0, 'Should return empty array for repository with no templates');
    });

    await this.test('listTemplates filters out non-template directories', async () => {
      const tempCacheDir = await this.createTempDir('-filter-non-templates');
      const cacheManager = new CacheManager(tempCacheDir);
      const discovery = new TemplateDiscovery(cacheManager);

      // Create mock cached repository with mixed content
      const repoUrl = 'https://github.com/user/mixed.git';
      const branchName = 'main';
      const repoHash = cacheManager.generateRepoHash(repoUrl, branchName);
      const repoDir = path.join(tempCacheDir, repoHash);

      // Create template directory
      const templateDir = path.join(repoDir, 'web-app');
      await fs.mkdir(templateDir, { recursive: true });
      await fs.writeFile(path.join(templateDir, 'package.json'), '{}');

      // Create non-template directories (common repository files/dirs)
      await fs.mkdir(path.join(repoDir, '.git'), { recursive: true });
      await fs.mkdir(path.join(repoDir, 'node_modules'), { recursive: true });
      await fs.mkdir(path.join(repoDir, '.github'), { recursive: true });
      await fs.writeFile(path.join(repoDir, 'README.md'), '# Repository');
      await fs.writeFile(path.join(repoDir, 'package.json'), '{}');
      await fs.writeFile(path.join(repoDir, '.gitignore'), 'node_modules/');

      // Create cache metadata
      const metadata = {
        repoUrl,
        branchName,
        lastUpdated: new Date().toISOString(),
        ttlHours: 24,
        repoHash,
        size: 1024000,
        templateCount: 1
      };
      await cacheManager.updateCacheMetadata(repoHash, metadata);

      const templateList = await discovery.listTemplates(repoUrl, branchName);

      assert.strictEqual(templateList.length, 1, 'Should only find template directories');
      assert.strictEqual(templateList[0].name, 'web-app', 'Should find the web-app template');
    });
  }

  async testCacheSystemIntegration() {
    console.log('🔄 Testing cache system integration...');

    await this.test('listTemplates uses cached repository when available', async () => {
      const tempCacheDir = await this.createTempDir('-cache-integration');
      const cacheManager = new CacheManager(tempCacheDir);
      const discovery = new TemplateDiscovery(cacheManager);

      // Create mock cached repository
      const repoUrl = 'https://github.com/user/cached.git';
      const branchName = 'main';
      const repoHash = cacheManager.generateRepoHash(repoUrl, branchName);
      const repoDir = path.join(tempCacheDir, repoHash);

      // Create template in cache
      const templateDir = path.join(repoDir, 'cached-template');
      await fs.mkdir(templateDir, { recursive: true });
      await fs.writeFile(path.join(templateDir, 'index.js'), 'console.log("Cached");');

      // Create fresh cache metadata
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

      const templateList = await discovery.listTemplates(repoUrl, branchName);

      assert.strictEqual(templateList.length, 1, 'Should use cached repository');
      assert.strictEqual(templateList[0].name, 'cached-template', 'Should find cached template');
    });

    await this.test('listTemplates throws error when repository is not cached and cannot be accessed', async () => {
      const tempCacheDir = await this.createTempDir('-no-cache');
      const cacheManager = new CacheManager(tempCacheDir);
      const discovery = new TemplateDiscovery(cacheManager);

      // Try to list templates from non-existent cached repository
      const repoUrl = 'https://github.com/user/nonexistent.git';
      const branchName = 'main';

      try {
        await discovery.listTemplates(repoUrl, branchName);
        assert.fail('Should throw error for non-cached repository');
      } catch (error) {
        assert(error.message.includes('not cached'), 'Should provide descriptive error about missing cache');
      }
    });

    await this.test('listTemplates handles cache corruption gracefully', async () => {
      const tempCacheDir = await this.createTempDir('-corrupted-cache');
      const cacheManager = new CacheManager(tempCacheDir);
      const discovery = new TemplateDiscovery(cacheManager);

      // Create corrupted cache (metadata exists but directory is missing)
      const repoUrl = 'https://github.com/user/corrupted.git';
      const branchName = 'main';
      const repoHash = cacheManager.generateRepoHash(repoUrl, branchName);

      // Create metadata but no repository directory
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

      try {
        await discovery.listTemplates(repoUrl, branchName);
        assert.fail('Should throw error for corrupted cache');
      } catch (error) {
        assert(error.message.includes('corrupted') || error.message.includes('not found'),
          'Should provide descriptive error about cache corruption');
      }
    });
  }

  async testFormattedOutputGeneration() {
    console.log('🎨 Testing formatted output generation...');

    await this.test('formatTemplateList creates readable output with visual separation', async () => {
      const tempCacheDir = await this.createTempDir('-format-output');
      const cacheManager = new CacheManager(tempCacheDir);
      const discovery = new TemplateDiscovery(cacheManager);

      const templates = [
        {
          name: 'React App',
          description: 'Modern React application with TypeScript',
          version: '1.0.0',
          author: 'React Team',
          tags: ['react', 'typescript']
        },
        {
          name: 'Vue App',
          description: 'Vue 3 application with Composition API',
          version: '2.1.0',
          author: 'Vue Team',
          tags: ['vue', 'composition-api']
        }
      ];

      const formatted = discovery.formatTemplateList(templates);

      assert(typeof formatted === 'string', 'Should return formatted string');
      assert(formatted.includes('React App'), 'Should include first template name');
      assert(formatted.includes('Vue App'), 'Should include second template name');
      assert(formatted.includes('Modern React application'), 'Should include descriptions');
      assert(formatted.includes('Vue 3 application'), 'Should include descriptions');
      assert(formatted.includes('─'), 'Should include visual separators');
    });

    await this.test('formatTemplateEntry formats individual template with all metadata', async () => {
      const tempCacheDir = await this.createTempDir('-format-entry');
      const cacheManager = new CacheManager(tempCacheDir);
      const discovery = new TemplateDiscovery(cacheManager);

      const template = {
        name: 'Express API',
        handle: 'express-api',
        description: 'RESTful API with Express and TypeScript',
        version: '3.0.0',
        author: 'API Team',
        tags: ['express', 'typescript', 'rest']
      };

      const formatted = discovery.formatTemplateEntry(template);

      assert(typeof formatted === 'string', 'Should return formatted string');
      assert(formatted.includes('Express API (express-api)'), 'Should include template name with handle');
      assert(formatted.includes('RESTful API with Express'), 'Should include description');
      assert(formatted.includes('3.0.0'), 'Should include version');
      assert(formatted.includes('API Team'), 'Should include author');
      assert(formatted.includes('express'), 'Should include tags');
      assert(formatted.includes('typescript'), 'Should include tags');
    });

    await this.test('formatTemplateEntry handles templates with minimal metadata', async () => {
      const tempCacheDir = await this.createTempDir('-minimal-format');
      const cacheManager = new CacheManager(tempCacheDir);
      const discovery = new TemplateDiscovery(cacheManager);

      const template = {
        name: 'simple-app',
        handle: 'simple-app',
        description: 'No description available',
        version: null,
        author: null,
        tags: []
      };

      const formatted = discovery.formatTemplateEntry(template);

      assert(typeof formatted === 'string', 'Should return formatted string');
      assert(formatted.includes('simple-app'), 'Should include template name');
      assert(!formatted.includes('(simple-app)'), 'Should not show handle when same as name');
      assert(formatted.includes('No description available'), 'Should include fallback description');
      assert(!formatted.includes('null'), 'Should not display null values');
    });

    await this.test('formatTemplateList handles empty template list', async () => {
      const tempCacheDir = await this.createTempDir('-empty-format');
      const cacheManager = new CacheManager(tempCacheDir);
      const discovery = new TemplateDiscovery(cacheManager);

      const formatted = discovery.formatTemplateList([]);

      assert(typeof formatted === 'string', 'Should return formatted string');
      assert(formatted.includes('No templates found'), 'Should indicate no templates found');
    });
  }

  async testErrorHandling() {
    console.log('🚨 Testing error handling...');

    await this.test('getTemplateMetadata handles file system errors gracefully', async () => {
      const tempCacheDir = await this.createTempDir('-fs-errors');
      const cacheManager = new CacheManager(tempCacheDir);
      const discovery = new TemplateDiscovery(cacheManager);

      // Try to get metadata from non-existent directory
      const nonExistentDir = path.join(tempCacheDir, 'does-not-exist');

      const metadata = await discovery.getTemplateMetadata(nonExistentDir);

      // Should provide fallback metadata even for non-existent directories
      assert.strictEqual(metadata.name, 'does-not-exist', 'Should use directory name as fallback');
      assert.strictEqual(metadata.description, 'No description available', 'Should provide fallback description');
    });

    await this.test('parseTemplateJson handles permission errors gracefully', async () => {
      const tempCacheDir = await this.createTempDir('-permission-errors');
      const cacheManager = new CacheManager(tempCacheDir);
      const discovery = new TemplateDiscovery(cacheManager);

      // Create template directory with unreadable template.json
      const templateDir = path.join(tempCacheDir, 'permission-test');
      await fs.mkdir(templateDir, { recursive: true });

      const templateJsonPath = path.join(templateDir, 'template.json');
      await fs.writeFile(templateJsonPath, '{"name": "test"}');

      // Make file unreadable (this might not work on all systems)
      try {
        await fs.chmod(templateJsonPath, 0o000);

        const parsed = await discovery.parseTemplateJson(templateDir);

        // Should handle permission error gracefully
        assert.strictEqual(parsed, null, 'Should return null for permission errors');

        // Restore permissions for cleanup
        await fs.chmod(templateJsonPath, 0o644);
      } catch (_error) {
        // If chmod fails, skip this test (might be on a system that doesn't support it)
        console.log('   Skipping permission test (chmod not supported)');
      }
    });

    await this.test('listTemplates provides helpful error messages', async () => {
      const tempCacheDir = await this.createTempDir('-error-messages');
      const cacheManager = new CacheManager(tempCacheDir);
      const discovery = new TemplateDiscovery(cacheManager);

      try {
        await discovery.listTemplates('invalid-repo-url', 'main');
        assert.fail('Should throw error for invalid repository');
      } catch (error) {
        assert(typeof error.message === 'string', 'Should provide error message');
        assert(error.message.length > 0, 'Error message should not be empty');
        assert(error.message.includes('invalid-repo-url') || error.message.includes('not cached'),
          'Error message should be descriptive');
      }
    });
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const testSuite = new TemplateDiscoveryTestSuite();
  await testSuite.runTests();
}

export { TemplateDiscoveryTestSuite };
