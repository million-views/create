#!/usr/bin/env node

import { strict as assert } from 'assert';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { DryRunEngine } from '../bin/dryRunEngine.mjs';
import { CacheManager } from '../bin/cacheManager.mjs';
import { Logger } from '../bin/logger.mjs';

/**
 * Test suite for Dry Run Engine module
 * Tests operation preview generation, formatted output display, and cache integration
 */

class DryRunEngineTestSuite {
  constructor() {
    this.tempPaths = [];
    this.testCount = 0;
    this.passedCount = 0;
  }

  async createTempDir(suffix = '') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 9);
    const dirName = `dry-run-test-${timestamp}-${random}${suffix}`;
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
    console.log('🧪 Running Dry Run Engine Tests\n');

    try {
      // Test 5.1: Operation preview functionality
      await this.testOperationPreviewFunctionality();
      
      // Test 5.2: Preview display formatting
      await this.testPreviewDisplayFormatting();
      
      // Test 5.3: Cache system integration
      await this.testCacheSystemIntegration();
      
      // Additional error handling tests
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

  async testOperationPreviewFunctionality() {
    console.log('🔍 Testing operation preview functionality...');

    await this.test('previewScaffolding simulates complete scaffolding process without execution', async () => {
      const tempCacheDir = await this.createTempDir('-preview-scaffolding');
      const tempLogDir = await this.createTempDir('-preview-log');
      
      const cacheManager = new CacheManager(tempCacheDir);
      const logger = new Logger(path.join(tempLogDir, 'test.log'));
      const dryRunEngine = new DryRunEngine(cacheManager, logger);
      
      // Create mock cached repository with template
      const repoUrl = 'https://github.com/user/templates.git';
      const branchName = 'main';
      const templateName = 'react-app';
      const projectDir = path.join(tempCacheDir, 'my-project');
      
      const repoHash = cacheManager.generateRepoHash(repoUrl, branchName);
      const repoDir = path.join(tempCacheDir, repoHash);
      const templateDir = path.join(repoDir, templateName);
      
      // Create template structure
      await fs.mkdir(templateDir, { recursive: true });
      await fs.mkdir(path.join(templateDir, 'src'), { recursive: true });
      await fs.writeFile(path.join(templateDir, 'package.json'), '{"name": "template"}');
      await fs.writeFile(path.join(templateDir, 'src/index.js'), 'console.log("Hello");');
      await fs.writeFile(path.join(templateDir, '_setup.mjs'), 'export default function() {}');
      
      // Create cache metadata
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
      
      const preview = await dryRunEngine.previewScaffolding(repoUrl, branchName, templateName, projectDir);
      
      assert(Array.isArray(preview.operations), 'Should return operations array');
      assert(preview.operations.length > 0, 'Should have preview operations');
      
      // Should include file copy operations
      const fileCopyOps = preview.operations.filter(op => op.type === 'file_copy');
      assert(fileCopyOps.length > 0, 'Should include file copy operations');
      
      // Should include setup script operation
      const setupOps = preview.operations.filter(op => op.type === 'setup_script');
      assert(setupOps.length === 1, 'Should include setup script operation');
      
      // Should not actually create files
      try {
        await fs.stat(projectDir);
        assert.fail('Should not create actual project directory');
      } catch (error) {
        assert.strictEqual(error.code, 'ENOENT', 'Project directory should not exist');
      }
    });

    await this.test('previewFileCopy shows planned file operations without execution', async () => {
      const tempCacheDir = await this.createTempDir('-preview-file-copy');
      const tempLogDir = await this.createTempDir('-preview-log');
      
      const cacheManager = new CacheManager(tempCacheDir);
      const logger = new Logger(path.join(tempLogDir, 'test.log'));
      const dryRunEngine = new DryRunEngine(cacheManager, logger);
      
      // Create template structure
      const templateDir = path.join(tempCacheDir, 'template');
      await fs.mkdir(templateDir, { recursive: true });
      await fs.mkdir(path.join(templateDir, 'src'), { recursive: true });
      await fs.writeFile(path.join(templateDir, 'package.json'), '{"name": "template"}');
      await fs.writeFile(path.join(templateDir, 'README.md'), '# Template');
      await fs.writeFile(path.join(templateDir, 'src/index.js'), 'console.log("Hello");');
      await fs.writeFile(path.join(templateDir, 'src/utils.js'), 'export const util = () => {};');
      
      const projectDir = path.join(tempCacheDir, 'my-project');
      
      const operations = await dryRunEngine.previewFileCopy(templateDir, projectDir);
      
      assert(Array.isArray(operations), 'Should return operations array');
      assert(operations.length >= 4, 'Should have operations for all files');
      
      // Check that all operations are file_copy type
      operations.forEach(op => {
        assert.strictEqual(op.type, 'file_copy', 'All operations should be file_copy type');
        assert(op.source, 'Should have source path');
        assert(op.destination, 'Should have destination path');
        assert(op.source.startsWith(templateDir), 'Source should be in template directory');
        assert(op.destination.startsWith(projectDir), 'Destination should be in project directory');
      });
      
      // Should not actually copy files
      try {
        await fs.stat(projectDir);
        assert.fail('Should not create actual project directory');
      } catch (error) {
        assert.strictEqual(error.code, 'ENOENT', 'Project directory should not exist');
      }
    });

    await this.test('previewSetupScript detects and displays setup scripts without running them', async () => {
      const tempCacheDir = await this.createTempDir('-preview-setup');
      const tempLogDir = await this.createTempDir('-preview-log');
      
      const cacheManager = new CacheManager(tempCacheDir);
      const logger = new Logger(path.join(tempLogDir, 'test.log'));
      const dryRunEngine = new DryRunEngine(cacheManager, logger);
      
      // Create project directory with setup script
      const projectDir = path.join(tempCacheDir, 'project-with-setup');
      await fs.mkdir(projectDir, { recursive: true });
      
      const setupScript = `export default function setup(env) {
  console.log('Setting up project:', env.projectName);
  // This would normally modify files
}`;
      
      await fs.writeFile(path.join(projectDir, '_setup.mjs'), setupScript);
      
      const operation = await dryRunEngine.previewSetupScript(projectDir);
      
      assert(operation, 'Should return setup script operation');
      assert.strictEqual(operation.type, 'setup_script', 'Should be setup_script type');
      assert.strictEqual(operation.scriptPath, path.join(projectDir, '_setup.mjs'), 'Should have correct script path');
      assert(operation.detected, 'Should indicate script was detected');
      
      // Verify setup script still exists (wasn't executed)
      const scriptContent = await fs.readFile(path.join(projectDir, '_setup.mjs'), 'utf8');
      assert(scriptContent.includes('Setting up project'), 'Setup script should still exist unchanged');
    });

    await this.test('previewSetupScript returns null when no setup script exists', async () => {
      const tempCacheDir = await this.createTempDir('-no-setup');
      const tempLogDir = await this.createTempDir('-preview-log');
      
      const cacheManager = new CacheManager(tempCacheDir);
      const logger = new Logger(path.join(tempLogDir, 'test.log'));
      const dryRunEngine = new DryRunEngine(cacheManager, logger);
      
      // Create project directory without setup script
      const projectDir = path.join(tempCacheDir, 'project-no-setup');
      await fs.mkdir(projectDir, { recursive: true });
      await fs.writeFile(path.join(projectDir, 'package.json'), '{}');
      
      const operation = await dryRunEngine.previewSetupScript(projectDir);
      
      assert.strictEqual(operation, null, 'Should return null when no setup script exists');
    });
  }

  async testPreviewDisplayFormatting() {
    console.log('🎨 Testing preview display formatting...');

    await this.test('displayPreview shows clear visual indicators for dry run mode', async () => {
      const tempCacheDir = await this.createTempDir('-display-preview');
      const tempLogDir = await this.createTempDir('-preview-log');
      
      const cacheManager = new CacheManager(tempCacheDir);
      const logger = new Logger(path.join(tempLogDir, 'test.log'));
      const dryRunEngine = new DryRunEngine(cacheManager, logger);
      
      const operations = [
        {
          type: 'file_copy',
          source: '/template/package.json',
          destination: '/project/package.json'
        },
        {
          type: 'setup_script',
          scriptPath: '/project/_setup.mjs',
          detected: true
        }
      ];
      
      const output = dryRunEngine.displayPreview(operations);
      
      assert(typeof output === 'string', 'Should return formatted string');
      assert(output.includes('DRY RUN') || output.includes('PREVIEW'), 'Should indicate dry run mode');
      assert(output.includes('file_copy') || output.includes('Copy') || output.includes('copy'), 'Should show file operations');
      assert(output.includes('setup_script') || output.includes('Setup') || output.includes('setup'), 'Should show setup operations');
      assert(output.includes('package.json'), 'Should show specific files');
      assert(output.includes('_setup.mjs'), 'Should show setup script');
    });

    await this.test('formatOperation creates formatted output with source and destination paths', async () => {
      const tempCacheDir = await this.createTempDir('-format-operation');
      const tempLogDir = await this.createTempDir('-preview-log');
      
      const cacheManager = new CacheManager(tempCacheDir);
      const logger = new Logger(path.join(tempLogDir, 'test.log'));
      const dryRunEngine = new DryRunEngine(cacheManager, logger);
      
      const fileCopyOp = {
        type: 'file_copy',
        source: '/template/src/index.js',
        destination: '/project/src/index.js'
      };
      
      const setupOp = {
        type: 'setup_script',
        scriptPath: '/project/_setup.mjs',
        detected: true
      };
      
      const dirCreateOp = {
        type: 'directory_create',
        path: '/project/src'
      };
      
      const fileCopyFormatted = dryRunEngine.formatOperation(fileCopyOp);
      const setupFormatted = dryRunEngine.formatOperation(setupOp);
      const dirCreateFormatted = dryRunEngine.formatOperation(dirCreateOp);
      
      assert(typeof fileCopyFormatted === 'string', 'Should format file copy operation');
      assert(fileCopyFormatted.includes('/template/src/index.js'), 'Should include source path');
      assert(fileCopyFormatted.includes('/project/src/index.js'), 'Should include destination path');
      
      assert(typeof setupFormatted === 'string', 'Should format setup script operation');
      assert(setupFormatted.includes('_setup.mjs'), 'Should include script path');
      
      assert(typeof dirCreateFormatted === 'string', 'Should format directory create operation');
      assert(dirCreateFormatted.includes('/project/src'), 'Should include directory path');
    });

    await this.test('displayPreview categorizes operations by type', async () => {
      const tempCacheDir = await this.createTempDir('-categorize-ops');
      const tempLogDir = await this.createTempDir('-preview-log');
      
      const cacheManager = new CacheManager(tempCacheDir);
      const logger = new Logger(path.join(tempLogDir, 'test.log'));
      const dryRunEngine = new DryRunEngine(cacheManager, logger);
      
      const operations = [
        {
          type: 'directory_create',
          path: '/project/src'
        },
        {
          type: 'file_copy',
          source: '/template/package.json',
          destination: '/project/package.json'
        },
        {
          type: 'file_copy',
          source: '/template/src/index.js',
          destination: '/project/src/index.js'
        },
        {
          type: 'setup_script',
          scriptPath: '/project/_setup.mjs',
          detected: true
        }
      ];
      
      const output = dryRunEngine.displayPreview(operations);
      
      assert(typeof output === 'string', 'Should return formatted string');
      
      // Should show operation counts or categories
      const lines = output.split('\n');
      const hasDirectoryOps = lines.some(line => line.toLowerCase().includes('directory') || line.toLowerCase().includes('create'));
      const hasFileOps = lines.some(line => line.toLowerCase().includes('file') || line.toLowerCase().includes('copy'));
      const hasSetupOps = lines.some(line => line.toLowerCase().includes('setup') || line.toLowerCase().includes('script'));
      
      assert(hasDirectoryOps, 'Should categorize directory operations');
      assert(hasFileOps, 'Should categorize file operations');
      assert(hasSetupOps, 'Should categorize setup operations');
    });

    await this.test('displayPreview handles empty operations list', async () => {
      const tempCacheDir = await this.createTempDir('-empty-ops');
      const tempLogDir = await this.createTempDir('-preview-log');
      
      const cacheManager = new CacheManager(tempCacheDir);
      const logger = new Logger(path.join(tempLogDir, 'test.log'));
      const dryRunEngine = new DryRunEngine(cacheManager, logger);
      
      const output = dryRunEngine.displayPreview([]);
      
      assert(typeof output === 'string', 'Should return formatted string');
      assert(output.includes('No operations') || output.includes('nothing'), 'Should indicate no operations');
    });
  }

  async testCacheSystemIntegration() {
    console.log('🔄 Testing cache system integration...');

    await this.test('previewScaffolding uses Cache Manager for instant repository access', async () => {
      const tempCacheDir = await this.createTempDir('-cache-integration');
      const tempLogDir = await this.createTempDir('-preview-log');
      
      const cacheManager = new CacheManager(tempCacheDir);
      const logger = new Logger(path.join(tempLogDir, 'test.log'));
      const dryRunEngine = new DryRunEngine(cacheManager, logger);
      
      // Create cached repository
      const repoUrl = 'https://github.com/user/fast-templates.git';
      const branchName = 'main';
      const templateName = 'fast-app';
      const projectDir = path.join(tempCacheDir, 'fast-project');
      
      const repoHash = cacheManager.generateRepoHash(repoUrl, branchName);
      const repoDir = path.join(tempCacheDir, repoHash);
      const templateDir = path.join(repoDir, templateName);
      
      // Create template with multiple files
      await fs.mkdir(templateDir, { recursive: true });
      await fs.mkdir(path.join(templateDir, 'src'), { recursive: true });
      await fs.writeFile(path.join(templateDir, 'package.json'), '{"name": "fast-template"}');
      await fs.writeFile(path.join(templateDir, 'src/index.js'), 'console.log("Fast");');
      
      // Create fresh cache metadata
      const metadata = {
        repoUrl,
        branchName,
        lastUpdated: new Date().toISOString(),
        ttlHours: 24,
        repoHash,
        size: 2048,
        templateCount: 1
      };
      await cacheManager.updateCacheMetadata(repoHash, metadata);
      
      const startTime = Date.now();
      const preview = await dryRunEngine.previewScaffolding(repoUrl, branchName, templateName, projectDir);
      const endTime = Date.now();
      
      assert(Array.isArray(preview.operations), 'Should return operations array');
      assert(preview.operations.length > 0, 'Should have preview operations');
      
      // Should be fast (using cache, not network)
      const duration = endTime - startTime;
      assert(duration < 1000, 'Should be fast using cached repository');
      
      // Verify it used the cached content
      const fileCopyOps = preview.operations.filter(op => op.type === 'file_copy');
      const hasPackageJson = fileCopyOps.some(op => op.source.includes('package.json'));
      const hasIndexJs = fileCopyOps.some(op => op.source.includes('index.js'));
      
      assert(hasPackageJson, 'Should include cached package.json');
      assert(hasIndexJs, 'Should include cached index.js');
    });

    await this.test('previewScaffolding resolves template paths using cached repositories', async () => {
      const tempCacheDir = await this.createTempDir('-path-resolution');
      const tempLogDir = await this.createTempDir('-preview-log');
      
      const cacheManager = new CacheManager(tempCacheDir);
      const logger = new Logger(path.join(tempLogDir, 'test.log'));
      const dryRunEngine = new DryRunEngine(cacheManager, logger);
      
      // Create cached repository with nested template structure
      const repoUrl = 'https://github.com/user/nested-templates.git';
      const branchName = 'main';
      const templateName = 'nested-app';
      const projectDir = path.join(tempCacheDir, 'nested-project');
      
      const repoHash = cacheManager.generateRepoHash(repoUrl, branchName);
      const repoDir = path.join(tempCacheDir, repoHash);
      const templateDir = path.join(repoDir, templateName);
      
      // Create nested template structure
      await fs.mkdir(path.join(templateDir, 'src', 'components'), { recursive: true });
      await fs.mkdir(path.join(templateDir, 'public'), { recursive: true });
      await fs.writeFile(path.join(templateDir, 'package.json'), '{}');
      await fs.writeFile(path.join(templateDir, 'src/index.js'), '');
      await fs.writeFile(path.join(templateDir, 'src/components/App.js'), '');
      await fs.writeFile(path.join(templateDir, 'public/index.html'), '');
      
      // Create cache metadata
      const metadata = {
        repoUrl,
        branchName,
        lastUpdated: new Date().toISOString(),
        ttlHours: 24,
        repoHash,
        size: 4096,
        templateCount: 1
      };
      await cacheManager.updateCacheMetadata(repoHash, metadata);
      
      const preview = await dryRunEngine.previewScaffolding(repoUrl, branchName, templateName, projectDir);
      
      assert(Array.isArray(preview.operations), 'Should return operations array');
      
      const fileCopyOps = preview.operations.filter(op => op.type === 'file_copy');
      
      // Should resolve all nested paths correctly
      const hasNestedComponent = fileCopyOps.some(op => 
        op.source.includes('components/App.js') && 
        op.destination.includes('components/App.js')
      );
      const hasPublicFile = fileCopyOps.some(op => 
        op.source.includes('public/index.html') && 
        op.destination.includes('public/index.html')
      );
      
      assert(hasNestedComponent, 'Should resolve nested component paths');
      assert(hasPublicFile, 'Should resolve public file paths');
      
      // All source paths should be absolute and point to cached template
      fileCopyOps.forEach(op => {
        assert(path.isAbsolute(op.source), 'Source paths should be absolute');
        assert(op.source.startsWith(templateDir), 'Source should be in cached template directory');
        assert(path.isAbsolute(op.destination), 'Destination paths should be absolute');
        assert(op.destination.startsWith(projectDir), 'Destination should be in project directory');
      });
    });

    await this.test('previewScaffolding handles cache misses during dry run operations', async () => {
      const tempCacheDir = await this.createTempDir('-cache-miss');
      const tempLogDir = await this.createTempDir('-preview-log');
      
      const cacheManager = new CacheManager(tempCacheDir);
      const logger = new Logger(path.join(tempLogDir, 'test.log'));
      const dryRunEngine = new DryRunEngine(cacheManager, logger);
      
      // Try to preview with non-cached repository
      const repoUrl = 'https://github.com/user/not-cached.git';
      const branchName = 'main';
      const templateName = 'missing-template';
      const projectDir = path.join(tempCacheDir, 'missing-project');
      
      try {
        await dryRunEngine.previewScaffolding(repoUrl, branchName, templateName, projectDir);
        assert.fail('Should throw error for cache miss');
      } catch (error) {
        assert(error.message.includes('not cached') || error.message.includes('not found'), 
               'Should provide descriptive error about cache miss');
      }
    });

    await this.test('previewScaffolding handles expired cache gracefully', async () => {
      const tempCacheDir = await this.createTempDir('-expired-cache');
      const tempLogDir = await this.createTempDir('-preview-log');
      
      const cacheManager = new CacheManager(tempCacheDir);
      const logger = new Logger(path.join(tempLogDir, 'test.log'));
      const dryRunEngine = new DryRunEngine(cacheManager, logger);
      
      // Create expired cached repository
      const repoUrl = 'https://github.com/user/expired-templates.git';
      const branchName = 'main';
      const templateName = 'expired-app';
      const projectDir = path.join(tempCacheDir, 'expired-project');
      
      const repoHash = cacheManager.generateRepoHash(repoUrl, branchName);
      const repoDir = path.join(tempCacheDir, repoHash);
      const templateDir = path.join(repoDir, templateName);
      
      // Create template
      await fs.mkdir(templateDir, { recursive: true });
      await fs.writeFile(path.join(templateDir, 'package.json'), '{}');
      
      // Create expired cache metadata (25 hours ago)
      const expiredDate = new Date();
      expiredDate.setHours(expiredDate.getHours() - 25);
      
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
      
      try {
        await dryRunEngine.previewScaffolding(repoUrl, branchName, templateName, projectDir);
        assert.fail('Should handle expired cache appropriately');
      } catch (error) {
        // Should either refresh cache or provide appropriate error
        assert(typeof error.message === 'string', 'Should provide error message');
        assert(error.message.length > 0, 'Error message should not be empty');
      }
    });
  }

  async testErrorHandling() {
    console.log('🚨 Testing error handling...');

    await this.test('previewFileCopy handles missing template directory gracefully', async () => {
      const tempCacheDir = await this.createTempDir('-missing-template');
      const tempLogDir = await this.createTempDir('-preview-log');
      
      const cacheManager = new CacheManager(tempCacheDir);
      const logger = new Logger(path.join(tempLogDir, 'test.log'));
      const dryRunEngine = new DryRunEngine(cacheManager, logger);
      
      const nonExistentTemplate = path.join(tempCacheDir, 'does-not-exist');
      const projectDir = path.join(tempCacheDir, 'project');
      
      try {
        await dryRunEngine.previewFileCopy(nonExistentTemplate, projectDir);
        assert.fail('Should throw error for missing template directory');
      } catch (error) {
        assert(error.message.includes('not found') || error.message.includes('ENOENT'), 
               'Should provide descriptive error about missing template');
      }
    });

    await this.test('previewSetupScript handles invalid project directory paths', async () => {
      const tempCacheDir = await this.createTempDir('-invalid-path');
      const tempLogDir = await this.createTempDir('-preview-log');
      
      const cacheManager = new CacheManager(tempCacheDir);
      const logger = new Logger(path.join(tempLogDir, 'test.log'));
      const dryRunEngine = new DryRunEngine(cacheManager, logger);
      
      const invalidProjectDir = '/invalid/path/that/does/not/exist';
      
      const operation = await dryRunEngine.previewSetupScript(invalidProjectDir);
      
      // Should handle gracefully and return null (no setup script found)
      assert.strictEqual(operation, null, 'Should return null for invalid paths');
    });

    await this.test('displayPreview handles malformed operations gracefully', async () => {
      const tempCacheDir = await this.createTempDir('-malformed-ops');
      const tempLogDir = await this.createTempDir('-preview-log');
      
      const cacheManager = new CacheManager(tempCacheDir);
      const logger = new Logger(path.join(tempLogDir, 'test.log'));
      const dryRunEngine = new DryRunEngine(cacheManager, logger);
      
      const malformedOperations = [
        { type: 'file_copy' }, // Missing source/destination
        { type: 'unknown_type', data: 'test' }, // Unknown operation type
        null, // Null operation
        { source: '/test', destination: '/test' }, // Missing type
      ];
      
      const output = dryRunEngine.displayPreview(malformedOperations);
      
      assert(typeof output === 'string', 'Should return formatted string even with malformed operations');
      assert(output.length > 0, 'Should provide some output');
    });

    await this.test('formatOperation handles unknown operation types', async () => {
      const tempCacheDir = await this.createTempDir('-unknown-type');
      const tempLogDir = await this.createTempDir('-preview-log');
      
      const cacheManager = new CacheManager(tempCacheDir);
      const logger = new Logger(path.join(tempLogDir, 'test.log'));
      const dryRunEngine = new DryRunEngine(cacheManager, logger);
      
      const unknownOperation = {
        type: 'unknown_operation',
        data: 'some data',
        path: '/some/path'
      };
      
      const formatted = dryRunEngine.formatOperation(unknownOperation);
      
      assert(typeof formatted === 'string', 'Should return formatted string for unknown operations');
      assert(formatted.includes('unknown_operation') || formatted.includes('Unknown'), 
             'Should indicate unknown operation type');
    });
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const testSuite = new DryRunEngineTestSuite();
  await testSuite.runTests();
}

export { DryRunEngineTestSuite };