#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { validateDirectoryExists, readJsonFile } from './utils/fsUtils.mjs';
import { loadTemplateMetadataFromPath } from './templateMetadata.mjs';

/**
 * Template Discovery module
 * Lists available templates from cached repositories with metadata
 */
export class TemplateDiscovery {
  constructor(cacheManager) {
    this.cacheManager = cacheManager;
  }

  /**
   * List all templates in a repository
   * @param {string} repoUrl - Repository URL or user/repo format
   * @param {string} branchName - Git branch name
   * @returns {Array} - Array of template objects with metadata
   */
  async listTemplates(repoUrl, branchName = 'main') {
    // Get cached repository path
    const cachedRepoPath = await this.cacheManager.getCachedRepo(repoUrl, branchName);

    if (!cachedRepoPath) {
      throw new Error(`Repository ${repoUrl} (${branchName}) is not cached. Please cache the repository first.`);
    }

    return await this.listTemplatesFromPath(cachedRepoPath);
  }

  /**
   * List all templates from a given repository path
   * @param {string} repoPath - Path to repository directory
   * @returns {Array} - Array of template objects with metadata
   */
  async listTemplatesFromPath(repoPath) {
    // Verify repository path exists
    await validateDirectoryExists(repoPath, 'Repository path');

    // Discover template directories
    const templates = [];

    try {
      const entries = await fs.readdir(repoPath, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }

        // Skip common non-template directories
        const skipDirs = ['.git', 'node_modules', '.github', '.vscode', '.kiro'];
        if (skipDirs.includes(entry.name) || entry.name.startsWith('.')) {
          continue;
        }

        const templatePath = path.join(repoPath, entry.name);

        // Check if directory contains template-like files
        if (await this.isTemplateDirectory(templatePath)) {
          const metadata = await this.getTemplateMetadata(templatePath);
          templates.push(metadata);
        }
      }
    } catch (error) {
      throw new Error(`Failed to read cached repository: ${error.message}`);
    }

    return templates;
  }

  /**
   * Check if a directory appears to be a template directory
   * @param {string} templatePath - Path to potential template directory
   * @returns {boolean} - True if directory appears to be a template
   */
  async isTemplateDirectory(templatePath) {
    try {
      const entries = await fs.readdir(templatePath);

      // Consider it a template if it has common project files
      const templateIndicators = [
        'package.json', 'index.js', 'index.ts', 'main.js', 'main.ts',
        'app.js', 'app.ts', 'src', 'lib', 'template.json', '_setup.mjs'
      ];

      return entries.some(entry => templateIndicators.includes(entry));
    } catch (_error) {
      return false;
    }
  }

  /**
   * Get template metadata from template.json and README frontmatter
   * @param {string} templatePath - Path to template directory
   * @returns {Object} - Template metadata object
   */
  async getTemplateMetadata(templatePath) {
    const templateName = path.basename(templatePath);

    // Start with fallback metadata
    let metadata = {
      name: templateName,
      description: 'No description available',
      version: null,
      author: null,
      tags: [],
      supportedOptions: []
    };

    // Store the directory name as the handle for template selection
    metadata.handle = templateName;

    // Try to get metadata from template.json (higher priority)
    const structuredMetadata = await loadTemplateMetadataFromPath(templatePath);
    const templateJson = structuredMetadata.raw ?? await this.parseTemplateJson(templatePath);

    if (templateJson) {
      metadata = { ...metadata, ...templateJson };
    }

    // Supplement metadata from package.json when available
    const packageJson = await this.parsePackageJson(templatePath);
    if (packageJson) {
      if (packageJson.name && (metadata.name === templateName || !metadata.name)) {
        metadata.name = packageJson.name;
      }

      if (
        packageJson.description &&
        (!metadata.description || metadata.description === 'No description available')
      ) {
        metadata.description = packageJson.description;
      }

      if (packageJson.version && !metadata.version) {
        metadata.version = packageJson.version;
      }

      const packageAuthor = this.normalizePackageAuthor(packageJson.author);
      if (packageAuthor && !metadata.author) {
        metadata.author = packageAuthor;
      }

      if (
        Array.isArray(packageJson.keywords) &&
        packageJson.keywords.length > 0 &&
        (!metadata.tags || metadata.tags.length === 0)
      ) {
        metadata.tags = packageJson.keywords;
      }
    }

    // Try to get additional metadata from README frontmatter
    const readmeFrontmatter = await this.parseReadmeFrontmatter(templatePath);
    if (readmeFrontmatter) {
      // Merge frontmatter, but template.json takes priority for existing keys
      for (const [key, value] of Object.entries(readmeFrontmatter)) {
        const noDescriptionFallback = metadata[key] === 'No description available';
        if (
          metadata[key] === null ||
          metadata[key] === undefined ||
          noDescriptionFallback ||
          (Array.isArray(metadata[key]) && metadata[key].length === 0)
        ) {
          metadata[key] = value;
        }
      }
    }

  metadata.supportedOptions = structuredMetadata.supportedOptions;
  metadata.authoringMode = structuredMetadata.authoringMode;
  metadata.dimensions = structuredMetadata.dimensions;
  metadata.handoff = structuredMetadata.handoffSteps;
  metadata.placeholders = structuredMetadata.placeholders ?? [];
  metadata.canonicalVariables = structuredMetadata.canonicalVariables ?? [];

    return metadata;
  }

  /**
   * Parse template.json file for template metadata
   * @param {string} templatePath - Path to template directory
   * @returns {Object|null} - Parsed template metadata or null if not found/invalid
   */
  async parseTemplateJson(templatePath) {
    const templateJsonPath = path.join(templatePath, 'template.json');
    try {
      return await readJsonFile(templateJsonPath, null, 'template.json');
    } catch {
      return null;
    }
  }

  /**
   * Parse package.json file for template metadata
   * @param {string} templatePath - Path to template directory
   * @returns {Object|null} - Parsed package metadata or null if not found/invalid
   */
  async parsePackageJson(templatePath) {
    const packageJsonPath = path.join(templatePath, 'package.json');
    try {
      return await readJsonFile(packageJsonPath, null, 'package.json');
    } catch {
      return null;
    }
  }

  /**
   * Normalize package.json author field to a string
   * @param {string|Object} author - Author field from package.json
   * @returns {string|null} - Normalized author string or null
   */
  normalizePackageAuthor(author) {
    if (!author) {
      return null;
    }

    if (typeof author === 'string') {
      return author;
    }

    if (typeof author === 'object') {
      const parts = [];
      if (author.name) {
        parts.push(author.name);
      }
      if (author.email) {
        parts.push(`<${author.email}>`);
      }
      if (author.url) {
        parts.push(author.url);
      }
      return parts.length > 0 ? parts.join(' ') : null;
    }

    return null;
  }

  /**
   * Parse README frontmatter for template metadata
   * @param {string} templatePath - Path to template directory
   * @returns {Object|null} - Parsed frontmatter metadata or null if not found/invalid
   */
  async parseReadmeFrontmatter(templatePath) {
    try {
      const readmePath = path.join(templatePath, 'README.md');
      const rawData = await fs.readFile(readmePath, 'utf8');

      // Check if file starts with frontmatter delimiter
      if (!rawData.startsWith('---\n')) {
        return null;
      }

      // Find the closing delimiter
      const lines = rawData.split('\n');
      let frontmatterEnd = -1;

      for (let i = 1; i < lines.length; i++) {
        if (lines[i] === '---') {
          frontmatterEnd = i;
          break;
        }
      }

      if (frontmatterEnd === -1) {
        return null;
      }

      // Extract frontmatter content
      const frontmatterLines = lines.slice(1, frontmatterEnd);
      const frontmatterContent = frontmatterLines.join('\n');

      // Parse YAML-like frontmatter (simple implementation)
      return this.parseSimpleYaml(frontmatterContent);
    } catch (_error) {
      // Return null for any error (file not found, permission denied, etc.)
      return null;
    }
  }

  /**
   * Simple YAML parser for frontmatter (handles basic key-value pairs and arrays)
   * @param {string} yamlContent - YAML content to parse
   * @returns {Object} - Parsed YAML object
   */
  parseSimpleYaml(yamlContent) {
    const result = {};
    const lines = yamlContent.split('\n');
    let currentArray = null;

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }

      // Handle array items
      if (trimmedLine.startsWith('- ')) {
        if (currentArray) {
          currentArray.push(trimmedLine.slice(2).trim());
        }
        continue;
      }

      // Handle key-value pairs
      const colonIndex = trimmedLine.indexOf(':');
      if (colonIndex > 0) {
        const key = trimmedLine.slice(0, colonIndex).trim();
        const value = trimmedLine.slice(colonIndex + 1).trim();

        if (value === '') {
          // This might be the start of an array
          currentArray = [];
          result[key] = currentArray;
        } else {
          // Simple key-value pair
          result[key] = value;
          currentArray = null;
        }
      }
    }

    return result;
  }

  /**
   * Format template list for console output
   * @param {Array} templates - Array of template objects
   * @returns {string} - Formatted template list
   */
  formatTemplateList(templates) {
    if (templates.length === 0) {
      return '📋 No templates found in this repository.\n';
    }

    let output = `📋 Found ${templates.length} template${templates.length === 1 ? '' : 's'}:\n\n`;

    for (let i = 0; i < templates.length; i++) {
      output += this.formatTemplateEntry(templates[i]);

      // Add separator between templates (but not after the last one)
      if (i < templates.length - 1) {
        output += '\n' + '─'.repeat(60) + '\n\n';
      }
    }

    return output;
  }

  /**
   * Format individual template entry for console output
   * @param {Object} template - Template metadata object
   * @returns {string} - Formatted template entry
   */
  formatTemplateEntry(template) {
    let output = `📦 ${template.name}`;

    // Show handle if different from display name
    if (template.handle && template.handle !== template.name) {
      output += ` (${template.handle})`;
    }

    output += '\n';

    if (template.description && template.description !== 'No description available') {
      output += `   ${template.description}\n`;
    } else {
      output += `   No description available\n`;
    }

    const details = [];

    if (template.version) {
      details.push(`v${template.version}`);
    }

    if (template.author) {
      details.push(`by ${template.author}`);
    }

    if (template.tags && template.tags.length > 0) {
      details.push(`tags: ${template.tags.join(', ')}`);
    }

    if (details.length > 0) {
      output += `   ${details.join(' • ')}\n`;
    }

    return output;
  }

  /**
   * Prepare template metadata for interactive selection menus
   * @param {Array<Object>} templates - Templates returned from discovery
   * @returns {Array<Object>} Formatted template entries for menus
   */
  formatTemplateOptions(templates) {
    return templates.map((template, index) => ({
      id: index + 1,
      name: template.name,
      handle: template.handle,
      description: template.description ?? 'No description available',
      tags: Array.isArray(template.tags) ? template.tags : [],
      canonicalVariables: Array.isArray(template.canonicalVariables) ? template.canonicalVariables : [],
      handoffSteps: Array.isArray(template.handoff) ? template.handoff : [],
      placeholders: Array.isArray(template.placeholders) ? template.placeholders : []
    }));
  }
}
