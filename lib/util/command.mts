/**
 * Command Execution Utilities
 *
 * Provides unified command execution with configurable options.
 *
 * @module lib/util/command
 */

import { spawn, type ChildProcess, type SpawnOptions, type StdioOptions } from 'node:child_process';

/**
 * Options for command execution
 */
export interface ExecCommandOptions {
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Stdio configuration (default: ['ignore', 'pipe', 'pipe']) */
  stdio?: StdioOptions;
  /** Working directory */
  cwd?: string;
  /** Spawn function to use (for testing) */
  spawn?: typeof spawn;
}

/**
 * Execute a command with timeout and proper error handling
 * @param command - Command to execute
 * @param args - Command arguments
 * @param options - Execution options
 * @returns Command output
 */
export function execCommand(
  command: string,
  args: string[],
  options: ExecCommandOptions = {}
): Promise<string> {
  const {
    timeout = 30000,
    stdio = ['ignore', 'pipe', 'pipe'],
    cwd,
    spawn: spawnFn = spawn
  } = options;

  return new Promise((resolve, reject) => {
    const spawnOptions: SpawnOptions = {
      stdio,
      cwd
    };

    const child = spawnFn(command, args, spawnOptions) as ChildProcess;

    let stdout = '';
    let stderr = '';
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let timedOut = false;

    // Set up timeout
    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
        reject(new Error(`Command timed out after ${timeout}ms`));
      }, timeout);
    }

    if (child.stdout) {
      child.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });
    }

    child.on('error', (error: Error) => {
      if (timeoutId) clearTimeout(timeoutId);
      reject(error);
    });

    child.on('close', (code: number | null) => {
      if (timeoutId) clearTimeout(timeoutId);

      // Don't process close event if we already timed out
      if (timedOut) return;

      if (code === 0) {
        resolve(stdout);
      } else {
        const error = new Error(stderr || stdout || `Command failed with exit code ${code}`) as Error & { code: number | null };
        error.code = code;
        reject(error);
      }
    });
  });
}
