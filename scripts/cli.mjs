#!/usr/bin/env node
// @ts-nocheck
/**
 * Unified Build Scripts CLI - Dogfooding the @m5nv/cli micro-framework
 *
 * This demonstrates how the Router/Command architecture works for
 * build tooling scenarios with custom terminology.
 *
 * Usage:
 *   node scripts/cli.mjs schema build
 *   node scripts/cli.mjs schema build --check
 *   node scripts/cli.mjs docs generate
 *   node scripts/cli.mjs validate all
 *   node scripts/cli.mjs lint mocks
 */

import { Router } from '../lib/cli/router.mts';
import { Command } from '../lib/cli/command.mts';

// ============================================================
// Schema Commands
// ============================================================

class SchemaBuildCommand extends Command {
  constructor() {
    super({
      name: 'build',
      description: 'Generate TypeScript artifacts from JSON schemas',
      usage: 'schema build [--check]',
      options: [
        { long: '--check', desc: 'Verify generated files are up-to-date (CI mode)' }
      ],
      examples: [
        { cmd: 'schema build', desc: 'Generate schema TypeScript files' },
        { cmd: 'schema build --check', desc: 'Verify schemas are up-to-date' }
      ]
    });
  }

  parseArg(arg, args, i, parsed) {
    if (arg === '--check') {
      parsed.check = true;
      return i;  // Return current index to indicate we handled this arg
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

class SchemaRouter extends Router {
  constructor() {
    super();
    this.toolName = 'schema';
    this.description = 'Schema generation and validation tools';
    this.commandsLabel = 'OPERATIONS';
    this.commandsItemLabel = 'operation';
    this.commands = {
      build: new SchemaBuildCommand()
    };
  }
}

// ============================================================
// Docs Commands
// ============================================================

class DocsGenerateCommand extends Command {
  constructor() {
    super({
      name: 'generate',
      description: 'Generate CLI reference documentation from help files',
      usage: 'docs generate',
      examples: [
        { cmd: 'docs generate', desc: 'Generate docs/reference/commands/*.md' }
      ]
    });
  }

  parseArg() {
    // No arguments
  }

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

class DocsRouter extends Router {
  constructor() {
    super();
    this.toolName = 'docs';
    this.description = 'Documentation generation tools';
    this.commandsLabel = 'OPERATIONS';
    this.commandsItemLabel = 'operation';
    this.commands = {
      generate: new DocsGenerateCommand()
    };
  }
}

// ============================================================
// Validate Commands
// ============================================================

class ValidateAllCommand extends Command {
  constructor() {
    super({
      name: 'all',
      description: 'Run comprehensive validation (docs + code analysis)',
      usage: 'validate all [--docs-only] [--code-only]',
      options: [
        { long: '--docs-only', desc: 'Run only documentation validation' },
        { long: '--code-only', desc: 'Run only code analysis' }
      ],
      examples: [
        { cmd: 'validate all', desc: 'Run all validations' },
        { cmd: 'validate all --docs-only', desc: 'Run only doc validation' }
      ]
    });
  }

  parseArg(arg, _args, i, parsed) {
    if (arg === '--docs-only') {
      parsed.docsOnly = true;
      return i;
    }
    if (arg === '--code-only') {
      parsed.codeOnly = true;
      return i;
    }
  }

  async run(parsed) {
    const { runComprehensiveValidation } = await import('./comprehensive-validation.mjs');

    try {
      const { exitCode } = await runComprehensiveValidation({
        docsOnly: parsed.docsOnly,
        codeOnly: parsed.codeOnly
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

class ValidateDocsCommand extends Command {
  constructor() {
    super({
      name: 'docs',
      description: 'Validate documentation only',
      usage: 'validate docs [--verbose]',
      options: [
        { long: '--verbose', desc: 'Enable verbose output' }
      ],
      examples: [
        { cmd: 'validate docs', desc: 'Check markdown documentation' },
        { cmd: 'validate docs --verbose', desc: 'Verbose validation output' }
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

class ValidateRouter extends Router {
  constructor() {
    super();
    this.toolName = 'validate';
    this.description = 'Project validation tools';
    this.commandsLabel = 'TARGETS';
    this.commandsItemLabel = 'target';
    this.commands = {
      all: new ValidateAllCommand(),
      docs: new ValidateDocsCommand()
    };
  }
}

// ============================================================
// Lint Commands
// ============================================================

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
    this.description = 'Code linting tools';
    this.commandsLabel = 'CHECKS';
    this.commandsItemLabel = 'check';
    this.commands = {
      mocks: new LintMocksCommand()
    };
  }
}

// ============================================================
// Root Router (Super-Router)
// ============================================================

class ScriptsRouter extends Router {
  constructor() {
    super();
    this.toolName = 'scripts';
    this.description = 'Unified build and validation tools for @m5nv/create';
    this.version = '1.0.0';

    // Custom terminology for this domain
    this.commandsLabel = 'TOOLS';
    this.commandsItemLabel = 'tool';

    this.commands = {
      schema: new SchemaRouter(),
      docs: new DocsRouter(),
      validate: new ValidateRouter(),
      lint: new LintRouter()
    };

    this.examples = [
      'schema build',
      'schema build --check',
      'docs generate',
      'validate all',
      'lint mocks'
    ];
  }
}

// ============================================================
// Entry Point
// ============================================================

const router = new ScriptsRouter();
await router.route(process.argv.slice(2));
