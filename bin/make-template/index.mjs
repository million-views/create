#!/usr/bin/env node

/**
 * @m5nv/make-template CLI Entry Point
 *
 * Converts existing Node.js projects into reusable templates
 * compatible with @m5nv/create-scaffold.
 */

import { parseArgs } from 'node:util';
import { access, constants, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { realpathSync } from 'node:fs';
import { ConversionEngine } from '../../lib/shared/make-template/engine.mjs';
import { RestorationEngine } from '../../lib/shared/make-template/restoration-engine.mjs';
import { PROJECT_TYPES } from '../../lib/shared/make-template/config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// When tests call main(argv) in-process we set this flag so error handling
// can throw instead of calling process.exit which would kill the test runner.
let IN_PROCESS = false;

/**
 * CLI Options Schema for util.parseArgs
 */
const OPTIONS_SCHEMA = {
  'help': {
    type: 'boolean',
    short: 'h',
    default: false
  },
  'dry-run': {
    type: 'boolean',
    default: false
  },
  'yes': {
    type: 'boolean',
    short: 'y',
    default: false
  },
  'type': {
    type: 'string'
  },
  'placeholder-format': {
    type: 'string',
    default: '{{NAME}}'
  },
  'sanitize-undo': {
    type: 'boolean',
    default: false
  },
  'silent': {
    type: 'boolean',
    default: false
  },
  'force-lenient': {
    type: 'boolean',
    default: false
  },
  // Restoration options
  'restore': {
    type: 'boolean',
    default: false
  },
  'restore-files': {
    type: 'string'
  },
  'restore-placeholders': {
    type: 'boolean',
    default: false
  },
  'generate-defaults': {
    type: 'boolean',
    default: false
  },
  // Init options
  'init': {
    type: 'boolean',
    default: false
  },
  'init-file': {
    type: 'string'
  },
  // Hints options
  'hints': {
    type: 'boolean',
    default: false
  },
  // Validation options
  'lint': {
    type: 'boolean',
    default: false
  },
  'lint-file': {
    type: 'string'
  }
};

/**
 * Display help text and usage information
 */
function displayHelp() {
  const helpText = `
make-template - Convert existing Node.js projects into reusable templates

DESCRIPTION:
  Convert existing Node.js projects into reusable templates compatible with
  @m5nv/create-scaffold. Analyzes project structure, identifies project types,
  replaces project-specific values with placeholders, and generates template files.

  Also supports restoring templatized projects back to working state for
  template development and testing workflows.

Usage:
  make-template [options]

CONVERSION OPTIONS:
  -h, --help                    Show this help message
      --dry-run                 Preview changes without executing them
  -y, --yes                     Skip confirmation prompts
        --silent                 Suppress prompts and non-essential output (useful for tests)
      --type <type>             Force specific project type detection
      --placeholder-format <fmt> Specify placeholder format
      --sanitize-undo           Remove sensitive data from undo log

RESTORATION OPTIONS:
      --restore                 Restore template back to working project
      --restore-files <files>   Restore only specified files (comma-separated)
      --restore-placeholders    Restore only placeholder values, keep files
      --generate-defaults       Generate .restore-defaults.json configuration

INIT OPTIONS:
      --init                    Generate skeleton template.json file
      --init-file <file>        Specify output file for skeleton (default: template.json)

HINTS OPTIONS:
      --hints                   Display available hints catalog for authoring assistance

VALIDATION OPTIONS:
      --lint                    Validate template.json against schema
      --lint-file <file>        Validate specific template.json file

SUPPORTED PROJECT TYPES:
  cf-d1        Cloudflare Worker with D1 database
  cf-turso     Cloudflare Worker with Turso database
  vite-react   Vite-based React project
  generic      Generic Node.js project (default fallback)

SUPPORTED PLACEHOLDER FORMATS:
  {{NAME}}     Double-brace format (default)
  __NAME__     Double-underscore format
  %NAME%       Percent format

CONVERSION EXAMPLES:
  make-template --dry-run
    Preview conversion without making changes

  make-template --type vite-react --yes
    Convert as Vite React project, skip confirmations

  make-template --placeholder-format __NAME__ --dry-run
    Use double-underscore placeholders, preview only

  make-template --sanitize-undo --dry-run
    Preview conversion with sanitized undo log

RESTORATION EXAMPLES:
  make-template --restore --dry-run
    Preview restoration without making changes

  make-template --restore --yes
    Restore template to working state, skip confirmations

  make-template --restore-files "package.json,README.md"
    Restore only specific files from undo log

  make-template --restore-placeholders --dry-run
    Preview placeholder restoration only

  make-template --generate-defaults
    Create .restore-defaults.json with default values

  make-template --sanitize-undo --dry-run
    Preview conversion with sanitized undo log (safe for commits)

  make-template --restore --sanitize-undo
    Restore from sanitized undo log (prompts for missing values)

VALIDATION EXAMPLES:
  make-template --lint
    Validate template.json in current directory

  make-template --lint-file path/to/template.json
    Validate specific template.json file

TEMPLATE AUTHOR WORKFLOW:
  1. make-template                    # Convert working project to template
  2. Test template with create-scaffold
  3. make-template --restore          # Restore to working state
  4. Fix issues and iterate
  5. make-template                    # Update template

UNDO LOG MANAGEMENT:
  • .template-undo.json contains restoration data for template authors
  • Safe to commit for template maintenance (use --sanitize-undo for privacy)
  • create-scaffold ignores .template-undo.json automatically
  • Keep undo log for template development, gitignore for public templates
  • Use .restore-defaults.json to automate sanitized restoration

TROUBLESHOOTING:
  Undo log not found:
    → Run make-template first to create template with undo log
    → Check if .template-undo.json exists in project root

  Restoration fails with missing values:
    → Use --generate-defaults to create .restore-defaults.json
    → Edit defaults file with your project-specific values
    → Use environment variables: \${USER}, \${PWD} in defaults

  Sanitized restoration prompts for values:
    → Create .restore-defaults.json with default values
    → Set promptForMissing: false to use defaults without prompting
    → Use --restore-placeholders to restore values only

  File conflicts during restoration:
    → Use --dry-run to preview changes first
    → Backup important files before restoration
    → Use selective restoration: --restore-files "specific,files"

REQUIREMENTS:
  - Must be run in a directory containing package.json
  - Project should be a valid Node.js project
  - Recommended to use version control before conversion
  - For restoration: .template-undo.json must exist

For more information, visit: https://github.com/m5nv/make-template
`;

  console.log(helpText.trim());
}

/**
 * Validate CLI arguments
 */
function validateArguments(options) {
  const errors = [];

  // Validate project type if specified
  if (options.type && !Object.keys(PROJECT_TYPES).includes(options.type)) {
    errors.push(`Invalid project type: ${options.type}. Supported types: ${Object.keys(PROJECT_TYPES).join(', ')}`);
  }

  // Validate placeholder format if specified
  if (options['placeholder-format']) {
    const format = options['placeholder-format'];
    const supportedFormats = ['{{NAME}}', '__NAME__', '%NAME%'];

    if (!supportedFormats.includes(format)) {
      errors.push(`Invalid placeholder format: ${format}. Must contain NAME substitution mechanism. Supported formats: {{NAME}}, __NAME__, %NAME%`);
    }
  }

  // Validate restoration option combinations
  const restorationOptions = ['restore', 'restore-files', 'restore-placeholders', 'generate-defaults'];
  const activeRestorationOptions = restorationOptions.filter(opt => options[opt]);

  if (activeRestorationOptions.length > 1) {
    // Allow restore with restore-files or restore-placeholders
    if (options.restore && (options['restore-files'] || options['restore-placeholders'])) {
      // This is valid - selective restoration
    } else if (options['generate-defaults'] && activeRestorationOptions.length > 1) {
      errors.push('--generate-defaults cannot be combined with other restoration options');
    } else if (options['restore-files'] && options['restore-placeholders']) {
      errors.push('--restore-files and --restore-placeholders cannot be used together');
    }
  }

  // Validate restore-files format if specified
  if (options['restore-files']) {
    const files = options['restore-files'].split(',').map(f => f.trim());
    if (files.some(f => f === '')) {
      errors.push('--restore-files cannot contain empty file names');
    }
    if (files.some(f => f.includes('..'))) {
      errors.push('--restore-files cannot contain path traversal sequences (..)');
    }
  }

  // Validate that conversion and restoration options don't conflict
  const conversionOnlyOptions = ['type'];
  // Only check placeholder-format if it's not the default value
  if (options['placeholder-format'] && options['placeholder-format'] !== '{{NAME}}') {
    conversionOnlyOptions.push('placeholder-format');
  }

  const hasConversionOnlyOptions = conversionOnlyOptions.some(opt => options[opt]);
  const hasRestorationOptions = activeRestorationOptions.length > 0;

  if (hasConversionOnlyOptions && hasRestorationOptions) {
    errors.push('Conversion options (--type, --placeholder-format) cannot be used with restoration options');
  }

  return errors;
}

/**
 * Validate project directory and required files
 */
async function validateProjectDirectory() {
  const errors = [];

  try {
    // Check if package.json exists
    await access('package.json', constants.F_OK);
  } catch (error) {
    // Detect running in system root (dangerous) and provide a clearer message
    if (process.cwd && process.cwd() === '/') {
      errors.push('Running in the system root directory is not recommended and may be dangerous. Please run this command in a project directory.');
    }
    // Make this message explicit about being unable to proceed without package.json
    errors.push('package.json not found. Cannot proceed without package.json. This command must be run in a valid Node.js project directory.');
  }

  return errors;
}

/**
 * Generate .restore-defaults.json configuration file
 */
async function generateDefaultsFile() {
  const { DefaultsManager } = await import('../lib/restoration/defaults-manager.js');
  const defaultsManager = new DefaultsManager();

  try {
    // Generate with common placeholders
    const commonPlaceholders = [
      '{{PROJECT_NAME}}',
      '{{AUTHOR_NAME}}',
      '{{AUTHOR_EMAIL}}',
      '{{PROJECT_DESCRIPTION}}'
    ];

    await defaultsManager.generateDefaultsFile(commonPlaceholders);

    console.log('✅ Generated .restore-defaults.json configuration file');
    console.log('');
    console.log('📝 Edit this file to customize default values for restoration:');
    console.log('   • Use ${VARIABLE} for environment variable substitution');
    console.log('   • Set promptForMissing: false to use defaults without prompting');
    console.log('   • Add your project-specific placeholders and default values');
    console.log('');
    console.log('💡 Use this file with: make-template --restore');
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('⚠️  .restore-defaults.json already exists');
      console.log('💡 Delete the existing file first or edit it directly');
      return;
    }
    handleError(`Failed to create .restore-defaults.json: ${error.message}`);
  }
}

/**
 * Handle CLI errors and exit appropriately
 */
function handleError(message, exitCode = 1) {
  if (IN_PROCESS) {
    // Log the error to stderr so in-process test harnesses that capture
    // stderr receive the same messages as spawned CLI invocations.
    console.error(`Error: ${message}`);
    // Throw an error that tests can catch; include exit code for assertions
    const err = new Error(message);
    err.code = exitCode;
    throw err;
  }
  console.error(`Error: ${message}`);
  process.exit(exitCode);
}

/**
 * Handle init command for skeleton template generation
 */
async function handleInitCommand(options) {
  const fs = await import('fs/promises');
  const path = await import('path');

  try {
    const outputFile = options['init-file'] || 'template.json';
    const outputPath = path.resolve(outputFile);

    // Check if file already exists
    try {
      await fs.access(outputPath);
      console.log(`⚠️  File ${outputFile} already exists.`);
      console.log(`   Use --init-file <different-name> to specify a different output file.`);
      process.exit(1);
    } catch (error) {
      // File doesn't exist, which is what we want
    }

    console.log(`📝 Generating skeleton template.json at ${outputFile}...`);

    // Generate skeleton template.json
    const skeletonTemplate = generateSkeletonTemplate();

    // Write to file
    await fs.writeFile(outputPath, JSON.stringify(skeletonTemplate, null, 2));

    console.log('✅ Skeleton template.json generated successfully!');
    console.log('');
    console.log('📋 Next steps:');
    console.log(`   1. Edit ${outputFile} to customize your template`);
    console.log('   2. Run "make-template --lint" to validate your template');
    console.log('   3. Test with create-scaffold to ensure it works');

  } catch (error) {
    handleError(`Init failed: ${error.message}`);
  }
}

/**
 * Generate skeleton template.json with proper structure
 */
function generateSkeletonTemplate() {
  return {
    "schemaVersion": "1.0.0",
    "id": "your-org/your-template-name",
    "name": "Your Template Name",
    "description": "A brief description of what this template creates",
    "tags": ["web", "api", "fullstack"],
    "author": "Your Name or Organization",
    "license": "MIT",
    "dimensions": {
      "deployment_target": {
        "values": ["vercel", "netlify", "railway"]
      },
      "features": {
        "values": ["auth", "database", "api", "ui"]
      },
      "database": {
        "values": ["postgresql", "mysql", "sqlite"]
      },
      "storage": {
        "values": ["aws-s3", "vercel-blob", "local"]
      },
      "auth_providers": {
        "values": ["google", "github", "twitter", "email"]
      },
      "payments": {
        "values": ["stripe", "paypal"]
      },
      "analytics": {
        "values": ["mixpanel", "google-analytics", "plausible"]
      }
    },
    "gates": {
      "deployment_target": {
        "platform": "node",
        "constraint": "Requires Node.js runtime"
      }
    },
    "featureSpecs": {
      "auth": {
        "label": "Authentication",
        "description": "Add user authentication system",
        "needs": ["database"]
      },
      "database": {
        "label": "Database",
        "description": "Add database integration",
        "needs": []
      },
      "api": {
        "label": "API Routes",
        "description": "Add API endpoints and routing",
        "needs": []
      },
      "ui": {
        "label": "User Interface",
        "description": "Add frontend components and pages",
        "needs": []
      }
    },
    "hints": {
      "features": {
        "auth": "Add secure user authentication with login/signup flows",
        "database": "Set up database connection and schema management",
        "api": "Create REST or GraphQL API endpoints",
        "ui": "Build responsive user interface components"
      }
    }
  };
}

/**
 * Handle hints command for displaying hints catalog
 */
async function handleHintsCommand(options) {
  console.log('💡 Available Hints Catalog for Template Authoring');
  console.log('================================================');
  console.log('');

  console.log('📋 Feature Hints:');
  console.log('   These hints provide guidance for template authors when defining features.');
  console.log('   Use them in your template.json under hints.features to help users understand');
  console.log('   what each feature provides.');
  console.log('');

  const featureHints = {
    'auth': 'Add secure user authentication with login/signup flows, session management, and user profiles',
    'database': 'Set up database connection, schema management, migrations, and data access patterns',
    'api': 'Create REST or GraphQL API endpoints, request/response handling, and API documentation',
    'ui': 'Build responsive user interface components, pages, routing, and interactive elements',
    'storage': 'Configure file storage solutions for uploads, assets, and media management',
    'payments': 'Integrate payment processing, subscriptions, and financial transaction handling',
    'analytics': 'Add tracking, metrics, and analytics for user behavior and application performance',
    'email': 'Set up email sending, templates, and notification systems',
    'admin': 'Create administrative interfaces, dashboards, and management tools',
    'testing': 'Add comprehensive test suites, mocking, and quality assurance tools',
    'ci-cd': 'Configure continuous integration, deployment pipelines, and automation',
    'monitoring': 'Set up logging, error tracking, performance monitoring, and alerting',
    'security': 'Implement security measures, authentication guards, and data protection',
    'docs': 'Add documentation generation, API docs, and developer guides',
    'i18n': 'Configure internationalization, localization, and multi-language support'
  };

  for (const [feature, hint] of Object.entries(featureHints)) {
    console.log(`   • ${feature}: ${hint}`);
  }

  console.log('');
  console.log('📖 Usage in template.json:');
  console.log('   {');
  console.log('     "hints": {');
  console.log('       "features": {');
  console.log('         "auth": "Add secure user authentication..."');
  console.log('       }');
  console.log('     }');
  console.log('   }');
  console.log('');
  console.log('💡 Tip: Use these hints to provide clear, actionable guidance for template users!');
}

/**
 * Handle lint command for template validation
 */
async function handleLintCommand(options) {
  const { TemplateValidator } = await import('../../lib/validation/template-validator.mjs');

  try {
    const validator = new TemplateValidator();
    const templateFile = options['lint-file'] || 'template.json';

    console.log(`🔍 Validating ${templateFile}...`);

    const result = await validator.validate(templateFile, 'strict');

    if (result.valid) {
      console.log('✅ Template validation passed!');
      console.log('');
      console.log('📋 Validation Summary:');
      console.log(`   • Schema validation: ✅ Passed`);
      console.log(`   • Domain validation: ✅ Passed`);
      console.log(`   • Warnings: ${result.warnings.length}`);

      if (result.warnings.length > 0) {
        console.log('');
        console.log('⚠️  Warnings:');
        result.warnings.forEach((warning, i) => {
          console.log(`   ${i + 1}. ${warning.message}`);
        });
      }
    } else {
      console.log('❌ Template validation failed!');
      console.log('');
      console.log('📋 Validation Summary:');
      console.log(`   • Errors: ${result.errors.length}`);
      console.log(`   • Warnings: ${result.warnings.length}`);
      console.log('');

      console.log('🚨 Errors:');
      result.errors.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error.message}`);
        if (error.path && error.path.length > 0) {
          console.log(`      Path: ${error.path.join('.')}`);
        }
      });

      if (result.warnings.length > 0) {
        console.log('');
        console.log('⚠️  Warnings:');
        result.warnings.forEach((warning, i) => {
          console.log(`   ${i + 1}. ${warning.message}`);
        });
      }

      process.exit(1);
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      handleError(`Template file not found: ${options['lint-file'] || 'template.json'}`);
    } else {
      handleError(`Lint failed: ${error.message}`);
    }
  }
}

/**
 * Main CLI function
 * Accepts an optional argv array (e.g. ['--dry-run']) for in-process testing.
 */
export async function main(argv = null) {
  let parsedArgs;
  if (Array.isArray(argv)) {
    // When called in-process with an argv array, tell parseArgs to parse
    // that array directly instead of manipulating process.argv which can
    // confuse the parser when tests run under different environments.
    IN_PROCESS = true;
  }

  try {
    // Parse command line arguments. If argv was provided (in-process call)
    // pass it explicitly to parseArgs via the 'args' property.
    const parseOptions = {
      options: OPTIONS_SCHEMA,
      allowPositionals: false
    };
    if (Array.isArray(argv)) parseOptions.args = argv;
    parsedArgs = parseArgs(parseOptions);
  } catch (error) {
    if (error.code === 'ERR_PARSE_ARGS_UNKNOWN_OPTION') {
      handleError(`Unknown option: ${error.message.split("'")[1]}`);
    } else if (error.code === 'ERR_PARSE_ARGS_INVALID_OPTION_VALUE') {
      // Handle missing values for options
      if (error.message.includes('argument missing')) {
        const optionMatch = error.message.match(/Option '([^']+)'/);
        if (optionMatch) {
          const option = optionMatch[1];
          handleError(`Option ${option} requires a value`);
        } else {
          handleError(`Missing value for option`);
        }
      } else {
        handleError(`Invalid argument: ${error.message}`);
      }
    } else {
      handleError(`Argument parsing error: ${error.message}`);
    }
    return;
  }

  const options = parsedArgs.values;
  // Normalize kebab-case options to camelCase expected by engines/tests
  if (options['placeholder-format'] !== undefined) options.placeholderFormat = options['placeholder-format'];
  if (options['force-lenient'] !== undefined) options.forceLenient = options['force-lenient'];
  // Ensure project type is normalized (some tests call CLI with --type in different ways)
  if (options['type'] !== undefined && !options.type) options.type = options['type'];
  // Auto-enable non-interactive confirmations in test/CI contexts so the CLI
  // doesn't block prompts during automated runs. We set --yes only so tests
  // still receive informational output (dry-run previews) unless they opt-in
  // with --silent explicitly.
  const runningUnderNodeTest = Array.isArray(process.execArgv) && process.execArgv.includes('--test');
  const envCI = !!(process.env.CI && process.env.CI !== 'false');
  const envNodeTest = process.env.NODE_ENV === 'test';
  // NOTE: temporarily do NOT auto-enable --yes in test/CI contexts. This
  // ensures our test-only guards and assertions can surface callers that
  // forgot to opt into non-interactive behavior (by passing --silent or
  // setting MAKE_TEMPLATE_TEST_INPUT). Restore auto-yes behavior later if
  // needed after fixing tests/helpers.

  // Do not implicitly change validation strictness based on invocation
  // mode; tests should explicitly control leniency via options when
  // required. Keep validation behavior consistent between spawned and
  // in-process invocations unless the caller explicitly sets
  // --force-lenient (not exposed to users by default).
  // Historically the CLI when invoked as a subprocess applied a more
  // lenient validation mode to allow forced types to proceed even when some
  // config files were absent in lightweight CI fixtures. Tests rely on this
  // behavior: spawned CLI runs are lenient, in-process calls (used by some
  // tests) remain strict. Reintroduce that behavior here: if the CLI is
  // running as a separate process (not IN_PROCESS) and the caller did not
  // explicitly set forceLenient, enable leniency.
  // By default, do not enable lenient validation automatically. Tests and
  // callers must explicitly opt-in via options.forceLenient when they want
  // lenient behavior. This enforces a consistent, strict validation
  // contract where missing required config files cause an error unless the
  // caller explicitly requests leniency.

  // Temporary test-only guard: when running under the node test runner,
  // require callers to explicitly opt into non-interactive behavior by
  // passing --silent or setting MAKE_TEMPLATE_TEST_INPUT. Throw an
  // informative error here so the test runner surfaces a stack trace that
  // identifies the test/helper that invoked the CLI incorrectly.
  try {
    const runningUnderNodeTestGuard = runningUnderNodeTest || envNodeTest || envCI;
    if (runningUnderNodeTestGuard && !options.silent && !process.env.MAKE_TEMPLATE_TEST_INPUT) {
      throw new Error('TEST_ASSERTION: CLI invoked in test without --silent or MAKE_TEMPLATE_TEST_INPUT. Please pass --silent or set MAKE_TEMPLATE_TEST_INPUT in tests/helpers.');
    }
  } catch (e) {
    // Re-throw so tests fail loudly with a stack trace pointing to the caller
    throw e;
  }

  // For backwards compatibility: explicit --silent implies --yes
  if (options.silent) {
    options.yes = true;
  }

  // Debug: log options for troubleshooting
  // console.log('Parsed options:', JSON.stringify(options, null, 2));

  // Show help if requested or no arguments provided
  if (options.help) {
    displayHelp();
    process.exit(0);
  }

  // Validate arguments
  const argumentErrors = validateArguments(options);
  if (argumentErrors.length > 0) {
    argumentErrors.forEach(error => console.error(`Error: ${error}`));
    console.error('Try --help for usage information');
    console.error('Check project type spelling and supported options');
    process.exit(1);
  }

  // Handle generate-defaults workflow
  if (options['generate-defaults']) {
    await generateDefaultsFile();
    return;
  }

  // Handle init workflow
  if (options.init || options['init-file']) {
    await handleInitCommand(options);
    return;
  }

  // Handle hints workflow
  if (options.hints) {
    await handleHintsCommand(options);
    return;
  }

  // Handle lint workflow
  if (options.lint || options['lint-file']) {
    await handleLintCommand(options);
    return;
  }

  // Handle restoration workflows
  if (options.restore || options['restore-files'] || options['restore-placeholders']) {
    try {
      // For restoration workflows we do not require package.json to exist
      // (templates may be restored in minimal directories). Instead, ensure
      // the undo log (.template-undo.json) exists and is readable so the
      // restoration engine can proceed. This keeps test fixtures simple and
      // focuses errors on undo-log related issues.
      try {
        await access('.template-undo.json', constants.F_OK);
      } catch (err) {
        // Use handleError so in-process tests receive a thrown error and
        // spawned CLI receives a proper exit code and stderr output.
        handleError('.template-undo.json not found. Cannot restore without an undo log.', 1);
      }

      // Initialize and run restoration engine
      const restorationEngine = new RestorationEngine();
      // Note: Do not reduce logger verbosity for --silent here. Tests expect
      // dry-run and informational output to be present even when running
      // non-interactively. --silent remains available to suppress prompts,
      // but should not mute informative messages used in assertions.
      await restorationEngine.restore(options);
    } catch (error) {
      handleError(error.message);
    }
    return;
  }

  // Handle conversion workflow (default)
  // Validate project directory
  const projectErrors = await validateProjectDirectory();
  if (projectErrors.length > 0) {
    projectErrors.forEach(error => console.error(`Error: ${error}`));
    console.error('No changes were made - validation failed before execution');
    if (Array.isArray(argv)) {
      // When called in-process for tests, throw an error to allow the test harness to capture exit
      throw Object.assign(new Error('Validation failed'), { code: 1 });
    }
    process.exit(1);
  }

  try {
    // Check if we're running on the make-template project itself
    try {
      const packageContent = await readFile('package.json', 'utf8');
      const packageJson = JSON.parse(packageContent);

      if (packageJson.name === 'make-template' && packageJson.bin && packageJson.bin['make-template']) {
        console.error('Error: Cannot run make-template on the make-template project itself.');
        console.error('This would corrupt the tool\'s own source code.');
        console.error('If you need to test templatization, use the test fixtures or a separate project.');
        console.error('');
        if (Array.isArray(argv)) {
          throw Object.assign(new Error('Cannot run on make-template project itself'), { code: 1 });
        }
        process.exit(1);
      }
    } catch (error) {
      // If we can't read package.json, continue (other validation will catch this)
    }

    // Check if project appears to already be templated
    try {
      await access('.template-undo.json', constants.F_OK);
      console.info('ℹ️  Note: .template-undo.json found. This project has been templated before.');
      console.info('ℹ️  The existing undo log will be updated with the new templatization.');
      console.info('ℹ️  If you need to restore to the previous state, backup .template-undo.json first.');
      console.info('');
    } catch {
      // .template-undo.json doesn't exist, proceed normally
    }

    // Initialize and run conversion engine
    const engine = new ConversionEngine();
    // Keep informational output visible for tests; --yes disables prompts
    // but should not hide dry-run previews that tests assert on.
    await engine.convert(options);
  } catch (error) {
    if (Array.isArray(argv)) {
      // When running in-process during tests, some internal errors use
      // string codes (e.g. 'VALIDATION_ERROR'). Tests expect numeric
      // exit codes (1) so normalize string codes to numeric 1 here so
      // the test helpers receive consistent exit codes.
      try {
        if (error && typeof error.code === 'string') {
          error.code = 1;
        }
      } catch (e) {
        // ignore
      }
      throw error;
    }
    handleError(error.message);
  }
  finally {
    if (Array.isArray(argv)) {
      IN_PROCESS = false;
    }
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // During tests we must not exit the process - allow test harness to
  // surface the rejection. When running normally, exit with failure.
  const runningUnderNodeTest = Array.isArray(process.execArgv) && process.execArgv.includes('--test');
  if (!runningUnderNodeTest && !IN_PROCESS) {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  const runningUnderNodeTest = Array.isArray(process.execArgv) && process.execArgv.includes('--test');
  if (!runningUnderNodeTest && !IN_PROCESS) {
    process.exit(1);
  }
});

// If this file is executed directly (not imported), run main().
// Check if this is the main module by comparing the resolved script path
// with the actual file path, handling symlinks correctly.
if (process.argv[1] && realpathSync(process.argv[1]) === __filename) {
  main().catch((error) => {
    handleError(error.message);
  });
}