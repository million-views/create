import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ValidateCommand } from '@m5nv/create-scaffold/bin/make-template/commands/validate/index.mts';
import { captureOutput } from '../../helpers/console-capture.js';

describe('ValidateCommand (make-template)', () => {
  it('shows help with --help flag', () => {
    const cmd = new ValidateCommand();
    const { logs } = captureOutput(() => cmd.execute(['--help']));
    const output = logs.join('\n');
    assert.match(output, /Validate template.json/);
    assert.match(output, /--file/);
  });

  it('parses file option', () => {
    const cmd = new ValidateCommand();
    const parsed = cmd.parseArgs(['--file', 'custom.json']);
    assert.strictEqual(parsed.file, 'custom.json');
  });

  it('parses suggest flag', () => {
    const cmd = new ValidateCommand();
    const parsed = cmd.parseArgs(['--suggest']);
    assert.strictEqual(parsed.suggest, true);
  });

  it('uses template.json as default', () => {
    const cmd = new ValidateCommand();
    const parsed = cmd.parseArgs([]);
    assert.strictEqual(parsed.file, undefined); // Should use default
  });
});
