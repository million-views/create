#!/usr/bin/env node

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Command } from '../../../lib/cli/command.mts';

// Test help configuration
const testHelp = {
  name: 'test-command',
  description: 'A test command for comprehensive argument parsing validation',
  usage: 'test-command [options] <required-arg>',
  options: [
    { short: '-f', long: '--flag', desc: 'A boolean flag' },
    { short: '-v', long: '--value', value: 'VAL', desc: 'A value option' },
    { long: '--multi', value: 'ITEM', desc: 'Can be specified multiple times' },
    { short: '-h', long: '--help', desc: 'Show help information' }
  ],
  optionGroups: [
    {
      title: 'Advanced Options',
      options: [
        { long: '--verbose', desc: 'Enable verbose output' },
        { long: '--json', desc: 'Output in JSON format' }
      ]
    }
  ],
  examples: [
    { cmd: 'test-command --flag', desc: 'Run with flag enabled' },
    { cmd: 'test-command --value hello world', desc: 'Run with value and argument' },
    { cmd: 'test-command --multi item1 --multi item2', desc: 'Multiple values' }
  ]
};

// Test command implementation
class TestCommand extends Command {
  constructor() {
    super(testHelp);
    this.parsedArgs = null;
    this.executionCount = 0;
  }

  parseArg(arg, args, i, parsed) {
    if (arg === '--flag' || arg === '-f') {
      parsed.flag = true;
      return i;
    } else if (arg === '--value' || arg === '-v') {
      parsed.value = args[i + 1];
      return i + 1;
    } else if (arg === '--multi') {
      if (!parsed.multi) parsed.multi = [];
      parsed.multi.push(args[i + 1]);
      return i + 1;
    } else if (arg === '--verbose') {
      parsed.verbose = true;
      return i;
    } else if (arg === '--json') {
      parsed.json = true;
      return i;
    } else if (!arg.startsWith('-') && !parsed.requiredArg) {
      parsed.requiredArg = arg;
    }
    // Unknown argument or positional arg - let base class handle
    return undefined;
  }

  async run(parsed) {
    this.parsedArgs = parsed;
    this.executionCount++;
    return { success: true, args: parsed };
  }
}

describe('Argument Parser (Command Framework)', () => {
  describe('Command base class', () => {
    it('creates command instance with help configuration', () => {
      const cmd = new TestCommand();
      assert(cmd.help);
      assert.strictEqual(cmd.help.name, 'test-command');
      assert.strictEqual(cmd.help.description, 'A test command for comprehensive argument parsing validation');
    });

    it('requires parseArg implementation in subclasses', () => {
      const cmd = new Command(testHelp);
      // Should work for help parsing without custom parseArg
      const parsed = cmd.parseArgs(['--help']);
      assert.strictEqual(parsed.help, true);
    });

    it('requires run implementation in subclasses', async () => {
      class IncompleteCommand extends Command {
        constructor() {
          super(testHelp);
        }
        parseArg() {
          return undefined;
        }
      }

      const cmd = new IncompleteCommand();
      await assert.rejects(
        async () => await cmd.run({}),
        /run must be implemented/
      );
    });
  });

  describe('parseArgs method', () => {
    it('handles empty arguments array', () => {
      const cmd = new TestCommand();
      const parsed = cmd.parseArgs([]);
      assert.deepStrictEqual(parsed, {});
    });

    it('recognizes help flags and stops parsing', () => {
      const cmd = new TestCommand();
      const parsed = cmd.parseArgs(['--help', '--flag', 'arg']);
      assert.strictEqual(parsed.help, true);
      assert.strictEqual(Object.keys(parsed).length, 1);
    });

    it('recognizes short help flag', () => {
      const cmd = new TestCommand();
      const parsed = cmd.parseArgs(['-h', '--flag']);
      assert.strictEqual(parsed.help, true);
      assert.strictEqual(Object.keys(parsed).length, 1);
    });

    it('parses boolean flags', () => {
      const cmd = new TestCommand();
      const parsed = cmd.parseArgs(['--flag']);
      assert.strictEqual(parsed.flag, true);
    });

    it('parses short boolean flags', () => {
      const cmd = new TestCommand();
      const parsed = cmd.parseArgs(['-f']);
      assert.strictEqual(parsed.flag, true);
    });

    it('parses value options with long flag', () => {
      const cmd = new TestCommand();
      const parsed = cmd.parseArgs(['--value', 'test-value']);
      assert.strictEqual(parsed.value, 'test-value');
    });

    it('parses value options with short flag', () => {
      const cmd = new TestCommand();
      const parsed = cmd.parseArgs(['-v', 'short-value']);
      assert.strictEqual(parsed.value, 'short-value');
    });

    it('handles multiple value options', () => {
      const cmd = new TestCommand();
      const parsed = cmd.parseArgs(['--multi', 'item1', '--multi', 'item2']);
      assert.deepStrictEqual(parsed.multi, ['item1', 'item2']);
    });

    it('parses positional arguments', () => {
      const cmd = new TestCommand();
      const parsed = cmd.parseArgs(['my-project']);
      assert.strictEqual(parsed.requiredArg, 'my-project');
    });

    it('combines flags, options, and positional args', () => {
      const cmd = new TestCommand();
      const parsed = cmd.parseArgs([
        '--flag',
        '--value', 'hello',
        '--multi', 'item1',
        'my-project',
        '--verbose'
      ]);

      assert.strictEqual(parsed.flag, true);
      assert.strictEqual(parsed.value, 'hello');
      assert.deepStrictEqual(parsed.multi, ['item1']);
      assert.strictEqual(parsed.requiredArg, 'my-project');
      assert.strictEqual(parsed.verbose, true);
    });

    it('throws on unknown options', () => {
      const cmd = new TestCommand();
      assert.throws(
        () => cmd.parseArgs(['--unknown', 'value', '--flag']),
        /Unknown option: --unknown/
      );
    });

    it('preserves argument order for positional args', () => {
      const cmd = new TestCommand();
      const parsed = cmd.parseArgs(['first', '--flag', 'second']);
      assert.strictEqual(parsed.requiredArg, 'first');
      assert.strictEqual(parsed.flag, true);
      // Second positional arg would be ignored in this implementation
    });
  });

  describe('execute method', () => {
    it('shows help when help flag is present', async () => {
      const cmd = new TestCommand();
      let output = '';
      const originalLog = console.log;
      console.log = (...args) => {
        output += args.join(' ') + '\n';
      };

      try {
        const result = await cmd.execute(['--help']);
        assert(output.includes('test-command [options] <required-arg>'));
        assert.strictEqual(result, undefined);
        assert.strictEqual(cmd.executionCount, 0); // run() should not be called
      } finally {
        console.log = originalLog;
      }
    });

    it('executes run method with parsed arguments', async () => {
      const cmd = new TestCommand();
      const result = await cmd.execute(['--flag', '--value', 'test', 'project']);

      assert.strictEqual(cmd.executionCount, 1);
      assert.strictEqual(cmd.parsedArgs.flag, true);
      assert.strictEqual(cmd.parsedArgs.value, 'test');
      assert.strictEqual(cmd.parsedArgs.requiredArg, 'project');
      assert(result.success);
      assert.deepStrictEqual(result.args, cmd.parsedArgs);
    });

    it('handles execution errors gracefully', async () => {
      class FailingCommand extends Command {
        constructor() {
          super(testHelp);
        }
        parseArg() { return undefined; }
        async run() {
          throw new Error('Execution failed');
        }
      }

      const cmd = new FailingCommand();
      await assert.rejects(
        async () => await cmd.execute(['arg']),
        /Execution failed/
      );
    });
  });

  describe('help formatting', () => {
    it('formats option flags correctly', () => {
      const cmd = new TestCommand();

      // Short + long + value
      assert.strictEqual(
        cmd.formatFlags({ short: '-f', long: '--flag', value: 'VAL' }),
        '-f, --flag VAL'
      );

      // Long only
      assert.strictEqual(
        cmd.formatFlags({ long: '--verbose' }),
        '--verbose'
      );

      // Short + long only
      assert.strictEqual(
        cmd.formatFlags({ short: '-h', long: '--help' }),
        '-h, --help'
      );

      // Value only
      assert.strictEqual(
        cmd.formatFlags({ long: '--output', value: 'FILE' }),
        '--output FILE'
      );
    });

    it('displays basic help correctly', () => {
      const cmd = new TestCommand();
      let output = '';
      const originalLog = console.log;
      console.log = (...args) => {
        output += args.join(' ') + '\n';
      };

      try {
        cmd.showHelp();
        assert(output.includes('A test command for comprehensive argument parsing validation'));
        assert(output.includes('test-command [options] <required-arg>'));
        assert(output.includes('--flag'));
        assert(output.includes('--value VAL'));
        assert(output.includes('Advanced Options'));
        assert(output.includes('--verbose'));
        assert(output.includes('test-command --flag'));
      } finally {
        console.log = originalLog;
      }
    });

    it('displays detailed help correctly', () => {
      const cmd = new TestCommand();
      let output = '';
      const originalLog = console.log;
      console.log = (...args) => {
        output += args.join(' ') + '\n';
      };

      try {
        cmd.showDetailedHelp();
        assert(output.includes('NAME'));
        assert(output.includes('SYNOPSIS'));
        assert(output.includes('OPTIONS'));
        assert(output.includes('EXAMPLES'));
        assert(output.includes('test-command - A test command for comprehensive argument parsing validation'));
      } finally {
        console.log = originalLog;
      }
    });
  });

  describe('edge cases and error handling', () => {
    it('handles arguments with equals signs', () => {
      // Some commands might support --key=value syntax
      class EqualsCommand extends Command {
        constructor() {
          super(testHelp);
        }
        parseArg(arg, args, i, parsed) {
          if (arg.startsWith('--value=')) {
            parsed.value = arg.split('=')[1];
            return i;
          } else if (!arg.startsWith('-')) {
            parsed.arg = arg;
          }
          return undefined;
        }
        async run(parsed) { return parsed; }
      }

      const cmd = new EqualsCommand();
      const parsed = cmd.parseArgs(['--value=test-value', 'arg']);
      assert.strictEqual(parsed.value, 'test-value');
      assert.strictEqual(parsed.arg, 'arg');
    });

    it('handles numeric values', () => {
      class NumericCommand extends Command {
        constructor() {
          super(testHelp);
        }
        parseArg(arg, args, i, parsed) {
          if (arg === '--count') {
            parsed.count = parseInt(args[i + 1]);
            return i + 1;
          } else if (!arg.startsWith('-')) {
            parsed.arg = arg;
          }
          return undefined;
        }
        async run(parsed) { return parsed; }
      }

      const cmd = new NumericCommand();
      const parsed = cmd.parseArgs(['--count', '42', 'arg']);
      assert.strictEqual(parsed.count, 42);
      assert.strictEqual(parsed.arg, 'arg');
    });

    it('handles boolean negation patterns', () => {
      class NegationCommand extends Command {
        constructor() {
          super(testHelp);
        }
        parseArg(arg, args, i, parsed) {
          if (arg === '--no-cache') {
            parsed.cache = false;
            return i;
          } else if (arg === '--cache') {
            parsed.cache = true;
            return i;
          } else if (!arg.startsWith('-')) {
            parsed.arg = arg;
          }
          return undefined;
        }
        async run(parsed) { return parsed; }
      }

      const cmd = new NegationCommand();
      const parsed1 = cmd.parseArgs(['--cache', 'arg']);
      const parsed2 = cmd.parseArgs(['--no-cache', 'arg']);

      assert.strictEqual(parsed1.cache, true);
      assert.strictEqual(parsed2.cache, false);
    });

    it('handles array accumulation patterns', () => {
      class ArrayCommand extends Command {
        constructor() {
          super(testHelp);
        }
        parseArg(arg, args, i, parsed) {
          if (arg === '--tag') {
            if (!parsed.tags) parsed.tags = [];
            parsed.tags.push(args[i + 1]);
            return i + 1;
          } else if (!arg.startsWith('-')) {
            parsed.arg = arg;
          }
          return undefined;
        }
        async run(parsed) { return parsed; }
      }

      const cmd = new ArrayCommand();
      const parsed = cmd.parseArgs(['--tag', 'web', '--tag', 'api', 'project']);
      assert.deepStrictEqual(parsed.tags, ['web', 'api']);
      assert.strictEqual(parsed.arg, 'project');
    });

    it('handles complex argument combinations', () => {
      const cmd = new TestCommand();
      const parsed = cmd.parseArgs([
        '--flag',
        '-v', 'complex-value',
        '--multi', 'item1',
        '--verbose',
        '--multi', 'item2',
        '--json',
        'final-arg'
      ]);

      assert.strictEqual(parsed.flag, true);
      assert.strictEqual(parsed.value, 'complex-value');
      assert.deepStrictEqual(parsed.multi, ['item1', 'item2']);
      assert.strictEqual(parsed.verbose, true);
      assert.strictEqual(parsed.json, true);
      assert.strictEqual(parsed.requiredArg, 'final-arg');
    });

    it('ignores extra positional arguments', () => {
      const cmd = new TestCommand();
      const parsed = cmd.parseArgs(['arg1', '--flag', 'arg2', 'arg3']);
      assert.strictEqual(parsed.requiredArg, 'arg1');
      assert.strictEqual(parsed.flag, true);
      // Extra args are ignored in this implementation
    });
  });

  describe('integration with real command patterns', () => {
    it('follows new command argument patterns', () => {
      // Simulate the NewCommand argument patterns
      class NewCommand extends Command {
        constructor() {
          super(testHelp);
        }
        parseArg(arg, args, i, parsed) {
          if (arg === '--template' || arg === '-T') {
            parsed.template = args[i + 1];
            return i + 1;
          } else if (arg === '--branch' || arg === '-b') {
            parsed.branch = args[i + 1];
            return i + 1;
          } else if (arg === '--dry-run' || arg === '-d') {
            parsed.dryRun = true;
            return i;
          } else if (!arg.startsWith('-') && !parsed.projectName) {
            parsed.projectName = arg;
          }
          return undefined;
        }
        async run(parsed) { return parsed; }
      }

      const cmd = new NewCommand();
      const parsed = cmd.parseArgs([
        'my-awesome-project',
        '--template',
        'react-app',
        '--branch',
        'main',
        '--dry-run'
      ]);

      assert.strictEqual(parsed.projectName, 'my-awesome-project');
      assert.strictEqual(parsed.template, 'react-app');
      assert.strictEqual(parsed.branch, 'main');
      assert.strictEqual(parsed.dryRun, true);
    });

    it('handles validation command patterns', () => {
      class ValidateCommand extends Command {
        constructor() {
          super(testHelp);
        }
        parseArg(arg, args, i, parsed) {
          if (arg === '--suggest') {
            parsed.suggest = true;
            return i;
          } else if (arg === '--fix') {
            parsed.fix = true;
            return i;
          } else if (!arg.startsWith('-') && !parsed.templatePath) {
            parsed.templatePath = arg;
          }
          return undefined;
        }
        async run(parsed) { return parsed; }
      }

      const cmd = new ValidateCommand();
      const parsed = cmd.parseArgs(['./my-template', '--suggest', '--fix']);

      assert.strictEqual(parsed.templatePath, './my-template');
      assert.strictEqual(parsed.suggest, true);
      assert.strictEqual(parsed.fix, true);
    });
  });
});
