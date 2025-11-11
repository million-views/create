#!/usr/bin/env node

/**
 * Registry Manager
 * Manages multiple template registry sources
 */

import { EventEmitter } from 'events';
import { LocalRegistry } from './registries/local-registry.mjs';
import { GitRegistry } from './registries/git-registry.mjs';
import { HttpRegistry } from './registries/http-registry.mjs';

/**
 * Manages multiple template registry sources
 */
export class RegistryManager extends EventEmitter {
  constructor(templateRegistry) {
    super();
    this.templateRegistry = templateRegistry;
    this.registries = new Map();
    this.registryConfigs = new Map();
  }

  /**
   * Initialize the registry manager
   */
  async initialize() {
    // Register built-in registries
    await this.registerBuiltInRegistries();

    this.emit('initialized');
  }

  /**
   * Register built-in registry types
   */
  async registerBuiltInRegistries() {
    // Local filesystem registry
    await this.registerRegistry('local', {
      type: 'local',
      description: 'Local filesystem template registry',
      enabled: true
    });

    // Git repository registry
    await this.registerRegistry('git', {
      type: 'git',
      description: 'Git repository template registry',
      enabled: true
    });

    // HTTP/HTTPS registry
    await this.registerRegistry('http', {
      type: 'http',
      description: 'HTTP/HTTPS template registry',
      enabled: true
    });
  }

  /**
   * Register a new registry source
   */
  async registerRegistry(name, config) {
    if (this.registries.has(name)) {
      throw new Error(`Registry '${name}' is already registered`);
    }

    const registry = this.createRegistryInstance(config);
    this.registries.set(name, registry);
    this.registryConfigs.set(name, config);

    this.emit('registry:added', { name, config });

    return registry;
  }

  /**
   * Create registry instance based on type
   */
  createRegistryInstance(config) {
    const { type, ...options } = config;

    switch (type) {
      case 'local':
        return new LocalRegistry(options);
      case 'git':
        return new GitRegistry(options);
      case 'http':
        return new HttpRegistry(options);
      default:
        throw new Error(`Unknown registry type: ${type}`);
    }
  }

  /**
   * Unregister a registry
   */
  async unregisterRegistry(name) {
    if (!this.registries.has(name)) {
      throw new Error(`Registry '${name}' is not registered`);
    }

    const registry = this.registries.get(name);
    if (registry.shutdown) {
      await registry.shutdown();
    }

    this.registries.delete(name);
    this.registryConfigs.delete(name);

    this.emit('registry:removed', name);
  }

  /**
   * List all registered registries
   */
  listRegistries() {
    const result = [];
    for (const [name, config] of this.registryConfigs) {
      result.push({
        name,
        type: config.type,
        description: config.description,
        enabled: config.enabled !== false,
        config
      });
    }
    return result;
  }

  /**
   * Get a specific registry
   */
  getRegistry(name) {
    return this.registries.get(name);
  }

  /**
   * Discover templates from registries
   */
  async discoverTemplates(specificRegistry = null) {
    const allTemplates = [];

    if (specificRegistry) {
      // Discover from specific registry
      const registry = this.registries.get(specificRegistry);
      if (!registry) {
        throw new Error(`Registry '${specificRegistry}' not found`);
      }

      const templates = await registry.discoverTemplates();
      // Add registry info to templates
      templates.forEach(template => {
        template.registry = specificRegistry;
      });
      allTemplates.push(...templates);
    } else {
      // Discover from all enabled registries
      for (const [name, registry] of this.registries) {
        const config = this.registryConfigs.get(name);
        if (config.enabled === false) {
          continue;
        }

        try {
          const templates = await registry.discoverTemplates();
          // Add registry info to templates
          templates.forEach(template => {
            template.registry = name;
          });
          allTemplates.push(...templates);
        } catch (error) {
          this.emit('registry:discovery:failed', { registry: name, error });
          // Continue with other registries
        }
      }
    }

    return allTemplates;
  }

  /**
   * Get a specific template by ID
   */
  async getTemplate(templateId, specificRegistry = null) {
    if (specificRegistry) {
      // Get from specific registry
      const registry = this.registries.get(specificRegistry);
      if (!registry) {
        throw new Error(`Registry '${specificRegistry}' not found`);
      }

      return await registry.getTemplate(templateId);
    } else {
      // Search all enabled registries
      for (const [name, registry] of this.registries) {
        const config = this.registryConfigs.get(name);
        if (config.enabled === false) {
          continue;
        }

        try {
          const template = await registry.getTemplate(templateId);
          if (template) {
            template.registry = name;
            return template;
          }
        } catch (_error) {
          // Continue searching other registries
        }
      }

      return null;
    }
  }

  /**
   * Shutdown all registries
   */
  async shutdown() {
    for (const [name, registry] of this.registries) {
      if (registry.shutdown) {
        try {
          await registry.shutdown();
        } catch (error) {
          this.emit('registry:shutdown:failed', { registry: name, error });
        }
      }
    }

    this.registries.clear();
    this.registryConfigs.clear();
  }
}
