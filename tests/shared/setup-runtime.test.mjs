#!/usr/bin/env node

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import { tmpdir } from 'os';
import { loadSetupScript, createSetupTools, SetupSandboxError } from '../../bin/create-scaffold/modules/setup-runtime.mjs';

// Mock logger for testing
class MockLogger {
  constructor() {
    this.messages = [];
  }

  info(message) {
    this.messages.push({ level: 'info', message });
  }

  warn(message) {
    this.messages.push({ level: 'warn', message });
  }

  error(message) {
    this.messages.push({ level: 'error', message });
  }
}

describe('Setup Runtime', () => {
  describe('loadSetupScript()', () => {
    it('should execute a valid setup script', async () => {
      const scriptContent = `
        export default async function setup({ ctx, tools }) {
          return { executed: true, projectName: ctx.projectName };
        }
      `;

      const tempDir = path.join(tmpdir(), 'setup-test-' + Date.now());
      await fs.mkdir(tempDir, { recursive: true });

      try {
        const scriptPath = path.join(tempDir, '_setup.mjs');
        await fs.writeFile(scriptPath, scriptContent);

        const ctx = { projectName: 'test-project' };
        const tools = { test: 'tool' };

        const result = await loadSetupScript(scriptPath, ctx, tools);

        assert.strictEqual(result.executed, true);
        assert.strictEqual(result.projectName, 'test-project');
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('should reject scripts without default export', async () => {
      const scriptContent = `
        console.log('no export');
      `;

      const tempDir = path.join(tmpdir(), 'setup-test-' + Date.now());
      await fs.mkdir(tempDir, { recursive: true });

      try {
        const scriptPath = path.join(tempDir, '_setup.mjs');
        await fs.writeFile(scriptPath, scriptContent);

        const ctx = {};
        const tools = {};

        await assert.rejects(
          loadSetupScript(scriptPath, ctx, tools),
          SetupSandboxError
        );
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('should reject scripts with import statements', async () => {
      const scriptContent = `
        import fs from 'fs';
        export default async function setup() {}
      `;

      const tempDir = path.join(tmpdir(), 'setup-test-' + Date.now());
      await fs.mkdir(tempDir, { recursive: true });

      try {
        const scriptPath = path.join(tempDir, '_setup.mjs');
        await fs.writeFile(scriptPath, scriptContent);

        const ctx = {};
        const tools = {};

        await assert.rejects(
          loadSetupScript(scriptPath, ctx, tools),
          SetupSandboxError
        );
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('should transform export default to module.exports.default', async () => {
      const scriptContent = `
        export default async function setup({ ctx, tools }) {
          return { transformed: true };
        }
      `;

      const tempDir = path.join(tmpdir(), 'setup-test-' + Date.now());
      await fs.mkdir(tempDir, { recursive: true });

      try {
        const scriptPath = path.join(tempDir, '_setup.mjs');
        await fs.writeFile(scriptPath, scriptContent);

        const ctx = {};
        const tools = {};

        const result = await loadSetupScript(scriptPath, ctx, tools);

        assert.strictEqual(result.transformed, true);
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('should provide access to console in sandbox', async () => {
      const scriptContent = `
        export default async function setup({ ctx, tools }) {
          console.log('test message');
          return { logged: true };
        }
      `;

      const tempDir = path.join(tmpdir(), 'setup-test-' + Date.now());
      await fs.mkdir(tempDir, { recursive: true });

      try {
        const scriptPath = path.join(tempDir, '_setup.mjs');
        await fs.writeFile(scriptPath, scriptContent);

        const ctx = {};
        const tools = {};

        const result = await loadSetupScript(scriptPath, ctx, tools);

        assert.strictEqual(result.logged, true);
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('should reject scripts that try to use forbidden functions', async () => {
      const forbiddenFunctions = ['eval', 'Function', 'require'];

      for (const forbidden of forbiddenFunctions) {
        const scriptContent = `
          export default async function setup({ ctx, tools }) {
            ${forbidden}('test');
            return {};
          }
        `;

        const tempDir = path.join(tmpdir(), 'setup-test-' + Date.now());
        await fs.mkdir(tempDir, { recursive: true });

        try {
          const scriptPath = path.join(tempDir, '_setup.mjs');
          await fs.writeFile(scriptPath, scriptContent);

          const ctx = {};
          const tools = {};

          await assert.rejects(
            loadSetupScript(scriptPath, ctx, tools),
            SetupSandboxError
          );
        } finally {
          await fs.rm(tempDir, { recursive: true, force: true });
        }
      }
    });

    it('should provide access to setTimeout and setInterval', async () => {
      const scriptContent = `
        export default async function setup({ ctx, tools }) {
          return new Promise((resolve) => {
            setTimeout(() => resolve({ timed: true }), 10);
          });
        }
      `;

      const tempDir = path.join(tmpdir(), 'setup-test-' + Date.now());
      await fs.mkdir(tempDir, { recursive: true });

      try {
        const scriptPath = path.join(tempDir, '_setup.mjs');
        await fs.writeFile(scriptPath, scriptContent);

        const ctx = {};
        const tools = {};

        const result = await loadSetupScript(scriptPath, ctx, tools);

        assert.strictEqual(result.timed, true);
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('should provide access to process.env', async () => {
      const scriptContent = `
        export default async function setup({ ctx, tools }) {
          return { env: process.env.NODE_ENV };
        }
      `;

      const tempDir = path.join(tmpdir(), 'setup-test-' + Date.now());
      await fs.mkdir(tempDir, { recursive: true });

      try {
        const scriptPath = path.join(tempDir, '_setup.mjs');
        await fs.writeFile(scriptPath, scriptContent);

        // Set NODE_ENV for the test
        process.env.NODE_ENV = 'test';

        const ctx = {};
        const tools = {};

        const result = await loadSetupScript(scriptPath, ctx, tools);

        assert.strictEqual(typeof result.env, 'string'); // Should have access to env vars
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('should reject scripts with old function signature', async () => {
      const scriptContent = `
        export default async function setup(ctx, tools) {
          return {};
        }
      `;

      const tempDir = path.join(tmpdir(), 'setup-test-' + Date.now());
      await fs.mkdir(tempDir, { recursive: true });

      try {
        const scriptPath = path.join(tempDir, '_setup.mjs');
        await fs.writeFile(scriptPath, scriptContent);

        const ctx = {};
        const tools = {};

        await assert.rejects(
          loadSetupScript(scriptPath, ctx, tools),
          SetupSandboxError
        );
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('should handle script execution errors', async () => {
      const scriptContent = `
        export default async function setup({ ctx, tools }) {
          throw new Error('Script execution failed');
        }
      `;

      const tempDir = path.join(tmpdir(), 'setup-test-' + Date.now());
      await fs.mkdir(tempDir, { recursive: true });

      try {
        const scriptPath = path.join(tempDir, '_setup.mjs');
        await fs.writeFile(scriptPath, scriptContent);

        const ctx = {};
        const tools = {};

        await assert.rejects(
          loadSetupScript(scriptPath, ctx, tools),
          (error) => {
            return error instanceof SetupSandboxError && error.message.includes('Script execution failed');
          }
        );
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('createSetupTools()', () => {
    it('should create frozen tools object with complete API shape', async () => {
      const tempDir = path.join(tmpdir(), 'tools-shape-test-' + Date.now());
      await fs.mkdir(tempDir, { recursive: true });

      try {
        const logger = new MockLogger();
        const options = {
          projectDirectory: tempDir,
          projectName: 'test-project',
          logger,
          templateContext: {
            inputs: { TEST_VAR: 'test-value' },
            authoring: 'wysiwyg',
            constants: {},
            authorAssetsDir: '__scaffold__'
          },
          dimensions: {
            features: { type: 'multi', values: ['api', 'auth'], default: [] }
          },
          options: { raw: ['features=api'], byDimension: { features: ['api'] } }
        };

        const tools = await createSetupTools(options);

        // Test that tools object is frozen
        assert(Object.isFrozen(tools), 'tools object should be frozen');
        assert.throws(() => { tools.newProp = 'test'; }, 'should not allow adding properties to frozen object');

        // Test complete API shape
        const expectedAPIs = ['placeholders', 'inputs', 'files', 'json', 'templates', 'text', 'logger', 'options'];
        for (const api of expectedAPIs) {
          assert.ok(tools[api], `tools.${api} should exist`);
          assert(Object.isFrozen(tools[api]), `tools.${api} should be frozen`);
        }

        // Test placeholders API shape
        assert.strictEqual(typeof tools.placeholders.replaceAll, 'function');
        assert.strictEqual(typeof tools.placeholders.replaceInFile, 'function');
        assert.strictEqual(typeof tools.placeholders.applyInputs, 'function');

        // Test inputs API shape
        assert.strictEqual(typeof tools.inputs.get, 'function');
        assert.strictEqual(typeof tools.inputs.all, 'function');

        // Test files API shape
        assert.strictEqual(typeof tools.files.ensureDirs, 'function');
        assert.strictEqual(typeof tools.files.copy, 'function');
        assert.strictEqual(typeof tools.files.move, 'function');
        assert.strictEqual(typeof tools.files.remove, 'function');
        assert.strictEqual(typeof tools.files.write, 'function');

        // Test json API shape
        assert.strictEqual(typeof tools.json.read, 'function');
        assert.strictEqual(typeof tools.json.merge, 'function');
        assert.strictEqual(typeof tools.json.update, 'function');
        assert.strictEqual(typeof tools.json.set, 'function');
        assert.strictEqual(typeof tools.json.remove, 'function');
        assert.strictEqual(typeof tools.json.addToArray, 'function');
        assert.strictEqual(typeof tools.json.mergeArray, 'function');

        // Test templates API shape
        assert.strictEqual(typeof tools.templates.renderString, 'function');
        assert.strictEqual(typeof tools.templates.renderFile, 'function');
        assert.strictEqual(typeof tools.templates.copy, 'function');

        // Test text API shape
        assert.strictEqual(typeof tools.text.insertAfter, 'function');
        assert.strictEqual(typeof tools.text.ensureBlock, 'function');
        assert.strictEqual(typeof tools.text.replaceBetween, 'function');
        assert.strictEqual(typeof tools.text.appendLines, 'function');
        assert.strictEqual(typeof tools.text.replace, 'function');

        // Test logger API shape
        assert.strictEqual(typeof tools.logger.info, 'function');
        assert.strictEqual(typeof tools.logger.warn, 'function');
        assert.strictEqual(typeof tools.logger.table, 'function');

        // Test options API shape
        assert.strictEqual(typeof tools.options.has, 'function');
        assert.strictEqual(typeof tools.options.when, 'function');
        assert.strictEqual(typeof tools.options.list, 'function');
        assert.strictEqual(typeof tools.options.in, 'function');
        assert.strictEqual(typeof tools.options.require, 'function');
        assert.strictEqual(typeof tools.options.dimensions, 'function');
        assert.strictEqual(typeof tools.options.raw, 'function');

      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('should handle options API with real user selections', async () => {
      const tempDir = path.join(tmpdir(), 'options-test-' + Date.now());
      await fs.mkdir(tempDir, { recursive: true });

      try {
        const logger = new MockLogger();
        const options = {
          projectDirectory: tempDir,
          projectName: 'test-project',
          logger,
          templateContext: {
            inputs: {},
            authoring: 'wysiwyg',
            constants: {},
            authorAssetsDir: '__scaffold__'
          },
          dimensions: {
            features: { type: 'multi', values: ['api', 'auth'], default: [] }
          },
          options: { raw: ['features=api'], byDimension: { features: ['api'] } }
        };

        const tools = await createSetupTools(options);

        // Test options API with real selections
        assert.strictEqual(tools.options.in('features', 'api'), true);
        assert.strictEqual(tools.options.in('features', 'auth'), false);
        assert.strictEqual(tools.options.has('api'), true); // default dimension
        assert.strictEqual(tools.options.has('auth'), false);

        assert.deepStrictEqual(tools.options.list('features'), ['api']);
        assert.deepStrictEqual(tools.options.dimensions(), { features: ['api'] });
        assert.deepStrictEqual(tools.options.raw(), ['features=api']);

        // Test when() with selected feature
        let callbackExecuted = false;
        await tools.options.when('api', async () => {
          callbackExecuted = true;
        });
        assert.strictEqual(callbackExecuted, true);

        // Test when() with unselected feature
        callbackExecuted = false;
        await tools.options.when('auth', async () => {
          callbackExecuted = true;
        });
        assert.strictEqual(callbackExecuted, false);

      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('should handle empty options gracefully', async () => {
      const tempDir = path.join(tmpdir(), 'empty-options-test-' + Date.now());
      await fs.mkdir(tempDir, { recursive: true });

      try {
        const logger = new MockLogger();
        const options = {
          projectDirectory: tempDir,
          projectName: 'test-project',
          logger,
          templateContext: {
            inputs: {},
            authoring: 'wysiwyg',
            constants: {},
            authorAssetsDir: '__scaffold__'
          },
          dimensions: {
            features: { type: 'multi', values: ['api', 'auth'], default: [] }
          },
          options: { raw: [], byDimension: {} } // Empty options
        };

        const tools = await createSetupTools(options);

        // Test options API with empty selections
        assert.strictEqual(tools.options.in('features', 'api'), false);
        assert.strictEqual(tools.options.has('api'), false);
        assert.deepStrictEqual(tools.options.list('features'), []);
        assert.deepStrictEqual(tools.options.dimensions(), { features: [] });
        assert.deepStrictEqual(tools.options.raw(), []);

        // Test when() with empty options
        let callbackExecuted = false;
        await tools.options.when('api', async () => {
          callbackExecuted = true;
        });
        assert.strictEqual(callbackExecuted, false);

      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('should provide functional placeholders API', async () => {
      const tempDir = path.join(tmpdir(), 'placeholders-test-' + Date.now());
      await fs.mkdir(tempDir, { recursive: true });

      try {
        const logger = new MockLogger();
        const options = {
          projectDirectory: tempDir,
          projectName: 'test-project',
          logger,
          templateContext: {
            inputs: { NAME: 'MyApp', VERSION: '1.0.0' },
            authoring: 'wysiwyg',
            constants: {},
            authorAssetsDir: '__scaffold__'
          },
          dimensions: {},
          options: { raw: [], byDimension: {} }
        };

        const tools = await createSetupTools(options);

        // Test replaceAll with explicit replacements
        const testFile1 = path.join(tempDir, 'test1.txt');
        await fs.writeFile(testFile1, 'Hello {{NAME}} v{{VERSION}}!');
        await tools.placeholders.replaceAll({ NAME: 'CustomApp', VERSION: '2.0.0' });
        const content1 = await fs.readFile(testFile1, 'utf8');
        assert.strictEqual(content1, 'Hello CustomApp v2.0.0!');

        // Test applyInputs (uses template context inputs)
        const testFile2 = path.join(tempDir, 'test2.txt');
        await fs.writeFile(testFile2, 'Welcome {{NAME}} v{{VERSION}}!');
        await tools.placeholders.applyInputs();
        const content2 = await fs.readFile(testFile2, 'utf8');
        assert.strictEqual(content2, 'Welcome MyApp v1.0.0!');

        // Test replaceInFile
        const testFile3 = path.join(tempDir, 'test3.txt');
        await fs.writeFile(testFile3, 'Project: {{NAME}}');
        await tools.placeholders.replaceInFile(testFile3, { NAME: 'FileApp' });
        const content3 = await fs.readFile(testFile3, 'utf8');
        assert.strictEqual(content3, 'Project: FileApp');

      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('should provide functional inputs API', async () => {
      const tempDir = path.join(tmpdir(), 'inputs-test-' + Date.now());
      await fs.mkdir(tempDir, { recursive: true });

      try {
        const logger = new MockLogger();
        const options = {
          projectDirectory: tempDir,
          projectName: 'test-project',
          logger,
          templateContext: {
            inputs: { API_KEY: 'secret123', DEBUG: 'true', PORT: '3000' },
            authoring: 'wysiwyg',
            constants: {},
            authorAssetsDir: '__scaffold__'
          },
          dimensions: {},
          options: { raw: [], byDimension: {} }
        };

        const tools = await createSetupTools(options);

        // Test get method
        assert.strictEqual(tools.inputs.get('API_KEY'), 'secret123');
        assert.strictEqual(tools.inputs.get('MISSING'), undefined);
        assert.strictEqual(tools.inputs.get('MISSING', 'default'), 'default');

        // Test all method
        const allInputs = tools.inputs.all();
        assert.deepStrictEqual(allInputs, {
          API_KEY: 'secret123',
          DEBUG: 'true',
          PORT: '3000'
        });

      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('should provide functional files API', async () => {
      const tempDir = path.join(tmpdir(), 'files-test-' + Date.now());
      await fs.mkdir(tempDir, { recursive: true });

      try {
        const logger = new MockLogger();
        const options = {
          projectDirectory: tempDir,
          projectName: 'test-project',
          logger,
          templateContext: {
            inputs: {},
            authoring: 'wysiwyg',
            constants: {},
            authorAssetsDir: '__scaffold__'
          },
          dimensions: {},
          options: { raw: [], byDimension: {} }
        };

        const tools = await createSetupTools(options);

        // Test ensureDirs
        const subDir = path.join(tempDir, 'subdir', 'nested');
        await tools.files.ensureDirs(subDir);
        const stats = await fs.stat(subDir);
        assert(stats.isDirectory());

        // Test write
        const testFile = path.join(tempDir, 'test.txt');
        await tools.files.write(testFile, 'Hello World');
        const content = await fs.readFile(testFile, 'utf8');
        assert.strictEqual(content, 'Hello World');

        // Test copy
        const copyFile = path.join(tempDir, 'copy.txt');
        await tools.files.copy(testFile, copyFile);
        const copyContent = await fs.readFile(copyFile, 'utf8');
        assert.strictEqual(copyContent, 'Hello World');

        // Test move
        const moveFile = path.join(tempDir, 'moved.txt');
        await tools.files.move(copyFile, moveFile);
        const moveContent = await fs.readFile(moveFile, 'utf8');
        assert.strictEqual(moveContent, 'Hello World');
        await assert.rejects(fs.access(copyFile)); // Should not exist

        // Test remove
        await tools.files.remove(moveFile);
        await assert.rejects(fs.access(moveFile)); // Should not exist

      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('should create context object with correct properties', async () => {
      const tempDir = path.join(tmpdir(), 'ctx-test-' + Date.now());
      await fs.mkdir(tempDir, { recursive: true });

      try {
        const logger = new MockLogger();
        const options = {
          projectDirectory: tempDir,
          projectName: 'my-test-project',
          logger,
          templateContext: {
            inputs: { INPUT_VAR: 'input-value' },
            constants: { CONST_VAR: 'const-value' },
            authoring: 'wysiwyg',
            authorAssetsDir: '__assets__'
          }
        };

        const tools = await createSetupTools(options);

        // We need to test the context indirectly through a setup script
        const context = {
          projectName: 'my-test-project',
          projectDir: tempDir,
          inputs: { INPUT_VAR: 'input-value' },
          constants: { CONST_VAR: 'const-value' },
          authoring: 'wysiwyg',
          authorAssetsDir: '__assets__'
        };

        const scriptContent = `
          export default async function setup({ ctx, tools }) {
            return {
              projectName: ctx.projectName,
              projectDir: ctx.projectDir,
              inputs: ctx.inputs,
              constants: ctx.constants,
              authoring: ctx.authoring,
              authorAssetsDir: ctx.authorAssetsDir
            };
          }
        `;

        const scriptPath = path.join(tempDir, '_setup.mjs');
        await fs.writeFile(scriptPath, scriptContent);

        const result = await loadSetupScript(scriptPath, context, tools);

        assert.strictEqual(result.projectName, 'my-test-project');
        assert.strictEqual(result.projectDir, tempDir);
        assert.deepStrictEqual(result.inputs, { INPUT_VAR: 'input-value' });
        assert.deepStrictEqual(result.constants, { CONST_VAR: 'const-value' });
        assert.strictEqual(result.authoring, 'wysiwyg');
        assert.strictEqual(result.authorAssetsDir, '__assets__');
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('should handle missing templateContext gracefully', async () => {
      const tempDir = path.join(tmpdir(), 'ctx-missing-test-' + Date.now());
      await fs.mkdir(tempDir, { recursive: true });

      try {
        const logger = new MockLogger();
        const options = {
          projectDirectory: tempDir,
          projectName: 'test-project',
          logger
        };

        const tools = await createSetupTools(options);

        const scriptContent = `
          export default async function setup({ ctx, tools }) {
            return {
              inputs: ctx.inputs,
              constants: ctx.constants,
              authoring: ctx.authoring,
              authorAssetsDir: ctx.authorAssetsDir
            };
          }
        `;

        const scriptPath = path.join(tempDir, '_setup.mjs');
        await fs.writeFile(scriptPath, scriptContent);

        const ctx = {
          projectName: 'test-project',
          projectDir: tempDir,
          cwd: process.cwd(),
          authoring: 'wysiwyg',
          inputs: {},
          constants: {},
          authorAssetsDir: '__scaffold__'
        };

        const result = await loadSetupScript(scriptPath, ctx, tools);

        assert.deepStrictEqual(result.inputs, {});
        assert.deepStrictEqual(result.constants, {});
        assert.strictEqual(result.authoring, 'wysiwyg');
        assert.strictEqual(result.authorAssetsDir, '__scaffold__');
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('Tools APIs', () => {
    describe('inputs API', () => {
      it('should get input values', async () => {
        const tempDir = path.join(tmpdir(), 'api-test-' + Date.now());
        await fs.mkdir(tempDir, { recursive: true });

        try {
          const logger = new MockLogger();
          const options = {
            projectDirectory: tempDir,
            projectName: 'test-project',
            logger,
            templateContext: {
              inputs: { TEST_VAR: 'test-value' }
            }
          };

          const tools = await createSetupTools(options);
          const scriptContent = `
          export default async function setup({ ctx, tools }) {
            return {
              testVar: tools.inputs.get('TEST_VAR'),
              missingVar: tools.inputs.get('MISSING_VAR', 'default'),
              allInputs: tools.inputs.all()
            };
          }
        `;

          const scriptPath = path.join(tempDir, '_setup.mjs');
          await fs.writeFile(scriptPath, scriptContent);

          const result = await loadSetupScript(scriptPath, {}, tools);

          assert.strictEqual(result.testVar, 'test-value');
          assert.strictEqual(result.missingVar, 'default');
          assert.deepStrictEqual(result.allInputs, { TEST_VAR: 'test-value' });
        } finally {
          await fs.rm(tempDir, { recursive: true, force: true });
        }
      });

      it('should reject invalid input keys', async () => {
        const tempDir = path.join(tmpdir(), 'api-test-' + Date.now());
        await fs.mkdir(tempDir, { recursive: true });

        try {
          const logger = new MockLogger();
          const options = {
            projectDirectory: tempDir,
            projectName: 'test-project',
            logger,
            templateContext: {
              inputs: { TEST_VAR: 'test-value' }
            }
          };

          const tools = await createSetupTools(options);

          const scriptContent = `
            export default async function setup({ ctx, tools }) {
              tools.inputs.get('');
              return {};
            }
          `;

          const scriptPath = path.join(tempDir, '_setup.mjs');
          await fs.writeFile(scriptPath, scriptContent);

          await assert.rejects(
            loadSetupScript(scriptPath, {}, tools),
            SetupSandboxError
          );
        } finally {
          await fs.rm(tempDir, { recursive: true, force: true });
        }
      });
    });

    describe('files API', () => {
      it('should copy files', async () => {
        const tempDir = path.join(tmpdir(), 'files-api-test-' + Date.now());
        await fs.mkdir(tempDir, { recursive: true });

        try {
          const logger = new MockLogger();
          const options = {
            projectDirectory: tempDir,
            projectName: 'test-project',
            logger,
            templateContext: {}
          };

          const tools = await createSetupTools(options);

          // Create a source file
          const sourceFile = path.join(tempDir, 'source.txt');
          await fs.writeFile(sourceFile, 'test content');

          const scriptContent = `
            export default async function setup({ ctx, tools }) {
              await tools.files.copy('source.txt', 'dest.txt');
              return { copied: true };
            }
          `;

          const scriptPath = path.join(tempDir, '_setup.mjs');
          await fs.writeFile(scriptPath, scriptContent);

          const result = await loadSetupScript(scriptPath, {}, tools);

          assert.strictEqual(result.copied, true);

          // Verify file was copied
          const destContent = await fs.readFile(path.join(tempDir, 'dest.txt'), 'utf8');
          assert.strictEqual(destContent, 'test content');
        } finally {
          await fs.rm(tempDir, { recursive: true, force: true });
        }
      });

      it('should move files', async () => {
        const tempDir = path.join(tmpdir(), 'files-api-test-' + Date.now());
        await fs.mkdir(tempDir, { recursive: true });

        try {
          const logger = new MockLogger();
          const options = {
            projectDirectory: tempDir,
            projectName: 'test-project',
            logger,
            templateContext: {}
          };

          const tools = await createSetupTools(options);

          // Create a source file
          const sourceFile = path.join(tempDir, 'move-source.txt');
          await fs.writeFile(sourceFile, 'move content');

          const scriptContent = `
            export default async function setup({ ctx, tools }) {
              await tools.files.move('move-source.txt', 'move-dest.txt');
              return { moved: true };
            }
          `;

          const scriptPath = path.join(tempDir, '_setup.mjs');
          await fs.writeFile(scriptPath, scriptContent);

          const result = await loadSetupScript(scriptPath, {}, tools);

          assert.strictEqual(result.moved, true);

          // Verify file was moved
          await assert.rejects(fs.access(path.join(tempDir, 'move-source.txt')));
          const destContent = await fs.readFile(path.join(tempDir, 'move-dest.txt'), 'utf8');
          assert.strictEqual(destContent, 'move content');
        } finally {
          await fs.rm(tempDir, { recursive: true, force: true });
        }
      });

      it('should write files', async () => {
        const tempDir = path.join(tmpdir(), 'files-api-test-' + Date.now());
        await fs.mkdir(tempDir, { recursive: true });

        try {
          const logger = new MockLogger();
          const options = {
            projectDirectory: tempDir,
            projectName: 'test-project',
            logger,
            templateContext: {}
          };

          const tools = await createSetupTools(options);

          const scriptContent = `
            export default async function setup({ ctx, tools }) {
              await tools.files.write('new-file.txt', 'written content');
              return { written: true };
            }
          `;

          const scriptPath = path.join(tempDir, '_setup.mjs');
          await fs.writeFile(scriptPath, scriptContent);

          const result = await loadSetupScript(scriptPath, {}, tools);

          assert.strictEqual(result.written, true);

          // Verify file was written
          const content = await fs.readFile(path.join(tempDir, 'new-file.txt'), 'utf8');
          assert.strictEqual(content, 'written content');
        } finally {
          await fs.rm(tempDir, { recursive: true, force: true });
        }
      });

      it('should remove files', async () => {
        const tempDir = path.join(tmpdir(), 'files-api-test-' + Date.now());
        await fs.mkdir(tempDir, { recursive: true });

        try {
          const logger = new MockLogger();
          const options = {
            projectDirectory: tempDir,
            projectName: 'test-project',
            logger,
            templateContext: {}
          };

          const tools = await createSetupTools(options);

          // Create a file to remove
          const fileToRemove = path.join(tempDir, 'to-remove.txt');
          await fs.writeFile(fileToRemove, 'content');

          const scriptContent = `
            export default async function setup({ ctx, tools }) {
              await tools.files.remove('to-remove.txt');
              return { removed: true };
            }
          `;

          const scriptPath = path.join(tempDir, '_setup.mjs');
          await fs.writeFile(scriptPath, scriptContent);

          const result = await loadSetupScript(scriptPath, {}, tools);

          assert.strictEqual(result.removed, true);

          // Verify file was removed
          await assert.rejects(fs.access(fileToRemove));
        } finally {
          await fs.rm(tempDir, { recursive: true, force: true });
        }
      });

      it('should ensure directories exist', async () => {
        const tempDir = path.join(tmpdir(), 'files-api-test-' + Date.now());
        await fs.mkdir(tempDir, { recursive: true });

        try {
          const logger = new MockLogger();
          const options = {
            projectDirectory: tempDir,
            projectName: 'test-project',
            logger,
            templateContext: {}
          };

          const tools = await createSetupTools(options);

          const scriptContent = `
            export default async function setup({ ctx, tools }) {
              await tools.files.ensureDirs(['subdir1', 'subdir2/nested']);
              return { ensured: true };
            }
          `;

          const scriptPath = path.join(tempDir, '_setup.mjs');
          await fs.writeFile(scriptPath, scriptContent);

          const result = await loadSetupScript(scriptPath, {}, tools);

          assert.strictEqual(result.ensured, true);

          // Verify directories were created
          const stat1 = await fs.stat(path.join(tempDir, 'subdir1'));
          assert.ok(stat1.isDirectory());

          const stat2 = await fs.stat(path.join(tempDir, 'subdir2', 'nested'));
          assert.ok(stat2.isDirectory());
        } finally {
          await fs.rm(tempDir, { recursive: true, force: true });
        }
      });
    });

    describe('placeholders API', () => {
      it('should apply inputs to files', async () => {
        const tempDir = path.join(tmpdir(), 'placeholders-api-test-' + Date.now());
        await fs.mkdir(tempDir, { recursive: true });

        try {
          const logger = new MockLogger();
          const options = {
            projectDirectory: tempDir,
            projectName: 'test-project',
            logger,
            templateContext: {
              inputs: { TEST_VAR: 'test-value' }
            }
          };

          const tools = await createSetupTools(options);

          // Create a file with placeholders
          const templateFile = path.join(tempDir, 'template.txt');
          await fs.writeFile(templateFile, 'Hello {{PROJECT_NAME}} and {{TEST_VAR}}!');

          const scriptContent = `
            export default async function setup({ ctx, tools }) {
              await tools.placeholders.applyInputs('template.txt');
              return { applied: true };
            }
          `;

          const scriptPath = path.join(tempDir, '_setup.mjs');
          await fs.writeFile(scriptPath, scriptContent);

          const result = await loadSetupScript(scriptPath, {}, tools);

          assert.strictEqual(result.applied, true);

          // Verify placeholders were replaced
          const content = await fs.readFile(templateFile, 'utf8');
          assert.strictEqual(content, 'Hello test-project and test-value!');
        } finally {
          await fs.rm(tempDir, { recursive: true, force: true });
        }
      });

      it('should replace all placeholders', async () => {
        const tempDir = path.join(tmpdir(), 'placeholders-api-test-' + Date.now());
        await fs.mkdir(tempDir, { recursive: true });

        try {
          const logger = new MockLogger();
          const options = {
            projectDirectory: tempDir,
            projectName: 'test-project',
            logger,
            templateContext: {}
          };

          const tools = await createSetupTools(options);

          // Create a file with placeholders
          const templateFile = path.join(tempDir, 'replace.txt');
          await fs.writeFile(templateFile, 'Replace {{OLD_VAR}} with {{NEW_VAR}}');

          const scriptContent = `
            export default async function setup({ ctx, tools }) {
              await tools.placeholders.replaceAll({
                'OLD_VAR': 'old-value',
                'NEW_VAR': 'new-value'
              }, 'replace.txt');
              return { replaced: true };
            }
          `;

          const scriptPath = path.join(tempDir, '_setup.mjs');
          await fs.writeFile(scriptPath, scriptContent);

          const result = await loadSetupScript(scriptPath, {}, tools);

          assert.strictEqual(result.replaced, true);

          // Verify replacements were made
          const content = await fs.readFile(templateFile, 'utf8');
          assert.strictEqual(content, 'Replace old-value with new-value');
        } finally {
          await fs.rm(tempDir, { recursive: true, force: true });
        }
      });
    });

    describe('logger API', () => {
      it('should log messages', async () => {
        const tempDir = path.join(tmpdir(), 'logger-api-test-' + Date.now());
        await fs.mkdir(tempDir, { recursive: true });

        try {
          const logger = new MockLogger();
          const options = {
            projectDirectory: tempDir,
            projectName: 'test-project',
            logger,
            templateContext: {}
          };

          const tools = await createSetupTools(options);

          const scriptContent = `
            export default async function setup({ ctx, tools }) {
              tools.logger.info('Info message');
              tools.logger.warn('Warning message');
              return { logged: true };
            }
          `;

          const scriptPath = path.join(tempDir, '_setup.mjs');
          await fs.writeFile(scriptPath, scriptContent);

          const result = await loadSetupScript(scriptPath, {}, tools);

          assert.strictEqual(result.logged, true);

          // Verify messages were logged
          assert.strictEqual(logger.messages.length, 2);
          assert.deepStrictEqual(logger.messages[0], { level: 'info', message: 'Info message' });
          assert.deepStrictEqual(logger.messages[1], { level: 'warn', message: 'Warning message' });
        } finally {
          await fs.rm(tempDir, { recursive: true, force: true });
        }
      });
    });
  });
});
