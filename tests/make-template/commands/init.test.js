import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { InitCommand } from '../../../bin/make-template/commands/init/index.js';
import { captureOutput } from '../../helpers.js';

describe('InitCommand', () => {
  it('shows help with --help flag', () => {
    const cmd = new InitCommand();
    const { logs } = captureOutput(() => cmd.execute(['--help']));
    const output = logs.join('\n');
    assert.match(output, /Generate skeleton template.json/);
    assert.match(output, /--file/);
  });

  it('parses file option', () => {
    const cmd = new InitCommand();
    const parsed = cmd.parseArgs(['--file', 'custom.json']);
    assert.strictEqual(parsed.file, 'custom.json');
  });

  it('generates template.json by default', () => {
    const cmd = new InitCommand();
    const parsed = cmd.parseArgs([]);
    assert.strictEqual(parsed.file, undefined); // Should use default
  });
});
