#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { validateDirectoryExists } from '../../lib/shared/utils/fs-utils.mjs';
import { execCommand } from '../../lib/shared/utils/command-utils.mjs';
import { shouldIgnoreTemplateEntry, stripIgnoredFromTree, createTemplateIgnoreSet } from '../../lib/shared/utils/template-ignore.mjs';
import { loadTemplateMetadataFromPath } from './template-metadata.mjs';

/**
 * Dry Run Engine module
 * Previews operations without executing them, using cached repositories
 */
export class DryRunEngine {
  constructor(cacheManager, logger) {
    this.cacheManager = cacheManager;
    this.logger = logger;
  }

  /**
   * Preview complete scaffolding process without execution
   * @param {string} repoUrl - Repository URL or user/repo format
   * @param {string} branchName - Git branch name
   * @param {string} templateName - Template name within repository
   * @param {string} projectDir - Target project directory
   * @returns {Object} - Preview object with operations array and summary
   */
  async previewScaffolding(repoUrl, branchName = 'main', templateName, projectDir) {
    const cachedRepoPath = await this.cacheManager.getCachedRepo(repoUrl, branchName);

    if (!cachedRepoPath) {
      throw new Error(`Repository ${repoUrl} (${branchName}) is not cached. Please cache the repository first.`);
    }

    await this.verifyDirectory(cachedRepoPath, 'Cached repository path');

    const templatePath = path.join(cachedRepoPath, templateName);
    await this.verifyDirectory(templatePath, `Template "${templateName}"`);

    const metadata = await loadTemplateMetadataFromPath(templatePath);
    const ignoreSet = createTemplateIgnoreSet({
      authorAssetsDir: metadata.authorAssetsDir
    });

    const operations = await this.buildOperations(templatePath, projectDir, ignoreSet);
    const summary = this.buildSummary(templatePath, projectDir, operations);

    return {
      operations,
      templatePath,
      projectDir,
      summary,
      totalOperations: operations.length,
      ignoreSet,
      metadata
    };
  }

  /**
   * Preview scaffolding from a provided repository path
   */
  async previewScaffoldingFromPath(repoPath, templateName, projectDir) {
    await this.verifyDirectory(repoPath, 'Repository path');

    const templatePath = path.join(repoPath, templateName);
    await this.verifyDirectory(templatePath, `Template "${templateName}"`);

    const metadata = await loadTemplateMetadataFromPath(templatePath);
    const ignoreSet = createTemplateIgnoreSet({
      authorAssetsDir: metadata.authorAssetsDir
    });

    const operations = await this.buildOperations(templatePath, projectDir, ignoreSet);
    const summary = this.buildSummary(templatePath, projectDir, operations);

    return {
      operations,
      templatePath,
      projectDir,
      summary,
      totalOperations: operations.length,
      ignoreSet,
      metadata
    };
  }

  async verifyDirectory(targetPath, description) {
    try {
      await validateDirectoryExists(targetPath, description);
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new Error(`${description} not found: ${targetPath}`);
      }
      if (error.message.includes('not a directory')) {
        throw new Error(`${description} exists but is not a directory: ${targetPath}`);
      }
      throw error;
    }
  }

  async buildOperations(templatePath, projectDir, ignoreSet) {
    const operations = [];

    const fileAndDirectoryOps = await this.previewFileCopy(templatePath, projectDir, templatePath, ignoreSet);
    operations.push(...fileAndDirectoryOps);

    const setupPreview = await this.previewSetupScript(templatePath);
    if (setupPreview) {
      operations.push({
        type: 'setup_script',
        scriptPath: path.join(projectDir, '_setup.mjs'),
        relative: '_setup.mjs',
        detected: true
      });
    }

    return operations;
  }

  /**
   * Preview file copy operations without execution
   */
  async previewFileCopy(templatePath, projectDir, templateRoot, ignoreSet) {
    const operations = [];

    try {
      await this.collectFileCopyOperations(templatePath, projectDir, templateRoot, operations, new Set(), ignoreSet);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Template directory not found: ${templatePath}`);
      }
      throw error;
    }

    return operations;
  }

  async collectFileCopyOperations(currentPath, projectDir, templateRoot, operations, directorySet, ignoreSet) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const sourcePath = path.join(currentPath, entry.name);
      const relativePath = path.relative(templateRoot, sourcePath);
      const destinationPath = path.join(projectDir, relativePath);

      if (shouldIgnoreTemplateEntry(entry.name, ignoreSet)) {
        continue;
      }

      if (entry.isDirectory()) {

        if (relativePath && !directorySet.has(relativePath)) {
          directorySet.add(relativePath);
        operations.push({
          type: 'directory_create',
          path: destinationPath,
          destination: destinationPath,
          relative: relativePath
        });
      }

        await this.collectFileCopyOperations(sourcePath, projectDir, templateRoot, operations, directorySet, ignoreSet);
        continue;
      }

      if (entry.name === '_setup.mjs') {
        continue;
      }

      operations.push({
        type: 'file_copy',
        source: sourcePath,
        destination: destinationPath,
        relative: relativePath
      });
    }
  }

  async previewSetupScript(templateDir) {
    const setupScriptPath = path.join(templateDir, '_setup.mjs');
    try {
      await fs.access(setupScriptPath);
      return {
        type: 'setup_script',
        scriptPath: setupScriptPath,
        relative: '_setup.mjs',
        detected: true
      };
    } catch {
      return null;
    }
  }

  /**
   * Display preview with clear visual indicators for dry run mode
   * @param {Object|Array} preview - Preview payload or operations array
   * @returns {string} - Formatted preview output
   */
  displayPreview(preview) {
    let operations = [];
    let summary = null;
    let templateName = null;
    let repoUrl = null;
    let projectDir = null;
    let templatePath = null;

    if (Array.isArray(preview)) {
      operations = preview;
    } else if (preview && typeof preview === 'object') {
      operations = Array.isArray(preview.operations) ? preview.operations : [];
      summary = preview.summary || null;
      templateName = preview.templateName || null;
      repoUrl = preview.repoUrl || null;
      projectDir = preview.projectDir || summary?.projectDir || null;
      templatePath = preview.templatePath || summary?.templatePath || null;
    }

    if (!operations || operations.length === 0) {
      return '🔍 DRY RUN MODE - No operations to preview\n';
    }

    let output = '🔍 DRY RUN MODE - Preview of planned operations (no changes will be made)\n\n';

    if (templateName) {
      output += `📦 Template: ${templateName}\n`;
    }
    if (repoUrl) {
      output += `🌐 Repository: ${repoUrl}\n`;
    }
    if (projectDir) {
      output += `📁 Target Directory: ${projectDir}\n`;
    }
    if (templatePath) {
      output += `🗂️ Template Path: ${templatePath}\n`;
    }
    if (templateName || repoUrl || projectDir || templatePath) {
      output += '\n';
    }

    const counts = summary?.counts ?? operations.reduce((acc, op) => {
      if (!op || !op.type) {
        return acc;
      }
      if (op.type === 'directory_create') {
        acc.directories++;
      } else if (op.type === 'file_copy') {
        acc.files++;
      } else if (op.type === 'setup_script') {
        acc.setupScripts++;
      }
      return acc;
    }, { directories: 0, files: 0, setupScripts: 0 });

    output += '📄 Summary:\n';
    output += `   • Directories: ${counts.directories}\n`;
    output += `   • Files: ${counts.files}\n`;
    output += `   • Setup Scripts: ${counts.setupScripts}\n\n`;

    const categorize = type => operations.filter(op => op && op.type === type);

    const categoryOutput = [
      { label: '📁 Directory Creation', items: categorize('directory_create') },
      { label: '⚙️ Setup Script', items: categorize('setup_script') }
    ];

    const fileBuckets = summary?.fileBuckets || this.aggregateFileBuckets(operations, projectDir);
    const bucketKeys = Object.keys(fileBuckets);
    if (bucketKeys.length > 0) {
      const sortedBuckets = bucketKeys.sort((a, b) => {
        if (a === './') return -1;
        if (b === './') return 1;
        return a.localeCompare(b);
      });
      output += `📋 File Copy (${counts.files} total):\n`;
      sortedBuckets.forEach(dir => {
        const bucketCount = fileBuckets[dir];
        const label = bucketCount === 1 ? 'file' : 'files';
        output += `   • ${dir} (${bucketCount} ${label})\n`;
      });
      output += '\n';
    }

    for (const category of categoryOutput) {
      if (category.items.length === 0) {
        continue;
      }
      output += `${category.label} (${category.items.length} operations):\n`;
      category.items.forEach(item => {
        output += `   ${this.formatOperation(item)}\n`;
      });
      output += '\n';
    }

    output += `📊 Total operations: ${operations.length}\n`;
    output += '💡 Dry run only – no changes will be made.\n';
    return output;
  }

  buildSummary(templatePath, projectDir, operations) {
    const summary = {
      directories: [],
      files: [],
      setupScripts: [],
      fileBuckets: {},
      counts: {
        directories: 0,
        files: 0,
        setupScripts: 0
      },
      templatePath,
      projectDir
    };

    for (const op of operations) {
      if (!op || !op.type) {
        continue;
      }

      switch (op.type) {
        case 'directory_create': {
          summary.directories.push({
            path: op.path,
            relative: op.relative ?? path.relative(projectDir, op.path)
          });
          summary.counts.directories++;
          break;
        }

        case 'file_copy': {
          summary.files.push({
            source: op.source,
            destination: op.destination,
            relative: op.relative ?? path.relative(projectDir, op.destination)
          });
          summary.counts.files++;
          const bucketKey = this.resolveBucket(summary.files[summary.files.length - 1].relative);
          summary.fileBuckets[bucketKey] = (summary.fileBuckets[bucketKey] || 0) + 1;
          break;
        }

        case 'setup_script': {
          summary.setupScripts.push({
            scriptPath: op.scriptPath,
            relative: op.relative ?? path.relative(projectDir, op.scriptPath)
          });
          summary.counts.setupScripts++;
          break;
        }

        default:
          break;
      }
    }

    return summary;
  }

  formatOperation(operation) {
    if (!operation || !operation.type) {
      return '❓ Unknown operation';
    }

    switch (operation.type) {
      case 'file_copy': {
        if (operation.relative) {
          return `📄 Copy: ${operation.relative}`;
        }
        if (operation.source && operation.destination) {
          return `📄 Copy: ${operation.source} → ${operation.destination}`;
        }
        return '📄 Copy: [missing source/destination]';
      }

      case 'directory_create': {
        if (operation.relative) {
          return `📁 Ensure directory: ${operation.relative}`;
        }
        if (operation.path) {
          return `📁 Ensure directory: ${operation.path}`;
        }
        return '📁 Ensure directory: [missing path]';
      }

      case 'setup_script': {
        if (operation.relative) {
          return `⚙️ Execute setup script: ${operation.relative}`;
        }
        if (operation.scriptPath) {
          return `⚙️ Execute setup script: ${operation.scriptPath}`;
        }
        return '⚙️ Execute setup script: [missing path]';
      }

      default:
        return `❓ Unknown operation type: ${operation.type}`;
    }
  }

  resolveBucket(relativePath = '') {
    const normalized = relativePath.replace(/\\/g, '/');
    const dir = normalized.includes('/') ? normalized.slice(0, normalized.lastIndexOf('/') + 1) : '';
    return dir === '' ? './' : dir;
  }

  aggregateFileBuckets(operations, projectDir) {
    return operations
      .filter(op => op && op.type === 'file_copy')
      .reduce((acc, op) => {
        const relative = op.relative ?? path.relative(projectDir, op.destination || '');
        const bucket = this.resolveBucket(relative);
        acc[bucket] = (acc[bucket] || 0) + 1;
        return acc;
      }, {});
  }

  async generateTreePreview(templatePath, ignoreSet) {
    const treeCommand = process.env.CREATE_SCAFFOLD_TREE_COMMAND || 'tree';
    const args = ['-L', '2', '--noreport', templatePath];

    try {
      const output = await execCommand(treeCommand, args, {
        timeout: 5000,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      const filtered = stripIgnoredFromTree(output.trim(), ignoreSet);

      return {
        available: true,
        output: filtered
      };
    } catch (error) {
      const reason = error.code === 'ENOENT'
        ? 'tree command unavailable'
        : error.message;

      return {
        available: false,
        reason
      };
    }
  }
}
