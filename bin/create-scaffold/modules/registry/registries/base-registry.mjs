#!/usr/bin/env node

/**
 * Base Registry Class
 * Abstract base class for template registries
 */

/**
 * Abstract base class for template registries
 */
export class BaseRegistry {
  constructor(options = {}) {
    this.options = {
      enabled: true,
      timeout: 30000,
      ...options
    };
  }

  /**
   * Discover all templates in this registry
   * @returns {Promise<Array>} Array of template metadata objects
   */
  async discoverTemplates() {
    throw new Error('discoverTemplates() must be implemented by subclass');
  }

  /**
   * Get a specific template by ID
   * @param {string} templateId - Template identifier
   * @returns {Promise<Object|null>} Template metadata or null if not found
   */
  async getTemplate(_templateId) {
    throw new Error('getTemplate() must be implemented by subclass');
  }

  /**
   * Validate registry configuration
   */
  validateConfig() {
    // Default implementation - override in subclasses
    return true;
  }

  /**
   * Shutdown the registry
   */
  async shutdown() {
    // Default implementation - override in subclasses if needed
  }
}
