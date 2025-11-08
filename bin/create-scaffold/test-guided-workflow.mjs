#!/usr/bin/env node

import { GuidedSetupWorkflow } from './guided-setup-workflow.mjs';

// Mock implementations for testing
const mockCacheManager = {
  get: async () => null,
  set: async () => {},
  clear: async () => {}
};

const mockLogger = {
  logOperation: async () => {},
  logError: async () => {}
};

const mockPromptAdapter = {
  write: (text) => process.stdout.write(text),
  question: async (question) => {
    console.log(question);
    return 'test-response';
  }
};

// Test the guided workflow with mock data
async function testGuidedWorkflow() {
  console.log('🧪 Testing GuidedSetupWorkflow...\n');

  try {
    const workflow = new GuidedSetupWorkflow({
      cacheManager: mockCacheManager,
      logger: mockLogger,
      promptAdapter: mockPromptAdapter,
      projectDirectory: '/tmp/test-project',
      templatePath: '/tmp/test-template',
      templateName: 'test-template',
      repoUrl: 'https://github.com/test/repo',
      branchName: 'main',
      options: { features: ['test'] },
      ide: 'vscode',
      placeholders: { name: 'Test Project' },
      metadata: {
        handoffSteps: ['Run npm install', 'Run npm start']
      }
    });

    // Test workflow state management
    console.log('Testing workflow state management...');
    await workflow._GuidedSetupWorkflow_displayWorkflowHeader();

    console.log('Testing step display...');
    await workflow._GuidedSetupWorkflow_displayStepHeader('initialization', 1);

    console.log('Testing step status...');
    await workflow._GuidedSetupWorkflow_displayStepStatus('initialization', 'completed');

    console.log('✅ GuidedSetupWorkflow basic functionality test passed!\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testGuidedWorkflow().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});