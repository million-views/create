#!/usr/bin/env node

/**
 * L2 Tests for Templatize Config
 *
 * Tests config loading, validation, and generation for the templatize module.
 * Uses project's tmp/ folder instead of system tmpdir for test isolation.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import { join } from 'node:path';
import { loadConfig, validateConfig, generateConfigFile, getPatternsForFile, DEFAULT_CONFIG } from '@m5nv/create/lib/templatize/strategy/config.mts';

// Helper to create unique temp directories
function tempDir(suffix) {
  return join(process.cwd(), 'tmp', 'unit-tests', `templatize-${suffix}-${Date.now()}`);
}

describe('TemplatizeConfig', () => {
  describe('loadConfig', () => {
    it('throws error when no .templatize.json exists', async () => {
      const dir = tempDir('no-config');
      await fs.mkdir(dir, { recursive: true });

      try {
        assert.throws(() => loadConfig(dir), /Configuration file .templatize.json not found/);
      } finally {
        await fs.rm(dir, { recursive: true, force: true });
      }
    });

    it('loads and validates .templatize.json when it exists', async () => {
      const dir = tempDir('with-config');
      const configPath = join(dir, '.templatize.json');
      await fs.mkdir(dir, { recursive: true });

      const customConfig = {
        version: '1.0',
        autoDetect: false,
        rules: {
          'package.json': [
            {
              context: 'application/json',
              path: '$.name',
              placeholder: 'CUSTOM_NAME'
            }
          ]
        }
      };

      await fs.writeFile(configPath, JSON.stringify(customConfig));

      try {
        const config = loadConfig(dir);
        assert.strictEqual(config.version, '1.0');
        assert.strictEqual(config.autoDetect, false);
        assert.strictEqual(config.rules['package.json'][0].placeholder, 'CUSTOM_NAME');
      } finally {
        await fs.rm(dir, { recursive: true, force: true });
      }
    });

    it('throws on invalid JSON in config file', async () => {
      const dir = tempDir('invalid-json');
      const configPath = join(dir, '.templatize.json');
      await fs.mkdir(dir, { recursive: true });

      await fs.writeFile(configPath, '{ invalid json }');

      try {
        assert.throws(() => loadConfig(dir), /Invalid JSON/);
      } finally {
        await fs.rm(dir, { recursive: true, force: true });
      }
    });

    it('throws on invalid config structure', async () => {
      const dir = tempDir('invalid-config');
      const configPath = join(dir, '.templatize.json');
      await fs.mkdir(dir, { recursive: true });

      const invalidConfig = {
        version: '1.0',
        // Missing required autoDetect field
      };

      await fs.writeFile(configPath, JSON.stringify(invalidConfig));

      try {
        assert.throws(() => loadConfig(dir), /Configuration autoDetect must be a boolean/);
      } finally {
        await fs.rm(dir, { recursive: true, force: true });
      }
    });
  });

  describe('validateConfig', () => {
    it('accepts valid default config', () => {
      assert.doesNotThrow(() => validateConfig(DEFAULT_CONFIG));
    });

    it('rejects config without version', () => {
      const invalidConfig = { ...DEFAULT_CONFIG };
      delete invalidConfig.version;

      assert.throws(() => validateConfig(invalidConfig), /must have a version string/);
    });

    it('rejects config without rules', () => {
      const invalidConfig = { ...DEFAULT_CONFIG };
      delete invalidConfig.rules;

      assert.throws(() => validateConfig(invalidConfig), /must have a rules object/);
    });

    it('allows unknown contexts for forwards compatibility', () => {
      const configWithUnknownContext = {
        ...DEFAULT_CONFIG,
        rules: {
          'test.json': [
            {
              context: 'application/future-format',
              placeholder: 'TEST'
            }
          ]
        }
      };

      // Should not throw - unknown contexts are allowed for forwards compatibility
      assert.doesNotThrow(() => validateConfig(configWithUnknownContext));
    });
  });

  describe('generateConfigFile', () => {
    it('creates .templatize.json with default config', async () => {
      const dir = tempDir('generate');
      await fs.mkdir(dir, { recursive: true });

      try {
        generateConfigFile(dir);

        const configPath = join(dir, '.templatize.json');
        const exists = await fs.access(configPath).then(() => true).catch(() => false);
        assert(exists, 'Config file should be created');

        const content = await fs.readFile(configPath, 'utf8');
        const config = JSON.parse(content);
        assert.deepStrictEqual(config, DEFAULT_CONFIG);
      } finally {
        await fs.rm(dir, { recursive: true, force: true });
      }
    });

    it('merges overrides with default config', async () => {
      const dir = tempDir('generate-overrides');
      await fs.mkdir(dir, { recursive: true });

      const overrides = {
        autoDetect: false,
        rules: {
          'custom.txt': [
            {
              context: 'text/plain',
              selector: 'body',
              placeholder: 'CUSTOM_CONTENT'
            }
          ]
        }
      };

      try {
        generateConfigFile(dir, overrides);

        const configPath = join(dir, '.templatize.json');
        const content = await fs.readFile(configPath, 'utf8');
        const config = JSON.parse(content);

        assert.strictEqual(config.autoDetect, false);
        assert(config.rules['package.json'], 'Should preserve default rules');
        assert(config.rules['custom.txt'], 'Should include custom rules');
        assert.strictEqual(config.rules['custom.txt'][0].placeholder, 'CUSTOM_CONTENT');
      } finally {
        await fs.rm(dir, { recursive: true, force: true });
      }
    });
  });

  describe('getPatternsForFile', () => {
    it('returns patterns for exact filename match', () => {
      const patterns = getPatternsForFile('package.json', DEFAULT_CONFIG);
      assert(patterns.length > 0);
      assert.strictEqual(patterns[0].context, 'application/json');
    });

    it('returns patterns for extension match', () => {
      const patterns = getPatternsForFile('App.jsx', DEFAULT_CONFIG);
      assert(patterns.length > 0);
      assert.strictEqual(patterns[0].context, 'text/jsx');
    });

    it('returns empty array for unmatched files', () => {
      const patterns = getPatternsForFile('unknown.xyz', DEFAULT_CONFIG);
      assert.strictEqual(patterns.length, 0);
    });

    it('handles multiple matching patterns', () => {
      const patterns = getPatternsForFile('index.html', DEFAULT_CONFIG);
      assert(patterns.length >= 2); // Should have text/html and text/html#attribute patterns
      const contexts = patterns.map(p => p.context);
      assert(contexts.includes('text/html'));
      assert(contexts.includes('text/html#attribute'));
    });
  });
});
