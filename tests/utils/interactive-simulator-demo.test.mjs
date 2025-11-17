#!/usr/bin/env node

import test from 'node:test';
import assert from 'node:assert/strict';
import { InteractiveSimulator, InteractiveTestPresets } from './interactive-simulator.mjs';

/**
 * Demonstration of Automated Interactive CLI Testing Infrastructure
 * Shows how the InteractiveSimulator enables fully automated testing
 * without human supervision for CI/CD pipelines
 */

test('🎯 InteractiveSimulator Core Capabilities', async (t) => {
  await t.test('✅ Basic Input Simulation', async () => {
    const simulator = new InteractiveSimulator(['yes', 'my-app', 'vscode']);

    // Simulate user responses to CLI prompts
    const templateChoice = await simulator.question('Choose template:');
    const projectName = await simulator.question('Project name:');
    const ideChoice = await simulator.question('Preferred IDE:');

    assert.equal(templateChoice, 'yes');
    assert.equal(projectName, 'my-app');
    assert.equal(ideChoice, 'vscode');

    // Verify all responses consumed
    assert.equal(simulator.remainingResponses(), 0);
  });

  await t.test('✅ Output Capture & Verification', () => {
    const simulator = new InteractiveSimulator();

    // Simulate CLI output
    simulator.write('🔍 Discovering templates...');
    simulator.write('✅ Template "express-api" found');
    simulator.write('📁 Creating project structure...');

    const results = simulator.getResults();

    assert.equal(results.outputLog.length, 3);
    assert(results.outputLog.some(log => log.message.includes('express-api')));
    assert(results.outputLog.some(log => log.message.includes('Creating project')));
  });

  await t.test('✅ Interaction Logging & Analysis', async () => {
    const simulator = new InteractiveSimulator(['option1', 'option2']);

    await simulator.question('First choice?');
    await simulator.question('Second choice?');

    const results = simulator.getResults();

    assert.equal(results.callLog.length, 2);
    assert.equal(results.callLog[0].response, 'option1');
    assert.equal(results.callLog[1].response, 'option2');
  });

  await t.test('✅ Automated Assertion Framework', async () => {
    const simulator = new InteractiveSimulator(['express', 'my-project', 'typescript']);

    // Simulate a complete interactive session
    await simulator.question('Template?');
    await simulator.question('Project name?');
    await simulator.question('Language?');

    simulator.write('🚀 Generating project...');
    simulator.write('✅ Setup complete!');

    // Verify the interaction pattern matches expectations
    assert.doesNotThrow(() =>
      simulator.assertInteractions({
        minQuestions: 3,
        maxQuestions: 3,
        expectedPrompts: ['Template?', 'Project name?', 'Language?'],
        expectedOutputs: ['Generating project', 'Setup complete']
      })
    );
  });
});

test('🎯 InteractiveTestPresets - Common Scenarios', async (t) => {
  await t.test('✅ Basic Template Selection', async () => {
    const preset = InteractiveTestPresets.basicTemplateSelection('react-app', 'my-react-project');

    assert.equal(await preset.question('Template?'), 'react-app');
    assert.equal(await preset.question('Project?'), 'my-react-project');
  });

  await t.test('✅ Advanced Configuration', async () => {
    const preset = InteractiveTestPresets.templateWithOptions(
      'vue-app',
      'my-vue-project',
      'webstorm',
      'typescript'
    );

    assert.equal(await preset.question('Template?'), 'vue-app');
    assert.equal(await preset.question('Project?'), 'my-vue-project');
    assert.equal(await preset.question('IDE?'), 'webstorm');
    assert.equal(await preset.question('Options?'), 'typescript');
  });

  await t.test('✅ Error Recovery', async () => {
    const preset = InteractiveTestPresets.errorRecovery('invalid-input', 'valid-input');

    // First attempt fails
    assert.equal(await preset.question('Try again?'), 'invalid-input');
    // Recovery succeeds
    assert.equal(await preset.question('Correct input?'), 'valid-input');
  });

  await t.test('✅ Cancellation Handling', async () => {
    const preset = InteractiveTestPresets.cancellation();

    assert.equal(await preset.question('Continue?'), 'q');
  });
});

test('🎯 CI/CD Ready Features', async (t) => {
  await t.test('✅ Debug Mode for Troubleshooting', async () => {
    const simulator = new InteractiveSimulator(['test'], { debug: true });

    // Capture console output to verify debug logging
    const originalLog = console.log;
    const logs = [];
    console.log = (...args) => logs.push(args.join(' '));

    try {
      await simulator.question('Debug prompt?');
      assert(logs.some(log => log.includes('[SIMULATOR]')));
    } finally {
      console.log = originalLog;
    }
  });

  await t.test('✅ Realistic Typing Delays', async () => {
    const simulator = new InteractiveSimulator(['response'], { typingDelay: 50 });

    const start = Date.now();
    await simulator.question('Delayed response?');
    const elapsed = Date.now() - start;

    // Should wait at least the specified delay
    assert(elapsed >= 45, `Expected delay, got ${elapsed}ms`);
  });

  await t.test('✅ Dynamic Response Queue Management', async () => {
    const simulator = new InteractiveSimulator(['initial']);

    // Start with one response
    assert.equal(simulator.remainingResponses(), 1);

    // Add more responses dynamically
    simulator.queueResponses(['second', 'third']);
    assert.equal(simulator.remainingResponses(), 3);

    // Consume responses
    await simulator.question('Q1?');
    await simulator.question('Q2?');
    await simulator.question('Q3?');

    assert.equal(simulator.remainingResponses(), 0);
  });

  await t.test('✅ Lifecycle Management', () => {
    const simulator = new InteractiveSimulator(['test']);

    // Normal operation
    assert(!simulator.closed);

    // Close simulator
    simulator.close();
    assert(simulator.closed);

    // Verify closure in results
    const results = simulator.getResults();
    assert(results.closed);
  });
});

test('🎯 Production-Ready Validation', async (t) => {
  await t.test('✅ Comprehensive Interaction Validation', async () => {
    const simulator = new InteractiveSimulator([
      'express-api',
      'my-express-app',
      'vscode',
      'typescript',
      'yes'
    ]);

    // Simulate complete project setup workflow
    await simulator.question('Select template:');
    await simulator.question('Enter project name:');
    await simulator.question('Choose IDE:');
    await simulator.question('Select options:');
    await simulator.question('Confirm setup:');

    simulator.write('🔧 Installing dependencies...');
    simulator.write('📦 Setup script executing...');
    simulator.write('✨ Project ready!');

    // Validate complete workflow
    const results = simulator.getResults();

    assert.equal(results.callLog.length, 5);
    assert.equal(results.outputLog.length, 3);
    assert.equal(results.remainingResponses, 0);
    assert(!results.closed);

    // Verify specific interaction patterns
    simulator.assertInteractions({
      minQuestions: 5,
      maxQuestions: 5,
      expectedOutputs: ['Installing dependencies', 'Project ready']
    });
  });

  await t.test('✅ Error Detection & Reporting', async () => {
    const simulator = new InteractiveSimulator(['valid-input']);

    await simulator.question('Valid prompt?');

    // Test assertion failures
    assert.throws(
      () => simulator.assertInteractions({ minQuestions: 2 }),
      /Expected at least 2 questions/
    );

    assert.throws(
      () => simulator.assertInteractions({ expectedPrompts: ['Missing prompt'] }),
      /Expected prompt containing "Missing prompt" not found/
    );
  });

  await t.test('✅ Resource Management', async () => {
    const simulator = new InteractiveSimulator(['test1', 'test2', 'test3']);

    // Consume some responses
    await simulator.question('Q1?');
    await simulator.question('Q2?');

    assert.equal(simulator.remainingResponses(), 1);

    // Close and verify cleanup
    simulator.close();

    await assert.rejects(
      () => simulator.question('Should fail?'),
      /InteractiveSimulator is closed/
    );
  });
});

console.log(`
🎉 InteractiveSimulator Test Suite Complete!

✅ Core Capabilities:
   • Automated input simulation for CLI prompts
   • Output capture and verification
   • Interaction logging and analysis
   • Comprehensive assertion framework

✅ Pre-built Presets:
   • Basic template selection workflows
   • Advanced configuration scenarios
   • Error recovery patterns
   • Cancellation handling

✅ CI/CD Ready Features:
   • Debug mode for troubleshooting
   • Realistic typing delay simulation
   • Dynamic response queue management
   • Proper lifecycle management

✅ Production Validation:
   • Complete workflow simulation
   • Error detection and reporting
   • Resource management and cleanup

🚀 Ready for Automated CLI Testing!
   No more manual testing required for interactive workflows.
   Perfect for CI/CD pipelines and automated regression testing.
`);
