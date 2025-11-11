#!/usr/bin/env node

import test from 'node:test';
import assert from 'node:assert/strict';
import { CLITestRunner, runCLITest } from './cli-test-runner.mjs';
import { InteractiveSimulator, InteractiveTestPresets } from './interactive-simulator.mjs';

/**
 * Integration tests for automated interactive CLI testing
 * Demonstrates fully automated testing without human supervision
 */

test('CLITestRunner - Basic Integration', async (t) => {
  const runner = new CLITestRunner({ timeout: 10000 });

  await t.test('should execute CLI with simulated input', async () => {
    const simulator = new InteractiveSimulator([]);

    // Test help command (doesn't require interactive input)
    const result = await runner.execWithSimulation(['--help'], simulator);

    assert.equal(result.exitCode, 0);
    assert(result.stdout.includes('Usage:'));
    assert(result.stdout.includes('create-scaffold'));
  });

  await t.test('should handle CLI errors gracefully', async () => {
    const simulator = new InteractiveSimulator([]);

    // Test with invalid arguments
    const result = await runner.execWithSimulation(['--invalid-flag'], simulator);

    // Should exit with non-zero code for invalid flags
    assert.notEqual(result.exitCode, 0);
  });
});

test('Simulator Integration Patterns', async (t) => {
  await t.test('should demonstrate preset usage', async () => {
    const simulator = InteractiveTestPresets.basicTemplateSelection('express-api', 'my-app');

    // Verify preset creates correct simulator
    assert.equal(simulator.remainingResponses(), 2);
    assert.equal(await simulator.question('Template?'), 'express-api');
    assert.equal(await simulator.question('Project?'), 'my-app');
    assert.equal(simulator.remainingResponses(), 0);
  });

  await t.test('should handle error recovery preset', async () => {
    const simulator = InteractiveTestPresets.errorRecovery('bad-input', 'good-input');

    assert.equal(await simulator.question('First try?'), 'bad-input');
    assert.equal(await simulator.question('Retry?'), 'good-input');
  });

  await t.test('should handle cancellation preset', () => {
    const simulator = InteractiveTestPresets.cancellation();

    assert.equal(simulator.responses[0], 'q');
  });
});

test('CLI Test Runner Assertions', async (t) => {
  const runner = new CLITestRunner();

  await t.test('should validate exit codes', () => {
    const result = { exitCode: 0, stdout: '', stderr: '', interactions: { callLog: [], outputLog: [] } };

    // Should pass for matching exit code
    assert.doesNotThrow(() => runner.assertResult(result, { exitCode: 0 }));

    // Should fail for non-matching exit code
    assert.throws(() => runner.assertResult(result, { exitCode: 1 }));
  });

  await t.test('should validate stdout content', () => {
    const result = { exitCode: 0, stdout: 'Hello World Test', stderr: '', interactions: { callLog: [], outputLog: [] } };

    // Should pass for contained text
    assert.doesNotThrow(() => runner.assertResult(result, { stdoutContains: ['Hello', 'Test'] }));

    // Should fail for missing text
    assert.throws(() => runner.assertResult(result, { stdoutContains: ['Missing'] }));
  });

  await t.test('should validate stderr content', () => {
    const result = { exitCode: 0, stdout: '', stderr: 'Error occurred', interactions: { callLog: [], outputLog: [] } };

    assert.doesNotThrow(() => runner.assertResult(result, { stderrContains: ['Error'] }));
    assert.throws(() => runner.assertResult(result, { stderrContains: ['Success'] }));
  });

  await t.test('should validate interaction patterns', () => {
    const simulator = new InteractiveSimulator();
    simulator.callLog = [
      { type: 'question', prompt: 'Template?', response: 'express', timestamp: Date.now() },
      { type: 'question', prompt: 'Project?', response: 'my-app', timestamp: Date.now() }
    ];
    simulator.outputLog = [
      { type: 'write', message: 'Processing...', timestamp: Date.now() }
    ];

    const result = {
      exitCode: 0,
      stdout: '',
      stderr: '',
      interactions: simulator.getResults()
    };

    // Should pass for matching interactions
    assert.doesNotThrow(() =>
      runner.assertResult(result, {
        interactions: {
          minQuestions: 2,
          expectedPrompts: ['Template?', 'Project?'],
          expectedOutputs: ['Processing...']
        }
      })
    );

    // Should fail for insufficient questions
    assert.throws(() =>
      runner.assertResult(result, {
        interactions: { minQuestions: 3 }
      })
    );
  });
});

test('runCLITest Convenience Function', async (t) => {
  await t.test('should handle successful test runs', async () => {
    const runner = new CLITestRunner({ timeout: 5000 });
    const simulator = new InteractiveSimulator([]);

    // Mock the runner methods to avoid actual CLI execution
    const _execCalled = false;
    let assertCalled = false;

    runner.runInteractiveTest = async () => ({
      exitCode: 0,
      stdout: 'Success',
      stderr: '',
      interactions: { callLog: [], outputLog: [] }
    });

    runner.assertResult = () => { assertCalled = true; };

    const result = await runCLITest('Mock Test', ['--help'], simulator, { exitCode: 0 });

    assert(result.success);
    assert(assertCalled);
  });

  await t.test('should handle test failures', async () => {
    const runner = new CLITestRunner();
    const simulator = new InteractiveSimulator([]);

    // Mock failure scenario
    runner.runInteractiveTest = async () => {
      throw new Error('Test failed');
    };

    const result = await runCLITest('Failing Test', ['--bad'], simulator);

    assert(!result.success);
    assert.equal(result.error, 'Test failed');
  });
});

test('Error Handling and Edge Cases', async (t) => {
  await t.test('should handle CLI timeout', async () => {
    const runner = new CLITestRunner({ timeout: 100 }); // Very short timeout
    const simulator = new InteractiveSimulator(['response']);

    await assert.rejects(
      () => runner.runInteractiveTest(['--help'], simulator),
      /timed out/
    );
  });

  await t.test('should handle simulator closure', async () => {
    const simulator = new InteractiveSimulator(['response']);
    simulator.close();

    const runner = new CLITestRunner();

    await assert.rejects(
      () => runner.runInteractiveTest(['--help'], simulator),
      /InteractiveSimulator is closed/
    );
  });
});

test('Automated Interactive Workflow Testing', async (t) => {
  await t.test('should test template selection workflow', async () => {
    const success = await runCLITest(
      'Template Selection Simulation',
      ['--interactive'], // Force interactive mode
      InteractiveTestPresets.basicTemplateSelection('express-api', 'my-express-app'),
      {
        exitCode: 0,
        stdoutContains: ['Template:', 'express-api'],
        interactions: {
          expectedPrompts: ['template', 'project'],
          minQuestions: 2,
          maxQuestions: 2
        }
      }
    );

    assert(success.success, success.error);
  });

  await t.test('should test error recovery workflow', async () => {
    const success = await runCLITest(
      'Error Recovery Simulation',
      ['--interactive'],
      InteractiveTestPresets.errorRecovery('invalid-template-name', 'express-api'),
      {
        exitCode: 0,
        stderrContains: ['invalid-template-name'], // Should show error for invalid input
        interactions: {
          minQuestions: 2,
          maxQuestions: 3 // May ask for correction
        }
      }
    );

    assert(success.success, success.error);
  });

  await t.test('should test cancellation workflow', async () => {
    const success = await runCLITest(
      'Cancellation Simulation',
      ['--interactive'],
      InteractiveTestPresets.cancellation(),
      {
        exitCode: 0, // Cancellation should be graceful
        interactions: {
          expectedPrompts: ['q'], // Should detect quit command
          maxQuestions: 1
        }
      }
    );

    assert(success.success, success.error);
  });
});

test('Complex Interactive Scenarios', async (t) => {
  await t.test('should handle multi-step template configuration', async () => {
    const simulator = new InteractiveSimulator([
      'react-app',        // Template selection
      'my-react-project', // Project name
      'vscode',          // IDE selection
      'typescript'       // Options
    ]);

    const success = await runCLITest(
      'Multi-step Template Configuration',
      ['--interactive'],
      simulator,
      {
        exitCode: 0,
        stdoutContains: ['react-app', 'my-react-project'],
        interactions: {
          minQuestions: 4,
          maxQuestions: 4,
          expectedPrompts: ['template', 'project', 'ide', 'options']
        }
      }
    );

    assert(success.success, success.error);
  });

  await t.test('should validate interaction patterns', async () => {
    const simulator = new InteractiveSimulator(['yes', 'my-app', 'n']);

    const success = await runCLITest(
      'Interaction Pattern Validation',
      ['--interactive'],
      simulator,
      {
        interactions: {
          minQuestions: 3,
          expectedPrompts: ['continue', 'name'],
          expectedOutputs: ['Processing', 'Complete']
        }
      }
    );

    assert(success.success, success.error);
  });
});

test('CI/CD Ready Automation', async (t) => {
  await t.test('should work in headless environment', async () => {
    const runner = new CLITestRunner({
      timeout: 15000,
      debug: false // Ensure no debug output in CI
    });

    const simulator = InteractiveTestPresets.basicTemplateSelection('node-lib', 'test-lib');

    const result = await runner.runInteractiveTest(['--interactive'], simulator);

    // Should complete without hanging or requiring human input
    assert(typeof result.exitCode === 'number');
    assert(typeof result.stdout === 'string');
    assert(typeof result.stderr === 'string');
  });

  await t.test('should handle environment variables', async () => {
    const simulator = new InteractiveSimulator(['env-template', 'env-project']);

    const success = await runCLITest(
      'Environment Variable Handling',
      ['--interactive'],
      simulator,
      {
        exitCode: 0,
        interactions: {
          minQuestions: 2,
          maxQuestions: 2
        }
      }
    );

    assert(success.success, success.error);
  });
});

test('Error Handling and Edge Cases', async (t) => {
  await t.test('should handle premature simulator closure', async () => {
    const simulator = new InteractiveSimulator(['response1']);
    simulator.close(); // Close before test

    const runner = new CLITestRunner({ timeout: 5000 });

    await assert.rejects(
      () => runner.runInteractiveTest(['--interactive'], simulator),
      /InteractiveSimulator is closed/
    );
  });

  await t.test('should handle CLI timeout', async () => {
    const runner = new CLITestRunner({ timeout: 100 }); // Very short timeout
    const simulator = new InteractiveSimulator(['slow-response']);

    await assert.rejects(
      () => runner.runInteractiveTest(['--interactive'], simulator),
      /timed out/
    );
  });

  await t.test('should validate assertion failures', async () => {
    const runner = new CLITestRunner();

    // Test with mismatched expectations
    const result = { exitCode: 1, stdout: 'output', stderr: 'error', interactions: new InteractiveSimulator([]).getResults() };

    assert.throws(
      () => runner.assertResult(result, { exitCode: 0 }),
      /Expected exit code 0/
    );
  });
});
