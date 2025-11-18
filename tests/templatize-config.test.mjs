#!/usr/bin/env node

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { loadConfig, validateConfig, generateConfigFile, getPatternsForFile, DEFAULT_CONFIG } from '../lib/templatize-config.mjs';

describe('TemplatizeConfig', () => {
  describe('loadConfig', () => {
    it('throws error when no .templatize.json exists', async () => {
      const tempDir = path.join(tmpdir(), 'templatize-test-no-config');
      await fs.mkdir(tempDir, { recursive: true });

      try {
        assert.throws(() => loadConfig(tempDir), /Configuration file .templatize.json not found/);
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('loads and validates .templatize.json when it exists', async () => {
      const tempDir = path.join(tmpdir(), 'templatize-test-with-config');
      const configPath = path.join(tempDir, '.templatize.json');
      await fs.mkdir(tempDir, { recursive: true });

      const customConfig = {
        version: '1.0',
        autoDetect: false,
        rules: {
          'package.json': [
            {
              type: 'json-value',
              path: '$.name',
              placeholder: 'CUSTOM_NAME'
            }
          ]
        }
      };

      await fs.writeFile(configPath, JSON.stringify(customConfig));

      try {
        const config = loadConfig(tempDir);
        assert.strictEqual(config.version, '1.0');
        assert.strictEqual(config.autoDetect, false);
        assert.strictEqual(config.rules['package.json'][0].placeholder, 'CUSTOM_NAME');
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('throws on invalid JSON in config file', async () => {
      const tempDir = path.join(tmpdir(), 'templatize-test-invalid-json');
      const configPath = path.join(tempDir, '.templatize.json');
      await fs.mkdir(tempDir, { recursive: true });

      await fs.writeFile(configPath, '{ invalid json }');

      try {
        assert.throws(() => loadConfig(tempDir), /Invalid JSON/);
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('throws on invalid config structure', async () => {
      const tempDir = path.join(tmpdir(), 'templatize-test-invalid-config');
      const configPath = path.join(tempDir, '.templatize.json');
      await fs.mkdir(tempDir, { recursive: true });

      const invalidConfig = {
        version: '1.0',
        // Missing required autoDetect field
      };

      await fs.writeFile(configPath, JSON.stringify(invalidConfig));

      try {
        assert.throws(() => loadConfig(tempDir), /Configuration autoDetect must be a boolean/);
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
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

    it('allows unknown pattern types for forwards compatibility', () => {
      const configWithUnknownType = {
        ...DEFAULT_CONFIG,
        rules: {
          'test.json': [
            {
              type: 'unknown-type',
              placeholder: 'TEST'
            }
          ]
        }
      };

      // Should not throw - unknown types are allowed for forwards compatibility
      assert.doesNotThrow(() => validateConfig(configWithUnknownType));
    });
  });

  describe('generateConfigFile', () => {
    it('creates .templatize.json with default config', async () => {
      const tempDir = path.join(tmpdir(), 'templatize-test-generate');
      await fs.mkdir(tempDir, { recursive: true });

      try {
        generateConfigFile(tempDir);

        const configPath = path.join(tempDir, '.templatize.json');
        const exists = await fs.access(configPath).then(() => true).catch(() => false);
        assert(exists, 'Config file should be created');

        const content = await fs.readFile(configPath, 'utf8');
        const config = JSON.parse(content);
        assert.deepStrictEqual(config, DEFAULT_CONFIG);
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('merges overrides with default config', async () => {
      const tempDir = path.join(tmpdir(), 'templatize-test-generate-overrides');
      await fs.mkdir(tempDir, { recursive: true });

      const overrides = {
        autoDetect: false,
        rules: {
          'custom.txt': [
            {
              type: 'string-literal',
              context: 'text',
              selector: 'body',
              placeholder: 'CUSTOM_CONTENT'
            }
          ]
        }
      };

      try {
        generateConfigFile(tempDir, overrides);

        const configPath = path.join(tempDir, '.templatize.json');
        const content = await fs.readFile(configPath, 'utf8');
        const config = JSON.parse(content);

        assert.strictEqual(config.autoDetect, false);
        assert(config.rules['package.json'], 'Should preserve default rules');
        assert(config.rules['custom.txt'], 'Should include custom rules');
        assert.strictEqual(config.rules['custom.txt'][0].placeholder, 'CUSTOM_CONTENT');
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('getPatternsForFile', () => {
    it('returns patterns for exact filename match', () => {
      const patterns = getPatternsForFile('package.json', DEFAULT_CONFIG);
      assert(patterns.length > 0);
      assert.strictEqual(patterns[0].type, 'json-value');
    });

    it('returns patterns for extension match', () => {
      const patterns = getPatternsForFile('App.jsx', DEFAULT_CONFIG);
      assert(patterns.length > 0);
      assert.strictEqual(patterns[0].type, 'string-literal');
      assert.strictEqual(patterns[0].context, 'jsx-text');
    });

    it('returns empty array for unmatched files', () => {
      const patterns = getPatternsForFile('unknown.xyz', DEFAULT_CONFIG);
      assert.strictEqual(patterns.length, 0);
    });

    it('handles multiple matching patterns', () => {
      const patterns = getPatternsForFile('index.html', DEFAULT_CONFIG);
      assert(patterns.length >= 2); // Should have html-text and html-attribute patterns
      const types = patterns.map(p => p.type);
      assert(types.includes('html-text'));
      assert(types.includes('html-attribute'));
    });
  });
});
