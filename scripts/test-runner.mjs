#!/usr/bin/env node

/**
 * Unified Test Runner for @m5nv/create-scaffold CLI tool
 * Coordinates execution of all test suites with comprehensive reporting
 */

import { spawn } from 'child_process';
import { performance } from 'perf_hooks';

class TestRunner {
  constructor() {
    this.results = [];
    this.totalStartTime = performance.now();
  }

  async runTest(name, command, description) {
    console.log(`\n🧪 ${name}`);
    console.log(`   ${description}`);
    
    const startTime = performance.now();
    
    try {
      await this.execCommand('node', [command]);
      const duration = Math.round(performance.now() - startTime);
      console.log(`✅ ${name} - ${duration}ms`);
      this.results.push({ name, status: 'PASSED', duration });
      return true;
    } catch (error) {
      const duration = Math.round(performance.now() - startTime);
      console.log(`❌ ${name} - ${duration}ms`);
      console.log(`   Error: ${error.message}`);
      this.results.push({ name, status: 'FAILED', duration, error: error.message });
      return false;
    }
  }

  async execCommand(command, args) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: ['inherit', 'inherit', 'inherit']
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Process exited with code ${code}`));
        }
      });

      child.on('error', reject);
    });
  }

  printSummary() {
    const totalDuration = Math.round(performance.now() - this.totalStartTime);
    const passed = this.results.filter(r => r.status === 'PASSED').length;
    const failed = this.results.filter(r => r.status === 'FAILED').length;
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUITE SUMMARY');
    console.log('='.repeat(60));
    
    this.results.forEach(result => {
      const status = result.status === 'PASSED' ? '✅' : '❌';
      console.log(`${status} ${result.name.padEnd(30)} ${result.duration}ms`);
    });
    
    console.log('='.repeat(60));
    console.log(`📈 Results: ${passed} passed, ${failed} failed`);
    console.log(`⏱️  Total time: ${totalDuration}ms`);
    
    if (failed > 0) {
      console.log('\n❌ Some tests failed');
      process.exit(1);
    } else {
      console.log('\n✅ All test suites passed!');
      console.log('\n🎉 CLI tool is ready for production!');
      process.exit(0);
    }
  }

  async runAll() {
    console.log('🚀 Running Complete Test Suite for @m5nv/create-scaffold');
    console.log('='.repeat(60));

    const tests = [
      {
        name: 'Environment Factory Tests',
        command: './test/environmentFactory.test.mjs',
        description: 'Unit tests for Environment_Object factory and validation'
      },
      {
        name: 'Security Tests',
        command: './test/security.test.mjs',
        description: 'Security validation for new IDE and features parameters'
      },
      {
        name: 'Functional Tests',
        command: './test/cli.test.mjs',
        description: 'Comprehensive end-to-end CLI behavior validation'
      },
      {
        name: 'Spec Compliance Tests', 
        command: './test/spec-compliance-verification.mjs',
        description: 'Verification against all specification requirements'
      },
      {
        name: 'Resource Leak Tests',
        command: './test/resource-leak-test.mjs', 
        description: 'Resource management and cleanup validation'
      },
      {
        name: 'Smoke Tests',
        command: './scripts/smoke-test.mjs',
        description: 'Production readiness and integration validation'
      }
    ];

    for (const test of tests) {
      await this.runTest(test.name, test.command, test.description);
    }

    this.printSummary();
  }

  async runQuick() {
    console.log('⚡ Running Quick Test Suite for @m5nv/create-scaffold');
    console.log('='.repeat(60));

    const tests = [
      {
        name: 'Environment Factory Tests',
        command: './test/environmentFactory.test.mjs',
        description: 'Unit tests for Environment_Object factory and validation'
      },
      {
        name: 'Functional Tests',
        command: './test/cli.test.mjs',
        description: 'Core CLI functionality validation'
      },
      {
        name: 'Smoke Tests',
        command: './scripts/smoke-test.mjs',
        description: 'Basic integration validation'
      }
    ];

    for (const test of tests) {
      await this.runTest(test.name, test.command, test.description);
    }

    this.printSummary();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const runner = new TestRunner();

if (args.includes('--quick')) {
  await runner.runQuick();
} else {
  await runner.runAll();
}