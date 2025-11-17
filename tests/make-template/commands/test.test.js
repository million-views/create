import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TestCommand } from '../../../bin/make-template/commands/test/index.js';
import { captureOutput, mockExit } from '../../helpers.js';

describe('TestCommand (make-template)', () => {
  it('requires template-path argument', () => {
    const cmd = new TestCommand();
    const exitCode = mockExit(() => {
      captureOutput(() => cmd.execute([]));
    });
    assert.strictEqual(exitCode, 1);
  });

  it('shows help with --help flag', () => {
    const cmd = new TestCommand();
    const { logs } = captureOutput(() => cmd.execute(['--help']));
    const output = logs.join('\n');
    assert.match(output, /Test template functionality/);
    assert.match(output, /--verbose/);
  });

  it('parses template-path correctly', () => {
    const cmd = new TestCommand();
    const parsed = cmd.parseArgs(['./my-template']);
    assert.strictEqual(parsed.templatePath, './my-template');
  });

  it('parses verbose flag', () => {
    const cmd = new TestCommand();
    const parsed = cmd.parseArgs(['./my-template', '--verbose']);
    assert.strictEqual(parsed.verbose, true);
    assert.strictEqual(parsed.templatePath, './my-template');
  });

  it('handles verbose flag before path', () => {
    const cmd = new TestCommand();
    const parsed = cmd.parseArgs(['--verbose', './my-template']);
    assert.strictEqual(parsed.verbose, true);
    assert.strictEqual(parsed.templatePath, './my-template');
  });
});
