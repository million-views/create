import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Router } from '../../lib/cli/router.js';
import { Command } from '../../lib/cli/command.js';

class TestCommand extends Command {
  constructor() {
    super({
      name: 'test',
      description: 'Test command',
      usage: 'test [options]',
      options: []
    });
  }

  parseArg(arg, args, i, parsed) {
    if (arg === '--flag') {
      parsed.flag = true;
      return i;
    }
    return super.parseArg(arg, args, i, parsed);
  }

  async run(parsed) {
    console.log(`test executed with flag: ${parsed.flag || false}`);
  }
}

class TestRouter extends Router {
  constructor() {
    super();
    this.toolName = 'test-cli';
    this.description = 'Test CLI tool';
    this.commands = {
      test: new TestCommand()
    };
    this.version = '1.0.0';
  }
}

describe('Router', () => {
  it('should show general help when no args provided', async () => {
    const router = new TestRouter();
    let output = '';

    const originalLog = console.log;
    console.log = (...args) => {
      output += args.join(' ') + '\n';
    };

    try {
      await router.route([]);
      assert(output.includes('Test CLI tool'), 'Should show tool description');
      assert(output.includes('test-cli <command> [options]'), 'Should show command usage');
    } finally {
      console.log = originalLog;
    }
  });

  it('should show help with --help flag', async () => {
    const router = new TestRouter();
    let output = '';

    const originalLog = console.log;
    console.log = (...args) => {
      output += args.join(' ') + '\n';
    };

    try {
      await router.route(['--help']);
      assert(output.includes('Test CLI tool'), 'Should show tool description');
    } finally {
      console.log = originalLog;
    }
  });

  it('should show version with --version flag', async () => {
    const router = new TestRouter();
    let output = '';

    const originalLog = console.log;
    console.log = (...args) => {
      output += args.join(' ') + '\n';
    };

    try {
      await router.route(['--version']);
      assert(output.includes('test-cli 1.0.0'), 'Should show version');
    } finally {
      console.log = originalLog;
    }
  });

  it('should route to command', async () => {
    const router = new TestRouter();
    let output = '';

    const originalLog = console.log;
    console.log = (...args) => {
      output += args.join(' ') + '\n';
    };

    try {
      await router.route(['test', '--flag']);
      assert(output.includes('test executed with flag: true'), 'Should execute command with parsed args');
    } finally {
      console.log = originalLog;
    }
  });

  it('should show error for unknown command', async () => {
    const router = new TestRouter();
    let output = '';

    const originalLog = console.log;
    const originalError = console.error;
    const originalExit = process.exit;

    console.log = (...args) => {
      output += args.join(' ') + '\n';
    };
    console.error = (...args) => {
      output += args.join(' ') + '\n';
    };
    process.exit = () => {
      throw new Error('EXIT_CALLED');
    };

    try {
      await router.route(['unknown']);
      assert.fail('Should have exited');
    } catch (error) {
      if (error.message === 'EXIT_CALLED') {
        assert(output.includes('Unknown command'), 'Should show unknown command error');
      } else {
        throw error;
      }
    } finally {
      console.log = originalLog;
      console.error = originalError;
      process.exit = originalExit;
    }
  });

  it('should show command help with help command', async () => {
    const router = new TestRouter();
    let output = '';

    const originalLog = console.log;
    console.log = (...args) => {
      output += args.join(' ') + '\n';
    };

    try {
      await router.route(['help', 'test']);
      assert(output.includes('Test command'), 'Should show command help');
    } finally {
      console.log = originalLog;
    }
  });
});
