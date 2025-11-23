import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ConvertCommand } from '../../../bin/make-template/commands/convert/index.js';
import { captureOutput } from '../../helpers.js';

describe('ConvertCommand', () => {
  it('parses project-path correctly', () => {
    const cmd = new ConvertCommand();
    const parsed = cmd.parseArgs(['./my-project', '--dry-run']);
    assert.strictEqual(parsed.projectPath, './my-project');
    assert.strictEqual(parsed.dryRun, true);
  });

  it('defaults to current directory when no path provided', () => {
    const cmd = new ConvertCommand();
    const parsed = cmd.parseArgs(['--dry-run']);
    assert.strictEqual(parsed.projectPath, undefined); // Will default to cwd in run()
    assert.strictEqual(parsed.dryRun, true);
  });

  it('shows help with --help flag', () => {
    const cmd = new ConvertCommand();
    const { logs } = captureOutput(() => cmd.execute(['--help']));
    const output = logs.join('\n');
    assert.match(output, /Convert project to template/);
    assert.match(output, /--placeholder-format/);
  });
});
