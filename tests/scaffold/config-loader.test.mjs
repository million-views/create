#!/usr/bin/env node

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ValidationError } from '@m5nv/create/lib/error/validation.mts';
import {
  loadConfig
} from '../../bin/create/domains/scaffold/modules/config-loader.mts';
import { resolveUserConfigPath } from '@m5nv/create/lib/util/path.mts';

// Constants from config-loader.mjs (not exported)
const CONFIG_FILENAME = '.m5nvrc';
const _PLACEHOLDER_TOKEN_PATTERN = /^[A-Z0-9_]+$/;

describe('ConfigLoader', () => {
  describe('loadConfig', () => {
    it('returns null when skip is true', async () => {
      const result = await loadConfig({ skip: true });
      assert.strictEqual(result, null);
    });

    it('returns null when no config files exist', async () => {
      const tempDir = path.join(tmpdir(), 'config-test-no-files');
      await fs.mkdir(tempDir, { recursive: true });

      try {
        const result = await loadConfig({ cwd: tempDir });
        assert.strictEqual(result, null);
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('loads project config file when it exists', async () => {
      const tempDir = path.join(tmpdir(), 'config-test-project');
      const configPath = path.join(tempDir, CONFIG_FILENAME);
      await fs.mkdir(tempDir, { recursive: true });

      const configData = { repo: 'https://github.com/user/repo.git' };
      await fs.writeFile(configPath, JSON.stringify(configData));

      try {
        const result = await loadConfig({ cwd: tempDir });
        assert.notStrictEqual(result, null);
        assert.strictEqual(result.path, configPath);
        assert.strictEqual(result.defaults.repo, 'https://github.com/user/repo.git');
        assert.deepStrictEqual(result.defaults.placeholders, []);
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('loads user config when project config does not exist', async () => {
      const tempDir = path.join(tmpdir(), 'config-test-user');
      const userConfigPath = resolveUserConfigPath();
      const userConfigDir = path.dirname(userConfigPath);
      await fs.mkdir(tempDir, { recursive: true });

      // Create user config
      await fs.mkdir(userConfigDir, { recursive: true });
      const configData = { branch: 'main' };
      await fs.writeFile(userConfigPath, JSON.stringify(configData));

      try {
        const result = await loadConfig({ cwd: tempDir });
        assert.notStrictEqual(result, null);
        assert.strictEqual(result.path, userConfigPath);
        assert.strictEqual(result.defaults.branch, 'main');
        assert.deepStrictEqual(result.defaults.placeholders, []);
      } finally {
        await fs.rm(userConfigPath, { force: true });
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('prioritizes project config over user config', async () => {
      const tempDir = path.join(tmpdir(), 'config-test-priority');
      const configPath = path.join(tempDir, CONFIG_FILENAME);
      const userConfigPath = resolveUserConfigPath();
      const userConfigDir = path.dirname(userConfigPath);
      await fs.mkdir(tempDir, { recursive: true });

      // Create both configs
      const projectConfig = { repo: 'https://github.com/user/project.git' };
      const userConfig = { branch: 'main' };
      await fs.writeFile(configPath, JSON.stringify(projectConfig));
      await fs.mkdir(userConfigDir, { recursive: true });
      await fs.writeFile(userConfigPath, JSON.stringify(userConfig));

      try {
        const result = await loadConfig({ cwd: tempDir });
        assert.notStrictEqual(result, null);
        assert.strictEqual(result.path, configPath);
        assert.strictEqual(result.defaults.repo, 'https://github.com/user/project.git');
        assert.deepStrictEqual(result.defaults.placeholders, []);
      } finally {
        await fs.rm(userConfigPath, { force: true });
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });


  });

  describe('Configuration Validation', () => {
    it('validates repo field', async () => {
      const tempDir = path.join(tmpdir(), 'config-test-repo');
      const configPath = path.join(tempDir, CONFIG_FILENAME);
      await fs.mkdir(tempDir, { recursive: true });

      const configData = { repo: 'https://github.com/user/repo.git' };
      await fs.writeFile(configPath, JSON.stringify(configData));

      try {
        const result = await loadConfig({ cwd: tempDir });
        assert.strictEqual(result.defaults.repo, 'https://github.com/user/repo.git');
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('validates branch field', async () => {
      const tempDir = path.join(tmpdir(), 'config-test-branch');
      const configPath = path.join(tempDir, CONFIG_FILENAME);
      await fs.mkdir(tempDir, { recursive: true });

      const configData = { branch: 'develop' };
      await fs.writeFile(configPath, JSON.stringify(configData));

      try {
        const result = await loadConfig({ cwd: tempDir });
        assert.strictEqual(result.defaults.branch, 'develop');
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('validates author field', async () => {
      const tempDir = path.join(tmpdir(), 'config-test-author');
      const configPath = path.join(tempDir, CONFIG_FILENAME);
      await fs.mkdir(tempDir, { recursive: true });

      const configData = {
        author: {
          name: 'Test User',
          email: 'test@example.com',
          url: 'https://example.com'
        }
      };
      await fs.writeFile(configPath, JSON.stringify(configData));

      try {
        const result = await loadConfig({ cwd: tempDir });
        assert.deepStrictEqual(result.defaults.author, {
          name: 'Test User',
          email: 'test@example.com',
          url: 'https://example.com'
        });
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('validates placeholders field', async () => {
      const tempDir = path.join(tmpdir(), 'config-test-placeholders');
      const configPath = path.join(tempDir, CONFIG_FILENAME);
      await fs.mkdir(tempDir, { recursive: true });

      const configData = {
        placeholders: {
          AUTHOR_NAME: 'Test User',
          PROJECT_NAME: 'my-project'
        }
      };
      await fs.writeFile(configPath, JSON.stringify(configData));

      try {
        const result = await loadConfig({ cwd: tempDir });
        assert.deepStrictEqual(result.defaults.placeholders, [
          'AUTHOR_NAME=Test User',
          'PROJECT_NAME=my-project'
        ]);
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('validates registries field', async () => {
      const tempDir = path.join(tmpdir(), 'config-test-registries');
      const configPath = path.join(tempDir, CONFIG_FILENAME);
      await fs.mkdir(tempDir, { recursive: true });

      const configData = {
        registries: {
          'my-registry': {
            'template1': 'https://github.com/user/template1.git',
            'template2': 'https://github.com/user/template2.git'
          }
        }
      };
      await fs.writeFile(configPath, JSON.stringify(configData));

      try {
        const result = await loadConfig({ cwd: tempDir });
        assert.strictEqual(result.defaults.registries['my-registry']['template1'], 'https://github.com/user/template1.git');
        assert.strictEqual(result.defaults.registries['my-registry']['template2'], 'https://github.com/user/template2.git');
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('Error Handling', () => {
    it('throws on invalid JSON', async () => {
      const tempDir = path.join(tmpdir(), 'config-test-invalid-json');
      const configPath = path.join(tempDir, CONFIG_FILENAME);
      await fs.mkdir(tempDir, { recursive: true });

      await fs.writeFile(configPath, '{ invalid json }');

      try {
        await assert.rejects(
          () => loadConfig({ cwd: tempDir }),
          (error) => {
            assert(error instanceof ValidationError);
            assert(error.message.includes('not valid JSON'));
            return true;
          }
        );
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('throws on invalid repo URL', async () => {
      const tempDir = path.join(tmpdir(), 'config-test-invalid-repo');
      const configPath = path.join(tempDir, CONFIG_FILENAME);
      await fs.mkdir(tempDir, { recursive: true });

      const configData = { repo: 'not-a-valid-url' };
      await fs.writeFile(configPath, JSON.stringify(configData));

      try {
        await assert.rejects(
          () => loadConfig({ cwd: tempDir }),
          (error) => {
            assert(error instanceof ValidationError);
            assert(error.message.includes('repo is invalid'));
            return true;
          }
        );
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('throws on invalid branch name', async () => {
      const tempDir = path.join(tmpdir(), 'config-test-invalid-branch');
      const configPath = path.join(tempDir, CONFIG_FILENAME);
      await fs.mkdir(tempDir, { recursive: true });

      const configData = { branch: 'invalid..branch' };
      await fs.writeFile(configPath, JSON.stringify(configData));

      try {
        await assert.rejects(
          () => loadConfig({ cwd: tempDir }),
          (error) => {
            assert(error instanceof ValidationError);
            assert(error.message.includes('branch is invalid'));
            return true;
          }
        );
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('throws on invalid author object', async () => {
      const tempDir = path.join(tmpdir(), 'config-test-invalid-author');
      const configPath = path.join(tempDir, CONFIG_FILENAME);
      await fs.mkdir(tempDir, { recursive: true });

      const configData = { author: 'not-an-object' };
      await fs.writeFile(configPath, JSON.stringify(configData));

      try {
        await assert.rejects(
          () => loadConfig({ cwd: tempDir }),
          (error) => {
            assert(error instanceof ValidationError);
            assert(error.message.includes('author must be an object'));
            return true;
          }
        );
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('throws on invalid placeholders object', async () => {
      const tempDir = path.join(tmpdir(), 'config-test-invalid-placeholders');
      const configPath = path.join(tempDir, CONFIG_FILENAME);
      await fs.mkdir(tempDir, { recursive: true });

      const configData = { placeholders: 'not-an-object' };
      await fs.writeFile(configPath, JSON.stringify(configData));

      try {
        await assert.rejects(
          () => loadConfig({ cwd: tempDir }),
          (error) => {
            assert(error instanceof ValidationError);
            assert(error.message.includes('placeholders must be an object'));
            return true;
          }
        );
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('throws on invalid placeholder token', async () => {
      const tempDir = path.join(tmpdir(), 'config-test-invalid-token');
      const configPath = path.join(tempDir, CONFIG_FILENAME);
      await fs.mkdir(tempDir, { recursive: true });

      const configData = { placeholders: { 'invalid-token!': 'value' } };
      await fs.writeFile(configPath, JSON.stringify(configData));

      try {
        await assert.rejects(
          () => loadConfig({ cwd: tempDir }),
          (error) => {
            assert(error instanceof ValidationError);
            assert(error.message.includes('placeholder token "invalid-token!" is invalid'));
            return true;
          }
        );
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('throws on invalid registries object', async () => {
      const tempDir = path.join(tmpdir(), 'config-test-invalid-registries');
      const configPath = path.join(tempDir, CONFIG_FILENAME);
      await fs.mkdir(tempDir, { recursive: true });

      const configData = { registries: 'not-an-object' };
      await fs.writeFile(configPath, JSON.stringify(configData));

      try {
        await assert.rejects(
          () => loadConfig({ cwd: tempDir }),
          (error) => {
            assert(error instanceof ValidationError);
            assert(error.message.includes('registries must be an object'));
            return true;
          }
        );
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('Security Validation', () => {
    it('rejects null bytes in author fields', async () => {
      const tempDir = path.join(tmpdir(), 'config-test-author-null');
      const configPath = path.join(tempDir, CONFIG_FILENAME);
      await fs.mkdir(tempDir, { recursive: true });

      const configData = { author: { name: 'Test\0User' } };
      await fs.writeFile(configPath, JSON.stringify(configData));

      try {
        await assert.rejects(
          () => loadConfig({ cwd: tempDir }),
          (error) => {
            assert(error instanceof ValidationError);
            assert(error.message.includes('contains null bytes'));
            return true;
          }
        );
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('rejects newlines in author fields', async () => {
      const tempDir = path.join(tmpdir(), 'config-test-author-newlines');
      const configPath = path.join(tempDir, CONFIG_FILENAME);
      await fs.mkdir(tempDir, { recursive: true });

      const configData = { author: { email: 'test@example.com\nmore' } }; // newline in middle
      await fs.writeFile(configPath, JSON.stringify(configData));

      try {
        await assert.rejects(
          () => loadConfig({ cwd: tempDir }),
          (error) => {
            assert(error instanceof ValidationError);
            assert(error.message.includes('cannot contain newlines'));
            return true;
          }
        );
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('rejects null bytes in placeholder values', async () => {
      const tempDir = path.join(tmpdir(), 'config-test-placeholder-null');
      const configPath = path.join(tempDir, CONFIG_FILENAME);
      await fs.mkdir(tempDir, { recursive: true });

      const configData = { placeholders: { TOKEN: 'value\0withnull' } };
      await fs.writeFile(configPath, JSON.stringify(configData));

      try {
        await assert.rejects(
          () => loadConfig({ cwd: tempDir }),
          (error) => {
            assert(error instanceof ValidationError);
            assert(error.message.includes('contains null bytes'));
            return true;
          }
        );
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('Path Resolution', () => {

    it('handles Windows-style paths on Windows', async () => {
      if (process.platform !== 'win32') {
        // Skip on non-Windows platforms
        return;
      }

      const tempDir = path.join(tmpdir(), 'config-test-windows');
      await fs.mkdir(tempDir, { recursive: true });

      // Test would go here for Windows-specific path handling
      // For now, just ensure the test runs without error
      const result = await loadConfig({ cwd: tempDir });
      assert.strictEqual(result, null);

      await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('handles Unix-style paths on Unix-like systems', async () => {
      if (process.platform === 'win32') {
        // Skip on Windows
        return;
      }

      const tempDir = path.join(tmpdir(), 'config-test-unix');
      await fs.mkdir(tempDir, { recursive: true });

      // Test would go here for Unix-specific path handling
      // For now, just ensure the test runs without error
      const result = await loadConfig({ cwd: tempDir });
      assert.strictEqual(result, null);

      await fs.rm(tempDir, { recursive: true, force: true });
    });
  });

  describe('Product-Specific Configuration', () => {
    it('loads product-specific registries', async () => {
      const tempDir = path.join(tmpdir(), 'config-test-product');
      const configPath = path.join(tempDir, CONFIG_FILENAME);
      await fs.mkdir(tempDir, { recursive: true });

      const configData = {
        'scaffold': {
          registries: {
            'product-registry': {
              'template1': 'https://github.com/user/template1.git'
            }
          }
        }
      };
      await fs.writeFile(configPath, JSON.stringify(configData));

      try {
        const result = await loadConfig({ cwd: tempDir });
        assert.strictEqual(result.defaults.registries['product-registry']['template1'], 'https://github.com/user/template1.git');
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('prioritizes product-specific registries over top-level', async () => {
      const tempDir = path.join(tmpdir(), 'config-test-product-priority');
      const configPath = path.join(tempDir, CONFIG_FILENAME);
      await fs.mkdir(tempDir, { recursive: true });

      const configData = {
        registries: {
          'top-level': {
            'template1': 'https://github.com/user/top-level.git'
          }
        },
        'scaffold': {
          registries: {
            'product-specific': {
              'template1': 'https://github.com/user/product-specific.git'
            }
          }
        }
      };
      await fs.writeFile(configPath, JSON.stringify(configData));

      try {
        const result = await loadConfig({ cwd: tempDir });
        assert.strictEqual(result.defaults.registries['product-specific']['template1'], 'https://github.com/user/product-specific.git');
        assert(!result.defaults.registries['top-level']);
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });
  });
});
