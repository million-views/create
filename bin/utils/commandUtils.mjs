#!/usr/bin/env node

import { spawn } from 'child_process';

/**
 * Shared command execution utilities
 * Provides unified command execution with configurable options
 */

/**
 * Execute a command with timeout and proper error handling
 * @param {string} command - Command to execute
 * @param {string[]} args - Command arguments
 * @param {Object} options - Execution options
 * @param {number} options.timeout - Timeout in milliseconds (default: 30000)
 * @param {string[]} options.stdio - Stdio configuration (default: ['ignore', 'pipe', 'pipe'])
 * @returns {Promise<string>} - Command output
 */
export function execCommand(command, args, options = {}) {
  const { 
    timeout = 30000,
    stdio = ['ignore', 'pipe', 'pipe'],
    cwd
  } = options;
  
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio,
      cwd
    });

    let stdout = '';
    let stderr = '';
    let timeoutId;

    // Set up timeout
    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Command timed out after ${timeout}ms`));
      }, timeout);
    }

    if (child.stdout) {
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
    }

    child.on('error', (error) => {
      if (timeoutId) clearTimeout(timeoutId);
      reject(error);
    });

    child.on('close', (code) => {
      if (timeoutId) clearTimeout(timeoutId);
      
      if (code === 0) {
        resolve(stdout);
      } else {
        const error = new Error(stderr || stdout || `Command failed with exit code ${code}`);
        error.code = code;
        reject(error);
      }
    });
  });
}
