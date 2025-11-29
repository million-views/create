#!/usr/bin/env node

/**
 * Unified Test Runner for @m5nv/create
 * Coordinates execution of all test suites with comprehensive reporting
 */

import { spawn } from 'child_process';
import { performance } from 'perf_hooks';
import path from 'path';
import fs from 'fs/promises';

class TestRunner {
  constructor() {
    this.results = [];
    this.totalStartTime = performance.now();
    // Use project tmp/ for M5NV_HOME isolation instead of system tmpdir
    this.m5nvBaseDir = path.join(process.cwd(), 'tmp', 'test-m5nv-homes');

    // Define test suite groups organized by test pyramid levels
    this.suiteGroups = {
      // Unit tests: Core components and infrastructure (L2/L3)
      'unit': [
        'Public Facade Tests',
        'Security Functions Tests',
        'BoundaryValidator Tests',
        'Environment Module Tests',
        'Environment Tools Tests',
        'Error Classes Tests',
        'Template Ignore Tests',
        'Error Handler Tests',
        'Placeholder Resolver Tests',
        'Placeholder Schema Tests',
        'Template Manifest Validator Tests',
        'Template Validator Extended Tests',
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
        'Scaffold New Tests',
        'Dry Run CLI Tests',
        'Scaffold List Tests',
        'Scaffold Validate Tests',
        'Template Init Tests',
        'Template Hints Tests',
        'Template Convert Tests',
        'Template Restore Tests',
        'Template Test Command Tests',
        'Template Validate Tests',
        'Template Config Validate Tests'
      ],
      // System tests: Full end-to-end workflows (L4)
      'system': [
        'Functional Tests',
        'Resource Leak Tests',
        'E2E Hermetic Isolation Tests',
        'E2E Tutorial Workflows Tests',
        'E2E Selection and Validation Tests',
        'E2E Dimensions and Placeholders Tests',
        'E2E Edge Cases and Errors Tests',
        'E2E Guided Workflow Tests'
      ],
      // Domain-specific groupings for targeted testing
      'scaffold': [
        'Scaffold New Tests',
        'Dry Run CLI Tests',
        'Scaffold List Tests',
        'Scaffold Validate Tests',
        'Functional Tests'
      ],
      'template': [
        'Template Init Tests',
        'Template Hints Tests',
        'Template Convert Tests',
        'Template Restore Tests',
        'Template Test Command Tests',
        'Template Validate Tests',
        'Template Config Validate Tests'
      ]
    };
  }

  async runTest(test) {
    const { name, command, description, homeSuffix } = test;

    console.log(`\n🧪 ${name}`);
    console.log(`   ${description}`);

    const startTime = performance.now();
    const m5nvHome = path.join(
      this.m5nvBaseDir,
      (homeSuffix || name).toLowerCase().replace(/[^a-z0-9]+/g, '-')
    );

    await fs.rm(m5nvHome, { recursive: true, force: true });
    await fs.mkdir(m5nvHome, { recursive: true });

    try {
      const args = Array.isArray(command) ? command : [command];
      await this.execCommand('node', args, m5nvHome);
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
      await fs.rm(m5nvHome, { recursive: true, force: true }).catch(() => { });
    }
  }

  async execCommand(command, args, m5nvHome) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: ['inherit', 'inherit', 'inherit'],
        env: {
          ...process.env,
          // Use M5NV_HOME instead of HOME to isolate config discovery
          // This prevents test pollution without hijacking the entire HOME directory
          M5NV_HOME: m5nvHome
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
    console.log('🚀 Running Complete Test Suite for @m5nv/create');
    console.log('='.repeat(60));
    await fs.rm(this.m5nvBaseDir, { recursive: true, force: true });
    await fs.mkdir(this.m5nvBaseDir, { recursive: true });

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

    await fs.rm(this.m5nvBaseDir, { recursive: true, force: true });
    await fs.mkdir(this.m5nvBaseDir, { recursive: true });

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
        name: 'Security Functions Tests',
        command: ['--test', './tests/security/security-functions.test.mjs', './tests/security/defense-in-depth.test.mjs'],
        description: 'L2 validation functions and defense-in-depth security tests',
        homeSuffix: 'security-functions'
      },
      {
        name: 'BoundaryValidator Tests',
        command: ['--test', './tests/lib/security/boundary-validator.test.mjs'],
        description: 'Path boundary enforcement and traversal prevention',
        homeSuffix: 'boundary-validator'
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
        command: ['--test', './tests/lib/error/error-classes.test.mjs'],
        description: 'Custom error class instantiation and properties',
        homeSuffix: 'error-classes'
      },
      {
        name: 'Logger Tests',
        command: ['--test', './tests/scaffold/logger.test.mjs'],
        description: 'Logging utility and formatting',
        homeSuffix: 'logger'
      },
      {
        name: 'Template Ignore Tests',
        command: ['--test', './tests/lib/template/template-ignore.test.mjs'],
        description: 'Template artifact filtering and tree output sanitization',
        homeSuffix: 'template-ignore'
      },
      {
        name: 'Error Handler Tests',
        command: ['--test', './tests/lib/error/error-handler.test.mjs'],
        description: 'Error formatting and contextual error handling',
        homeSuffix: 'error-handler'
      },
      {
        name: 'Placeholder Resolver Tests',
        command: ['--test', './tests/lib/placeholder/placeholder-resolver.test.mjs'],
        description: 'Placeholder resolution and merging logic',
        homeSuffix: 'placeholder-resolver'
      },
      {
        name: 'Selection Validator Tests',
        command: ['--test', './tests/lib/validation/selection-validator.test.mjs'],
        description: 'Template selection validation logic',
        homeSuffix: 'selection-validator'
      },
      {
        name: 'Path Resolver Tests',
        command: ['--test', './tests/lib/util/path-resolver.test.mjs'],
        description: 'Path resolution and M5NV_HOME handling',
        homeSuffix: 'path-resolver'
      },
      {
        name: 'Functional Tests',
        command: ['--test', './tests/scaffold/cli-validation.test.mjs', './tests/scaffold/cli-execution.test.mjs', './tests/scaffold/cli-error-handling.test.mjs', './tests/scaffold/cli-integration.test.mjs'],
        description: 'Comprehensive end-to-end CLI behavior validation',
        homeSuffix: 'functional'
      },
      {
        name: 'Template Schema Build Tests',
        command: ['--test', './tests/scripts/schema-build.test.mjs'],
        description: 'Deterministic generation of schema types and runtime stubs',
        homeSuffix: 'schema-build'
      },
      {
        name: 'Template Validator Tests',
        command: ['--test', './tests/lib/validation/template-validator.test.mjs'],
        description: 'Runtime manifest validation aligned with schema constraints',
        homeSuffix: 'template-validator'
      },
      {
        name: 'Placeholder Schema Tests',
        command: ['--test', './tests/validators/placeholder-schema.test.mjs'],
        description: 'Placeholder normalization and type validation',
        homeSuffix: 'placeholder-schema'
      },
      {
        name: 'Template Runtime Validator Tests',
        command: ['--test', './tests/validators/template-runtime-validator.test.mjs'],
        description: 'Template manifest validation for V1 schema',
        homeSuffix: 'template-runtime-validator'
      },
      {
        name: 'Template Validator Extended Tests',
        command: ['--test', './tests/validators/template-validator-extended.test.mjs', './tests/validators/required-files.test.mjs', './tests/validators/setup-lint.test.mjs'],
        description: 'Extended template validator, required files, and setup lint',
        homeSuffix: 'template-validator-extended'
      },
      {
        name: 'Options Processor Tests',
        command: ['--test', './tests/scaffold/options-processor.test.mjs'],
        description: 'Template dimension option normalization used by scaffold commands',
        homeSuffix: 'options-processor'
      },
      {
        name: 'Config Loader Tests',
        command: ['--test', './tests/scaffold/config-loader.test.mjs', './tests/scaffold/config-loader-templates.test.mjs', './tests/scaffold/config-discovery.test.mjs'],
        description: '.m5nvrc discovery and normalization for scaffold defaults',
        homeSuffix: 'config-loader'
      },
      {
        name: 'CacheManager Tests',
        command: ['--test', './tests/scaffold/cache-manager.test.mjs', './tests/scaffold/cache-manager.git.test.mjs'],
        description: 'Cache URL normalization and git-backed operations',
        homeSuffix: 'cache-manager'
      },
      {
        name: 'TemplateResolver Tests',
        command: ['--test', './tests/scaffold/template-resolver.test.mjs', './tests/scaffold/template-resolver.git.test.mjs'],
        description: 'Template resolution and git-backed alias refresh',
        homeSuffix: 'template-resolver'
      },
      {
        name: 'Base Command Tests',
        command: ['--test', './tests/cli/command.test.js', './tests/lib/cli/command.test.mjs'],
        description: 'Command template method pattern and base command tests',
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
        command: ['--test', './tests/scaffold/resource-leak-test.mjs'],
        description: 'Resource management and cleanup validation',
        homeSuffix: 'resource'
      },
      {
        name: 'Setup Runtime Tests',
        command: ['--test', './tests/scaffold/setup-runtime.test.mjs', './tests/scaffold/guided-setup-workflow.test.mjs'],
        description: 'Setup runtime and guided workflow orchestration',
        homeSuffix: 'setup-runtime'
      },
      {
        name: 'Template URL Integration Tests',
        command: ['--test', './tests/scaffold/template-url-integration.test.mjs'],
        description: 'Template URL parsing and parameter handling',
        homeSuffix: 'template-url'
      },
      {
        name: 'File Utilities Tests',
        command: ['--test', './tests/utils/file.test.mjs'],
        description: 'L1 file operation wrappers and utilities',
        homeSuffix: 'file-utils'
      },
      {
        name: 'Scaffold New Tests',
        command: ['--test', './tests/scaffold/commands/new.test.js', './tests/scaffold/commands/new.router.test.js'],
        description: 'Scaffold new command unit and router tests',
        homeSuffix: 'scaffold-new'
      },
      {
        name: 'Dry Run CLI Tests',
        command: ['--test', './tests/scaffold/dry-run-cli.test.mjs'],
        description: 'End-to-end dry-run previews for local and cached templates',
        homeSuffix: 'dry-run-cli'
      },
      {
        name: 'Scaffold List Tests',
        command: ['--test', './tests/scaffold/commands/list.test.js', './tests/scaffold/commands/list.router.test.js'],
        description: 'Scaffold list command unit and router tests',
        homeSuffix: 'scaffold-list'
      },
      {
        name: 'Scaffold Validate Tests',
        command: ['--test', './tests/scaffold/commands/validate.test.js', './tests/scaffold/commands/validate.router.test.js'],
        description: 'Scaffold validate command unit and router tests',
        homeSuffix: 'scaffold-validate'
      },
      {
        name: 'Template Init Tests',
        command: ['--test', './tests/template/init.test.mjs'],
        description: 'Template initialization and skeleton generation',
        homeSuffix: 'template-init'
      },
      {
        name: 'Template Hints Tests',
        command: ['--test', './tests/template/hints.test.mjs'],
        description: 'Template authoring guidance and hints display',
        homeSuffix: 'template-hints'
      },
      {
        name: 'Template Convert Tests',
        command: ['--test', './tests/template/convert.test.mjs'],
        description: 'Project to template conversion functionality',
        homeSuffix: 'template-convert'
      },
      {
        name: 'Template Restore Tests',
        command: ['--test', './tests/template/restore.test.mjs'],
        description: 'Template to project restoration functionality',
        homeSuffix: 'template-restore'
      },
      {
        name: 'Template Test Command Tests',
        command: ['--test', './tests/template/test-command.test.mjs'],
        description: 'Template testing with scaffold integration',
        homeSuffix: 'template-test'
      },
      {
        name: 'Template Validate Tests',
        command: ['--test', './tests/template/cli-integration.test.mjs', './tests/template/commands/validate.test.js'],
        description: 'Template validation and schema compliance',
        homeSuffix: 'template-validate'
      },
      {
        name: 'Template Config Validate Tests',
        command: ['--test', './tests/template/config-validate.test.mjs'],
        description: '.templatize.json configuration validation CLI coverage',
        homeSuffix: 'template-config-validate'
      },
      {
        name: 'Templatize JSX Tests',
        command: ['--test', './tests/lib/templatize/templatize-jsx.test.mjs'],
        description: 'JSX/TSX file templatization with AST parsing',
        homeSuffix: 'templatize-jsx'
      },
      {
        name: 'Templatize JSON Tests',
        command: ['--test', './tests/lib/templatize/templatize-json.test.mjs'],
        description: 'JSON file templatization with JSONPath support',
        homeSuffix: 'templatize-json'
      },
      {
        name: 'Templatize Markdown Tests',
        command: ['--test', './tests/lib/templatize/templatize-markdown.test.mjs'],
        description: 'Markdown file templatization with regex patterns',
        homeSuffix: 'templatize-markdown'
      },
      {
        name: 'Templatize HTML Tests',
        command: ['--test', './tests/lib/templatize/templatize-html.test.mjs'],
        description: 'HTML file templatization with DOM parsing',
        homeSuffix: 'templatize-html'
      },
      {
        name: 'Templatize Config Tests',
        command: ['--test', './tests/lib/templatize/templatize-config.test.mjs'],
        description: 'Configuration file templatization (YAML, TOML, INI)',
        homeSuffix: 'templatize-config'
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
        name: 'E2E Selection and Validation Tests',
        command: ['--test', './tests/e2e/selection-and-validation.test.mjs'],
        description: 'Selection files, gates validation, and validate command',
        homeSuffix: 'e2e-selection-validation'
      },
      {
        name: 'E2E Dimensions and Placeholders Tests',
        command: ['--test', './tests/e2e/dimensions-and-placeholders.test.mjs'],
        description: 'Dimension scaffolding, placeholder overrides, make-template test',
        homeSuffix: 'e2e-dimensions-placeholders'
      },
      {
        name: 'E2E Edge Cases and Errors Tests',
        command: ['--test', './tests/e2e/edge-cases-and-errors.test.mjs'],
        description: 'Edge cases, restore workflow, and error scenarios',
        homeSuffix: 'e2e-edge-cases'
      },
      {
        name: 'E2E Guided Workflow Tests',
        command: ['--test', './tests/e2e/guided-workflow.test.mjs'],
        description: 'Guided workflow coverage for setup runtime and sandbox enforcement',
        homeSuffix: 'e2e-guided-workflow'
      },
      {
        name: 'Test Infrastructure Tests',
        command: ['--test', './tests/utils/cli-runner.test.js', './tests/utils/interactive-simulator.test.mjs'],
        description: 'Test utility validation (CLI runner, interactive simulator)',
        homeSuffix: 'test-infra'
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
