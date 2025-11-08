#!/usr/bin/env node

import fs from 'fs';
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
   */
  async previewScaffolding(repoUrl, branchName = 'main', templateName, projectDir) {
    const cachedRepoPath = await this.cacheManager.getCachedRepo(repoUrl, branchName);

    if (this.logger) {
      await this.logger.logOperation('dry_run_preview', {
        template: templateName,
        repoUrl,
        branch: branchName,
        projectDir,
        cachedRepoPath
      });
    }

    // Load template metadata synchronously
    const templatePath = path.join(cachedRepoPath, templateName);
    const metadata = loadTemplateMetadataFromPath(templatePath);

    if (this.logger) {
      await this.logger.logOperation('template_metadata_loaded', {
        template: templateName,
        name: metadata.name,
        description: metadata.description,
        version: metadata.version
      });
    }

    // Preview file operations
    const preview = this.previewScaffoldingFromPath(templatePath, projectDir, metadata);

    if (this.logger) {
      await this.logger.logOperation('dry_run_preview', {
        summary: {
          files: preview.summary.fileCount,
          directories: preview.summary.directoryCount,
          operations: preview.operations.length
        }
      });
    }

    return preview;
  }

  /**
   * Preview scaffolding operations from a local template path
   */
  previewScaffoldingFromPath(templatePath, projectDir, metadata = null) {
    validateDirectoryExists(templatePath, 'Template directory');

    // Load metadata if not provided
    if (!metadata) {
      metadata = loadTemplateMetadataFromPath(templatePath);
    }

    // Create ignore set for template filtering
    const ignoreSet = createTemplateIgnoreSet();

    // Collect all files and directories synchronously
    const templateFiles = this.collectTemplateFiles(templatePath, ignoreSet);

    // Separate files and directories
    const files = templateFiles.filter(item => item.type === 'file');
    const directories = templateFiles.filter(item => item.type === 'directory');

    // Extract placeholders from files
    const placeholders = this.extractPlaceholders(files, templatePath);

    // Build preview result
    const preview = {
      templatePath,
      projectDir,
      metadata,
      files: files.map(f => ({
        source: f.path,
        relative: path.relative(templatePath, f.path),
        target: path.join(projectDir, path.relative(templatePath, f.path))
      })),
      directories: directories.map(d => ({
        source: d.path,
        relative: path.relative(templatePath, d.path),
        target: path.join(projectDir, path.relative(templatePath, d.path))
      })),
      ignored: Array.from(ignoreSet),
      placeholders,
      operations: [
        ...directories.map(d => ({
          type: 'directory_create',
          path: path.join(projectDir, path.relative(templatePath, d.path)),
          relativePath: path.relative(templatePath, d.path)
        })),
        ...files.map(f => ({
          type: 'file_copy',
          source: f.path,
          destination: path.join(projectDir, path.relative(templatePath, f.path)),
          relativePath: path.relative(templatePath, f.path)
        }))
      ],
      summary: {
        fileCount: files.length,
        directoryCount: directories.length,
        totalOperations: files.length + directories.length
      }
    };

    return preview;
  }

  /**
   * Recursively collect all files and directories from template path
   */
  collectTemplateFiles(templatePath, ignoreSet) {
    const results = [];

    function walk(dir) {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.relative(templatePath, fullPath);

          // Skip ignored entries
          if (shouldIgnoreTemplateEntry(relativePath, ignoreSet)) {
            continue;
          }

          if (entry.isDirectory()) {
            results.push({
              type: 'directory',
              path: fullPath,
              relative: relativePath
            });
            // Recursively walk subdirectories
            walk(fullPath);
          } else if (entry.isFile()) {
            results.push({
              type: 'file',
              path: fullPath,
              relative: relativePath
            });
          }
        }
      } catch (error) {
        // Skip directories we can't read (permission issues, etc.)
        this.logger.warn(`Warning: Could not read directory ${dir}: ${error.message}`);
      }
    }

    walk(templatePath);
    return results;
  }

  /**
   * Extract placeholders from template files
   */
  extractPlaceholders(files, templatePath) {
    const placeholders = new Set();

    for (const file of files) {
      try {
        const content = fs.readFileSync(file.path, 'utf8');
        // Simple regex to find {{placeholder}} patterns
        const matches = content.match(/\{\{([^}]+)\}\}/g);
        if (matches) {
          matches.forEach(match => {
            const placeholder = match.slice(2, -2).trim(); // Remove {{ }}
            placeholders.add(placeholder);
          });
        }
      } catch (error) {
        // Skip files we can't read
        this.logger.warn(`Warning: Could not read file ${file.path}: ${error.message}`);
      }
    }

    return Array.from(placeholders).sort();
  }

  /**
   * Validate that dry run preview matches expected structure
   */
  validatePreview(preview) {
    const errors = [];

    // Check required properties
    if (!preview.templatePath) errors.push('Missing templatePath');
    if (!preview.projectDir) errors.push('Missing projectDir');
    if (!preview.metadata) errors.push('Missing metadata');
    if (!Array.isArray(preview.files)) errors.push('Files should be an array');
    if (!Array.isArray(preview.directories)) errors.push('Directories should be an array');
    if (!Array.isArray(preview.ignored)) errors.push('Ignored should be an array');
    if (!Array.isArray(preview.placeholders)) errors.push('Placeholders should be an array');

    // Validate file entries
    for (const file of preview.files) {
      if (!file.source || !file.relative || !file.target) {
        errors.push(`Invalid file entry: ${JSON.stringify(file)}`);
      }
    }

    // Validate directory entries
    for (const dir of preview.directories) {
      if (!dir.source || !dir.relative || !dir.target) {
        errors.push(`Invalid directory entry: ${JSON.stringify(dir)}`);
      }
    }

    return errors;
  }
}
