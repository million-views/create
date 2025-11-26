import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Command } from '../../lib/cli/command.mts';

const testHelp = {
  name: 'test',
  description: 'Test command for unit testing',
  usage: 'test [options] <arg>',
  options: [
    { short: '-f', long: '--flag', desc: 'A test flag' },
    { long: '--value', value: 'VAL', desc: 'A test value' }
  ],
  examples: [
    { cmd: 'test --flag', desc: 'Run with flag' },
    { cmd: 'test --value hello', desc: 'Run with value' }
  ]
};

class TestCommand extends Command {
  constructor() {
    super(testHelp);
    this.executionCount = 0;
    this.lastParsed = null;
  }

  parseArg(arg, args, i, parsed) {
    if (arg === '--custom') {
      parsed.custom = args[i + 1];
      return i + 1;
    }
    // For unknown args, return undefined to let base class handle
    return undefined;
  }

  async run(parsed) {
    this.executionCount++;
    this.lastParsed = parsed;
    return `executed with: ${JSON.stringify(parsed)}`;
  }
}

describe('Command', () => {
  it('should show basic help', () => {
    const cmd = new TestCommand();
    let output = '';

    const originalLog = console.log;
    console.log = (...args) => {
      output += args.join(' ') + '\n';
    };

    try {
      cmd.showHelp();
      assert(output.includes('Test command for unit testing'), 'Should show description');
      assert(output.includes('test [options] <arg>'), 'Should show usage');
      assert(output.includes('--flag'), 'Should show options');
      assert(output.includes('test --flag'), 'Should show examples');
    } finally {
      console.log = originalLog;
    }
  });

  it('should show detailed help', () => {
    const cmd = new TestCommand();
    let output = '';

    const originalLog = console.log;
    console.log = (...args) => {
      output += args.join(' ') + '\n';
    };

    try {
      cmd.showDetailedHelp();
      assert(output.includes('NAME'), 'Should have NAME section');
      assert(output.includes('SYNOPSIS'), 'Should have SYNOPSIS section');
      assert(output.includes('Test command for unit testing'), 'Should show description');
    } finally {
      console.log = originalLog;
    }
  });

  it('should parse help flag', () => {
    const cmd = new TestCommand();
    const parsed = cmd.parseArgs(['--help']);
    assert.strictEqual(parsed.help, true, 'Should set help flag');
  });

  it('should execute help when --help provided', async () => {
    const cmd = new TestCommand();
    let output = '';

    const originalLog = console.log;
    console.log = (...args) => {
      output += args.join(' ') + '\n';
    };

    try {
      const result = await cmd.execute(['--help']);
      assert(output.includes('Test command for unit testing'), 'Should show help');
      assert.strictEqual(result, undefined, 'Should not return result when showing help');
    } finally {
      console.log = originalLog;
    }
  });

  it('should parse custom arguments', () => {
    const cmd = new TestCommand();
    const parsed = cmd.parseArgs(['--custom', 'value', 'arg1']);
    assert.strictEqual(parsed.custom, 'value', 'Should parse custom argument');
  });

  it('should execute run method', async () => {
    const cmd = new TestCommand();
    const result = await cmd.execute(['--custom', 'test']);

    assert.strictEqual(cmd.executionCount, 1, 'Should execute run method');
    assert.strictEqual(cmd.lastParsed.custom, 'test', 'Should pass parsed args to run');
    assert(result.includes('"custom":"test"'), 'Should return result from run method');
  });

  it('should reject unknown arguments with error', () => {
    const cmd = new TestCommand();
    assert.throws(() => {
      cmd.parseArgs(['--unknown', 'value']);
    }, /Unknown option: --unknown/, 'Should throw error for unknown options');
  });

  it('should format option flags correctly', () => {
    const cmd = new TestCommand();

    // Test short + long + value
    const flag1 = cmd.formatFlags({ short: '-f', long: '--flag', value: 'VAL' });
    assert.strictEqual(flag1, '-f, --flag VAL');

    // Test long only
    const flag2 = cmd.formatFlags({ long: '--verbose' });
    assert.strictEqual(flag2, '--verbose');

    // Test short + long only
    const flag3 = cmd.formatFlags({ short: '-h', long: '--help' });
    assert.strictEqual(flag3, '-h, --help');
  });

  it('should require subclass to implement parseArg', () => {
    const cmd = new Command(testHelp);

    // This should work for basic parsing
    const parsed = cmd.parseArgs(['--help']);
    assert.strictEqual(parsed.help, true);
  });

  it('should require subclass to implement run', async () => {
    class IncompleteCommand extends Command {
      constructor() {
        super(testHelp);
      }
      // Override parseArg to avoid that error
      parseArg() {
        return undefined;
      }
      // Doesn't implement run(), so should call super.run() which throws
    }

    const cmd = new IncompleteCommand();

    try {
      await cmd.run({});
      assert.fail('Should throw error for unimplemented run method');
    } catch (error) {
      assert(error.message.includes('run must be implemented'), 'Should throw implementation error');
    }
  });
});
