#!/usr/bin/env node

/**
 * Unit tests for Environment_Object factory and validation functions
 * Tests all validation functions and environment object creation
 */

import { 
  createEnvironmentObject
} from '../bin/environmentFactory.mjs';
import { 
  validateIdeParameter, 
  validateFeaturesParameter,
  ValidationError 
} from '../bin/security.mjs';

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
    console.log('🧪 Running Environment Factory Unit Tests\n');

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

// ===== IDE Parameter Validation Tests =====

runner.test('validateIdeParameter: accepts valid IDE values', () => {
  const validIdes = ['kiro', 'vscode', 'cursor', 'windsurf'];
  
  for (const ide of validIdes) {
    const result = validateIdeParameter(ide);
    if (result !== ide.toLowerCase()) {
      throw new Error(`Expected ${ide.toLowerCase()}, got ${result}`);
    }
  }
});

runner.test('validateIdeParameter: handles case-insensitive matching', () => {
  const testCases = [
    ['KIRO', 'kiro'],
    ['VSCode', 'vscode'],
    ['CURSOR', 'cursor'],
    ['Windsurf', 'windsurf']
  ];
  
  for (const [input, expected] of testCases) {
    const result = validateIdeParameter(input);
    if (result !== expected) {
      throw new Error(`Expected ${expected}, got ${result}`);
    }
  }
});

runner.test('validateIdeParameter: returns null for undefined/null', () => {
  if (validateIdeParameter(undefined) !== null) {
    throw new Error('Should return null for undefined');
  }
  
  if (validateIdeParameter(null) !== null) {
    throw new Error('Should return null for null');
  }
});

runner.test('validateIdeParameter: returns null for empty string', () => {
  if (validateIdeParameter('') !== null) {
    throw new Error('Should return null for empty string');
  }
  
  if (validateIdeParameter('   ') !== null) {
    throw new Error('Should return null for whitespace-only string');
  }
});

runner.test('validateIdeParameter: rejects invalid IDE values', () => {
  const invalidIdes = ['invalid', 'sublime', 'atom', 'vim'];
  
  for (const ide of invalidIdes) {
    try {
      validateIdeParameter(ide);
      throw new Error(`Should have rejected invalid IDE: ${ide}`);
    } catch (error) {
      if (!(error instanceof ValidationError)) {
        throw new Error(`Expected ValidationError, got ${error.constructor.name}`);
      }
      if (!error.message.includes('Invalid IDE')) {
        throw new Error(`Expected "Invalid IDE" in error message, got: ${error.message}`);
      }
    }
  }
});

runner.test('validateIdeParameter: rejects non-string types', () => {
  const invalidTypes = [123, {}, [], true, Symbol('test')];
  
  for (const invalid of invalidTypes) {
    try {
      validateIdeParameter(invalid);
      throw new Error(`Should have rejected non-string type: ${typeof invalid}`);
    } catch (error) {
      if (!(error instanceof ValidationError)) {
        throw new Error(`Expected ValidationError, got ${error.constructor.name}`);
      }
    }
  }
});

runner.test('validateIdeParameter: rejects null bytes', () => {
  try {
    validateIdeParameter('kiro\0malicious');
    throw new Error('Should have rejected null bytes');
  } catch (error) {
    if (!(error instanceof ValidationError)) {
      throw new Error(`Expected ValidationError, got ${error.constructor.name}`);
    }
    if (!error.message.includes('null bytes')) {
      throw new Error(`Expected "null bytes" in error message, got: ${error.message}`);
    }
  }
});

// ===== Features Parameter Validation Tests =====

runner.test('validateFeaturesParameter: parses comma-separated features', () => {
  const result = validateFeaturesParameter('auth,database,testing');
  const expected = ['auth', 'database', 'testing'];
  
  if (JSON.stringify(result) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(result)}`);
  }
});

runner.test('validateFeaturesParameter: trims whitespace from features', () => {
  const result = validateFeaturesParameter(' auth , database , testing ');
  const expected = ['auth', 'database', 'testing'];
  
  if (JSON.stringify(result) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(result)}`);
  }
});

runner.test('validateFeaturesParameter: returns empty array for undefined/null/empty', () => {
  const testCases = [undefined, null, '', '   '];
  
  for (const testCase of testCases) {
    const result = validateFeaturesParameter(testCase);
    if (!Array.isArray(result) || result.length !== 0) {
      throw new Error(`Expected empty array for ${testCase}, got ${JSON.stringify(result)}`);
    }
  }
});

runner.test('validateFeaturesParameter: validates feature name format', () => {
  const validFeatures = [
    'auth',
    'user-management',
    'api_client',
    'feature123',
    'test-feature_v2'
  ];
  
  for (const feature of validFeatures) {
    const result = validateFeaturesParameter(feature);
    if (!result.includes(feature)) {
      throw new Error(`Valid feature ${feature} was rejected`);
    }
  }
});

runner.test('validateFeaturesParameter: rejects invalid feature names', () => {
  const invalidFeatures = [
    'feature@invalid',
    'feature with spaces',
    'feature.with.dots',
    'feature/with/slashes',
    'feature\\with\\backslashes',
    'feature:with:colons'
  ];
  
  for (const feature of invalidFeatures) {
    try {
      validateFeaturesParameter(feature);
      throw new Error(`Should have rejected invalid feature: ${feature}`);
    } catch (error) {
      if (!(error instanceof ValidationError)) {
        throw new Error(`Expected ValidationError, got ${error.constructor.name}`);
      }
      if (!error.message.includes('Invalid feature name')) {
        throw new Error(`Expected "Invalid feature name" in error message, got: ${error.message}`);
      }
    }
  }
});

runner.test('validateFeaturesParameter: rejects overly long feature names', () => {
  const longFeature = 'a'.repeat(51); // Exceeds 50 character limit
  
  try {
    validateFeaturesParameter(longFeature);
    throw new Error('Should have rejected overly long feature name');
  } catch (error) {
    if (!(error instanceof ValidationError)) {
      throw new Error(`Expected ValidationError, got ${error.constructor.name}`);
    }
    if (!error.message.includes('too long')) {
      throw new Error(`Expected "too long" in error message, got: ${error.message}`);
    }
  }
});

runner.test('validateFeaturesParameter: filters out empty features', () => {
  const result = validateFeaturesParameter('auth,,database,,,testing,');
  const expected = ['auth', 'database', 'testing'];
  
  if (JSON.stringify(result) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(result)}`);
  }
});

runner.test('validateFeaturesParameter: rejects non-string types', () => {
  const invalidTypes = [123, {}, [], true, Symbol('test')];
  
  for (const invalid of invalidTypes) {
    try {
      validateFeaturesParameter(invalid);
      throw new Error(`Should have rejected non-string type: ${typeof invalid}`);
    } catch (error) {
      if (!(error instanceof ValidationError)) {
        throw new Error(`Expected ValidationError, got ${error.constructor.name}`);
      }
    }
  }
});

runner.test('validateFeaturesParameter: rejects null bytes', () => {
  try {
    validateFeaturesParameter('auth\0malicious');
    throw new Error('Should have rejected null bytes');
  } catch (error) {
    if (!(error instanceof ValidationError)) {
      throw new Error(`Expected ValidationError, got ${error.constructor.name}`);
    }
    if (!error.message.includes('null bytes')) {
      throw new Error(`Expected "null bytes" in error message, got: ${error.message}`);
    }
  }
});

// ===== Environment Object Creation Tests =====

runner.test('createEnvironmentObject: creates valid environment object', () => {
  const params = {
    projectDirectory: 'test-project',
    projectName: 'test-project',
    cwd: process.cwd(),
    ide: 'kiro',
    features: 'auth,testing'
  };
  
  const env = createEnvironmentObject(params);
  
  if (typeof env.projectDir !== 'string' || !env.projectDir.includes('test-project')) {
    throw new Error('projectDir should be a resolved path containing project name');
  }
  
  if (env.projectName !== 'test-project') {
    throw new Error(`Expected projectName 'test-project', got '${env.projectName}'`);
  }
  
  if (typeof env.cwd !== 'string' || env.cwd.length === 0) {
    throw new Error('cwd should be a non-empty string');
  }
  
  if (env.ide !== 'kiro') {
    throw new Error(`Expected ide 'kiro', got '${env.ide}'`);
  }
  
  if (!Array.isArray(env.features) || env.features.length !== 2) {
    throw new Error(`Expected features array with 2 items, got ${JSON.stringify(env.features)}`);
  }
});

runner.test('createEnvironmentObject: handles null/undefined IDE and features', () => {
  const params = {
    projectDirectory: 'test-project',
    projectName: 'test-project',
    cwd: process.cwd(),
    ide: null,
    features: undefined
  };
  
  const env = createEnvironmentObject(params);
  
  if (env.ide !== null) {
    throw new Error(`Expected ide null, got '${env.ide}'`);
  }
  
  if (!Array.isArray(env.features) || env.features.length !== 0) {
    throw new Error(`Expected empty features array, got ${JSON.stringify(env.features)}`);
  }
});

runner.test('createEnvironmentObject: creates immutable object', () => {
  const params = {
    projectDirectory: 'test-project',
    projectName: 'test-project',
    cwd: process.cwd(),
    ide: 'kiro',
    features: 'auth'
  };
  
  const env = createEnvironmentObject(params);
  
  if (!Object.isFrozen(env)) {
    throw new Error('Environment object should be frozen');
  }
  
  // Try to modify properties
  try {
    env.projectName = 'modified';
    if (env.projectName === 'modified') {
      throw new Error('Environment object should be immutable');
    }
  } catch {
    // Expected in strict mode
  }
  
  try {
    env.newProperty = 'test';
    if (env.newProperty === 'test') {
      throw new Error('Should not be able to add new properties');
    }
  } catch {
    // Expected in strict mode
  }
});

runner.test('createEnvironmentObject: validates all input parameters', () => {
  // Test invalid project directory
  try {
    createEnvironmentObject({
      projectDirectory: '../invalid',
      projectName: 'test',
      cwd: process.cwd(),
      ide: 'kiro',
      features: 'auth'
    });
    throw new Error('Should have rejected invalid project directory');
  } catch (error) {
    if (!(error instanceof ValidationError)) {
      throw new Error(`Expected ValidationError, got ${error.constructor.name}`);
    }
  }
  
  // Test invalid project name
  try {
    createEnvironmentObject({
      projectDirectory: 'test-project',
      projectName: 'invalid/name',
      cwd: process.cwd(),
      ide: 'kiro',
      features: 'auth'
    });
    throw new Error('Should have rejected invalid project name');
  } catch (error) {
    if (!(error instanceof ValidationError)) {
      throw new Error(`Expected ValidationError, got ${error.constructor.name}`);
    }
  }
  
  // Test invalid IDE
  try {
    createEnvironmentObject({
      projectDirectory: 'test-project',
      projectName: 'test-project',
      cwd: process.cwd(),
      ide: 'invalid-ide',
      features: 'auth'
    });
    throw new Error('Should have rejected invalid IDE');
  } catch (error) {
    if (!(error instanceof ValidationError)) {
      throw new Error(`Expected ValidationError, got ${error.constructor.name}`);
    }
  }
  
  // Test invalid features
  try {
    createEnvironmentObject({
      projectDirectory: 'test-project',
      projectName: 'test-project',
      cwd: process.cwd(),
      ide: 'kiro',
      features: 'invalid@feature'
    });
    throw new Error('Should have rejected invalid features');
  } catch (error) {
    if (!(error instanceof ValidationError)) {
      throw new Error(`Expected ValidationError, got ${error.constructor.name}`);
    }
  }
});

runner.test('createEnvironmentObject: resolves paths correctly', () => {
  const params = {
    projectDirectory: 'test-project',
    projectName: 'test-project',
    cwd: process.cwd(),
    ide: 'kiro',
    features: 'auth'
  };
  
  const env = createEnvironmentObject(params);
  
  // projectDir should be absolute
  if (!env.projectDir.startsWith('/')) {
    throw new Error('projectDir should be an absolute path');
  }
  
  // cwd should be absolute
  if (!env.cwd.startsWith('/')) {
    throw new Error('cwd should be an absolute path');
  }
  
  // Should match the current working directory
  if (env.cwd !== process.cwd()) {
    throw new Error(`Expected cwd to match process.cwd(), got ${env.cwd}`);
  }
});

// Run all tests
runner.run();