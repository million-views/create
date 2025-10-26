#!/usr/bin/env node

/**
 * Security validation tests for new IDE and options parameters
 * Tests path traversal prevention, input sanitization, and validation edge cases
 * Verifies no system environment variable exposure
 */

import { 
  validateIdeParameter,
  validateOptionsParameter,
  validateAllInputs,
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
    console.log('🧪 Running Security Tests\n');

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

// ===== IDE Parameter Security Tests =====

runner.test('IDE parameter: prevents path traversal attempts', () => {
  const pathTraversalAttempts = [
    '../kiro',
    '../../vscode',
    'kiro/../malicious',
    './kiro',
    '/kiro',
    '\\kiro',
    'kiro\\..\\malicious'
  ];

  for (const attempt of pathTraversalAttempts) {
    try {
      validateIdeParameter(attempt);
      throw new Error(`Should have rejected path traversal attempt: ${attempt}`);
    } catch (error) {
      if (!(error instanceof ValidationError)) {
        throw new Error(`Expected ValidationError for ${attempt}, got ${error.constructor.name}`);
      }
      if (!error.message.includes('Invalid IDE')) {
        throw new Error(`Expected IDE validation error for ${attempt}, got: ${error.message}`);
      }
    }
  }
});

runner.test('IDE parameter: prevents injection attacks', () => {
  const injectionAttempts = [
    'kiro; rm -rf /',
    'kiro && malicious',
    'kiro | evil',
    'kiro`malicious`',
    'kiro$(evil)',
    'kiro${evil}',
    'kiro\nmalicious',
    'kiro\rmalicious',
    'kiro\tmalicious'
  ];

  for (const attempt of injectionAttempts) {
    try {
      validateIdeParameter(attempt);
      throw new Error(`Should have rejected injection attempt: ${attempt}`);
    } catch (error) {
      if (!(error instanceof ValidationError)) {
        throw new Error(`Expected ValidationError for ${attempt}, got ${error.constructor.name}`);
      }
      if (!error.message.includes('Invalid IDE')) {
        throw new Error(`Expected IDE validation error for ${attempt}, got: ${error.message}`);
      }
    }
  }
});

runner.test('IDE parameter: prevents null byte injection', () => {
  const nullByteAttempts = [
    'kiro\0',
    '\0kiro',
    'ki\0ro',
    'kiro\0malicious'
  ];

  for (const attempt of nullByteAttempts) {
    try {
      validateIdeParameter(attempt);
      throw new Error(`Should have rejected null byte injection: ${JSON.stringify(attempt)}`);
    } catch (error) {
      if (!(error instanceof ValidationError)) {
        throw new Error(`Expected ValidationError for null byte injection, got ${error.constructor.name}`);
      }
      if (!error.message.includes('null bytes')) {
        throw new Error(`Expected null byte error, got: ${error.message}`);
      }
    }
  }
});

runner.test('IDE parameter: handles edge cases safely', () => {
  const edgeCases = [
    ' '.repeat(1000), // Very long whitespace
    'A'.repeat(1000), // Very long string
    '🚀', // Unicode characters
    'кіро', // Cyrillic characters
    'kiro-test', // Hyphens (should be invalid)
    'kiro_test', // Underscores (should be invalid)
    'kiro.test', // Dots (should be invalid)
  ];

  for (const edgeCase of edgeCases) {
    try {
      const result = validateIdeParameter(edgeCase);
      // Should either return null (for whitespace) or throw ValidationError
      if (result !== null) {
        throw new Error(`Expected null or ValidationError for edge case: ${JSON.stringify(edgeCase)}, got: ${result}`);
      }
    } catch (error) {
      if (!(error instanceof ValidationError)) {
        throw new Error(`Expected ValidationError for edge case ${JSON.stringify(edgeCase)}, got ${error.constructor.name}`);
      }
    }
  }
});

// ===== Options Parameter Security Tests =====

runner.test('Options parameter: prevents path traversal in option names', () => {
  const pathTraversalAttempts = [
    '../auth',
    '../../database',
    'auth/../malicious',
    './auth',
    '/auth',
    '\\auth',
    'auth\\..\\malicious',
    'auth,../malicious,database',
    'auth,../../etc/passwd,database'
  ];

  for (const attempt of pathTraversalAttempts) {
    try {
      validateOptionsParameter(attempt);
      throw new Error(`Should have rejected path traversal attempt: ${attempt}`);
    } catch (error) {
      if (!(error instanceof ValidationError)) {
        throw new Error(`Expected ValidationError for ${attempt}, got ${error.constructor.name}`);
      }
      if (!error.message.includes('Invalid option name')) {
        throw new Error(`Expected option validation error for ${attempt}, got: ${error.message}`);
      }
    }
  }
});

runner.test('Options parameter: prevents injection attacks in option names', () => {
  const injectionAttempts = [
    'auth; rm -rf /',
    'auth && malicious',
    'auth | evil',
    'auth`malicious`',
    'auth$(evil)',
    'auth${evil}',
    'auth\nmalicious',
    'auth\rmalicious',
    'auth\tmalicious',
    'auth,database; rm -rf /,testing',
    'auth,$(malicious),database'
  ];

  for (const attempt of injectionAttempts) {
    try {
      validateOptionsParameter(attempt);
      throw new Error(`Should have rejected injection attempt: ${attempt}`);
    } catch (error) {
      if (!(error instanceof ValidationError)) {
        throw new Error(`Expected ValidationError for ${attempt}, got ${error.constructor.name}`);
      }
      if (!error.message.includes('Invalid option name')) {
        throw new Error(`Expected option validation error for ${attempt}, got: ${error.message}`);
      }
    }
  }
});

runner.test('Options parameter: prevents null byte injection', () => {
  const nullByteAttempts = [
    'auth\0',
    '\0auth',
    'au\0th',
    'auth\0malicious',
    'auth,data\0base,testing',
    'auth,\0malicious,database'
  ];

  for (const attempt of nullByteAttempts) {
    try {
      validateOptionsParameter(attempt);
      throw new Error(`Should have rejected null byte injection: ${JSON.stringify(attempt)}`);
    } catch (error) {
      if (!(error instanceof ValidationError)) {
        throw new Error(`Expected ValidationError for null byte injection, got ${error.constructor.name}`);
      }
      if (!error.message.includes('null bytes')) {
        throw new Error(`Expected null byte error, got: ${error.message}`);
      }
    }
  }
});

runner.test('Options parameter: handles malicious option combinations', () => {
  const maliciousCombinations = [
    'auth,@malicious,database', // Special characters
    'auth,feature@evil.com,database', // Email-like injection
    'auth,http://evil.com,database', // URL injection
    'auth,<script>alert("xss")</script>,database', // XSS attempt
    'auth,../../etc/passwd,database', // Path traversal
    'auth,${HOME},database', // Environment variable expansion
    'auth,`whoami`,database', // Command substitution
    'auth,$(id),database' // Command substitution
  ];

  for (const combination of maliciousCombinations) {
    try {
      validateOptionsParameter(combination);
      throw new Error(`Should have rejected malicious combination: ${combination}`);
    } catch (error) {
      if (!(error instanceof ValidationError)) {
        throw new Error(`Expected ValidationError for ${combination}, got ${error.constructor.name}`);
      }
      if (!error.message.includes('Invalid option name')) {
        throw new Error(`Expected option validation error for ${combination}, got: ${error.message}`);
      }
    }
  }
});

runner.test('Options parameter: prevents resource exhaustion attacks', () => {
  // Test very long option names
  const longOption = 'a'.repeat(1000);
  try {
    validateOptionsParameter(longOption);
    throw new Error('Should have rejected overly long option name');
  } catch (error) {
    if (!(error instanceof ValidationError)) {
      throw new Error(`Expected ValidationError for long feature, got ${error.constructor.name}`);
    }
  }

  // Test many options - this should succeed but we'll just verify it doesn't crash
  const manyOptions = Array(100).fill('auth').join(',');
  try {
    const result = validateOptionsParameter(manyOptions);
    // Should succeed and return the options
    if (!Array.isArray(result)) {
      throw new Error(`Expected array result for many options, got ${typeof result}`);
    }
  } catch (error) {
    // ValidationError is acceptable for resource limits
    if (!(error instanceof ValidationError)) {
      throw new Error(`Expected ValidationError or success for many options, got ${error.constructor.name}`);
    }
  }
});

// ===== validateAllInputs Security Tests =====

runner.test('validateAllInputs: handles IDE and options parameters securely', () => {
  const testInputs = {
    projectDirectory: 'test-project',
    template: 'react',
    repo: 'user/repo',
    branch: 'main',
    ide: 'kiro',
    options: 'auth,database,testing'
  };

  const result = validateAllInputs(testInputs);
  
  if (result.ide !== 'kiro') {
    throw new Error(`Expected IDE 'kiro', got ${result.ide}`);
  }
  
  if (!Array.isArray(result.options) || result.options.length !== 3) {
    throw new Error(`Expected 3 options, got ${JSON.stringify(result.options)}`);
  }
  
  if (!result.options.includes('auth') || !result.options.includes('database') || !result.options.includes('testing')) {
    throw new Error(`Missing expected options in ${JSON.stringify(result.options)}`);
  }
});

runner.test('validateAllInputs: accumulates multiple validation errors', () => {
  const maliciousInputs = {
    projectDirectory: '../evil',
    template: '../../malicious',
    repo: 'javascript:alert("xss")',
    branch: 'main; rm -rf /',
    ide: 'evil-ide',
    options: 'auth,../malicious,database'
  };

  try {
    validateAllInputs(maliciousInputs);
    throw new Error('Should have rejected multiple malicious inputs');
  } catch (error) {
    if (!(error instanceof ValidationError)) {
      throw new Error(`Expected ValidationError, got ${error.constructor.name}`);
    }
    
    // Should contain multiple error messages
    const errorMessage = error.message;
    if (!errorMessage.includes('Input validation failed')) {
      throw new Error(`Expected validation failure message, got: ${errorMessage}`);
    }
    
    // Should mention multiple validation issues
    const errorCount = (errorMessage.match(/- /g) || []).length;
    if (errorCount < 3) {
      throw new Error(`Expected multiple validation errors, got ${errorCount}: ${errorMessage}`);
    }
  }
});

runner.test('validateAllInputs: handles undefined IDE and features safely', () => {
  const inputsWithUndefined = {
    projectDirectory: 'test-project',
    template: 'react'
    // ide and features are not included (undefined)
  };

  const result = validateAllInputs(inputsWithUndefined);
  
  // When ide is not provided, it should not be in the result
  if ('ide' in result) {
    throw new Error(`IDE should not be in result when not provided, got ${result.ide}`);
  }
  
  // When features is not provided, it should not be in the result
  if ('features' in result) {
    throw new Error(`Features should not be in result when not provided, got ${JSON.stringify(result.features)}`);
  }
});

// ===== Environment Variable Exposure Prevention Tests =====

runner.test('Parameters do not expose system environment variables', () => {
  // Test that validation functions don't accidentally expose env vars
  const envVarAttempts = [
    '$HOME',
    '${HOME}',
    '$PATH',
    '${PATH}',
    '$USER',
    '${USER}',
    '%USERPROFILE%', // Windows
    '%PATH%' // Windows
  ];

  for (const attempt of envVarAttempts) {
    // Test IDE parameter
    try {
      const ideResult = validateIdeParameter(attempt);
      if (ideResult !== null && ideResult.includes('/')) {
        throw new Error(`IDE parameter may have exposed environment variable: ${ideResult}`);
      }
    } catch (error) {
      if (!(error instanceof ValidationError)) {
        throw new Error(`Unexpected error type for IDE env var test: ${error.constructor.name}`);
      }
    }

    // Test options parameter
    try {
      const optionsResult = validateOptionsParameter(attempt);
      for (const option of optionsResult) {
        if (option.includes('/') || option.includes('\\')) {
          throw new Error(`Options parameter may have exposed environment variable: ${option}`);
        }
      }
    } catch (error) {
      if (!(error instanceof ValidationError)) {
        throw new Error(`Unexpected error type for options env var test: ${error.constructor.name}`);
      }
    }
  }
});

runner.test('Validation functions do not leak system information', () => {
  const systemPathAttempts = [
    '/etc/passwd',
    '/etc/shadow',
    'C:\\Windows\\System32',
    '/proc/version',
    '/sys/class/net'
  ];

  const systemInfoAttempts = [
    '127.0.0.1',
    '192.168.1.1'
  ];

  // Test system paths (should be rejected due to invalid characters)
  for (const attempt of systemPathAttempts) {
    // Test IDE parameter - should reject all system paths
    try {
      validateIdeParameter(attempt);
      throw new Error(`IDE parameter should have rejected system path attempt: ${attempt}`);
    } catch (error) {
      if (!(error instanceof ValidationError)) {
        throw new Error(`Expected ValidationError for IDE system path test, got ${error.constructor.name}: ${error.message}`);
      }
    }

    // Test options parameter - should reject all system paths
    try {
      validateOptionsParameter(attempt);
      throw new Error(`Options parameter should have rejected system path attempt: ${attempt}`);
    } catch (error) {
      if (!(error instanceof ValidationError)) {
        throw new Error(`Expected ValidationError for options system path test, got ${error.constructor.name}: ${error.message}`);
      }
    }
  }

  // Test system info (IP addresses should be rejected due to dots)
  for (const attempt of systemInfoAttempts) {
    // Test IDE parameter - should reject IP addresses
    try {
      validateIdeParameter(attempt);
      throw new Error(`IDE parameter should have rejected IP address: ${attempt}`);
    } catch (error) {
      if (!(error instanceof ValidationError)) {
        throw new Error(`Expected ValidationError for IDE IP test, got ${error.constructor.name}: ${error.message}`);
      }
    }

    // Test options parameter - should reject IP addresses
    try {
      validateOptionsParameter(attempt);
      throw new Error(`Options parameter should have rejected IP address: ${attempt}`);
    } catch (error) {
      if (!(error instanceof ValidationError)) {
        throw new Error(`Expected ValidationError for options IP test, got ${error.constructor.name}: ${error.message}`);
      }
    }
  }
});

// ===== Input Sanitization Edge Cases =====

runner.test('Input sanitization handles Unicode and encoding attacks', () => {
  const unicodeAttempts = [
    'kiro\u0000malicious', // Null byte as Unicode (won't be trimmed)
    'ki\u000Aro', // Line feed in middle
    'ki\u000Dro', // Carriage return in middle
    'ki\u0009ro', // Tab in middle
    'kiro\u001Bmalicious', // Escape character
    'auth\u002E\u002E\u002Fmalicious', // ../malicious encoded
    'auth\u0026\u0026rm', // &&rm encoded
  ];

  for (const attempt of unicodeAttempts) {
    // Test IDE parameter
    try {
      validateIdeParameter(attempt);
      throw new Error(`IDE parameter should have rejected Unicode attack: ${JSON.stringify(attempt)}`);
    } catch (error) {
      if (!(error instanceof ValidationError)) {
        throw new Error(`Expected ValidationError for IDE Unicode test, got ${error.constructor.name}: ${error.message}`);
      }
    }

    // Test options parameter
    try {
      validateOptionsParameter(attempt);
      throw new Error(`Options parameter should have rejected Unicode attack: ${JSON.stringify(attempt)}`);
    } catch (error) {
      if (!(error instanceof ValidationError)) {
        throw new Error(`Expected ValidationError for options Unicode test, got ${error.constructor.name}: ${error.message}`);
      }
    }
  }
});

// Run all tests
runner.run();