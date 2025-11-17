import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ConvertCommand } from '../../../bin/make-template/commands/convert/index.js';
import { captureOutput, mockExit } from '../../helpers.js';

describe('ConvertCommand', () => {
  it('requires project-path argument', () => {
    const cmd = new ConvertCommand();
    const exitCode = mockExit(() => {
      captureOutput(() => cmd.execute([]));
    });
    assert.strictEqual(exitCode, 1);
  });

  it('shows safety warning when path missing', () => {
    const cmd = new ConvertCommand();
    mockExit(() => {
      const { errors } = captureOutput(() => cmd.execute([]));
      const output = errors.join('\n');
      assert.match(output, /project-path.*required/);
      assert.match(output, /specify the project path explicitly/);
    });
  });

  it('parses project-path correctly', () => {
    const cmd = new ConvertCommand();
    const parsed = cmd.parseArgs(['./my-project', '--dry-run']);
    assert.strictEqual(parsed.projectPath, './my-project');
    assert.strictEqual(parsed.dryRun, true);
  });

  it('handles options before path', () => {
    const cmd = new ConvertCommand();
    const parsed = cmd.parseArgs(['--type', 'vite-react', './my-project']);
    assert.strictEqual(parsed.projectPath, './my-project');
    assert.strictEqual(parsed.type, 'vite-react');
  });

  it('shows help with --help flag', () => {
    const cmd = new ConvertCommand();
    const { logs } = captureOutput(() => cmd.execute(['--help']));
    const output = logs.join('\n');
    assert.match(output, /Convert project to template/);
    assert.match(output, /--type/);
  });
});
