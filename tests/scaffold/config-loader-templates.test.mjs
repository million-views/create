#!/usr/bin/env node

import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ValidationError } from '@m5nv/create/lib/error/validation.mts';
import { loadConfig } from '../../bin/create/domains/scaffold/modules/config-loader.mts';

const CONFIG_FILENAME = '.m5nvrc';

let tempDirs = [];

afterEach(async () => {
  // Cleanup all temp directories
  for (const dir of tempDirs) {
    await fs.rm(dir, { recursive: true, force: true });
  }
  tempDirs = [];
});

async function createTempDir(suffix) {
  const dir = path.join(tmpdir(), `config-templates-test-${suffix}-${Date.now()}`);
  await fs.mkdir(dir, { recursive: true });
  tempDirs.push(dir);
  return dir;
}

async function writeConfig(dir, config) {
  const configPath = path.join(dir, CONFIG_FILENAME);
  await fs.writeFile(configPath, JSON.stringify(config));
  return configPath;
}

describe('ConfigLoader - Templates Normalization', () => {
  describe('normalizeTemplates - valid configurations', () => {
    it('loads templates with single mapping', async () => {
      const tempDir = await createTempDir('templates-single');
      const config = {
        templates: {
          'my-alias': {
            'react-app': 'https://github.com/user/react-template.git'
          }
        }
      };
      await writeConfig(tempDir, config);

      const result = await loadConfig({ cwd: tempDir });
      assert.notStrictEqual(result, null);
      assert.ok(result.defaults.templates);
      assert.ok(result.defaults.templates['my-alias']);
      assert.strictEqual(result.defaults.templates['my-alias']['react-app'], 'https://github.com/user/react-template.git');
    });

    it('loads templates with multiple mappings', async () => {
      const tempDir = await createTempDir('templates-multiple');
      const config = {
        templates: {
          'work': {
            'react-app': 'https://github.com/work/react.git',
            'vue-app': 'https://github.com/work/vue.git'
          },
          'personal': {
            'blog': 'https://github.com/me/blog.git'
          }
        }
      };
      await writeConfig(tempDir, config);

      const result = await loadConfig({ cwd: tempDir });
      assert.notStrictEqual(result, null);
      assert.strictEqual(Object.keys(result.defaults.templates).length, 2);
      assert.strictEqual(result.defaults.templates['work']['react-app'], 'https://github.com/work/react.git');
      assert.strictEqual(result.defaults.templates['work']['vue-app'], 'https://github.com/work/vue.git');
      assert.strictEqual(result.defaults.templates['personal']['blog'], 'https://github.com/me/blog.git');
    });

    it('trims whitespace from template aliases and paths', async () => {
      const tempDir = await createTempDir('templates-trim');
      const config = {
        templates: {
          '  work  ': {
            '  react  ': '  https://github.com/work/react.git  '
          }
        }
      };
      await writeConfig(tempDir, config);

      const result = await loadConfig({ cwd: tempDir });
      assert.notStrictEqual(result, null);
      assert.ok(result.defaults.templates['work']);
      assert.strictEqual(result.defaults.templates['work']['react'], 'https://github.com/work/react.git');
    });
  });

  describe('normalizeTemplates - validation errors', () => {
    it('rejects templates as non-object', async () => {
      const tempDir = await createTempDir('templates-non-object');
      const config = {
        templates: 'not-an-object'
      };
      await writeConfig(tempDir, config);

      await assert.rejects(
        async () => await loadConfig({ cwd: tempDir }),
        (error) => {
          assert.ok(error instanceof ValidationError);
          assert.match(error.message, /templates must be an object/);
          return true;
        }
      );
    });

    it('rejects templates as array', async () => {
      const tempDir = await createTempDir('templates-array');
      const config = {
        templates: ['template1', 'template2']
      };
      await writeConfig(tempDir, config);

      await assert.rejects(
        async () => await loadConfig({ cwd: tempDir }),
        (error) => {
          assert.ok(error instanceof ValidationError);
          assert.match(error.message, /templates must be an object/);
          return true;
        }
      );
    });

    it('rejects empty template alias', async () => {
      const tempDir = await createTempDir('templates-alias-empty');
      const config = {
        templates: {
          '   ': {
            'react': 'https://github.com/user/react.git'
          }
        }
      };
      await writeConfig(tempDir, config);

      await assert.rejects(
        async () => await loadConfig({ cwd: tempDir }),
        (error) => {
          assert.ok(error instanceof ValidationError);
          assert.match(error.message, /template alias cannot be empty/);
          return true;
        }
      );
    });

    it('rejects template config as non-object', async () => {
      const tempDir = await createTempDir('templates-config-non-object');
      const config = {
        templates: {
          'work': 'https://github.com/user/repo.git'
        }
      };
      await writeConfig(tempDir, config);

      await assert.rejects(
        async () => await loadConfig({ cwd: tempDir }),
        (error) => {
          assert.ok(error instanceof ValidationError);
          assert.match(error.message, /template "work" must be an object/);
          return true;
        }
      );
    });

    it('rejects template config as array', async () => {
      const tempDir = await createTempDir('templates-config-array');
      const config = {
        templates: {
          'work': ['template1', 'template2']
        }
      };
      await writeConfig(tempDir, config);

      await assert.rejects(
        async () => await loadConfig({ cwd: tempDir }),
        (error) => {
          assert.ok(error instanceof ValidationError);
          assert.match(error.message, /template "work" must be an object/);
          return true;
        }
      );
    });

    it('rejects template config as null', async () => {
      const tempDir = await createTempDir('templates-config-null');
      const config = {
        templates: {
          'work': null
        }
      };
      await writeConfig(tempDir, config);

      await assert.rejects(
        async () => await loadConfig({ cwd: tempDir }),
        (error) => {
          assert.ok(error instanceof ValidationError);
          assert.match(error.message, /template "work" must be an object/);
          return true;
        }
      );
    });

    it('rejects non-string template path', async () => {
      const tempDir = await createTempDir('templates-path-type');
      const config = {
        templates: {
          'work': {
            'react': 12345
          }
        }
      };
      await writeConfig(tempDir, config);

      await assert.rejects(
        async () => await loadConfig({ cwd: tempDir }),
        (error) => {
          assert.ok(error instanceof ValidationError);
          assert.match(error.message, /template "work" template "react" must be a URL\/path string/);
          return true;
        }
      );
    });

    it('rejects empty template name', async () => {
      const tempDir = await createTempDir('templates-name-empty');
      const config = {
        templates: {
          'work': {
            '   ': 'https://github.com/user/react.git'
          }
        }
      };
      await writeConfig(tempDir, config);

      await assert.rejects(
        async () => await loadConfig({ cwd: tempDir }),
        (error) => {
          assert.ok(error instanceof ValidationError);
          assert.match(error.message, /template "work" template ".*" cannot be empty/);
          return true;
        }
      );
    });

    it('rejects empty template path', async () => {
      const tempDir = await createTempDir('templates-path-empty');
      const config = {
        templates: {
          'work': {
            'react': '   '
          }
        }
      };
      await writeConfig(tempDir, config);

      await assert.rejects(
        async () => await loadConfig({ cwd: tempDir }),
        (error) => {
          assert.ok(error instanceof ValidationError);
          assert.match(error.message, /template "work" template "react" cannot be empty/);
          return true;
        }
      );
    });
  });

  describe('normalizeRegistries - edge cases', () => {
    it('rejects non-object registry value that is not typed', async () => {
      const tempDir = await createTempDir('registry-non-object');
      const config = {
        registries: {
          'work': 'https://github.com/user/templates.git'
        }
      };
      await writeConfig(tempDir, config);

      await assert.rejects(
        async () => await loadConfig({ cwd: tempDir }),
        (error) => {
          assert.ok(error instanceof ValidationError);
          assert.match(error.message, /registry "work" must be a typed registry object or an object mapping/);
          return true;
        }
      );
    });

    it('rejects non-string template URL in registry mapping', async () => {
      const tempDir = await createTempDir('registry-template-url-type');
      const config = {
        registries: {
          'work': {
            'react': 12345
          }
        }
      };
      await writeConfig(tempDir, config);

      await assert.rejects(
        async () => await loadConfig({ cwd: tempDir }),
        (error) => {
          assert.ok(error instanceof ValidationError);
          assert.match(error.message, /registry "work" template "react" must be a URL\/path string/);
          return true;
        }
      );
    });

    it('rejects empty template name in registry mapping', async () => {
      const tempDir = await createTempDir('registry-template-name-empty');
      const config = {
        registries: {
          'work': {
            '   ': 'https://github.com/user/template.git'
          }
        }
      };
      await writeConfig(tempDir, config);

      await assert.rejects(
        async () => await loadConfig({ cwd: tempDir }),
        (error) => {
          assert.ok(error instanceof ValidationError);
          assert.match(error.message, /registry "work" template ".*" cannot be empty/);
          return true;
        }
      );
    });

    it('rejects empty template URL in registry mapping', async () => {
      const tempDir = await createTempDir('registry-template-url-empty');
      const config = {
        registries: {
          'work': {
            'react': '   '
          }
        }
      };
      await writeConfig(tempDir, config);

      await assert.rejects(
        async () => await loadConfig({ cwd: tempDir }),
        (error) => {
          assert.ok(error instanceof ValidationError);
          assert.match(error.message, /registry "work" template "react" cannot be empty/);
          return true;
        }
      );
    });

    it('rejects git registry without url field', async () => {
      const tempDir = await createTempDir('registry-git-no-url');
      const config = {
        registries: {
          'work': {
            type: 'git'
            // Missing url field
          }
        }
      };
      await writeConfig(tempDir, config);

      await assert.rejects(
        async () => await loadConfig({ cwd: tempDir }),
        (error) => {
          assert.ok(error instanceof ValidationError);
          assert.match(error.message, /registry "work" git type requires "url" field/);
          return true;
        }
      );
    });

    it('rejects local registry without path field', async () => {
      const tempDir = await createTempDir('registry-local-no-path');
      const config = {
        registries: {
          'work': {
            type: 'local'
            // Missing path field
          }
        }
      };
      await writeConfig(tempDir, config);

      await assert.rejects(
        async () => await loadConfig({ cwd: tempDir }),
        (error) => {
          assert.ok(error instanceof ValidationError);
          assert.match(error.message, /registry "work" local type requires "path" field/);
          return true;
        }
      );
    });
  });
});
