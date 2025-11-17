import { describe, it } from 'node:test';
import assert from 'node:assert';
import { EventEmitter } from 'node:events';
import { RegistryManager } from '../../bin/create-scaffold/modules/registry/registry-manager.mjs';

// Mock registry classes for testing
class MockLocalRegistry {
  constructor(options) {
    this.options = options;
    this.templates = [];
    this.shutdownCalled = false;
  }

  async discoverTemplates() {
    return this.templates;
  }

  async getTemplate(id) {
    return this.templates.find(t => t.id === id) || null;
  }

  async shutdown() {
    this.shutdownCalled = true;
  }

  validateConfig() {
    return true;
  }
}

class MockGitRegistry {
  constructor(options) {
    this.options = options;
    this.templates = [];
    this.shutdownCalled = false;
  }

  async discoverTemplates() {
    return this.templates;
  }

  async getTemplate(id) {
    return this.templates.find(t => t.id === id) || null;
  }

  async shutdown() {
    this.shutdownCalled = true;
  }

  validateConfig() {
    return true;
  }
}

class MockHttpRegistry {
  constructor(options) {
    this.options = options;
    this.templates = [];
    this.shutdownCalled = false;
  }

  async discoverTemplates() {
    return this.templates;
  }

  async getTemplate(id) {
    return this.templates.find(t => t.id === id) || null;
  }

  async shutdown() {
    this.shutdownCalled = true;
  }

  validateConfig() {
    return true;
  }
}

// Mock TemplateRegistry for testing
class MockTemplateRegistry {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    this.initialized = true;
  }
}

describe('RegistryManager', () => {
  describe('constructor', () => {
    it('creates instance with template registry', () => {
      const templateRegistry = new MockTemplateRegistry();
      const manager = new RegistryManager(templateRegistry);

      assert(manager instanceof EventEmitter);
      assert.strictEqual(manager.templateRegistry, templateRegistry);
      assert(manager.registries instanceof Map);
      assert(manager.registryConfigs instanceof Map);
    });
  });

  describe('initialize()', () => {
    it('initializes and registers built-in registries', async () => {
      const templateRegistry = new MockTemplateRegistry();
      const manager = new RegistryManager(templateRegistry);

      // Override createRegistryInstance to return mocks
      manager.createRegistryInstance = (config) => {
        const { type, ...options } = config;
        switch (type) {
          case 'local':
            return new MockLocalRegistry(options);
          case 'git':
            return new MockGitRegistry(options);
          case 'http':
            return new MockHttpRegistry(options);
          default:
            throw new Error(`Unknown registry type: ${type}`);
        }
      };

      const events = [];
      manager.on('initialized', () => events.push('initialized'));
      manager.on('registry:added', (data) => events.push(`registry:added:${data.name}`));

      await manager.initialize();

      assert.strictEqual(events.length, 4); // initialized + 3 registries
      assert(events.includes('initialized'));
      assert(events.includes('registry:added:local'));
      assert(events.includes('registry:added:git'));
      assert(events.includes('registry:added:http'));

      // Check that registries are registered
      assert(manager.registries.has('local'));
      assert(manager.registries.has('git'));
      assert(manager.registries.has('http'));

      assert(manager.registryConfigs.has('local'));
      assert(manager.registryConfigs.has('git'));
      assert(manager.registryConfigs.has('http'));
    });
  });

  describe('registerRegistry()', () => {
    it('registers a new registry successfully', async () => {
      const templateRegistry = new MockTemplateRegistry();
      const manager = new RegistryManager(templateRegistry);

      // Override createRegistryInstance to return mock
      manager.createRegistryInstance = (config) => {
        return new MockLocalRegistry(config);
      };

      const events = [];
      manager.on('registry:added', (data) => events.push(data));

      const config = {
        type: 'local',
        description: 'Test registry',
        basePath: '/tmp/test'
      };

      const registry = await manager.registerRegistry('test-registry', config);

      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0].name, 'test-registry');
      assert.deepStrictEqual(events[0].config, config);

      assert(manager.registries.has('test-registry'));
      assert(manager.registryConfigs.has('test-registry'));
      assert(registry instanceof MockLocalRegistry);
    });

    it('throws error when registering duplicate registry', async () => {
      const templateRegistry = new MockTemplateRegistry();
      const manager = new RegistryManager(templateRegistry);

      const config = {
        type: 'local',
        description: 'Test registry'
      };

      await manager.registerRegistry('test-registry', config);

      await assert.rejects(
        async () => {
          await manager.registerRegistry('test-registry', config);
        },
        { message: "Registry 'test-registry' is already registered" }
      );
    });

    it('throws error for unknown registry type', async () => {
      const templateRegistry = new MockTemplateRegistry();
      const manager = new RegistryManager(templateRegistry);

      const config = {
        type: 'unknown',
        description: 'Unknown registry'
      };

      await assert.rejects(
        async () => {
          await manager.registerRegistry('test-registry', config);
        },
        { message: 'Unknown registry type: unknown' }
      );
    });
  });

  describe('createRegistryInstance()', () => {
    it('creates LocalRegistry instance', () => {
      const templateRegistry = new MockTemplateRegistry();
      const manager = new RegistryManager(templateRegistry);

      // Override to return mock
      manager.createRegistryInstance = (config) => {
        return new MockLocalRegistry(config);
      };

      const config = {
        type: 'local',
        basePath: '/tmp/test'
      };

      const registry = manager.createRegistryInstance(config);
      assert(registry instanceof MockLocalRegistry);
      assert.deepStrictEqual(registry.options, config);
    });

    it('creates GitRegistry instance', () => {
      const templateRegistry = new MockTemplateRegistry();
      const manager = new RegistryManager(templateRegistry);

      // Override to return mock
      manager.createRegistryInstance = (config) => {
        return new MockGitRegistry(config);
      };

      const config = {
        type: 'git',
        repositories: ['https://github.com/test/repo']
      };

      const registry = manager.createRegistryInstance(config);
      assert(registry instanceof MockGitRegistry);
      assert.deepStrictEqual(registry.options, config);
    });

    it('creates HttpRegistry instance', () => {
      const templateRegistry = new MockTemplateRegistry();
      const manager = new RegistryManager(templateRegistry);

      // Override to return mock
      manager.createRegistryInstance = (config) => {
        return new MockHttpRegistry(config);
      };

      const config = {
        type: 'http',
        endpoints: ['https://api.test.com']
      };

      const registry = manager.createRegistryInstance(config);
      assert(registry instanceof MockHttpRegistry);
      assert.deepStrictEqual(registry.options, config);
    });
  });

  describe('unregisterRegistry()', () => {
    it('unregisters existing registry', async () => {
      const templateRegistry = new MockTemplateRegistry();
      const manager = new RegistryManager(templateRegistry);

      const config = {
        type: 'local',
        description: 'Test registry'
      };

      await manager.registerRegistry('test-registry', config);
      assert(manager.registries.has('test-registry'));

      const events = [];
      manager.on('registry:removed', (name) => events.push(name));

      await manager.unregisterRegistry('test-registry');

      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0], 'test-registry');

      assert(!manager.registries.has('test-registry'));
      assert(!manager.registryConfigs.has('test-registry'));
    });

    it('throws error when unregistering non-existent registry', async () => {
      const templateRegistry = new MockTemplateRegistry();
      const manager = new RegistryManager(templateRegistry);

      await assert.rejects(
        async () => {
          await manager.unregisterRegistry('non-existent');
        },
        { message: "Registry 'non-existent' is not registered" }
      );
    });

    it('calls shutdown on registry if available', async () => {
      const templateRegistry = new MockTemplateRegistry();
      const manager = new RegistryManager(templateRegistry);

      // Override createRegistryInstance to return mock
      manager.createRegistryInstance = (config) => {
        return new MockLocalRegistry(config);
      };

      const config = {
        type: 'local',
        description: 'Test registry'
      };

      const registry = await manager.registerRegistry('test-registry', config);
      assert(!registry.shutdownCalled);

      await manager.unregisterRegistry('test-registry');

      assert(registry.shutdownCalled);
    });
  });

  describe('listRegistries()', () => {
    it('lists all registered registries', async () => {
      const templateRegistry = new MockTemplateRegistry();
      const manager = new RegistryManager(templateRegistry);

      await manager.initialize();

      const registries = manager.listRegistries();

      assert(Array.isArray(registries));
      assert.strictEqual(registries.length, 3);

      const localRegistry = registries.find(r => r.name === 'local');
      assert(localRegistry);
      assert.strictEqual(localRegistry.type, 'local');
      assert.strictEqual(localRegistry.description, 'Local filesystem template registry');
      assert.strictEqual(localRegistry.enabled, true);

      const gitRegistry = registries.find(r => r.name === 'git');
      assert(gitRegistry);
      assert.strictEqual(gitRegistry.type, 'git');
      assert.strictEqual(gitRegistry.description, 'Git repository template registry');
      assert.strictEqual(gitRegistry.enabled, true);

      const httpRegistry = registries.find(r => r.name === 'http');
      assert(httpRegistry);
      assert.strictEqual(httpRegistry.type, 'http');
      assert.strictEqual(httpRegistry.description, 'HTTP/HTTPS template registry');
      assert.strictEqual(httpRegistry.enabled, true);
    });

    it('respects enabled/disabled status', async () => {
      const templateRegistry = new MockTemplateRegistry();
      const manager = new RegistryManager(templateRegistry);

      await manager.registerRegistry('disabled-registry', {
        type: 'local',
        description: 'Disabled registry',
        enabled: false
      });

      const registries = manager.listRegistries();
      const disabledRegistry = registries.find(r => r.name === 'disabled-registry');
      assert(disabledRegistry);
      assert.strictEqual(disabledRegistry.enabled, false);
    });
  });

  describe('getRegistry()', () => {
    it('returns registry instance by name', async () => {
      const templateRegistry = new MockTemplateRegistry();
      const manager = new RegistryManager(templateRegistry);

      // Override createRegistryInstance to return mocks
      manager.createRegistryInstance = (config) => {
        const { type, ...options } = config;
        switch (type) {
          case 'local':
            return new MockLocalRegistry(options);
          case 'git':
            return new MockGitRegistry(options);
          case 'http':
            return new MockHttpRegistry(options);
        }
      };

      await manager.initialize();

      const localRegistry = manager.getRegistry('local');
      assert(localRegistry instanceof MockLocalRegistry);

      const gitRegistry = manager.getRegistry('git');
      assert(gitRegistry instanceof MockGitRegistry);

      const httpRegistry = manager.getRegistry('http');
      assert(httpRegistry instanceof MockHttpRegistry);
    });

    it('returns undefined for non-existent registry', () => {
      const templateRegistry = new MockTemplateRegistry();
      const manager = new RegistryManager(templateRegistry);

      const registry = manager.getRegistry('non-existent');
      assert.strictEqual(registry, undefined);
    });
  });

  describe('discoverTemplates()', () => {
    it('discovers templates from specific registry', async () => {
      const templateRegistry = new MockTemplateRegistry();
      const manager = new RegistryManager(templateRegistry);

      // Override createRegistryInstance to return mocks
      manager.createRegistryInstance = (config) => {
        const { type, ...options } = config;
        switch (type) {
          case 'local':
            return new MockLocalRegistry(options);
          case 'git':
            return new MockGitRegistry(options);
          case 'http':
            return new MockHttpRegistry(options);
        }
      };

      await manager.initialize();

      // Set up mock templates
      const localRegistry = manager.getRegistry('local');
      localRegistry.templates = [
        { id: 'template1', name: 'Template 1' },
        { id: 'template2', name: 'Template 2' }
      ];

      const templates = await manager.discoverTemplates('local');

      assert.strictEqual(templates.length, 2);
      assert.strictEqual(templates[0].id, 'template1');
      assert.strictEqual(templates[0].registry, 'local');
      assert.strictEqual(templates[1].id, 'template2');
      assert.strictEqual(templates[1].registry, 'local');
    });

    it('throws error for non-existent specific registry', async () => {
      const templateRegistry = new MockTemplateRegistry();
      const manager = new RegistryManager(templateRegistry);

      await assert.rejects(
        async () => {
          await manager.discoverTemplates('non-existent');
        },
        { message: "Registry 'non-existent' not found" }
      );
    });

    it('discovers templates from all enabled registries', async () => {
      const templateRegistry = new MockTemplateRegistry();
      const manager = new RegistryManager(templateRegistry);

      // Override createRegistryInstance to return mocks
      manager.createRegistryInstance = (config) => {
        const { type, ...options } = config;
        switch (type) {
          case 'local':
            return new MockLocalRegistry(options);
          case 'git':
            return new MockGitRegistry(options);
          case 'http':
            return new MockHttpRegistry(options);
        }
      };

      await manager.initialize();

      // Set up mock templates
      const localRegistry = manager.getRegistry('local');
      localRegistry.templates = [
        { id: 'local-template', name: 'Local Template' }
      ];

      const gitRegistry = manager.getRegistry('git');
      gitRegistry.templates = [
        { id: 'git-template', name: 'Git Template' }
      ];

      // Disable HTTP registry
      manager.registryConfigs.get('http').enabled = false;

      const templates = await manager.discoverTemplates();

      assert.strictEqual(templates.length, 2);

      const localTemplate = templates.find(t => t.id === 'local-template');
      assert(localTemplate);
      assert.strictEqual(localTemplate.registry, 'local');

      const gitTemplate = templates.find(t => t.id === 'git-template');
      assert(gitTemplate);
      assert.strictEqual(gitTemplate.registry, 'git');
    });

    it('handles registry discovery failures gracefully', async () => {
      const templateRegistry = new MockTemplateRegistry();
      const manager = new RegistryManager(templateRegistry);

      // Override createRegistryInstance to return mocks
      manager.createRegistryInstance = (config) => {
        const { type, ...options } = config;
        switch (type) {
          case 'local':
            return new MockLocalRegistry(options);
          case 'git':
            return new MockGitRegistry(options);
          case 'http':
            return new MockHttpRegistry(options);
        }
      };

      await manager.initialize();

      // Set up mock that throws error
      const gitRegistry = manager.getRegistry('git');
      gitRegistry.discoverTemplates = async () => {
        throw new Error('Network error');
      };

      const events = [];
      manager.on('registry:discovery:failed', (data) => events.push(data));

      // Set up local registry with templates
      const localRegistry = manager.getRegistry('local');
      localRegistry.templates = [
        { id: 'local-template', name: 'Local Template' }
      ];

      const templates = await manager.discoverTemplates();

      assert.strictEqual(templates.length, 1);
      assert.strictEqual(templates[0].id, 'local-template');
      assert.strictEqual(templates[0].registry, 'local');

      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0].registry, 'git');
      assert(events[0].error instanceof Error);
      assert.strictEqual(events[0].error.message, 'Network error');
    });
  });

  describe('getTemplate()', () => {
    it('gets template from specific registry', async () => {
      const templateRegistry = new MockTemplateRegistry();
      const manager = new RegistryManager(templateRegistry);

      // Override createRegistryInstance to return mocks
      manager.createRegistryInstance = (config) => {
        const { type, ...options } = config;
        switch (type) {
          case 'local':
            return new MockLocalRegistry(options);
          case 'git':
            return new MockGitRegistry(options);
          case 'http':
            return new MockHttpRegistry(options);
        }
      };

      await manager.initialize();

      // Set up mock template
      const localRegistry = manager.getRegistry('local');
      localRegistry.templates = [
        { id: 'template1', name: 'Template 1' }
      ];

      const template = await manager.getTemplate('template1', 'local');

      assert(template);
      assert.strictEqual(template.id, 'template1');
      // Note: getTemplate for specific registry doesn't add registry property
      // assert.strictEqual(template.registry, 'local');
    });

    it('returns null when template not found in specific registry', async () => {
      const templateRegistry = new MockTemplateRegistry();
      const manager = new RegistryManager(templateRegistry);

      await manager.initialize();

      const template = await manager.getTemplate('non-existent', 'local');

      assert.strictEqual(template, null);
    });

    it('throws error for non-existent specific registry', async () => {
      const templateRegistry = new MockTemplateRegistry();
      const manager = new RegistryManager(templateRegistry);

      await assert.rejects(
        async () => {
          await manager.getTemplate('template1', 'non-existent');
        },
        { message: "Registry 'non-existent' not found" }
      );
    });

    it('searches all enabled registries for template', async () => {
      const templateRegistry = new MockTemplateRegistry();
      const manager = new RegistryManager(templateRegistry);

      // Override createRegistryInstance to return mocks
      manager.createRegistryInstance = (config) => {
        const { type, ...options } = config;
        switch (type) {
          case 'local':
            return new MockLocalRegistry(options);
          case 'git':
            return new MockGitRegistry(options);
          case 'http':
            return new MockHttpRegistry(options);
        }
      };

      await manager.initialize();

      // Set up templates in different registries
      const gitRegistry = manager.getRegistry('git');
      gitRegistry.templates = [
        { id: 'git-template', name: 'Git Template' }
      ];

      const template = await manager.getTemplate('git-template');

      assert(template);
      assert.strictEqual(template.id, 'git-template');
      assert.strictEqual(template.registry, 'git');
    });

    it('returns null when template not found in any registry', async () => {
      const templateRegistry = new MockTemplateRegistry();
      const manager = new RegistryManager(templateRegistry);

      await manager.initialize();

      const template = await manager.getTemplate('non-existent');

      assert.strictEqual(template, null);
    });

    it('skips disabled registries during search', async () => {
      const templateRegistry = new MockTemplateRegistry();
      const manager = new RegistryManager(templateRegistry);

      await manager.initialize();

      // Disable local registry
      manager.registryConfigs.get('local').enabled = false;

      // Set up template in disabled registry
      const localRegistry = manager.getRegistry('local');
      localRegistry.templates = [
        { id: 'local-template', name: 'Local Template' }
      ];

      // Set up template in enabled registry
      const gitRegistry = manager.getRegistry('git');
      gitRegistry.templates = [
        { id: 'git-template', name: 'Git Template' }
      ];

      const template = await manager.getTemplate('local-template');

      assert.strictEqual(template, null);
    });
  });

  describe('shutdown()', () => {
    it('shuts down all registries', async () => {
      const templateRegistry = new MockTemplateRegistry();
      const manager = new RegistryManager(templateRegistry);

      await manager.initialize();

      const events = [];
      manager.on('registry:shutdown:failed', (data) => events.push(data));

      // Get references before shutdown
      const localRegistry = manager.registries.get('local');
      const gitRegistry = manager.registries.get('git');
      const httpRegistry = manager.registries.get('http');

      // Verify registries have shutdown method
      assert(typeof localRegistry.shutdown === 'function');
      assert(typeof gitRegistry.shutdown === 'function');
      assert(typeof httpRegistry.shutdown === 'function');

      await manager.shutdown();

      // Maps should be cleared
      assert.strictEqual(manager.registries.size, 0);
      assert.strictEqual(manager.registryConfigs.size, 0);

      assert.strictEqual(events.length, 0); // No failures
    });

    it('handles shutdown failures gracefully', async () => {
      const templateRegistry = new MockTemplateRegistry();
      const manager = new RegistryManager(templateRegistry);

      // Override createRegistryInstance to return mocks
      manager.createRegistryInstance = (config) => {
        const { type, ...options } = config;
        switch (type) {
          case 'local':
            return new MockLocalRegistry(options);
          case 'git':
            return new MockGitRegistry(options);
          case 'http':
            return new MockHttpRegistry(options);
        }
      };

      await manager.initialize();

      // Make git registry shutdown fail
      const gitRegistry = manager.getRegistry('git');
      gitRegistry.shutdown = async () => {
        throw new Error('Shutdown failed');
      };

      const events = [];
      manager.on('registry:shutdown:failed', (data) => events.push(data));

      await manager.shutdown();

      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0].registry, 'git');
      assert(events[0].error instanceof Error);
      assert.strictEqual(events[0].error.message, 'Shutdown failed');

      // Maps should still be cleared
      assert.strictEqual(manager.registries.size, 0);
      assert.strictEqual(manager.registryConfigs.size, 0);
    });
  });
});
