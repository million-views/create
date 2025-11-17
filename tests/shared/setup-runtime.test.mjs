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
    it('should create tools object with all APIs', async () => {
      const tempDir = path.join(tmpdir(), 'tools-test-' + Date.now());
      await fs.mkdir(tempDir, { recursive: true });

      try {
        const logger = new MockLogger();
        const options = {
          projectDirectory: tempDir,
          projectName: 'test-project',
          logger,
          templateContext: {
            inputs: { TEST_VAR: 'test-value' },
            authoring: 'test'
          }
        };

        const tools = await createSetupTools(options);

        assert.ok(tools.placeholders);
        assert.ok(tools.inputs);
        assert.ok(tools.files);
        assert.ok(tools.json);
        assert.ok(tools.templates);
        assert.ok(tools.text);
        assert.ok(tools.logger);
        assert.ok(tools.options);

        // Test that tools are frozen
        assert.throws(() => { tools.newProp = 'test'; });
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
