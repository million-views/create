#!/usr/bin/env node

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createRequire } from 'module';
import { execCommand } from '../../../bin/create-scaffold/modules/utils/command-utils.mjs';

const require = createRequire(import.meta.url);

// Mock child_process module before importing anything that uses it
const _originalChildProcess = require.cache[require.resolve('child_process')];
const mockChildProcess = {
  spawn(command, args, options) {
    // This will be overridden in each test
    return mockSpawn(command, args, options);
  }
};
require.cache[require.resolve('child_process')] = { exports: mockChildProcess };

// Mock spawn function
let mockSpawnResults = [];
let mockSpawnCalls = [];

function mockSpawn(command, args, options) {
  const result = mockSpawnResults.shift() || {};
  const child = new MockChildProcess(command, args, options);

  mockSpawnCalls.push({
    command,
    args,
    options
  });

  // Simulate async behavior
  setTimeout(() => {
    if (result.error) {
      child.emit('error', result.error);
    } else {
      // Simulate stdout/stderr output
      if (result.stdout) {
        child.setStdout(result.stdout);
      }
      if (result.stderr) {
        child.setStderr(result.stderr);
      }

      // Only emit close if we have an exit code, otherwise let timeout handle it
      if (result.exitCode !== undefined) {
        child.emit('close', result.exitCode);
      }
      // If no exitCode provided, the child "hangs" and timeout should kill it
    }
  }, 1);

  return child;
}

// Mock child_process.spawn for testing
class MockChildProcess {
  constructor(command, args, options) {
    this.command = command;
    this.args = args;
    this.options = options;
    this.eventListeners = new Map();
    this.killed = false;
    this.signal = null;

    // Create mock streams
    this.stdout = {
      on: (event, listener) => {
        if (!this.stdout.listeners) this.stdout.listeners = [];
        this.stdout.listeners.push({ event, listener });
      },
      emit: (event, data) => {
        const listeners = this.stdout.listeners || [];
        listeners.forEach(({ event: evt, listener }) => {
          if (evt === event) listener(data);
        });
      }
    };

    this.stderr = {
      on: (event, listener) => {
        if (!this.stderr.listeners) this.stderr.listeners = [];
        this.stderr.listeners.push({ event, listener });
      },
      emit: (event, data) => {
        const listeners = this.stderr.listeners || [];
        listeners.forEach(({ event: evt, listener }) => {
          if (evt === event) listener(data);
        });
      }
    };

    this.stdin = {
      on: () => {},
      emit: () => {}
    };
  }

  on(event, listener) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(listener);
  }

  emit(event, ...args) {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(listener => listener(...args));
  }

  kill(signal = 'SIGTERM') {
    this.killed = true;
    this.signal = signal;
    this.emit('close', null); // Simulate immediate termination
  }

  // Mock stdout/stderr streams
  setStdout(data) {
    if (this.stdout) {
      this.stdout.emit('data', data);
      this.stdout.emit('end');
    }
  }

  setStderr(data) {
    if (this.stderr) {
      this.stderr.emit('data', data);
      this.stderr.emit('end');
    }
  }

  setExitCode(code) {
    this.emit('close', code);
  }

  setSpawnError(error) {
    this.emit('error', error);
  }
}

// Helper function for test setup/cleanup
function withMockSpawn(mockResults, testFn) {
  mockSpawnResults = [...mockResults]; // Copy the array
  mockSpawnCalls = [];

  return testFn();
}

describe('execCommand', () => {

  describe('basic execution', () => {
    it('should execute command successfully and return stdout', async () => {
      await withMockSpawn([{
        stdout: 'Hello World',
        exitCode: 0
      }], async () => {
        const result = await execCommand('echo', ['hello'], { spawn: mockSpawn });

        assert.strictEqual(result, 'Hello World');
        assert.strictEqual(mockSpawnCalls.length, 1);
        assert.deepStrictEqual(mockSpawnCalls[0], {
          command: 'echo',
          args: ['hello'],
          options: {
            stdio: ['ignore', 'pipe', 'pipe'],
            cwd: undefined
          }
        });
      });
    });

    it('should handle commands with no arguments', async () => {
      await withMockSpawn([{
        stdout: 'output',
        exitCode: 0
      }], async () => {
        const result = await execCommand('ls', [], { spawn: mockSpawn });

        assert.strictEqual(result, 'output');
        assert.deepStrictEqual(mockSpawnCalls[0].args, []);
      });
    });

    it('should handle empty stdout', async () => {
      await withMockSpawn([{
        stdout: '',
        exitCode: 0
      }], async () => {
        const result = await execCommand('true', [], { spawn: mockSpawn });

        assert.strictEqual(result, '');
      });
    });
  });

  describe('error handling', () => {
    it('should reject on non-zero exit code with stderr', async () => {
      await withMockSpawn([{
        stdout: 'some output',
        stderr: 'error message',
        exitCode: 1
      }], async () => {
        await assert.rejects(
          () => execCommand('failing-command', [], { spawn: mockSpawn }),
          (error) => {
            assert.strictEqual(error.message, 'error message');
            assert.strictEqual(error.code, 1);
            return true;
          }
        );
      });
    });

    it('should reject on non-zero exit code with stdout when no stderr', async () => {
      await withMockSpawn([{
        stdout: 'command output',
        stderr: '',
        exitCode: 2
      }], async () => {
        await assert.rejects(
          () => execCommand('failing-command', [], { spawn: mockSpawn }),
          (error) => {
            assert.strictEqual(error.message, 'command output');
            assert.strictEqual(error.code, 2);
            return true;
          }
        );
      });
    });

    it('should reject on non-zero exit code with generic message when no output', async () => {
      await withMockSpawn([{
        stdout: '',
        stderr: '',
        exitCode: 3
      }], async () => {
        await assert.rejects(
          () => execCommand('failing-command', [], { spawn: mockSpawn }),
          (error) => {
            assert.strictEqual(error.message, 'Command failed with exit code 3');
            assert.strictEqual(error.code, 3);
            return true;
          }
        );
      });
    });

    it('should reject on spawn error', async () => {
      const spawnError = new Error('Command not found');
      await withMockSpawn([{
        error: spawnError
      }], async () => {
        await assert.rejects(
          () => execCommand('nonexistent-command', [], { spawn: mockSpawn }),
          spawnError
        );
      });
    });
  });

  describe('timeout handling', () => {
    it('should timeout after specified duration', async () => {
      await withMockSpawn([{}], async () => {
        await assert.rejects(
          () => execCommand('slow-command', [], { timeout: 10, spawn: mockSpawn }),
          /Command timed out after 10ms/
        );

        // Verify the child was killed
        assert.strictEqual(mockSpawnCalls.length, 1);
      });
    });

    it('should use default timeout of 30000ms', async () => {
      await withMockSpawn([{}], async () => {
        await assert.rejects(
          () => execCommand('slow-command', [], { spawn: mockSpawn }),
          /Command timed out after 30000ms/
        );
      });
    });

    it('should not timeout when timeout is 0', async () => {
      await withMockSpawn([{
        stdout: 'completed',
        exitCode: 0
      }], async () => {
        const result = await execCommand('command', [], { timeout: 0, spawn: mockSpawn });

        assert.strictEqual(result, 'completed');
      });
    });
  });

  describe('stdio configuration', () => {
    it('should use default stdio configuration', async () => {
      await withMockSpawn([{
        stdout: 'output',
        exitCode: 0
      }], async () => {
        await execCommand('command', [], { spawn: mockSpawn });

        assert.deepStrictEqual(mockSpawnCalls[0].options.stdio, ['ignore', 'pipe', 'pipe']);
      });
    });

    it('should use custom stdio configuration', async () => {
      await withMockSpawn([{
        stdout: 'output',
        exitCode: 0
      }], async () => {
        await execCommand('command', [], { stdio: ['inherit', 'inherit', 'inherit'], spawn: mockSpawn });

        assert.deepStrictEqual(mockSpawnCalls[0].options.stdio, ['inherit', 'inherit', 'inherit']);
      });
    });

    it('should handle stdout not being piped', async () => {
      await withMockSpawn([{
        exitCode: 0
      }], async () => {
        const result = await execCommand('command', [], { stdio: ['ignore', 'ignore', 'pipe'], spawn: mockSpawn });

        assert.strictEqual(result, '');
      });
    });

    it('should handle stderr not being piped', async () => {
      await withMockSpawn([{
        stdout: 'output',
        exitCode: 1
      }], async () => {
        await assert.rejects(
          () => execCommand('command', [], { stdio: ['ignore', 'pipe', 'ignore'], spawn: mockSpawn }),
          (error) => {
            assert.strictEqual(error.message, 'output');
            assert.strictEqual(error.code, 1);
            return true;
          }
        );
      });
    });
  });

  describe('working directory', () => {
    it('should execute in specified working directory', async () => {
      await withMockSpawn([{
        stdout: 'output',
        exitCode: 0
      }], async () => {
        await execCommand('command', [], { cwd: '/custom/path', spawn: mockSpawn });

        assert.strictEqual(mockSpawnCalls[0].options.cwd, '/custom/path');
      });
    });

    it('should not set cwd when not specified', async () => {
      await withMockSpawn([{
        stdout: 'output',
        exitCode: 0
      }], async () => {
        await execCommand('command', [], { spawn: mockSpawn });

        assert.strictEqual(mockSpawnCalls[0].options.cwd, undefined);
      });
    });
  });

  describe('output accumulation', () => {
    it('should accumulate multiple stdout chunks', async () => {
      const customMockSpawn = (command, args, options) => {
        const child = new MockChildProcess(command, args, options);
        mockSpawnCalls.push({ command, args, options });

        // Simulate multiple stdout chunks
        setTimeout(() => {
          child.setStdout('chunk1');
          setTimeout(() => {
            child.setStdout('chunk2');
            setTimeout(() => {
              child.emit('close', 0);
            }, 1);
          }, 1);
        }, 1);

        return child;
      };

      const result = await execCommand('command', [], { spawn: customMockSpawn });
      assert.strictEqual(result, 'chunk1chunk2');
    });

    it('should accumulate multiple stderr chunks', async () => {
      const customMockSpawn = (command, args, options) => {
        const child = new MockChildProcess(command, args, options);
        mockSpawnCalls.push({ command, args, options });

        // Simulate multiple stderr chunks that cause rejection
        setTimeout(() => {
          child.setStderr('error1');
          setTimeout(() => {
            child.setStderr('error2');
            setTimeout(() => {
              child.emit('close', 1);
            }, 1);
          }, 1);
        }, 1);

        return child;
      };

      await assert.rejects(
        () => execCommand('command', [], { spawn: customMockSpawn }),
        (error) => {
          assert.strictEqual(error.message, 'error1error2');
          assert.strictEqual(error.code, 1);
          return true;
        }
      );
    });
  });

  describe('signal handling', () => {
    it('should kill process with SIGTERM on timeout', async () => {
      const localCalls = [];
      const customMockSpawn = (command, args, options) => {
        const child = new MockChildProcess(command, args, options);
        localCalls.push({ command, args, options });
        // Don't emit close - let it hang for timeout
        return child;
      };

      await assert.rejects(
        () => execCommand('slow-command', [], { timeout: 1, spawn: customMockSpawn }),
        /Command timed out after 1ms/
      );

      assert.strictEqual(localCalls.length, 1);
    });

    it('should clear timeout on successful completion', async () => {
      await withMockSpawn([{
        stdout: 'success',
        exitCode: 0
      }], async () => {
        const result = await execCommand('command', [], { timeout: 1000, spawn: mockSpawn });

        assert.strictEqual(result, 'success');
      });
    });

    it('should clear timeout on error', async () => {
      await withMockSpawn([{
        stderr: 'error',
        exitCode: 1
      }], async () => {
        await assert.rejects(
          () => execCommand('command', [], { timeout: 1000, spawn: mockSpawn }),
          (error) => {
            assert.strictEqual(error.message, 'error');
            assert.strictEqual(error.code, 1);
            return true;
          }
        );
      });
    });
  });
});
