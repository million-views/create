#!/usr/bin/env node

/**
 * Local Registry
 * Registry for templates stored on local filesystem
 */

import path from 'path';
import { BaseRegistry } from './base-registry.mjs';
import { TemplateDiscovery } from '../../../../bin/create-scaffold/template-discovery.mjs';
import { loadTemplateMetadataFromPath } from '../../../../bin/create-scaffold/template-metadata.mjs';

/**
 * Local filesystem template registry
 */
export class LocalRegistry extends BaseRegistry {
  constructor(options = {}) {
    super(options);

    this.options = {
      basePath: process.cwd(),
      includeSubdirs: true,
      excludePatterns: ['node_modules', '.git', '.kiro'],
      ...this.options
    };

    this.discoveryCache = new Map();
  }

  /**
   * Discover templates from local filesystem
   */
  async discoverTemplates() {
    const templates = [];

    // Check if we have cached discovery results
    const cacheKey = this.getCacheKey();
    if (this.discoveryCache.has(cacheKey)) {
      return this.discoveryCache.get(cacheKey);
    }

    try {
      // Check if explicit templates are defined in config
      if (this.options.templates) {
        // Use explicit template mappings from config
        for (const [templateName, templatePath] of Object.entries(this.options.templates)) {
          try {
            const templateInfo = await loadTemplateMetadataFromPath(templatePath);
            templates.push({
              id: templateName,
              name: templateName,
              path: templatePath,
              description: templateInfo.description || `Template: ${templateName}`,
              version: templateInfo.version || '1.0.0',
              type: 'local',
              registry: this.name
            });
          } catch (_error) {
            // Skip templates that can't be loaded
            continue;
          }
        }
      } else {
        // Use existing TemplateDiscovery for filesystem scanning
        // TODO: Refactor to use new registry interface
        const discovery = new TemplateDiscovery(null); // No cache manager needed for local

        // For local registry, we scan the current directory and subdirectories
        const scanPaths = [this.options.basePath];

        if (this.options.includeSubdirs) {
          // Add common template directories
          scanPaths.push(
            path.join(this.options.basePath, 'templates'),
            path.join(this.options.basePath, 'examples'),
            path.join(this.options.basePath, 'starters')
          );
        }

        for (const scanPath of scanPaths) {
          try {
            const pathTemplates = await discovery.listTemplatesFromPath(scanPath);
            templates.push(...pathTemplates);
          } catch (_error) {
            // Skip directories that don't exist or can't be read
            continue;
          }
        }
      }

      // Cache the results
      this.discoveryCache.set(cacheKey, templates);

    } catch (error) {
      throw new Error(`Failed to discover local templates: ${error.message}`);
    }

    return templates;
  }

  /**
   * Get a specific template by ID from local filesystem
   */
  async getTemplate(templateId) {
    const templates = await this.discoverTemplates();
    return templates.find(template => template.handle === templateId || template.name === templateId) || null;
  }

  /**
   * Get cache key for discovery results
   */
  getCacheKey() {
    return `local:${this.options.basePath}:${this.options.includeSubdirs}`;
  }

  /**
   * Clear discovery cache
   */
  clearCache() {
    this.discoveryCache.clear();
  }

  /**
   * Validate local registry configuration
   */
  validateConfig() {
    if (!this.options.basePath) {
      throw new Error('Local registry requires basePath configuration');
    }

    return true;
  }
}
