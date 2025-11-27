#!/usr/bin/env node
// @ts-nocheck
/**
 * Unified Build Scripts CLI - Dogfooding the @m5nv/cli micro-framework
 *
 * This demonstrates proper DSL design with two clear domains:
 * - build: produce artifacts (schemas, docs)
 * - lint: check/validate things (docs, code, mocks)
 *
 * Usage:
 *   node scripts/cli.mjs build schema          # generate schema TypeScript
 *   node scripts/cli.mjs build schema --check  # verify schema is current
 *   node scripts/cli.mjs build docs            # generate CLI reference docs
 *   node scripts/cli.mjs lint                  # run all lints
 *   node scripts/cli.mjs lint docs             # validate documentation
 *   node scripts/cli.mjs lint code             # ast-grep analysis
 *   node scripts/cli.mjs lint mocks            # check mock patterns
 */

import { Router } from '../lib/cli/router.mts';
import { Command } from '../lib/cli/command.mts';

// ============================================================
// Build Commands
// ============================================================

class BuildSchemaCommand extends Command {
  constructor() {
    super({
      name: 'schema',
      description: 'Generate TypeScript artifacts from JSON schemas',
      usage: 'build schema [--check]',
      options: [
        { long: '--check', desc: 'Verify generated files are up-to-date (CI mode)' }
      ],
      examples: [
        { cmd: 'build schema', desc: 'Generate schema TypeScript files' },
        { cmd: 'build schema --check', desc: 'Verify schemas are up-to-date' }
      ]
    });
  }

  parseArg(arg, _args, i, parsed) {
    if (arg === '--check') {
      parsed.check = true;
      return i;
    }
  }

  async run(parsed) {
    const { buildTemplateSchema } = await import('./build-template-schema.mjs');

    console.log(parsed.check
      ? '🔍 Checking schema files are up-to-date...'
      : '🔨 Building schema TypeScript files...');

    try {
      await buildTemplateSchema({ check: parsed.check });
      console.log(parsed.check
        ? '✅ Schema files are up-to-date'
        : '✅ Schema files generated successfully');
    } catch (error) {
      console.error(`❌ ${error.message}`);
      process.exit(1);
    }
  }
}

class BuildDocsCommand extends Command {
  constructor() {
    super({
      name: 'docs',
      description: 'Generate CLI reference documentation',
      usage: 'build docs',
      examples: [
        { cmd: 'build docs', desc: 'Generate docs/reference/commands/*.md' }
      ]
    });
  }

  parseArg() {}

  async run() {
    const { generateCommandDocs } = await import('./generate-cli-reference.mjs');

    console.log('📚 Generating CLI reference documentation...');

    try {
      const { generated, errors } = await generateCommandDocs();
      console.log(`✅ Generated ${generated} command files`);
      if (errors > 0) {
        console.log(`⚠️  ${errors} errors occurred`);
      }
    } catch (error) {
      console.error(`❌ ${error.message}`);
      process.exit(1);
    }
  }
}

class BuildRouter extends Router {
  constructor() {
    super();
    this.toolName = 'build';
    this.description = 'Build artifacts (schemas, documentation)';
    this.commandsLabel = 'TARGETS';
    this.commandsItemLabel = 'target';
    this.commands = {
      schema: new BuildSchemaCommand(),
      docs: new BuildDocsCommand()
    };
  }
}

// ============================================================
// Lint Commands
// ============================================================

class LintDocsCommand extends Command {
  constructor() {
    super({
      name: 'docs',
      description: 'Validate markdown documentation',
      usage: 'lint docs [--verbose]',
      options: [
        { long: '--verbose', desc: 'Enable verbose output' }
      ],
      examples: [
        { cmd: 'lint docs', desc: 'Check markdown documentation' },
        { cmd: 'lint docs --verbose', desc: 'Verbose validation output' }
      ]
    });
  }

  parseArg(arg, _args, i, parsed) {
    if (arg === '--verbose') {
      parsed.verbose = true;
      return i;
    }
  }

  async run(parsed) {
    const { validateDocumentation } = await import('./validate-docs.mjs');

    try {
      const { exitCode } = await validateDocumentation({
        verbose: parsed.verbose
      });
      if (exitCode !== 0) {
        process.exit(exitCode);
      }
    } catch (error) {
      console.error(`❌ ${error.message}`);
      process.exit(1);
    }
  }
}

class LintCodeCommand extends Command {
  constructor() {
    super({
      name: 'code',
      description: 'Run code analysis (ast-grep)',
      usage: 'lint code',
      examples: [
        { cmd: 'lint code', desc: 'Analyze code with ast-grep rules' }
      ]
    });
  }

  parseArg() {}

  async run() {
    const { runComprehensiveValidation } = await import('./comprehensive-validation.mjs');

    try {
      const { exitCode } = await runComprehensiveValidation({ codeOnly: true });
      if (exitCode !== 0) {
        process.exit(exitCode);
      }
    } catch (error) {
      console.error(`❌ ${error.message}`);
      process.exit(1);
    }
  }
}

class LintMocksCommand extends Command {
  constructor() {
    super({
      name: 'mocks',
      description: 'Check test files for mock pattern violations',
      usage: 'lint mocks',
      examples: [
        { cmd: 'lint mocks', desc: 'Scan tests for suspicious mock patterns' }
      ]
    });
  }

  parseArg() {}

  async run() {
    const { lintTestMocks } = await import('./lint-test-mocks.mjs');

    try {
      const { exitCode } = await lintTestMocks();
      if (exitCode !== 0) {
        process.exit(exitCode);
      }
    } catch (error) {
      console.error(`❌ ${error.message}`);
      process.exit(1);
    }
  }
}

class LintRouter extends Router {
  constructor() {
    super();
    this.toolName = 'lint';
    this.description = 'Lint and validate (docs, code, mocks)';
    this.commandsLabel = 'TARGETS';
    this.commandsItemLabel = 'target';
    this.commands = {
      docs: new LintDocsCommand(),
      code: new LintCodeCommand(),
      mocks: new LintMocksCommand()
    };
  }

  // Override route() to run all lints when no subcommand given
  async route(args) {
    // Handle explicit help requests normally
    if (args.length > 0) {
      const firstArg = args[0];
      if (firstArg === '--help' || firstArg === '-h' || firstArg === 'help') {
        return super.route(args);
      }
      // Handle known subcommands
      if (this.commands[firstArg]) {
        return super.route(args);
      }
    }

    // No args → run all lints
    console.log('Running all lints (use "lint docs", "lint code", or "lint mocks" for specific targets)\n');
    const { runComprehensiveValidation } = await import('./comprehensive-validation.mjs');

    try {
      const { exitCode } = await runComprehensiveValidation({});
      if (exitCode !== 0) {
        process.exit(exitCode);
      }
    } catch (error) {
      console.error(`❌ ${error.message}`);
      process.exit(1);
    }
  }
}

// ============================================================
// Root Router
// ============================================================

class ScriptsRouter extends Router {
  constructor() {
    super();
    this.toolName = 'scripts';
    this.description = 'Build and lint tools for @m5nv/create';
    this.version = '1.0.0';

    // Two domains: build and lint
    this.commandsLabel = 'COMMANDS';
    this.commandsItemLabel = 'command';

    this.commands = {
      build: new BuildRouter(),
      lint: new LintRouter()
    };

    this.examples = [
      'build schema',
      'build schema --check',
      'build docs',
      'lint',
      'lint docs',
      'lint code',
      'lint mocks'
    ];
  }
}

// ============================================================
// Entry Point
// ============================================================

const router = new ScriptsRouter();
await router.route(process.argv.slice(2));
