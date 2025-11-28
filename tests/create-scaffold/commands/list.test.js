import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ListCommand } from '@m5nv/create/bin/create/domains/scaffold/commands/list/index.mts';
import { captureOutput } from '../../helpers/console-capture.js';

describe('ListCommand', () => {
  it('shows help with --help flag', () => {
    const cmd = new ListCommand();
    const { logs } = captureOutput(() => cmd.execute(['--help']));
    const output = logs.join('\n');
    assert.match(output, /List templates from a registry repository/);
    assert.match(output, /--registry/);
  });

  it('parses registry option', () => {
    const cmd = new ListCommand();
    const parsed = cmd.parseArgs(['--registry', 'official']);
    assert.strictEqual(parsed.registry, 'official');
  });

  it('parses format option', () => {
    const cmd = new ListCommand();
    const parsed = cmd.parseArgs(['--format', 'json']);
    assert.strictEqual(parsed.format, 'json');
  });

  it('parses verbose flag', () => {
    const cmd = new ListCommand();
    const parsed = cmd.parseArgs(['--verbose']);
    assert.strictEqual(parsed.verbose, true);
  });
});
