import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RestoreCommand } from '../../../bin/make-template/commands/restore/index.js';
import { captureOutput, mockExit } from '../../helpers.js';

describe('RestoreCommand', () => {
  it('requires project-path argument', () => {
    const cmd = new RestoreCommand();
    const exitCode = mockExit(() => {
      captureOutput(() => cmd.execute([]));
    });
    assert.strictEqual(exitCode, 1);
  });

  it('parses files option as array', () => {
    const cmd = new RestoreCommand();
    const parsed = cmd.parseArgs([
      './my-template',
      '--files',
      'a.js,b.js,c.js'
    ]);
    assert.deepStrictEqual(parsed.files, ['a.js', 'b.js', 'c.js']);
  });

  it('parses placeholders-only flag', () => {
    const cmd = new RestoreCommand();
    const parsed = cmd.parseArgs(['./my-template', '--placeholders-only']);
    assert.strictEqual(parsed.placeholdersOnly, true);
  });

  it('shows help with --help flag', () => {
    const cmd = new RestoreCommand();
    const { logs } = captureOutput(() => cmd.execute(['--help']));
    const output = logs.join('\n');
    assert.match(output, /Restore template to project/);
    assert.match(output, /--files/);
  });
});
