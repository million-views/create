#!/usr/bin/env node

/**
 * Git Registry
 * Registry for templates stored in Git repositories
 */

import { BaseRegistry } from './base-registry.mjs';
import { TemplateDiscovery } from '../../../../bin/create-scaffold/template-discovery.mjs';

/**
 * Git repository template registry
 */
export class GitRegistry extends BaseRegistry {
  constructor(options = {}) {
    super(options);

    this.options = {
      repositories: [],
      defaultBranch: 'main',
      cacheEnabled: true,
      ...this.options
    };

    this.discoveryCache = new Map();
  }

  /**
   * Discover templates from Git repositories
   */
  async discoverTemplates() {
    const allTemplates = [];

    for (const repo of this.options.repositories) {
      try {
        const repoTemplates = await this.discoverTemplatesFromRepo(repo);
        allTemplates.push(...repoTemplates);
      } catch (error) {
        // Log error but continue with other repositories
        console.warn(`Failed to discover templates from ${repo.url}: ${error.message}`);
      }
    }

    return allTemplates;
  }

  /**
   * Discover templates from a specific Git repository
   */
  async discoverTemplatesFromRepo(repoConfig) {
    const { url, branch = this.options.defaultBranch } = repoConfig;
    const cacheKey = `git:${url}:${branch}`;

    // Check cache first
    if (this.options.cacheEnabled && this.discoveryCache.has(cacheKey)) {
      return this.discoveryCache.get(cacheKey);
    }

    try {
      // For now, we'll need to integrate with existing cache manager
      // TODO: Use the new cache manager from the registry system
      const cacheManager = this.getCacheManager();
      const discovery = new TemplateDiscovery(cacheManager);

      const templates = await discovery.listTemplates(url, branch);

      // Add repository info to templates
      templates.forEach(template => {
        template.repository = { url, branch };
      });

      // Cache the results
      if (this.options.cacheEnabled) {
        this.discoveryCache.set(cacheKey, templates);
      }

      return templates;

    } catch (error) {
      throw new Error(`Failed to discover templates from Git repo ${url}: ${error.message}`);
    }
  }

  /**
   * Get a specific template by ID from Git repositories
   */
  async getTemplate(templateId) {
    const templates = await this.discoverTemplates();
    return templates.find(template => template.handle === templateId || template.name === templateId) || null;
  }

  /**
   * Add a Git repository to the registry
   */
  addRepository(url, branch = this.options.defaultBranch) {
    this.options.repositories.push({ url, branch });
    this.clearCache();
  }

  /**
   * Remove a Git repository from the registry
   */
  removeRepository(url) {
    this.options.repositories = this.options.repositories.filter(repo => repo.url !== url);
    this.clearCache();
  }

  /**
   * Get cache manager (placeholder for now)
   */
  getCacheManager() {
    // TODO: Integrate with the new cache manager
    return null;
  }

  /**
   * Clear discovery cache
   */
  clearCache() {
    this.discoveryCache.clear();
  }

  /**
   * Validate Git registry configuration
   */
  validateConfig() {
    if (!Array.isArray(this.options.repositories)) {
      throw new Error('Git registry requires repositories array');
    }

    for (const repo of this.options.repositories) {
      if (!repo.url) {
        throw new Error('Git repository configuration must include url');
      }
    }

    return true;
  }
}
