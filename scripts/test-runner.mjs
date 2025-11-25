#!/usr/bin/env node

/**
 * Unified Test Runner for @m5nv/create-scaffold CLI tool
 * Coordinates execution of all test suites with comprehensive reporting
 */

import { spawn } from 'child_process';
import { performance } from 'perf_hooks';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';

class TestRunner {
  constructor() {
    this.results = [];
    this.totalStartTime = performance.now();
    this.homeBaseDir = path.join(os.tmpdir(), 'create-scaffold-test-homes');

    // Define test suite groups organized by test pyramid levels
    this.suiteGroups = {
      // Unit tests: Core components and infrastructure (L2/L3)
      'unit': [
        'Security Tests',
        'BoundaryValidator Tests',
        'Registry Cache Manager Tests',
        'Environment Module Tests',
        'Environment Tools Tests',
        'Error Classes Tests',
        'Template Ignore Tests',
        'Error Handler Tests',
        'Placeholder Resolver Tests',
        'Selection Validator Tests',
        'Path Resolver Tests',
        'Template Validator Tests',
        'Options Processor Tests',
        'Config Loader Tests',
        'CacheManager Git Tests',
        'TemplateResolver Git Tests',
        'Base Command Tests',
        'Router Tests',
        'Template Schema Build Tests',
        'Templatize JSX Tests',
        'Templatize JSON Tests',
        'Templatize Markdown Tests',
        'Templatize HTML Tests'
      ],
      // Integration tests: Command-level functionality (L3/L4)
      'integration': [
        'Create-Scaffold New Tests',
        'Dry Run CLI Tests',
        'Create-Scaffold List Tests',
        'Create-Scaffold Validate Tests',
        'Make-Template Init Tests',
        'Make-Template Hints Tests',
        'Make-Template Convert Tests',
        'Make-Template Restore Tests',
        'Make-Template Test Command Tests',
        'Make-Template Validate Tests',
        'Make-Template Config Validate Tests'
      ],
      // System tests: Full end-to-end workflows (L4)
      'system': [
        'Functional Tests',
        'Resource Leak Tests',
        'E2E Hermetic Isolation Tests',
        'E2E Tutorial Workflows Tests',
        'E2E Guided Workflow Tests'
      ],
      // Tool-specific groupings for targeted testing
      'create-scaffold': [
        'Create-Scaffold New Tests',
        'Dry Run CLI Tests',
        'Create-Scaffold List Tests',
        'Create-Scaffold Validate Tests',
        'Functional Tests'
      ],
      'make-template': [
        'Make-Template Init Tests',
        'Make-Template Hints Tests',
        'Make-Template Convert Tests',
        'Make-Template Restore Tests',
        'Make-Template Test Command Tests',
        'Make-Template Validate Tests',
        'Make-Template Config Validate Tests'
      ]
    };
  }

  async runTest(test) {
    const { name, command, description, homeSuffix } = test;

    console.log(`\n🧪 ${name}`);
    console.log(`   ${description}`);

    const startTime = performance.now();
    const homeDir = path.join(
      this.homeBaseDir,
      (homeSuffix || name).toLowerCase().replace(/[^a-z0-9]+/g, '-')
    );

    await fs.rm(homeDir, { recursive: true, force: true });
    await fs.mkdir(homeDir, { recursive: true });

    try {
      const args = Array.isArray(command) ? command : [command];
      await this.execCommand('node', args, homeDir);
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
    } finally {
      await fs.rm(homeDir, { recursive: true, force: true }).catch(() => { });
    }
  }

  async execCommand(command, args, homeDir) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: ['inherit', 'inherit', 'inherit'],
        env: {
          ...process.env,
          HOME: homeDir
        }
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
    await fs.rm(this.homeBaseDir, { recursive: true, force: true });
    await fs.mkdir(this.homeBaseDir, { recursive: true });

    const tests = this.getAllTestDefinitions();

    for (const test of tests) {
      const passed = await this.runTest(test);
      if (!passed) {
        break;
      }
    }

    this.printSummary();
  }

  async runSuite(suiteName) {
    console.log(`🎯 Running Test Suite: ${suiteName}`);
    console.log('='.repeat(60));

    const allTests = this.getAllTestDefinitions();

    // Check if this is a suite group
    if (this.suiteGroups[suiteName]) {
      console.log(`📦 Running suite group "${suiteName}" with ${this.suiteGroups[suiteName].length} test suites`);
      console.log('');

      const groupSuites = this.suiteGroups[suiteName];
      let allPassed = true;

      for (const suiteName of groupSuites) {
        const matchingTest = allTests.find(test => test.name === suiteName);
        if (!matchingTest) {
          console.error(`❌ Error: Test suite "${suiteName}" not found in group "${suiteName}"`);
          allPassed = false;
          continue;
        }

        const passed = await this.runTest(matchingTest);
        if (!passed) {
          allPassed = false;
        }
      }

      this.printSummary();
      return allPassed;
    }

    // Handle individual test suite
    const matchingTest = allTests.find(test => test.name === suiteName);

    if (!matchingTest) {
      console.error(`❌ Error: Test suite "${suiteName}" not found`);
      console.log('Available suites:');
      this.getAvailableSuites().forEach(suite => {
        console.log(`  - "${suite.name}"`);
      });
      console.log('\nAvailable suite groups:');
      Object.keys(this.suiteGroups).forEach(group => {
        console.log(`  - "${group}" (${this.suiteGroups[group].length} suites)`);
      });
      process.exit(1);
    }

    await fs.rm(this.homeBaseDir, { recursive: true, force: true });
    await fs.mkdir(this.homeBaseDir, { recursive: true });

    const passed = await this.runTest(matchingTest);
    this.printSummary();
    return passed;
  }

  getAvailableSuites() {
    return this.getAllTestDefinitions().map(test => ({
      name: test.name,
      description: test.description
    }));
  }

  getAllTestDefinitions() {
    return [
      {
        name: 'Security Tests',
        command: ['--test', './tests/shared/security.test.mjs'],
        description: 'Security validation for new IDE and features parameters',
        homeSuffix: 'security'
      },
      {
        name: 'BoundaryValidator Tests',
        command: ['--test', './tests/shared/boundary-validator.test.mjs'],
        description: 'Path boundary enforcement and traversal prevention',
        homeSuffix: 'boundary-validator'
      },
      {
        name: 'Registry Cache Manager Tests',
        command: ['--test', './tests/shared/registry-cache-manager.test.mjs'],
        description: 'Template registry metadata caching with LRU eviction',
        homeSuffix: 'registry-cache'
      },
      {
        name: 'Environment Module Tests',
        command: ['--test', './tests/environment/environment.test.mjs'],
        description: 'Environment object factory and test utilities',
        homeSuffix: 'environment'
      },
      {
        name: 'Environment Tools Tests',
        command: ['--test', './tests/environment/tools.test.mjs'],
        description: 'L2 tools API (files, json, text, templates, placeholders, inputs, options)',
        homeSuffix: 'environment-tools'
      },
      {
        name: 'Error Classes Tests',
        command: ['--test', './tests/shared/error-classes.test.mjs'],
        description: 'Custom error class instantiation and properties',
        homeSuffix: 'error-classes'
      },
      {
        name: 'Template Ignore Tests',
        command: ['--test', './tests/shared/template-ignore.test.mjs'],
        description: 'Template artifact filtering and tree output sanitization',
        homeSuffix: 'template-ignore'
      },
      {
        name: 'Error Handler Tests',
        command: ['--test', './tests/shared/error-handler.test.mjs'],
        description: 'Error formatting and contextual error handling',
        homeSuffix: 'error-handler'
      },
      {
        name: 'Placeholder Resolver Tests',
        command: ['--test', './tests/shared/placeholder-resolver.test.mjs'],
        description: 'Placeholder resolution and merging logic',
        homeSuffix: 'placeholder-resolver'
      },
      {
        name: 'Selection Validator Tests',
        command: ['--test', './tests/shared/selection-validator.test.mjs'],
        description: 'Template selection validation logic',
        homeSuffix: 'selection-validator'
      },
      {
        name: 'Path Resolver Tests',
        command: ['--test', './tests/shared/path-resolver.test.mjs'],
        description: 'Path resolution and M5NV_HOME handling',
        homeSuffix: 'path-resolver'
      },
      {
        name: 'Functional Tests',
        command: ['--test', './tests/create-scaffold/cli-validation.test.mjs', './tests/create-scaffold/cli-execution.test.mjs', './tests/create-scaffold/cli-error-handling.test.mjs', './tests/create-scaffold/cli-integration.test.mjs'],
        description: 'Comprehensive end-to-end CLI behavior validation',
        homeSuffix: 'functional'
      },
      {
        name: 'Template Schema Build Tests',
        command: ['--test', './tests/shared/schema-build.test.mjs'],
        description: 'Deterministic generation of schema types and runtime stubs',
        homeSuffix: 'schema-build'
      },
      {
        name: 'Template Validator Tests',
        command: ['--test', './tests/shared/template-validator.test.mjs'],
        description: 'Runtime manifest validation aligned with schema constraints',
        homeSuffix: 'template-validator'
      },
      {
        name: 'Options Processor Tests',
        command: ['--test', './tests/shared/options-processor.test.mjs'],
        description: 'Template dimension option normalization used by create-scaffold commands',
        homeSuffix: 'options-processor'
      },
      {
        name: 'Config Loader Tests',
        command: ['--test', './tests/shared/config-loader.test.mjs', './tests/shared/config-loader-templates.test.mjs', './tests/shared/config-discovery.test.mjs'],
        description: '.m5nvrc discovery and normalization for create-scaffold defaults',
        homeSuffix: 'config-loader'
      },
      {
        name: 'CacheManager Git Tests',
        command: ['--test', './tests/shared/cache-manager.git.test.mjs'],
        description: 'Git-backed cache population, TTL, and cleanup validation',
        homeSuffix: 'cache-manager-git'
      },
      {
        name: 'TemplateResolver Git Tests',
        command: ['--test', './tests/shared/template-resolver.git.test.mjs'],
        description: 'Git-backed template resolution and alias refresh validation',
        homeSuffix: 'template-resolver-git'
      },
      {
        name: 'Base Command Tests',
        command: ['--test', './tests/cli/command.test.js'],
        description: 'Command template method pattern tests',
        homeSuffix: 'base-command'
      },
      {
        name: 'Router Tests',
        command: ['--test', './tests/cli/router.test.js'],
        description: 'Command dispatch router tests',
        homeSuffix: 'router'
      },
      {
        name: 'Resource Leak Tests',
        command: ['--test', './tests/create-scaffold/resource-leak-test.mjs'],
        description: 'Resource management and cleanup validation',
        homeSuffix: 'resource'
      },
      {
        name: 'Create-Scaffold New Tests',
        command: ['--test', './tests/create-scaffold/commands/new.test.js'],
        description: 'Create-scaffold new command unit tests',
        homeSuffix: 'create-scaffold-new'
      },
      {
        name: 'Dry Run CLI Tests',
        command: ['--test', './tests/create-scaffold/dry-run-cli.test.mjs'],
        description: 'End-to-end dry-run previews for local and cached templates',
        homeSuffix: 'dry-run-cli'
      },
      {
        name: 'Create-Scaffold List Tests',
        command: ['--test', './tests/create-scaffold/commands/list.test.js'],
        description: 'Create-scaffold list command unit tests',
        homeSuffix: 'create-scaffold-list'
      },
      {
        name: 'Create-Scaffold Validate Tests',
        command: ['--test', './tests/create-scaffold/commands/validate.test.js'],
        description: 'Create-scaffold validate command unit tests',
        homeSuffix: 'create-scaffold-validate'
      },
      {
        name: 'Make-Template Init Tests',
        command: ['--test', './tests/make-template/init.test.mjs'],
        description: 'Template initialization and skeleton generation',
        homeSuffix: 'make-template-init'
      },
      {
        name: 'Make-Template Hints Tests',
        command: ['--test', './tests/make-template/hints.test.mjs'],
        description: 'Template authoring guidance and hints display',
        homeSuffix: 'make-template-hints'
      },
      {
        name: 'Make-Template Convert Tests',
        command: ['--test', './tests/make-template/convert.test.mjs'],
        description: 'Project to template conversion functionality',
        homeSuffix: 'make-template-convert'
      },
      {
        name: 'Make-Template Restore Tests',
        command: ['--test', './tests/make-template/restore.test.mjs'],
        description: 'Template to project restoration functionality',
        homeSuffix: 'make-template-restore'
      },
      {
        name: 'Make-Template Test Command Tests',
        command: ['--test', './tests/make-template/test-command.test.mjs'],
        description: 'Template testing with create-scaffold integration',
        homeSuffix: 'make-template-test'
      },
      {
        name: 'Make-Template Validate Tests',
        command: ['--test', './tests/make-template/cli-integration.test.mjs'],
        description: 'Template validation and schema compliance',
        homeSuffix: 'make-template-validate'
      },
      {
        name: 'Make-Template Config Validate Tests',
        command: ['--test', './tests/make-template/config-validate.test.mjs'],
        description: '.templatize.json configuration validation CLI coverage',
        homeSuffix: 'make-template-config-validate'
      },
      {
        name: 'Templatize JSX Tests',
        command: ['--test', './tests/templatize-jsx.test.mjs'],
        description: 'JSX/TSX file templatization with AST parsing',
        homeSuffix: 'templatize-jsx'
      },
      {
        name: 'Templatize JSON Tests',
        command: ['--test', './tests/templatize-json.test.mjs'],
        description: 'JSON file templatization with JSONPath support',
        homeSuffix: 'templatize-json'
      },
      {
        name: 'Templatize Markdown Tests',
        command: ['--test', './tests/templatize-markdown.test.mjs'],
        description: 'Markdown file templatization with regex patterns',
        homeSuffix: 'templatize-markdown'
      },
      {
        name: 'Templatize HTML Tests',
        command: ['--test', './tests/templatize-html.test.mjs'],
        description: 'HTML file templatization with DOM parsing',
        homeSuffix: 'templatize-html'
      },
      {
        name: 'E2E Hermetic Isolation Tests',
        command: ['--test', './tests/e2e/hermetic-isolation.test.mjs'],
        description: 'End-to-end hermetic test environment validation',
        homeSuffix: 'e2e-hermetic'
      },
      {
        name: 'E2E Tutorial Workflows Tests',
        command: ['--test', './tests/e2e/tutorial-workflows.test.mjs'],
        description: 'End-to-end tutorial workflow integration tests',
        homeSuffix: 'e2e-workflows'
      },
      {
        name: 'E2E Guided Workflow Tests',
        command: ['--test', './tests/e2e/guided-workflow.test.mjs'],
        description: 'Guided workflow coverage for setup runtime and sandbox enforcement',
        homeSuffix: 'e2e-guided-workflow'
      }
    ];
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const runner = new TestRunner();

if (args.includes('--suite')) {
  const suiteIndex = args.indexOf('--suite');
  if (suiteIndex + 1 < args.length) {
    const suiteName = args[suiteIndex + 1];
    await runner.runSuite(suiteName);
  } else {
    console.error('❌ Error: --suite requires a suite name argument');
    console.log('Usage: node scripts/test-runner.mjs --suite "Suite Name"');
    console.log('Available suites:');
    runner.getAvailableSuites().forEach(suite => {
      console.log(`  - "${suite.name}"`);
    });
    process.exit(1);
  }
} else {
  await runner.runAll();
}
