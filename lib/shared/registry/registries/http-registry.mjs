#!/usr/bin/env node

/**
 * HTTP Registry
 * Registry for templates served via HTTP/HTTPS endpoints
 */

import { BaseRegistry } from './base-registry.mjs';

/**
 * HTTP/HTTPS template registry
 */
export class HttpRegistry extends BaseRegistry {
  constructor(options = {}) {
    super(options);

    this.options = {
      endpoints: [],
      headers: {},
      timeout: 10000,
      ...this.options
    };

    this.discoveryCache = new Map();
  }

  /**
   * Discover templates from HTTP endpoints
   */
  async discoverTemplates() {
    const allTemplates = [];

    for (const endpoint of this.options.endpoints) {
      try {
        const endpointTemplates = await this.discoverTemplatesFromEndpoint(endpoint);
        allTemplates.push(...endpointTemplates);
      } catch (error) {
        // Log error but continue with other endpoints
        console.warn(`Failed to discover templates from ${endpoint.url}: ${error.message}`);
      }
    }

    return allTemplates;
  }

  /**
   * Discover templates from a specific HTTP endpoint
   */
  async discoverTemplatesFromEndpoint(endpointConfig) {
    const { url, headers = {} } = endpointConfig;
    const cacheKey = `http:${url}`;

    // Check cache first
    if (this.discoveryCache.has(cacheKey)) {
      return this.discoveryCache.get(cacheKey);
    }

    try {
      const response = await this.fetchWithTimeout(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'create-scaffold-registry/1.0.0',
          ...this.options.headers,
          ...headers
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Normalize the response format
      const templates = this.normalizeTemplatesResponse(data, endpointConfig);

      // Add endpoint info to templates
      templates.forEach(template => {
        template.endpoint = { url };
      });

      // Cache the results
      this.discoveryCache.set(cacheKey, templates);

      return templates;

    } catch (error) {
      throw new Error(`Failed to fetch templates from ${url}: ${error.message}`);
    }
  }

  /**
   * Normalize templates response from different API formats
   */
  normalizeTemplatesResponse(data, _endpointConfig) {
    // Handle different response formats
    if (Array.isArray(data)) {
      // Direct array of templates
      return data.map(template => this.normalizeTemplate(template));
    }

    if (data.templates && Array.isArray(data.templates)) {
      // Object with templates array
      return data.templates.map(template => this.normalizeTemplate(template));
    }

    if (data.data && Array.isArray(data.data)) {
      // Paginated response format
      return data.data.map(template => this.normalizeTemplate(template));
    }

    // Single template object
    if (data.name || data.id) {
      return [this.normalizeTemplate(data)];
    }

    throw new Error('Unsupported response format from registry endpoint');
  }

  /**
   * Normalize individual template object
   */
  normalizeTemplate(template) {
    return {
      id: template.id || template.name,
      name: template.name || template.id,
      description: template.description || '',
      version: template.version || '1.0.0',
      author: template.author || '',
      tags: template.tags || [],
      registry: 'http',
      ...template
    };
  }

  /**
   * Get a specific template by ID from HTTP endpoints
   */
  async getTemplate(templateId) {
    // For HTTP registries, we need to discover all templates first
    // In a more sophisticated implementation, we'd have individual template endpoints
    const templates = await this.discoverTemplates();
    return templates.find(template => template.id === templateId || template.name === templateId) || null;
  }

  /**
   * Add an HTTP endpoint to the registry
   */
  addEndpoint(url, headers = {}) {
    this.options.endpoints.push({ url, headers });
    this.clearCache();
  }

  /**
   * Remove an HTTP endpoint from the registry
   */
  removeEndpoint(url) {
    this.options.endpoints = this.options.endpoints.filter(endpoint => endpoint.url !== url);
    this.clearCache();
  }

  /**
   * Fetch with timeout
   */
  async fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.options.timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * Clear discovery cache
   */
  clearCache() {
    this.discoveryCache.clear();
  }

  /**
   * Validate HTTP registry configuration
   */
  validateConfig() {
    if (!Array.isArray(this.options.endpoints)) {
      throw new Error('HTTP registry requires endpoints array');
    }

    for (const endpoint of this.options.endpoints) {
      if (!endpoint.url) {
        throw new Error('HTTP endpoint configuration must include url');
      }

      try {
        new URL(endpoint.url);
      } catch (_error) {
        throw new Error(`Invalid URL in HTTP endpoint: ${endpoint.url}`);
      }
    }

    return true;
  }
}
