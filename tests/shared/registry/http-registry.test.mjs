#!/usr/bin/env node

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { HttpRegistry } from '../../../bin/create-scaffold/modules/registry/registries/http-registry.mjs';

// Mock fetch for testing
class MockFetch {
  constructor() {
    this.calls = [];
    this.responses = new Map();
  }

  setResponse(url, response) {
    this.responses.set(url, response);
  }

  async fetch(url, options = {}) {
    this.calls.push({ url, options });

    const response = this.responses.get(url);
    if (!response) {
      throw new Error(`No mock response configured for ${url}`);
    }

    if (response.error) {
      throw response.error;
    }

    return {
      ok: response.ok !== false,
      status: response.status || 200,
      statusText: response.statusText || 'OK',
      json: async () => response.data || {},
      ...response
    };
  }
}

describe('HttpRegistry', () => {

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const registry = new HttpRegistry();

      assert.strictEqual(registry.options.endpoints.length, 0);
      assert.deepStrictEqual(registry.options.headers, {});
      assert.strictEqual(registry.options.timeout, 10000);
      assert(registry.discoveryCache instanceof Map);
    });

    it('should merge provided options with defaults', () => {
      const options = {
        endpoints: [{ url: 'https://example.com' }],
        headers: { 'Authorization': 'Bearer token' },
        timeout: 5000
      };

      const registry = new HttpRegistry(options);

      assert.deepStrictEqual(registry.options.endpoints, options.endpoints);
      assert.deepStrictEqual(registry.options.headers, options.headers);
      assert.strictEqual(registry.options.timeout, 5000);
    });
  });

  describe('discoverTemplates', () => {
    it('should return empty array when no endpoints configured', async () => {
      const registry = new HttpRegistry();

      const templates = await registry.discoverTemplates();

      assert.deepStrictEqual(templates, []);
    });

    it('should discover templates from multiple endpoints', async () => {
      const mockFetch = new MockFetch();
      const originalFetch = global.fetch;
      global.fetch = mockFetch.fetch.bind(mockFetch);

      try {
        const registry = new HttpRegistry({
          endpoints: [
            { url: 'https://api1.example.com/templates' },
            { url: 'https://api2.example.com/templates' }
          ]
        });

        mockFetch.setResponse('https://api1.example.com/templates', {
          data: [
            { id: 'template1', name: 'Template 1', description: 'First template' }
          ]
        });

        mockFetch.setResponse('https://api2.example.com/templates', {
          data: [
            { id: 'template2', name: 'Template 2', description: 'Second template' }
          ]
        });

        const templates = await registry.discoverTemplates();

        assert.strictEqual(templates.length, 2);
        assert.strictEqual(templates[0].id, 'template1');
        assert.strictEqual(templates[0].endpoint.url, 'https://api1.example.com/templates');
        assert.strictEqual(templates[1].id, 'template2');
        assert.strictEqual(templates[1].endpoint.url, 'https://api2.example.com/templates');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('should continue with other endpoints when one fails', async () => {
      const mockFetch = new MockFetch();
      const originalFetch = global.fetch;
      global.fetch = mockFetch.fetch.bind(mockFetch);

      try {
        const registry = new HttpRegistry({
          endpoints: [
            { url: 'https://failing.example.com/templates' },
            { url: 'https://working.example.com/templates' }
          ]
        });

        mockFetch.setResponse('https://failing.example.com/templates', {
          error: new Error('Network error')
        });

        mockFetch.setResponse('https://working.example.com/templates', {
          data: [
            { id: 'template1', name: 'Template 1' }
          ]
        });

        const templates = await registry.discoverTemplates();

        assert.strictEqual(templates.length, 1);
        assert.strictEqual(templates[0].id, 'template1');
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('discoverTemplatesFromEndpoint', () => {
    it('should fetch and normalize templates from endpoint', async () => {
      const mockFetch = new MockFetch();
      const originalFetch = global.fetch;
      global.fetch = mockFetch.fetch.bind(mockFetch);

      try {
        const registry = new HttpRegistry();
        const endpoint = { url: 'https://api.example.com/templates' };

        mockFetch.setResponse('https://api.example.com/templates', {
          data: [
            { id: 'template1', name: 'Template 1', description: 'A template' }
          ]
        });

        const templates = await registry.discoverTemplatesFromEndpoint(endpoint);

        assert.strictEqual(templates.length, 1);
        assert.strictEqual(templates[0].id, 'template1');
        assert.strictEqual(templates[0].name, 'Template 1');
        assert.strictEqual(templates[0].description, 'A template');
        assert.strictEqual(templates[0].registry, 'http');
        assert.deepStrictEqual(templates[0].endpoint, { url: 'https://api.example.com/templates' });
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('should use cache for repeated requests', async () => {
      const mockFetch = new MockFetch();
      const originalFetch = global.fetch;
      global.fetch = mockFetch.fetch.bind(mockFetch);

      try {
        const registry = new HttpRegistry();
        const endpoint = { url: 'https://api.example.com/templates' };

        mockFetch.setResponse('https://api.example.com/templates', {
          data: [
            { id: 'template1', name: 'Template 1' }
          ]
        });

        // First call
        const templates1 = await registry.discoverTemplatesFromEndpoint(endpoint);
        // Second call should use cache
        const templates2 = await registry.discoverTemplatesFromEndpoint(endpoint);

        assert.strictEqual(mockFetch.calls.length, 1); // Only one HTTP call
        assert.deepStrictEqual(templates1, templates2);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('should handle HTTP error responses', async () => {
      const mockFetch = new MockFetch();
      const originalFetch = global.fetch;
      global.fetch = mockFetch.fetch.bind(mockFetch);

      try {
        const registry = new HttpRegistry();
        const endpoint = { url: 'https://api.example.com/templates' };

        mockFetch.setResponse('https://api.example.com/templates', {
          ok: false,
          status: 404,
          statusText: 'Not Found'
        });

        await assert.rejects(
          () => registry.discoverTemplatesFromEndpoint(endpoint),
          /HTTP 404: Not Found/
        );
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('should handle network errors', async () => {
      const mockFetch = new MockFetch();
      const originalFetch = global.fetch;
      global.fetch = mockFetch.fetch.bind(mockFetch);

      try {
        const registry = new HttpRegistry();
        const endpoint = { url: 'https://api.example.com/templates' };

        mockFetch.setResponse('https://api.example.com/templates', {
          error: new Error('Network timeout')
        });

        await assert.rejects(
          () => registry.discoverTemplatesFromEndpoint(endpoint),
          /Failed to fetch templates from https:\/\/api\.example\.com\/templates: Network timeout/
        );
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('should merge endpoint and global headers', async () => {
      const mockFetch = new MockFetch();
      const originalFetch = global.fetch;
      global.fetch = mockFetch.fetch.bind(mockFetch);

      try {
        const registry = new HttpRegistry({
          headers: { 'Authorization': 'Bearer global-token' }
        });
        const endpoint = {
          url: 'https://api.example.com/templates',
          headers: { 'X-API-Key': 'endpoint-key' }
        };

        mockFetch.setResponse('https://api.example.com/templates', {
          data: [{ id: 'template1' }]
        });

        await registry.discoverTemplatesFromEndpoint(endpoint);

        const call = mockFetch.calls[0];
        assert.strictEqual(call.options.headers['Authorization'], 'Bearer global-token');
        assert.strictEqual(call.options.headers['X-API-Key'], 'endpoint-key');
        assert.strictEqual(call.options.headers['Accept'], 'application/json');
        assert.strictEqual(call.options.headers['User-Agent'], 'create-scaffold-registry/1.0.0');
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('normalizeTemplatesResponse', () => {
    it('should handle direct array of templates', () => {
      const registry = new HttpRegistry();
      const data = [
        { id: 't1', name: 'Template 1' },
        { id: 't2', name: 'Template 2' }
      ];

      const templates = registry.normalizeTemplatesResponse(data);

      assert.strictEqual(templates.length, 2);
      assert.strictEqual(templates[0].id, 't1');
      assert.strictEqual(templates[1].id, 't2');
    });

    it('should handle object with templates array', () => {
      const registry = new HttpRegistry();
      const data = {
        templates: [
          { id: 't1', name: 'Template 1' }
        ]
      };

      const templates = registry.normalizeTemplatesResponse(data);

      assert.strictEqual(templates.length, 1);
      assert.strictEqual(templates[0].id, 't1');
    });

    it('should handle paginated response format', () => {
      const registry = new HttpRegistry();
      const data = {
        data: [
          { id: 't1', name: 'Template 1' }
        ]
      };

      const templates = registry.normalizeTemplatesResponse(data);

      assert.strictEqual(templates.length, 1);
      assert.strictEqual(templates[0].id, 't1');
    });

    it('should handle single template object', () => {
      const registry = new HttpRegistry();
      const data = { id: 't1', name: 'Template 1' };

      const templates = registry.normalizeTemplatesResponse(data);

      assert.strictEqual(templates.length, 1);
      assert.strictEqual(templates[0].id, 't1');
    });

    it('should throw error for unsupported format', () => {
      const registry = new HttpRegistry();
      const data = { invalid: 'format' };

      assert.throws(
        () => registry.normalizeTemplatesResponse(data),
        /Unsupported response format from registry endpoint/
      );
    });
  });

  describe('normalizeTemplate', () => {
    it('should normalize template with all fields', () => {
      const registry = new HttpRegistry();
      const template = {
        id: 'my-template',
        name: 'My Template',
        description: 'A great template',
        version: '2.0.0',
        author: 'John Doe',
        tags: ['web', 'react'],
        extra: 'field'
      };

      const normalized = registry.normalizeTemplate(template);

      assert.strictEqual(normalized.id, 'my-template');
      assert.strictEqual(normalized.name, 'My Template');
      assert.strictEqual(normalized.description, 'A great template');
      assert.strictEqual(normalized.version, '2.0.0');
      assert.strictEqual(normalized.author, 'John Doe');
      assert.deepStrictEqual(normalized.tags, ['web', 'react']);
      assert.strictEqual(normalized.registry, 'http');
      assert.strictEqual(normalized.extra, 'field');
    });

    it('should provide defaults for missing fields', () => {
      const registry = new HttpRegistry();
      const template = { name: 'Simple Template' };

      const normalized = registry.normalizeTemplate(template);

      assert.strictEqual(normalized.id, 'Simple Template');
      assert.strictEqual(normalized.name, 'Simple Template');
      assert.strictEqual(normalized.description, '');
      assert.strictEqual(normalized.version, '1.0.0');
      assert.strictEqual(normalized.author, '');
      assert.deepStrictEqual(normalized.tags, []);
      assert.strictEqual(normalized.registry, 'http');
    });

    it('should use id as name fallback', () => {
      const registry = new HttpRegistry();
      const template = { id: 'template-id' };

      const normalized = registry.normalizeTemplate(template);

      assert.strictEqual(normalized.id, 'template-id');
      assert.strictEqual(normalized.name, 'template-id');
    });
  });

  describe('getTemplate', () => {
    it('should find template by id', async () => {
      const mockFetch = new MockFetch();
      const originalFetch = global.fetch;
      global.fetch = mockFetch.fetch.bind(mockFetch);

      try {
        const registry = new HttpRegistry({
          endpoints: [{ url: 'https://api.example.com/templates' }]
        });

        mockFetch.setResponse('https://api.example.com/templates', {
          data: [
            { id: 'template1', name: 'Template 1' },
            { id: 'template2', name: 'Template 2' }
          ]
        });

        const template = await registry.getTemplate('template1');

        assert.strictEqual(template.id, 'template1');
        assert.strictEqual(template.name, 'Template 1');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('should find template by name', async () => {
      const mockFetch = new MockFetch();
      const originalFetch = global.fetch;
      global.fetch = mockFetch.fetch.bind(mockFetch);

      try {
        const registry = new HttpRegistry({
          endpoints: [{ url: 'https://api.example.com/templates' }]
        });

        mockFetch.setResponse('https://api.example.com/templates', {
          data: [
            { id: 'template1', name: 'Template 1' }
          ]
        });

        const template = await registry.getTemplate('Template 1');

        assert.strictEqual(template.id, 'template1');
        assert.strictEqual(template.name, 'Template 1');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('should return null when template not found', async () => {
      const mockFetch = new MockFetch();
      const originalFetch = global.fetch;
      global.fetch = mockFetch.fetch.bind(mockFetch);

      try {
        const registry = new HttpRegistry({
          endpoints: [{ url: 'https://api.example.com/templates' }]
        });

        mockFetch.setResponse('https://api.example.com/templates', {
          data: [{ id: 'template1', name: 'Template 1' }]
        });

        const template = await registry.getTemplate('nonexistent');

        assert.strictEqual(template, null);
      } finally {
        global.fetch = originalFetch;
      }
    });
  });  describe('endpoint management', () => {
    it('should add endpoint', () => {
      const registry = new HttpRegistry();

      registry.addEndpoint('https://api.example.com/templates', { 'X-API-Key': 'key' });

      assert.strictEqual(registry.options.endpoints.length, 1);
      assert.strictEqual(registry.options.endpoints[0].url, 'https://api.example.com/templates');
      assert.deepStrictEqual(registry.options.endpoints[0].headers, { 'X-API-Key': 'key' });
    });

    it('should clear cache when adding endpoint', () => {
      const registry = new HttpRegistry();

      // Add something to cache
      registry.discoveryCache.set('test', 'value');

      registry.addEndpoint('https://api.example.com/templates');

      assert.strictEqual(registry.discoveryCache.size, 0);
    });

    it('should remove endpoint', () => {
      const registry = new HttpRegistry({
        endpoints: [
          { url: 'https://api1.example.com' },
          { url: 'https://api2.example.com' }
        ]
      });

      registry.removeEndpoint('https://api1.example.com');

      assert.strictEqual(registry.options.endpoints.length, 1);
      assert.strictEqual(registry.options.endpoints[0].url, 'https://api2.example.com');
    });

    it('should clear cache when removing endpoint', () => {
      const registry = new HttpRegistry({
        endpoints: [{ url: 'https://api.example.com' }]
      });

      // Add something to cache
      registry.discoveryCache.set('test', 'value');

      registry.removeEndpoint('https://api.example.com');

      assert.strictEqual(registry.discoveryCache.size, 0);
    });
  });

  describe('fetchWithTimeout', () => {
    it('should fetch successfully within timeout', async () => {
      const mockFetch = new MockFetch();
      const originalFetch = global.fetch;
      global.fetch = mockFetch.fetch.bind(mockFetch);

      try {
        const registry = new HttpRegistry({ timeout: 1000 });
        const mockResponse = { ok: true, status: 200 };

        mockFetch.setResponse('https://api.example.com', mockResponse);

        const response = await registry.fetchWithTimeout('https://api.example.com');

        assert.strictEqual(response.ok, true);
        assert.strictEqual(response.status, 200);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('should timeout after specified duration', async () => {
      const mockFetch = new MockFetch();
      const originalFetch = global.fetch;
      global.fetch = mockFetch.fetch.bind(mockFetch);

      try {
        const registry = new HttpRegistry({ timeout: 10 }); // Very short timeout

        // Mock an abort error to simulate timeout
        const abortError = new Error('Request timeout');
        abortError.name = 'AbortError';
        mockFetch.setResponse('https://api.example.com', {
          error: abortError
        });

        await assert.rejects(
          () => registry.fetchWithTimeout('https://api.example.com'),
          /Request timeout after 10ms/
        );
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('should propagate other fetch errors', async () => {
      const mockFetch = new MockFetch();
      const originalFetch = global.fetch;
      global.fetch = mockFetch.fetch.bind(mockFetch);

      try {
        const registry = new HttpRegistry();
        const networkError = new Error('Network unreachable');

        mockFetch.setResponse('https://api.example.com', {
          error: networkError
        });

        await assert.rejects(
          () => registry.fetchWithTimeout('https://api.example.com'),
          networkError
        );
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('clearCache', () => {
    it('should clear discovery cache', () => {
      const registry = new HttpRegistry();

      registry.discoveryCache.set('key1', 'value1');
      registry.discoveryCache.set('key2', 'value2');

      registry.clearCache();

      assert.strictEqual(registry.discoveryCache.size, 0);
    });
  });

  describe('validateConfig', () => {
    it('should validate valid configuration', () => {
      const registry = new HttpRegistry({
        endpoints: [
          { url: 'https://api.example.com' },
          { url: 'https://api2.example.com' }
        ]
      });

      const result = registry.validateConfig();

      assert.strictEqual(result, true);
    });

    it('should throw error for non-array endpoints', () => {
      const registry = new HttpRegistry({
        endpoints: 'not-an-array'
      });

      assert.throws(
        () => registry.validateConfig(),
        /HTTP registry requires endpoints array/
      );
    });

    it('should throw error for endpoint without url', () => {
      const registry = new HttpRegistry({
        endpoints: [{ headers: {} }]
      });

      assert.throws(
        () => registry.validateConfig(),
        /HTTP endpoint configuration must include url/
      );
    });

    it('should throw error for invalid URL', () => {
      const registry = new HttpRegistry({
        endpoints: [{ url: 'not-a-valid-url' }]
      });

      assert.throws(
        () => registry.validateConfig(),
        /Invalid URL in HTTP endpoint: not-a-valid-url/
      );
    });
  });
});
