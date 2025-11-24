import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NewCommand } from '../../../bin/create-scaffold/commands/new/index.js';
import { captureOutputAsync, mockExitAsync } from '../../helpers.js';

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
        '--no-config'
      ]);

      assert.strictEqual(parsed.projectName, 'my-app');
      assert.strictEqual(parsed.template, 'react-app');
      assert.strictEqual(parsed.config, false);
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
