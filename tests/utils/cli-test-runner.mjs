#!/usr/bin/env node

/**
 * CLI Test Runner with Interactive Simulation
 * Enables automated testing of interactive CLI workflows
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { InteractiveSimulator } from './interactive-simulator.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class CLITestRunner {
  constructor(options = {}) {
    this.options = {
      cwd: process.cwd(),
      timeout: 30000,
      debug: false,
      ...options
    };
  }

  /**
   * Execute CLI command with simulated interactive input
   * @param {string[]} args - CLI arguments
   * @param {InteractiveSimulator} simulator - Input simulator
   * @returns {Promise<{exitCode: number, stdout: string, stderr: string, interactions: object}>}
   */
  async execWithSimulation(args, simulator) {
    return new Promise((resolve, reject) => {
      const cliPath = path.join(__dirname, '../../bin/create-scaffold/index.mjs');
      const child = spawn('node', [cliPath, ...args], {
        cwd: this.options.cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          // Disable interactive detection for testing
          CI: 'true',
          TERM: 'dumb'
        }
      });

      let stdout = '';
      let stderr = '';
      let timeoutId;

      // Handle stdout
      child.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        simulator.write(output);
      });

      // Handle stderr
      child.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        simulator.write(output);
      });

      // Handle process completion
      child.on('close', (code) => {
        if (timeoutId) clearTimeout(timeoutId);
        resolve({
          exitCode: code,
          stdout,
          stderr,
          interactions: simulator.getResults()
        });
      });

      child.on('error', (error) => {
        if (timeoutId) clearTimeout(timeoutId);
        reject(error);
      });

      // Set timeout
      if (this.options.timeout > 0) {
        timeoutId = setTimeout(() => {
          child.kill('SIGTERM');
          reject(new Error(`CLI execution timed out after ${this.options.timeout}ms`));
        }, this.options.timeout);
      }

      // Start the interactive simulation in the background
      this.runSimulation(child, simulator).catch(reject);
    });
  }

  /**
   * Run the interactive simulation
   * @param {ChildProcess} child - CLI process
   * @param {InteractiveSimulator} simulator - Input simulator
   */
  async runSimulation(child, simulator) {
    try {
      // Wait for CLI to be ready (small delay)
      await new Promise(resolve => setTimeout(resolve, 100));

      while (!simulator.closed && simulator.remainingResponses() > 0) {
        try {
          // Wait for CLI to ask a question (this is simplified - in real scenarios
          // you might need more sophisticated detection of when CLI is waiting for input)
          await new Promise(resolve => setTimeout(resolve, 50));

          if (child.killed) break;

          // Simulate user input
          const response = await simulator.question('simulated prompt');
          if (response && child.stdin.writable) {
            child.stdin.write(response + '\n');
          }
        } catch (_error) {
          // No more responses or simulator closed
          break;
        }
      }

      // Close simulator when done
      simulator.close();

    } catch (error) {
      simulator.close();
      throw error;
    }
  }

  /**
   * Execute CLI with preset interactive responses
   * @param {string[]} args - CLI arguments
   * @param {InteractiveSimulator} simulator - Pre-configured simulator
   * @returns {Promise<object>} - Test results
   */
  async runInteractiveTest(args, simulator) {
    if (this.options.debug) {
      console.log(`[CLI-TEST] Running: node create-scaffold ${args.join(' ')}`);
      console.log(`[CLI-TEST] Simulator responses: ${simulator.responses.join(', ')}`);
    }

    const result = await this.execWithSimulation(args, simulator);

    if (this.options.debug) {
      console.log(`[CLI-TEST] Exit code: ${result.exitCode}`);
      console.log(`[CLI-TEST] Interactions: ${result.interactions.callLog.length} questions, ${result.interactions.outputLog.length} outputs`);
    }

    return result;
  }

  /**
   * Assert CLI test results
   * @param {object} result - Test result from runInteractiveTest
   * @param {object} expectations - Expected outcomes
   */
  assertResult(result, expectations = {}) {
    const errors = [];

    if (expectations.exitCode !== undefined && result.exitCode !== expectations.exitCode) {
      errors.push(`Expected exit code ${expectations.exitCode}, got ${result.exitCode}`);
    }

    if (expectations.stdoutContains) {
      for (const expected of expectations.stdoutContains) {
        if (!result.stdout.includes(expected)) {
          errors.push(`Expected stdout to contain "${expected}"`);
        }
      }
    }

    if (expectations.stderrContains) {
      for (const expected of expectations.stderrContains) {
        if (!result.stderr.includes(expected)) {
          errors.push(`Expected stderr to contain "${expected}"`);
        }
      }
    }

    if (expectations.stdoutNotContains) {
      for (const notExpected of expectations.stdoutNotContains) {
        if (result.stdout.includes(notExpected)) {
          errors.push(`Expected stdout to not contain "${notExpected}"`);
        }
      }
    }

    if (expectations.interactions) {
      try {
        // Create a temporary simulator with the recorded interactions for assertion
        const tempSimulator = new InteractiveSimulator();
        tempSimulator.callLog = result.interactions.callLog;
        tempSimulator.outputLog = result.interactions.outputLog;
        tempSimulator.responses = []; // No remaining responses
        tempSimulator.assertInteractions(expectations.interactions);
      } catch (error) {
        errors.push(`Interaction assertion failed: ${error.message}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`CLI test assertions failed:\n${errors.join('\n')}`);
    }

    return true;
  }
}

/**
 * Convenience function for running CLI tests with presets
 */
export async function runCLITest(testName, args, simulatorOrResponses, expectations = {}) {
  const runner = new CLITestRunner({ debug: process.env.DEBUG === 'true' });

  let simulator;
  if (simulatorOrResponses instanceof InteractiveSimulator) {
    simulator = simulatorOrResponses;
  } else {
    simulator = new InteractiveSimulator(simulatorOrResponses);
  }

  console.log(`🧪 ${testName}`);

  try {
    const result = await runner.runInteractiveTest(args, simulator);
    runner.assertResult(result, expectations);

    console.log(`✅ ${testName} - PASSED`);
    return { success: true, result };
  } catch (error) {
    console.log(`❌ ${testName} - FAILED`);
    console.log(`   Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}
