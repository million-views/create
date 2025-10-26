#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { validateDirectoryExists } from './utils/fsUtils.mjs';

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
   * @returns {Object} - Preview object with operations array
   */
  async previewScaffolding(repoUrl, branchName = 'main', templateName, projectDir) {
    // Get cached repository path
    const cachedRepoPath = await this.cacheManager.getCachedRepo(repoUrl, branchName);
    
    if (!cachedRepoPath) {
      throw new Error(`Repository ${repoUrl} (${branchName}) is not cached. Please cache the repository first.`);
    }

    // Verify cached repository exists
    try {
      await validateDirectoryExists(cachedRepoPath, 'Cached repository path');
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new Error(`Cached repository not found or corrupted: ${cachedRepoPath}`);
      } else if (error.message.includes('not a directory')) {
        throw new Error(`Cached repository path is corrupted: ${cachedRepoPath}`);
      }
      throw error;
    }

    // Verify template exists in cached repository
    const templatePath = path.join(cachedRepoPath, templateName);
    try {
      await validateDirectoryExists(templatePath, `Template "${templateName}"`);
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new Error(`Template "${templateName}" not found in cached repository.`);
      } else if (error.message.includes('not a directory')) {
        throw new Error(`Template "${templateName}" exists but is not a directory.`);
      }
      throw error;
    }

    const operations = [];

    // Preview file copy operations
    const fileCopyOps = await this.previewFileCopy(templatePath, projectDir);
    operations.push(...fileCopyOps);

    // Preview setup script operation (check in template directory)
    const setupOp = await this.previewSetupScript(templatePath);
    if (setupOp) {
      // Adjust the script path to show where it would be in the project
      const projectSetupOp = {
        ...setupOp,
        scriptPath: path.join(projectDir, '_setup.mjs')
      };
      operations.push(projectSetupOp);
    }

    return {
      operations,
      templatePath,
      projectDir,
      totalOperations: operations.length
    };
  }

  /**
   * Preview complete scaffolding process from a repository path
   * @param {string} repoPath - Path to repository directory
   * @param {string} templateName - Template name within repository
   * @param {string} projectDir - Target project directory
   * @returns {Object} - Preview object with operations array
   */
  async previewScaffoldingFromPath(repoPath, templateName, projectDir) {
    // Verify repository path exists
    await validateDirectoryExists(repoPath, 'Repository path');

    // Verify template exists in repository
    const templatePath = path.join(repoPath, templateName);
    try {
      await validateDirectoryExists(templatePath, `Template "${templateName}"`);
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new Error(`Template "${templateName}" not found in repository.`);
      } else if (error.message.includes('not a directory')) {
        throw new Error(`Template "${templateName}" exists but is not a directory.`);
      }
      throw error;
    }

    const operations = [];

    // Preview file copy operations
    const fileCopyOps = await this.previewFileCopy(templatePath, projectDir);
    operations.push(...fileCopyOps);

    // Preview setup script operation (check in template directory)
    const setupOp = await this.previewSetupScript(templatePath);
    if (setupOp) {
      // Adjust the script path to show where it would be in the project
      const projectSetupOp = {
        ...setupOp,
        scriptPath: path.join(projectDir, '_setup.mjs')
      };
      operations.push(projectSetupOp);
    }

    return {
      operations,
      templatePath,
      projectDir,
      totalOperations: operations.length
    };
  }

  /**
   * Preview file copy operations without execution
   * @param {string} templatePath - Path to template directory
   * @param {string} projectDir - Target project directory
   * @returns {Array} - Array of file copy operations
   */
  async previewFileCopy(templatePath, projectDir) {
    const operations = [];

    try {
      await this.collectFileCopyOperations(templatePath, projectDir, templatePath, operations);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Template directory not found: ${templatePath}`);
      }
      throw error;
    }

    return operations;
  }

  /**
   * Recursively collect file copy operations
   * @param {string} currentPath - Current directory being processed
   * @param {string} projectDir - Target project directory
   * @param {string} templateRoot - Root template directory
   * @param {Array} operations - Array to collect operations
   */
  async collectFileCopyOperations(currentPath, projectDir, templateRoot, operations) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const sourcePath = path.join(currentPath, entry.name);
      
      // Calculate relative path from template root
      const relativePath = path.relative(templateRoot, sourcePath);
      const destinationPath = path.join(projectDir, relativePath);

      if (entry.isDirectory()) {
        // Skip .git directories and other common non-template directories
        if (entry.name === '.git') {
          continue;
        }

        // Recursively process directory contents first
        await this.collectFileCopyOperations(sourcePath, projectDir, templateRoot, operations);
      } else {
        // Skip setup scripts (they're handled separately)
        if (entry.name === '_setup.mjs') {
          continue;
        }

        // Add file copy operation
        operations.push({
          type: 'file_copy',
          source: sourcePath,
          destination: destinationPath
        });
      }
    }
  }

  /**
   * Preview setup script detection without execution
   * @param {string} projectDir - Project directory to check for setup script
   * @returns {Object|null} - Setup script operation or null if not found
   */
  async previewSetupScript(projectDir) {
    const setupScriptPath = path.join(projectDir, '_setup.mjs');

    try {
      await fs.access(setupScriptPath);
      
      return {
        type: 'setup_script',
        scriptPath: setupScriptPath,
        detected: true
      };
    } catch (error) {
      // Setup script doesn't exist - this is fine
      return null;
    }
  }

  /**
   * Display preview with clear visual indicators for dry run mode
   * @param {Array} operations - Array of operations to display
   * @returns {string} - Formatted preview output
   */
  displayPreview(operations) {
    if (!operations || operations.length === 0) {
      return '🔍 DRY RUN MODE - No operations to preview\n';
    }

    let output = '🔍 DRY RUN MODE - Preview of planned operations:\n\n';

    // Categorize operations
    const categories = {
      directory_create: [],
      file_copy: [],
      setup_script: []
    };

    operations.forEach(op => {
      if (op && op.type) {
        if (categories[op.type]) {
          categories[op.type].push(op);
        }
      }
    });

    // Display file copy operations first (most common)
    if (categories.file_copy.length > 0) {
      output += `📋 File Copy (${categories.file_copy.length} operations):\n`;
      categories.file_copy.forEach(op => {
        output += `   ${this.formatOperation(op)}\n`;
      });
      output += '\n';
    }

    // Display directory operations
    if (categories.directory_create.length > 0) {
      output += `📁 Directory Creation (${categories.directory_create.length} operations):\n`;
      categories.directory_create.forEach(op => {
        output += `   ${this.formatOperation(op)}\n`;
      });
      output += '\n';
    }

    // Display setup script operations
    if (categories.setup_script.length > 0) {
      output += `⚙️ Setup Script (${categories.setup_script.length} operations):\n`;
      categories.setup_script.forEach(op => {
        output += `   ${this.formatOperation(op)}\n`;
      });
      output += '\n';
    }

    output += `📊 Total operations: ${operations.length}\n`;
    output += '💡 No actual changes will be made in dry run mode.\n';

    return output;
  }

  /**
   * Format individual operation for display
   * @param {Object} operation - Operation object to format
   * @returns {string} - Formatted operation string
   */
  formatOperation(operation) {
    if (!operation || !operation.type) {
      return '❓ Unknown operation';
    }

    switch (operation.type) {
      case 'file_copy':
        if (operation.source && operation.destination) {
          return `📄 Copy: ${operation.source} → ${operation.destination}`;
        }
        return '📄 Copy: [missing source/destination]';

      case 'directory_create':
        if (operation.path) {
          return `📁 Create directory: ${operation.path}`;
        }
        return '📁 Create directory: [missing path]';

      case 'setup_script':
        if (operation.scriptPath) {
          return `⚙️ Execute setup script: ${operation.scriptPath}`;
        }
        return '⚙️ Execute setup script: [missing path]';

      default:
        return `❓ Unknown operation type: ${operation.type}`;
    }
  }
}