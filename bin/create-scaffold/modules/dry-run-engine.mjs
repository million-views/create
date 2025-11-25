#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { File } from '../../../lib/util/file.mjs';
import {
  shouldIgnoreTemplateEntry, createTemplateIgnoreSet
} from '../../../lib/template-ignore.mjs';
import { loadTemplateMetadataFromPath } from '../../../lib/template-discovery.mjs';
import { extractPlaceholders as extractPlaceholdersWithFormat } from '../../../lib/placeholder-formats.mjs';

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
  async previewScaffolding(repoUrl, branchName = 'main', templateTarget, projectDir) {
    const cachedRepoPath = await this.cacheManager.getCachedRepo(repoUrl, branchName);

    if (!cachedRepoPath) {
      throw new Error(`Repository ${repoUrl} (${branchName}) is not cached. Please cache the repository first.`);
    }

    const templatePath = path.isAbsolute(templateTarget)
      ? templateTarget
      : path.join(cachedRepoPath, templateTarget);

    const errors = await File.validateDirectoryExists(templatePath, 'Template directory');
    if (errors.length > 0) {
      throw new Error(errors.join('; '));
    }

    const templateLabel = path.relative(cachedRepoPath, templatePath) || path.basename(templatePath);

    if (this.logger) {
      await this.logger.logOperation('dry_run_preview', {
        template: templateLabel,
        repoUrl,
        branch: branchName,
        projectDir,
        cachedRepoPath
      });
    }

    // Load template metadata synchronously
    const metadata = loadTemplateMetadataFromPath(templatePath);

    if (this.logger) {
      await this.logger.logOperation('template_metadata_loaded', {
        template: templateLabel,
        name: metadata.name,
        description: metadata.description,
        version: metadata.version
      });
    }

    // Preview file operations
    const preview = await this.previewScaffoldingFromPath(templatePath, projectDir, metadata);

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
  async previewScaffoldingFromPath(templatePath, projectDir, metadata = null) {
    const errors = await File.validateDirectoryExists(templatePath, 'Template directory');
    if (errors.length > 0) {
      throw new Error(errors.join('; '));
    }

    if (this.logger) {
      await this.logger.logOperation('dry_run_preview', {
        templatePath,
        projectDir
      });
    }

    // Load metadata if not provided
    if (!metadata) {
      metadata = loadTemplateMetadataFromPath(templatePath);
    }

    if (this.logger) {
      await this.logger.logOperation('template_metadata_loaded', {
        template: path.basename(templatePath),
        name: metadata.name,
        description: metadata.description,
        version: metadata.version
      });
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

    if (this.logger) {
      await this.logger.logOperation('dry_run_preview', {
        summary: {
          files: files.length,
          directories: directories.length,
          operations: files.length + directories.length
        }
      });
    }

    return preview;
  }

  /**
   * Recursively collect all files and directories from template path
   */
  collectTemplateFiles(templatePath, ignoreSet) {
    const results = [];
    const logger = this.logger; // Capture logger reference

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
        if (logger) {
          logger.warn(`Warning: Could not read directory ${dir}: ${error.message}`);
        }
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

    // Try to load template metadata to get placeholder format
    let placeholderFormat = 'unicode'; // default
    try {
      const metadata = loadTemplateMetadataFromPath(templatePath);
      placeholderFormat = metadata.placeholderFormat || 'unicode';
    } catch {
      // If metadata can't be loaded, use default format
    }

    for (const file of files) {
      try {
        const content = fs.readFileSync(file.path, 'utf8');
        // Use centralized extraction to support all formats
        const tokens = extractPlaceholdersWithFormat(content, placeholderFormat);
        tokens.forEach(token => placeholders.add(token));
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
