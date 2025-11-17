#!/usr/bin/env node

/**
 * Template Registry System
 * Centralized template discovery, caching, and validation
 */

import { EventEmitter } from 'events';
import { RegistryManager } from './registry-manager.mjs';
import { TemplateValidator } from './template-validator.mjs';
import { CacheManager } from './cache-manager.mjs';

/**
 * Main Template Registry interface
 * Provides unified access to templates from multiple sources
 */
export class TemplateRegistry extends EventEmitter {
  constructor(options = {}) {
    super();

    this.options = {
      cacheEnabled: true,
      validationEnabled: true,
      maxCacheAge: 24 * 60 * 60 * 1000, // 24 hours
      ...options
    };

    // Initialize components
    this.registryManager = new RegistryManager(this);
    this.validator = new TemplateValidator(this);
    this.cacheManager = new CacheManager(this);

    // Bind event handlers
    this.setupEventHandlers();
  }

  /**
   * Set up event handlers for component communication
   */
  setupEventHandlers() {
    // Forward events from components
    this.registryManager.on('registry:added', (registry) => {
      this.emit('registry:added', registry);
    });

    this.registryManager.on('registry:removed', (registry) => {
      this.emit('registry:removed', registry);
    });

    this.cacheManager.on('cache:hit', (key) => {
      this.emit('cache:hit', key);
    });

    this.cacheManager.on('cache:miss', (key) => {
      this.emit('cache:miss', key);
    });

    this.validator.on('validation:success', (template) => {
      this.emit('validation:success', template);
    });

    this.validator.on('validation:failed', (error) => {
      this.emit('validation:failed', error);
    });
  }

  /**
   * Initialize the registry system
   */
  async initialize() {
    await this.registryManager.initialize();
    await this.cacheManager.initialize();

    this.emit('initialized');
  }

  /**
   * Register a new template registry source
   */
  async registerRegistry(name, config) {
    return await this.registryManager.registerRegistry(name, config);
  }

  /**
   * Unregister a template registry
   */
  async unregisterRegistry(name) {
    return await this.registryManager.unregisterRegistry(name);
  }

  /**
   * List all registered registries
   */
  listRegistries() {
    return this.registryManager.listRegistries();
  }

  /**
   * Discover templates from all registered registries
   */
  async discoverTemplates(options = {}) {
    const {
      registry: specificRegistry,
      invalidateCache = false,
      validate = this.options.validationEnabled
    } = options;

    const cacheKey = `templates:${specificRegistry || 'all'}:${JSON.stringify(options)}`;

    // Check cache first
    if (!invalidateCache && this.options.cacheEnabled) {
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        this.emit('templates:cache:hit', { registry: specificRegistry, count: cached.length });
        return cached;
      }
    }

    // Discover templates
    const templates = await this.registryManager.discoverTemplates(specificRegistry);

    // Validate templates if requested
    if (validate) {
      const validatedTemplates = [];
      for (const template of templates) {
        try {
          const validated = await this.validator.validateTemplate(template);
          validatedTemplates.push(validated);
        } catch (error) {
          this.emit('template:validation:failed', { template, error });
          // Include invalid templates with error info
          validatedTemplates.push({
            ...template,
            validationError: error.message
          });
        }
      }

      // Cache validated results
      if (this.options.cacheEnabled) {
        await this.cacheManager.set(cacheKey, validatedTemplates, this.options.maxCacheAge);
      }

      this.emit('templates:discovered', {
        registry: specificRegistry,
        count: validatedTemplates.length,
        validated: true
      });

      return validatedTemplates;
    }

    // Cache unvalidated results
    if (this.options.cacheEnabled) {
      await this.cacheManager.set(cacheKey, templates, this.options.maxCacheAge);
    }

    this.emit('templates:discovered', {
      registry: specificRegistry,
      count: templates.length,
      validated: false
    });

    return templates;
  }

  /**
   * Get a specific template by ID
   */
  async getTemplate(templateId, options = {}) {
    const {
      registry: specificRegistry,
      invalidateCache = false,
      validate = this.options.validationEnabled
    } = options;

    const cacheKey = `template:${templateId}:${specificRegistry || 'any'}`;

    // Check cache first
    if (!invalidateCache && this.options.cacheEnabled) {
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        this.emit('template:cache:hit', templateId);
        return cached;
      }
    }

    // Get template from registry
    const template = await this.registryManager.getTemplate(templateId, specificRegistry);

    if (!template) {
      throw new Error(`Template '${templateId}' not found`);
    }

    // Validate if requested
    let validatedTemplate = template;
    if (validate) {
      validatedTemplate = await this.validator.validateTemplate(template);
    }

    // Cache result
    if (this.options.cacheEnabled) {
      await this.cacheManager.set(cacheKey, validatedTemplate, this.options.maxCacheAge);
    }

    this.emit('template:retrieved', {
      id: templateId,
      registry: specificRegistry,
      validated: validate
    });

    return validatedTemplate;
  }

  /**
   * Search templates by criteria
   */
  async searchTemplates(criteria, options = {}) {
    const templates = await this.discoverTemplates(options);

    return templates.filter(template => {
      // Search by name
      if (criteria.name && !template.name.toLowerCase().includes(criteria.name.toLowerCase())) {
        return false;
      }

      // Search by description
      if (criteria.description && !template.description.toLowerCase().includes(criteria.description.toLowerCase())) {
        return false;
      }

      // Filter by tags
      if (criteria.tags && criteria.tags.length > 0) {
        const templateTags = template.tags || [];
        if (!criteria.tags.some(tag => templateTags.includes(tag))) {
          return false;
        }
      }

      // Filter by author
      if (criteria.author && template.author !== criteria.author) {
        return false;
      }

      // Filter by registry
      if (criteria.registry && template.registry !== criteria.registry) {
        return false;
      }

      return true;
    });
  }

  /**
   * Validate a template
   */
  async validateTemplate(template) {
    return await this.validator.validateTemplate(template);
  }

  /**
   * Clear all caches
   */
  async clearCache() {
    await this.cacheManager.clear();
    this.emit('cache:cleared');
  }

  /**
   * Get registry statistics
   */
  async getStats() {
    const registries = this.registryManager.listRegistries();
    const cacheStats = await this.cacheManager.getStats();

    return {
      registries: registries.length,
      cache: cacheStats,
      options: this.options
    };
  }

  /**
   * Shutdown the registry system
   */
  async shutdown() {
    await this.cacheManager.shutdown();
    this.emit('shutdown');
  }
}
