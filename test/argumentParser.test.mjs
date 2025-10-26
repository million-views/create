#!/usr/bin/env node

/**
 * Unit tests for argument parser enhancements
 * Tests new --ide and --features argument parsing and validation
 */

import { 
  parseArguments, 
  validateArguments, 
  generateHelpText,
  ArgumentError 
} from '../bin/argumentParser.mjs';

/**
 * Test utilities
 */
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('🧪 Running Argument Parser Unit Tests\n');

    for (const { name, fn } of this.tests) {
      try {
        console.log(`  ▶ ${name}`);
        await fn();
        console.log(`  ✅ ${name}`);
        this.passed++;
      } catch (error) {
        console.log(`  ❌ ${name}`);
        console.log(`     Error: ${error.message}`);
        this.failed++;
      }
    }

    console.log(`\n📊 Test Results:`);
    console.log(`   Passed: ${this.passed}`);
    console.log(`   Failed: ${this.failed}`);
    console.log(`   Total:  ${this.tests.length}`);

    if (this.failed > 0) {
      console.log('\n❌ Some tests failed');
      process.exit(1);
    } else {
      console.log('\n✅ All tests passed!');
      process.exit(0);
    }
  }
}

const runner = new TestRunner();

// ===== Argument Parsing Tests =====

runner.test('parseArguments: parses --ide argument', () => {
  const result = parseArguments(['test-project', '--template', 'basic', '--ide', 'kiro']);
  
  if (result.ide !== 'kiro') {
    throw new Error(`Expected ide 'kiro', got '${result.ide}'`);
  }
});

runner.test('parseArguments: parses -i short flag for IDE', () => {
  const result = parseArguments(['test-project', '--template', 'basic', '-i', 'vscode']);
  
  if (result.ide !== 'vscode') {
    throw new Error(`Expected ide 'vscode', got '${result.ide}'`);
  }
});

runner.test('parseArguments: parses --features argument', () => {
  const result = parseArguments(['test-project', '--template', 'basic', '--features', 'auth,testing']);
  
  if (result.features !== 'auth,testing') {
    throw new Error(`Expected features 'auth,testing', got '${result.features}'`);
  }
});

runner.test('parseArguments: parses -f short flag for features', () => {
  const result = parseArguments(['test-project', '--template', 'basic', '-f', 'database,api']);
  
  if (result.features !== 'database,api') {
    throw new Error(`Expected features 'database,api', got '${result.features}'`);
  }
});

runner.test('parseArguments: handles both new arguments together', () => {
  const result = parseArguments([
    'test-project', 
    '--template', 'basic', 
    '--ide', 'cursor', 
    '--features', 'auth,database,testing'
  ]);
  
  if (result.ide !== 'cursor') {
    throw new Error(`Expected ide 'cursor', got '${result.ide}'`);
  }
  
  if (result.features !== 'auth,database,testing') {
    throw new Error(`Expected features 'auth,database,testing', got '${result.features}'`);
  }
});

runner.test('parseArguments: handles missing IDE and features (undefined)', () => {
  const result = parseArguments(['test-project', '--template', 'basic']);
  
  if (result.ide !== undefined) {
    throw new Error(`Expected ide undefined, got '${result.ide}'`);
  }
  
  if (result.features !== undefined) {
    throw new Error(`Expected features undefined, got '${result.features}'`);
  }
});

runner.test('parseArguments: preserves existing argument parsing', () => {
  const result = parseArguments([
    'test-project', 
    '--template', 'react', 
    '--repo', 'user/repo', 
    '--branch', 'main'
  ]);
  
  if (result.projectDirectory !== 'test-project') {
    throw new Error(`Expected projectDirectory 'test-project', got '${result.projectDirectory}'`);
  }
  
  if (result.template !== 'react') {
    throw new Error(`Expected template 'react', got '${result.template}'`);
  }
  
  if (result.repo !== 'user/repo') {
    throw new Error(`Expected repo 'user/repo', got '${result.repo}'`);
  }
  
  if (result.branch !== 'main') {
    throw new Error(`Expected branch 'main', got '${result.branch}'`);
  }
});

runner.test('parseArguments: rejects unknown arguments', () => {
  try {
    parseArguments(['test-project', '--template', 'basic', '--unknown', 'value']);
    throw new Error('Should have rejected unknown argument');
  } catch (error) {
    if (!(error instanceof ArgumentError)) {
      throw new Error(`Expected ArgumentError, got ${error.constructor.name}`);
    }
    if (!error.message.includes('Unknown option')) {
      throw new Error(`Expected "Unknown option" in error message, got: ${error.message}`);
    }
  }
});

// ===== Argument Validation Tests =====

runner.test('validateArguments: validates valid IDE values', () => {
  const validIdes = ['kiro', 'vscode', 'cursor', 'windsurf'];
  
  for (const ide of validIdes) {
    const args = {
      projectDirectory: 'test-project',
      template: 'basic',
      ide: ide
    };
    
    const result = validateArguments(args);
    if (!result.isValid) {
      throw new Error(`Valid IDE '${ide}' was rejected: ${result.errors.join(', ')}`);
    }
  }
});

runner.test('validateArguments: rejects invalid IDE values', () => {
  const invalidIdes = ['invalid', 'sublime', 'atom', 'vim'];
  
  for (const ide of invalidIdes) {
    const args = {
      projectDirectory: 'test-project',
      template: 'basic',
      ide: ide
    };
    
    const result = validateArguments(args);
    if (result.isValid) {
      throw new Error(`Invalid IDE '${ide}' was accepted`);
    }
    
    const hasIdeError = result.errors.some(error => 
      error.includes('Invalid IDE') || error.includes('Supported IDEs')
    );
    if (!hasIdeError) {
      throw new Error(`Expected IDE validation error for '${ide}', got: ${result.errors.join(', ')}`);
    }
  }
});

runner.test('validateArguments: validates valid feature names', () => {
  const validFeatures = [
    'auth',
    'auth,database',
    'user-management,api_client,testing123',
    'feature-1,feature_2,feature3'
  ];
  
  for (const features of validFeatures) {
    const args = {
      projectDirectory: 'test-project',
      template: 'basic',
      features: features
    };
    
    const result = validateArguments(args);
    if (!result.isValid) {
      throw new Error(`Valid features '${features}' were rejected: ${result.errors.join(', ')}`);
    }
  }
});

runner.test('validateArguments: rejects invalid feature names', () => {
  const invalidFeatures = [
    'feature@invalid',
    'feature with spaces',
    'feature.with.dots',
    'feature/with/slashes',
    'feature:with:colons'
  ];
  
  for (const features of invalidFeatures) {
    const args = {
      projectDirectory: 'test-project',
      template: 'basic',
      features: features
    };
    
    const result = validateArguments(args);
    if (result.isValid) {
      throw new Error(`Invalid features '${features}' were accepted`);
    }
    
    const hasFeatureError = result.errors.some(error => 
      error.includes('Invalid feature name') || error.includes('alphanumeric')
    );
    if (!hasFeatureError) {
      throw new Error(`Expected feature validation error for '${features}', got: ${result.errors.join(', ')}`);
    }
  }
});

runner.test('validateArguments: handles case-insensitive IDE matching', () => {
  const testCases = [
    ['KIRO', true],
    ['VSCode', true],
    ['CURSOR', true],
    ['Windsurf', true],
    ['INVALID', false]
  ];
  
  for (const [ide, shouldBeValid] of testCases) {
    const args = {
      projectDirectory: 'test-project',
      template: 'basic',
      ide: ide
    };
    
    const result = validateArguments(args);
    if (result.isValid !== shouldBeValid) {
      throw new Error(`IDE '${ide}' validation result should be ${shouldBeValid}, got ${result.isValid}`);
    }
  }
});

runner.test('validateArguments: allows undefined IDE and features', () => {
  const args = {
    projectDirectory: 'test-project',
    template: 'basic'
    // ide and features are undefined
  };
  
  const result = validateArguments(args);
  if (!result.isValid) {
    throw new Error(`Should accept undefined IDE and features: ${result.errors.join(', ')}`);
  }
});

runner.test('validateArguments: preserves existing validation behavior', () => {
  // Test missing project directory
  const result1 = validateArguments({ template: 'basic' });
  if (result1.isValid) {
    throw new Error('Should reject missing project directory');
  }
  
  // Test missing template
  const result2 = validateArguments({ projectDirectory: 'test-project' });
  if (result2.isValid) {
    throw new Error('Should reject missing template');
  }
  
  // Test invalid project directory
  const result3 = validateArguments({ 
    projectDirectory: '../invalid', 
    template: 'basic' 
  });
  if (result3.isValid) {
    throw new Error('Should reject invalid project directory');
  }
});

runner.test('validateArguments: combines multiple validation errors', () => {
  const args = {
    projectDirectory: '../invalid',
    template: '../invalid-template',
    ide: 'invalid-ide',
    features: 'invalid@feature'
  };
  
  const result = validateArguments(args);
  if (result.isValid) {
    throw new Error('Should reject multiple invalid arguments');
  }
  
  if (result.errors.length < 3) {
    throw new Error(`Expected multiple validation errors, got: ${result.errors.join(', ')}`);
  }
});

// ===== Help Text Generation Tests =====

runner.test('generateHelpText: includes --ide argument', () => {
  const helpText = generateHelpText();
  
  if (!helpText.includes('--ide')) {
    throw new Error('Help text should include --ide argument');
  }
  
  if (!helpText.includes('-i,')) {
    throw new Error('Help text should include -i short flag');
  }
});

runner.test('generateHelpText: includes --features argument', () => {
  const helpText = generateHelpText();
  
  if (!helpText.includes('--features')) {
    throw new Error('Help text should include --features argument');
  }
  
  if (!helpText.includes('-f,')) {
    throw new Error('Help text should include -f short flag');
  }
});

runner.test('generateHelpText: documents supported IDE values', () => {
  const helpText = generateHelpText();
  
  const supportedIdes = ['kiro', 'vscode', 'cursor', 'windsurf'];
  for (const ide of supportedIdes) {
    if (!helpText.includes(ide)) {
      throw new Error(`Help text should mention supported IDE: ${ide}`);
    }
  }
});

runner.test('generateHelpText: includes usage examples with new arguments', () => {
  const helpText = generateHelpText();
  
  if (!helpText.includes('--ide')) {
    throw new Error('Help text should include usage examples with --ide');
  }
  
  if (!helpText.includes('--features')) {
    throw new Error('Help text should include usage examples with --features');
  }
});

runner.test('generateHelpText: preserves existing help content', () => {
  const helpText = generateHelpText();
  
  const requiredSections = ['USAGE:', 'ARGUMENTS:', 'OPTIONS:', 'EXAMPLES:'];
  for (const section of requiredSections) {
    if (!helpText.includes(section)) {
      throw new Error(`Help text should include ${section} section`);
    }
  }
  
  const existingOptions = ['--template', '--repo', '--branch', '--help'];
  for (const option of existingOptions) {
    if (!helpText.includes(option)) {
      throw new Error(`Help text should preserve existing option: ${option}`);
    }
  }
});

// Run all tests
runner.run();