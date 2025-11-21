import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { HintsCommand } from '../../../bin/make-template/commands/hints/index.js';
import { captureOutput } from '../../helpers.js';

describe('HintsCommand', () => {
  it('shows help with --help flag', () => {
    const cmd = new HintsCommand();
    const { logs } = captureOutput(() => cmd.execute(['--help']));
    const output = logs.join('\n');
    assert.match(output, /Show hints catalog/);
  });

  it('displays hints when executed', () => {
    const cmd = new HintsCommand();
    const { logs } = captureOutput(() => cmd.run({}));
    const output = logs.join('\n');
    assert.match(output, /Available Hints Catalog for Template Authoring/);
    assert.match(output, /Feature Hints/);
  });

  it('handles empty arguments', () => {
    const cmd = new HintsCommand();
    const parsed = cmd.parseArgs([]);
    // Hints command has no arguments, so parsed should be empty
    assert.deepStrictEqual(parsed, {});
  });
});
