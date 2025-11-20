import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NewCommand } from '../../../bin/create-scaffold/commands/new/index.js';
import { captureOutputAsync, mockExitAsync } from '../../helpers.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('NewCommand', () => {
  it('requires project-name argument', async () => {
    const cmd = new NewCommand();
    const exitCode = await mockExitAsync(async () => {
      await captureOutputAsync(async () => await cmd.execute([]));
    });
    assert.strictEqual(exitCode, 1);
  });

  it('requires --template option', async () => {
    const cmd = new NewCommand();
    const exitCode = await mockExitAsync(async () => {
      await captureOutputAsync(async () => await cmd.execute(['myapp']));
    });
    assert.strictEqual(exitCode, 1);
  });

  it('parses project name and template', () => {
    const cmd = new NewCommand();
    const parsed = cmd.parseArgs(['myapp', '--template', 'react-app']);
    assert.strictEqual(parsed.projectName, 'myapp');
    assert.strictEqual(parsed.template, 'react-app');
  });

  it('shows help with --help flag', async () => {
    const cmd = new NewCommand();
    const { logs } = await captureOutputAsync(async () => await cmd.execute(['--help']));
    const output = logs.join('\n');
    assert.match(output, /Create a new project from a template/);
    assert.match(output, /--template/);
  });

  describe('Integration Tests', () => {
    it('performs dry-run scaffolding with local template', async (t) => {
      // Create a temporary directory for this test
      const tempDir = path.join(os.tmpdir(), `new-command-test-${Date.now()}`);
      await fs.mkdir(tempDir, { recursive: true });

      t.after(async () => {
        // Clean up temporary directory
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      });

      const projectName = 'test-project';
      // Use relative path to fixtures in tests directory
      const templatePath = './tests/fixtures/features-demo-template';

      const cmd = new NewCommand();
      const parsed = cmd.parseArgs([
        projectName,
        '--template', templatePath,
        '--dry-run'
      ]);

      // Test that dry-run completes without throwing
      await assert.doesNotReject(async () => {
        await cmd.run(parsed);
      }, 'Dry-run should complete without errors');

      // Test that the project directory was not created (dry-run)
      const projectPath = path.resolve(projectName);
      try {
        await fs.access(projectPath);
        assert.fail('Project directory should not exist after dry-run');
      } catch (error) {
        // Expected - directory should not exist
        assert.strictEqual(error.code, 'ENOENT');
      }
    });

    it('handles placeholder arguments', () => {
      const cmd = new NewCommand();
      const parsed = cmd.parseArgs([
        'my-app',
        '--template', 'react-app',
        '--placeholder', 'NAME=MyApp',
        '--placeholder', 'VERSION=1.0.0'
      ]);

      assert.strictEqual(parsed.projectName, 'my-app');
      assert.strictEqual(parsed.template, 'react-app');
      assert.deepStrictEqual(parsed.placeholders, ['NAME=MyApp', 'VERSION=1.0.0']);
    });

    it('handles cache options', () => {
      const cmd = new NewCommand();
      const parsed = cmd.parseArgs([
        'my-app',
        '--template', 'react-app',
        '--no-cache',
        '--cache-ttl', '24'
      ]);

      assert.strictEqual(parsed.projectName, 'my-app');
      assert.strictEqual(parsed.template, 'react-app');
      assert.strictEqual(parsed.cache, false);
      assert.strictEqual(parsed.cacheTtl, '24'); // String before validation
    });

    it('handles configuration options', () => {
      const cmd = new NewCommand();
      const parsed = cmd.parseArgs([
        'my-app',
        '--template', 'react-app',
        '--no-config',
        '--options', 'ui=react,api=express'
      ]);

      assert.strictEqual(parsed.projectName, 'my-app');
      assert.strictEqual(parsed.template, 'react-app');
      assert.strictEqual(parsed.config, false);
      assert.strictEqual(parsed.optionsFile, 'ui=react,api=express');
    });

    it('handles log file option', () => {
      const cmd = new NewCommand();
      const parsed = cmd.parseArgs([
        'my-app',
        '--template', 'react-app',
        '--log-file', '/tmp/scaffold.log'
      ]);

      assert.strictEqual(parsed.projectName, 'my-app');
      assert.strictEqual(parsed.template, 'react-app');
      assert.strictEqual(parsed.logFile, '/tmp/scaffold.log');
    });
  });
});
