import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ConfigManager, createConfigManager } from '../../../lib/cli/config-manager.mjs';
import fs from 'fs/promises';
import path from 'path';
import { tmpdir } from 'os';

describe('CLI Config Manager', () => {
  let tempDir;
  let configManager;

  it('should setup test environment', () => {
    tempDir = path.join(tmpdir(), 'config-test-' + Date.now());
    configManager = new ConfigManager({
      toolName: 'test-cli',
      configFileName: '.testrc',
      globalConfigDir: tempDir,
      defaults: {
        timeout: 5000,
        verbose: false
      }
    });
  });

  describe('ConfigManager', () => {
    it('should load defaults when no config exists', async () => {
      const config = await configManager.load();

      assert.equal(config.timeout, 5000);
      assert.equal(config.verbose, false);
    });

    it('should merge environment variables', async () => {
      process.env.TEST_CLI_TIMEOUT = '10000';
      process.env.TEST_CLI_VERBOSE = 'true';

      try {
        const config = await configManager.load();

        assert.equal(config.timeout, '10000'); // String from env (numeric string)
        assert.equal(config.verbose, true); // Parsed boolean from env
      } finally {
        delete process.env.TEST_CLI_TIMEOUT;
        delete process.env.TEST_CLI_VERBOSE;
      }
    });

    it('should parse environment variable types', async () => {
      process.env.TEST_CLI_TIMEOUT = '10000';
      process.env.TEST_CLI_VERBOSE = 'true';
      process.env.TEST_CLI_COUNT = '5';

      try {
        const config = await configManager.load();

        assert.equal(config.timeout, '10000'); // String from env
        assert.equal(config.verbose, true); // Parsed boolean
        assert.equal(config.count, '5'); // String from env
      } finally {
        delete process.env.TEST_CLI_TIMEOUT;
        delete process.env.TEST_CLI_VERBOSE;
        delete process.env.TEST_CLI_COUNT;
      }
    });
  });

  describe('parseEnvValue', () => {
    it('should parse boolean values', () => {
      assert.equal(configManager.parseEnvValue('true'), true);
      assert.equal(configManager.parseEnvValue('false'), false);
      assert.equal(configManager.parseEnvValue('True'), true);
      assert.equal(configManager.parseEnvValue('FALSE'), false);
    });

    it('should parse numeric values', () => {
      assert.equal(configManager.parseEnvValue('42'), 42);
      assert.equal(configManager.parseEnvValue('3.14'), 3.14);
    });

    it('should parse JSON values', () => {
      assert.deepEqual(configManager.parseEnvValue('{"key": "value"}'), { key: 'value' });
      assert.deepEqual(configManager.parseEnvValue('[1, 2, 3]'), [1, 2, 3]);
    });

    it('should return strings for unparseable values', () => {
      assert.equal(configManager.parseEnvValue('not-a-number'), 'not-a-number');
      assert.equal(configManager.parseEnvValue('invalid-json{'), 'invalid-json{');
    });
  });

  describe('mergeConfigs', () => {
    it('should merge configs with overlay taking precedence', () => {
      const base = { a: 1, b: 2 };
      const overlay = { b: 3, c: 4 };

      const result = configManager.mergeConfigs(base, overlay);

      assert.deepEqual(result, { a: 1, b: 3, c: 4 });
    });

    it('should not overwrite with null/undefined', () => {
      const base = { a: 1, b: 2 };
      const overlay = { b: null, c: undefined };

      const result = configManager.mergeConfigs(base, overlay);

      assert.deepEqual(result, { a: 1, b: 2 });
    });
  });

  describe('validateConfig', () => {
    it('should validate required fields', () => {
      configManager.schema = {
        requiredField: { required: true }
      };

      assert.throws(() => {
        configManager.validateConfig({});
      }, /Configuration validation failed/);
    });

    it('should validate types', () => {
      configManager.schema = {
        numberField: { type: 'number' }
      };

      assert.throws(() => {
        configManager.validateConfig({ numberField: 'not-a-number' });
      }, /must be of type number/);
    });

    it('should validate enums', () => {
      configManager.schema = {
        enumField: { enum: ['a', 'b', 'c'] }
      };

      assert.throws(() => {
        configManager.validateConfig({ enumField: 'd' });
      }, /must be one of/);
    });
  });

  describe('createConfigManager', () => {
    it('should create a ConfigManager instance', () => {
      const manager = createConfigManager({ toolName: 'test' });
      assert(manager instanceof ConfigManager);
      assert.equal(manager.toolName, 'test');
    });
  });

  it('should cleanup test environment', async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });
});