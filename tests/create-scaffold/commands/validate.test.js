import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ValidateCommand } from '../../../bin/create-scaffold/commands/validate/index.js';
import { captureOutputAsync, mockExitAsync } from '../../helpers.js';

describe('ValidateCommand', () => {
  it('requires template-path argument', async () => {
    const cmd = new ValidateCommand();
    const exitCode = await mockExitAsync(async () => {
      await captureOutputAsync(async () => await cmd.execute([]));
    });
    assert.strictEqual(exitCode, 1);
  });

  it('shows help with --help flag', async () => {
    const cmd = new ValidateCommand();
    const { logs } = await captureOutputAsync(async () => await cmd.execute(['--help']));
    const output = logs.join('\n');
    assert.match(output, /Validate template configuration/);
    assert.match(output, /--suggest/);
  });

  it('parses suggest flag', () => {
    const cmd = new ValidateCommand();
    const parsed = cmd.parseArgs(['./template', '--suggest']);
    assert.strictEqual(parsed.suggest, true);
    assert.strictEqual(parsed.templatePath, './template');
  });

  it('parses fix flag', () => {
    const cmd = new ValidateCommand();
    const parsed = cmd.parseArgs(['./template', '--fix']);
    assert.strictEqual(parsed.fix, true);
    assert.strictEqual(parsed.templatePath, './template');
  });
});
