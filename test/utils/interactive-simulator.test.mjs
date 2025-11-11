#!/usr/bin/env node

import test from 'node:test';
import assert from 'node:assert/strict';
import { InteractiveSimulator, InteractiveTestPresets } from './interactive-simulator.mjs';

/**
 * Unit tests for InteractiveSimulator
 * Tests automated CLI workflow simulation without human intervention
 */

test('InteractiveSimulator - Basic Functionality', async (t) => {
  await t.test('should simulate readline.question() with queued responses', async () => {
    const simulator = new InteractiveSimulator(['response1', 'response2']);

    const result1 = await simulator.question('What is your name?');
    assert.equal(result1, 'response1');

    const result2 = await simulator.question('What is your age?');
    assert.equal(result2, 'response2');
  });

  await t.test('should throw error when no responses available', async () => {
    const simulator = new InteractiveSimulator([]);

    await assert.rejects(
      () => simulator.question('Any question?'),
      /No more responses available/
    );
  });

  await t.test('should capture output via write() method', () => {
    const simulator = new InteractiveSimulator();

    simulator.write('Hello World');
    simulator.write('This is a test');

    const results = simulator.getResults();
    assert.equal(results.outputLog.length, 2);
    assert.equal(results.outputLog[0].message, 'Hello World');
    assert.equal(results.outputLog[1].message, 'This is a test');
  });

  await t.test('should log question interactions', async () => {
    const simulator = new InteractiveSimulator(['yes']);

    await simulator.question('Do you want to continue?');

    const results = simulator.getResults();
    assert.equal(results.callLog.length, 1);
    assert.equal(results.callLog[0].type, 'question');
    assert.equal(results.callLog[0].prompt, 'Do you want to continue?');
    assert.equal(results.callLog[0].response, 'yes');
  });
});

test('InteractiveSimulator - Dynamic Response Management', async (t) => {
  await t.test('should allow queuing additional responses', async () => {
    const simulator = new InteractiveSimulator(['first']);

    const result1 = await simulator.question('First question?');
    assert.equal(result1, 'first');

    simulator.queueResponses(['second', 'third']);

    const result2 = await simulator.question('Second question?');
    assert.equal(result2, 'second');

    const result3 = await simulator.question('Third question?');
    assert.equal(result3, 'third');
  });

  await t.test('should track remaining responses', () => {
    const simulator = new InteractiveSimulator(['a', 'b', 'c']);

    assert.equal(simulator.remainingResponses(), 3);

    simulator.question('Q1'); // consumes 'a'
    assert.equal(simulator.remainingResponses(), 2);

    simulator.question('Q2'); // consumes 'b'
    assert.equal(simulator.remainingResponses(), 1);
  });
});

test('InteractiveSimulator - Simulator Lifecycle', async (t) => {
  await t.test('should prevent operations after close()', async () => {
    const simulator = new InteractiveSimulator(['response']);

    simulator.close();

    await assert.rejects(
      () => simulator.question('Question?'),
      /InteractiveSimulator is closed/
    );

    // write() should be a no-op after close
    simulator.write('This should not be logged');
    const results = simulator.getResults();
    assert.equal(results.outputLog.length, 0);
    assert.equal(results.closed, true);
  });

  await t.test('should report closed state in results', () => {
    const simulator = new InteractiveSimulator();
    simulator.close();

    const results = simulator.getResults();
    assert.equal(results.closed, true);
  });
});

test('InteractiveSimulator - Assertion Methods', async (t) => {
  await t.test('should pass assertions for expected interactions', async () => {
    const simulator = new InteractiveSimulator(['yes', 'my-app']);

    await simulator.question('Continue?');
    await simulator.question('Project name?');

    simulator.write('Processing...');
    simulator.write('Done!');

    assert.doesNotThrow(() =>
      simulator.assertInteractions({
        minQuestions: 2,
        maxQuestions: 2,
        expectedPrompts: ['Continue?', 'Project name?'],
        expectedOutputs: ['Processing...', 'Done!']
      })
    );
  });

  await t.test('should fail assertions for unexpected interactions', async () => {
    const simulator = new InteractiveSimulator(['yes']);

    await simulator.question('Continue?');

    assert.throws(
      () => simulator.assertInteractions({ minQuestions: 2 }),
      /Expected at least 2 questions/
    );
  });

  await t.test('should fail when responses not consumed', () => {
    const simulator = new InteractiveSimulator(['unused1', 'unused2']);

    assert.throws(
      () => simulator.assertInteractions({}),
      /responses were not consumed/
    );
  });
});

test('InteractiveTestPresets', async (t) => {
  await t.test('should create basic template selection preset', () => {
    const preset = InteractiveTestPresets.basicTemplateSelection('react-app', 'my-project');

    assert.deepEqual(preset.responses, ['react-app', 'my-project']);
  });

  await t.test('should create template with options preset', () => {
    const preset = InteractiveTestPresets.templateWithOptions(
      'vue-app',
      'my-vue-project',
      'webstorm',
      'typescript'
    );

    assert.deepEqual(preset.responses, ['vue-app', 'my-vue-project', 'webstorm', 'typescript']);
  });

  await t.test('should create error recovery preset', () => {
    const preset = InteractiveTestPresets.errorRecovery('invalid-input', 'valid-input');

    assert.deepEqual(preset.responses, ['invalid-input', 'valid-input']);
  });

  await t.test('should create cancellation preset', () => {
    const preset = InteractiveTestPresets.cancellation();

    assert.deepEqual(preset.responses, ['q']);
  });
});

test('InteractiveSimulator - Debug Mode', async (t) => {
  await t.test('should log debug information when enabled', async () => {
    const simulator = new InteractiveSimulator(['test'], { debug: true });

    // Mock console.log to capture debug output
    const originalLog = console.log;
    const logs = [];
    console.log = (...args) => logs.push(args.join(' '));

    try {
      await simulator.question('Test prompt?');

      assert(logs.some(log => log.includes('[SIMULATOR]')));
      assert(logs.some(log => log.includes('Test prompt?')));
      assert(logs.some(log => log.includes('test')));
    } finally {
      console.log = originalLog;
    }
  });
});

test('InteractiveSimulator - Typing Delay Simulation', async (t) => {
  await t.test('should support typing delay simulation', async () => {
    const simulator = new InteractiveSimulator(['response'], { typingDelay: 10 });

    const start = Date.now();
    await simulator.question('Question?');
    const elapsed = Date.now() - start;

    // Should have waited at least the typing delay
    assert(elapsed >= 10, `Expected at least 10ms delay, got ${elapsed}ms`);
  });
});
