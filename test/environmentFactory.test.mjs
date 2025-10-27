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
  validateOptionsParameter,
  validateSupportedOptionsMetadata,
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

// ===== Options Parameter Validation Tests =====

runner.test('validateOptionsParameter: parses comma-separated options', () => {
  const result = validateOptionsParameter('auth,database,testing');
  const expected = ['auth', 'database', 'testing'];
  
  if (JSON.stringify(result) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(result)}`);
  }
});

runner.test('validateOptionsParameter: trims whitespace from options', () => {
  const result = validateOptionsParameter(' auth , database , testing ');
  const expected = ['auth', 'database', 'testing'];
  
  if (JSON.stringify(result) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(result)}`);
  }
});

runner.test('validateOptionsParameter: returns empty array for undefined/null/empty', () => {
  const testCases = [undefined, null, '', '   '];
  
  for (const testCase of testCases) {
    const result = validateOptionsParameter(testCase);
    if (!Array.isArray(result) || result.length !== 0) {
      throw new Error(`Expected empty array for ${testCase}, got ${JSON.stringify(result)}`);
    }
  }
});

runner.test('validateOptionsParameter: validates option name format', () => {
  const validOptions = [
    'auth',
    'user-management',
    'api_client',
    'option123',
    'test-option_v2'
  ];
  
  for (const option of validOptions) {
    const result = validateOptionsParameter(option);
    if (!result.includes(option)) {
      throw new Error(`Valid option ${option} was rejected`);
    }
  }
});

runner.test('validateOptionsParameter: rejects invalid option names', () => {
  const invalidOptions = [
    'option@invalid',
    'option with spaces',
    'option.with.dots',
    'option/with/slashes',
    'option\\with\\backslashes',
    'option:with:colons'
  ];
  
  for (const option of invalidOptions) {
    try {
      validateOptionsParameter(option);
      throw new Error(`Should have rejected invalid option: ${option}`);
    } catch (error) {
      if (!(error instanceof ValidationError)) {
        throw new Error(`Expected ValidationError, got ${error.constructor.name}`);
      }
      if (!error.message.includes('Invalid option name')) {
        throw new Error(`Expected "Invalid option name" in error message, got: ${error.message}`);
      }
    }
  }
});

runner.test('validateOptionsParameter: rejects overly long option names', () => {
  const longOption = 'a'.repeat(51); // Exceeds 50 character limit
  
  try {
    validateOptionsParameter(longOption);
    throw new Error('Should have rejected overly long option name');
  } catch (error) {
    if (!(error instanceof ValidationError)) {
      throw new Error(`Expected ValidationError, got ${error.constructor.name}`);
    }
    if (!error.message.includes('too long')) {
      throw new Error(`Expected "too long" in error message, got: ${error.message}`);
    }
  }
});

runner.test('validateOptionsParameter: filters out empty options', () => {
  const result = validateOptionsParameter('auth,,database,,,testing,');
  const expected = ['auth', 'database', 'testing'];
  
  if (JSON.stringify(result) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(result)}`);
  }
});

runner.test('validateOptionsParameter: rejects non-string types', () => {
  const invalidTypes = [123, {}, [], true, Symbol('test')];
  
  for (const invalid of invalidTypes) {
    try {
      validateOptionsParameter(invalid);
      throw new Error(`Should have rejected non-string type: ${typeof invalid}`);
    } catch (error) {
      if (!(error instanceof ValidationError)) {
        throw new Error(`Expected ValidationError, got ${error.constructor.name}`);
      }
    }
  }
});

runner.test('validateOptionsParameter: rejects null bytes', () => {
  try {
    validateOptionsParameter('auth\0malicious');
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

// ===== Supported Options Metadata Tests =====

runner.test('validateSupportedOptionsMetadata: accepts valid option arrays', () => {
  const result = validateSupportedOptionsMetadata(['auth', 'testing']);
  if (JSON.stringify(result) !== JSON.stringify(['auth', 'testing'])) {
    throw new Error('Supported options metadata should return normalized array');
  }
});

runner.test('validateSupportedOptionsMetadata: deduplicates entries', () => {
  const result = validateSupportedOptionsMetadata(['auth', 'auth', 'testing']);
  if (JSON.stringify(result) !== JSON.stringify(['auth', 'testing'])) {
    throw new Error('Supported options metadata should deduplicate values');
  }
});

runner.test('validateSupportedOptionsMetadata: rejects invalid values', () => {
  const invalid = [123, 'bad option!', ''];
  for (const value of invalid) {
    try {
      validateSupportedOptionsMetadata([value]);
      throw new Error('Should have rejected invalid metadata value');
    } catch (error) {
      if (!(error instanceof ValidationError)) {
        throw new Error(`Expected ValidationError, got ${error.constructor.name}`);
      }
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
    options: 'auth,testing'
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
  
  if (!Array.isArray(env.options) || env.options.length !== 2) {
    throw new Error(`Expected options array with 2 items, got ${JSON.stringify(env.options)}`);
  }
});

runner.test('createEnvironmentObject: handles null/undefined IDE and options', () => {
  const params = {
    projectDirectory: 'test-project',
    projectName: 'test-project',
    cwd: process.cwd(),
    ide: null,
    options: undefined
  };
  
  const env = createEnvironmentObject(params);
  
  if (env.ide !== null) {
    throw new Error(`Expected ide null, got '${env.ide}'`);
  }
  
  if (!Array.isArray(env.options) || env.options.length !== 0) {
    throw new Error(`Expected empty options array, got ${JSON.stringify(env.options)}`);
  }
});

runner.test('createEnvironmentObject: creates immutable object', () => {
  const params = {
    projectDirectory: 'test-project',
    projectName: 'test-project',
    cwd: process.cwd(),
    ide: 'kiro',
    options: 'auth'
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
      options: 'auth'
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
      options: 'auth'
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
      options: 'auth'
    });
    throw new Error('Should have rejected invalid IDE');
  } catch (error) {
    if (!(error instanceof ValidationError)) {
      throw new Error(`Expected ValidationError, got ${error.constructor.name}`);
    }
  }
  
  // Test invalid options
  try {
    createEnvironmentObject({
      projectDirectory: 'test-project',
      projectName: 'test-project',
      cwd: process.cwd(),
      ide: 'kiro',
      options: 'invalid@option'
    });
    throw new Error('Should have rejected invalid options');
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
    options: 'auth'
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
