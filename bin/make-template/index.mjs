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
import { TERMINOLOGY } from '../../lib/shared/ontology.mjs';
import { createConfigManager } from '../../lib/cli/config-manager.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// When tests call main(argv) in-process we set this flag so error handling
// can throw instead of calling process.exit which would kill the test runner.
let IN_PROCESS = false;

/**
 * CLI Options Schema for util.parseArgs
 */
const OPTIONS_SCHEMA = {
  [TERMINOLOGY.OPTION.HELP]: {
    type: 'boolean',
    short: 'h',
    default: false
  },
  [TERMINOLOGY.OPTION.DRY_RUN]: {
    type: 'boolean',
    default: false
  },
  [TERMINOLOGY.OPTION.YES]: {
    type: 'boolean',
    short: 'y',
    default: false
  },
  [TERMINOLOGY.OPTION.TYPE]: {
    type: 'string'
  },
  [TERMINOLOGY.OPTION.PLACEHOLDER_FORMAT]: {
    type: 'string',
    default: '{{NAME}}'
  },
  [TERMINOLOGY.OPTION.SANITIZE_UNDO]: {
    type: 'boolean',
    default: false
  },
  [TERMINOLOGY.OPTION.QUIET]: {
    type: 'boolean',
    default: false
  },
  [TERMINOLOGY.OPTION.FORCE_LENIENT]: {
    type: 'boolean',
    default: false
  },
  // Restoration options
  [TERMINOLOGY.OPTION.RESTORE]: {
    type: 'boolean',
    default: false
  },
  [TERMINOLOGY.OPTION.RESTORE_FILES]: {
    type: 'string'
  },
  [TERMINOLOGY.OPTION.RESTORE_PLACEHOLDERS]: {
    type: 'boolean',
    default: false
  },
  [TERMINOLOGY.OPTION.GENERATE_DEFAULTS]: {
    type: 'boolean',
    default: false
  },
  // Init options
  [TERMINOLOGY.OPTION.INIT]: {
    type: 'boolean',
    default: false
  },
  [TERMINOLOGY.OPTION.INIT_FILE]: {
    type: 'string'
  },
  // Hints options
  [TERMINOLOGY.OPTION.HINTS]: {
    type: 'boolean',
    default: false
  },
  // Validation options
  [TERMINOLOGY.OPTION.LINT]: {
    type: 'boolean',
    default: false
  },
  [TERMINOLOGY.OPTION.LINT_FILE]: {
    type: 'string'
  },
  [TERMINOLOGY.OPTION.SUGGEST]: {
    type: 'boolean',
    default: false
  },
  [TERMINOLOGY.OPTION.FIX]: {
    type: 'boolean',
    default: false
  },
  // Phase 2: Advanced CLI commands
  [TERMINOLOGY.OPTION.ADD_DIMENSION]: {
    type: 'string'
  },
  [TERMINOLOGY.OPTION.SET_COMPAT]: {
    type: 'string'
  },
  [TERMINOLOGY.OPTION.SET_NEEDS]: {
    type: 'string'
  },
  [TERMINOLOGY.OPTION.PREVIEW]: {
    type: 'boolean',
    default: false
  },
  [TERMINOLOGY.OPTION.MIGRATE]: {
    type: 'boolean',
    default: false
  },
  [TERMINOLOGY.OPTION.MIGRATE_FILE]: {
    type: 'string'
  },
  // Bulk operations for Phase 2
  [TERMINOLOGY.OPTION.BULK_ADD_DIMENSIONS]: {
    type: 'string'
  },
  [TERMINOLOGY.OPTION.BULK_SET_COMPAT]: {
    type: 'string'
  },
  [TERMINOLOGY.OPTION.BULK_SET_NEEDS]: {
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

USAGE:
  make-template <command> [options]

COMMANDS:
  convert          Convert project to template
  restore          Restore template to project
  init             Generate skeleton template.json
  validate         Validate template.json
  hints            Show hints catalog
  test             Test template functionality

OPTIONS:
  -h, --help       Show this help message

LEGACY USAGE:
  make-template [options]     Convert project (default command)
  make-template --restore     Restore template
  make-template --init        Generate skeleton
  make-template --lint        Validate template
  make-template --hints       Show hints

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

VALIDATION OPTIONS:
      --lint                    Validate template.json against schema
      --lint-file <file>        Validate specific template.json file
      --suggest                 Show intelligent fix suggestions for validation errors
      --fix                     Auto-apply safe fixes for validation errors

HINTS OPTIONS:
      --hints                   Display available hints catalog for authoring assistance

SUPPORTED PROJECT TYPES:
  cf-d1        Cloudflare Worker with D1 database
  cf-turso     Cloudflare Worker with Turso database
  vite-react   Vite-based React project
  generic      Generic Node.js project (default fallback)

SUPPORTED PLACEHOLDER FORMATS:
  {{NAME}}     Double-brace format (default)
  __NAME__     Double-underscore format
  %NAME%       Percent format

EXAMPLES:
  make-template convert --dry-run
    Preview conversion without making changes

  make-template convert --type vite-react --yes
    Convert as Vite React project, skip confirmations

  make-template restore --dry-run
    Preview restoration without making changes

  make-template restore --yes
    Restore template to working state, skip confirmations

  make-template init
    Generate skeleton template.json

  make-template validate
    Validate template.json in current directory

  make-template hints
    Display hints catalog

For help with a specific command, use:
  make-template <command> --help

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
  const restorationOptions = [TERMINOLOGY.OPTION.RESTORE, TERMINOLOGY.OPTION.RESTORE_FILES, TERMINOLOGY.OPTION.RESTORE_PLACEHOLDERS, TERMINOLOGY.OPTION.GENERATE_DEFAULTS];
  const activeRestorationOptions = restorationOptions.filter(opt => options[opt]);

  if (activeRestorationOptions.length > 1) {
    // Allow restore with restore-files or restore-placeholders
    if (options[TERMINOLOGY.OPTION.RESTORE] && (options[TERMINOLOGY.OPTION.RESTORE_FILES] || options[TERMINOLOGY.OPTION.RESTORE_PLACEHOLDERS])) {
      // This is valid - selective restoration
    } else if (options[TERMINOLOGY.OPTION.GENERATE_DEFAULTS] && activeRestorationOptions.length > 1) {
      errors.push('--generate-defaults cannot be combined with other restoration options');
    } else if (options[TERMINOLOGY.OPTION.RESTORE_FILES] && options[TERMINOLOGY.OPTION.RESTORE_PLACEHOLDERS]) {
      errors.push('--restore-files and --restore-placeholders cannot be used together');
    }
  }

  // Validate restore-files format if specified
  if (options[TERMINOLOGY.OPTION.RESTORE_FILES]) {
    const files = options[TERMINOLOGY.OPTION.RESTORE_FILES].split(',').map(f => f.trim());
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
    const outputFile = options[TERMINOLOGY.OPTION.INIT_FILE] || 'template.json';
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
    "constants": {
      "language": "typescript",
      "framework": "nextjs",
      "styling": "tailwind",
      "testing": "jest",
      "ci": "github-actions"
    },
    "dimensions": {
      "deployment_target": {
        "values": ["vercel", "netlify", "railway", "render", "fly", "heroku"]
      },
      "features": {
        "values": ["auth", "database", "api", "ui", "storage", "payments", "analytics"]
      },
      "database": {
        "values": ["postgresql", "mysql", "sqlite", "mongodb", "redis", "d1", "tursodb", "none"]
      },
      "storage": {
        "values": ["aws-s3", "cloudflare-r2", "vercel-blob", "local", "none"]
      },
      "auth_providers": {
        "values": ["google", "github", "twitter", "email", "none"]
      },
      "payments": {
        "values": ["stripe", "paypal", "none"]
      },
      "analytics": {
        "values": ["mixpanel", "posthog", "google-analytics", "plausible", "none"]
      }
    },
    "gates": {
      "cloudflare-workers": {
        "platform": "edge",
        "constraint": "Limited runtime capabilities for edge computing",
        "allowed": {
          "database": ["sqlite", "tursodb", "d1", "none"],
          "storage": ["cloudflare-r2", "none"]
        }
      },
      "deno-deploy": {
        "platform": "edge",
        "constraint": "Deno runtime with limited storage options",
        "allowed": {
          "database": ["sqlite", "tursodb", "none"],
          "storage": ["none"]
        }
      },
      "linode": {
        "platform": "vm",
        "constraint": "Full VM with file system access",
        "allowed": {
          "database": ["sqlite", "tursodb", "postgresql", "mysql", "mongodb", "redis", "none"],
          "storage": ["local", "aws-s3", "none"]
        }
      }
    },
    "featureSpecs": {
      "auth": {
        "label": "Authentication",
        "description": "Add user authentication system with login/signup flows",
        "needs": {
          "database": "required"
        },
        "category": "authentication"
      },
      "database": {
        "label": "Database Integration",
        "description": "Set up database connection and schema management",
        "needs": {},
        "category": "database"
      },
      "api": {
        "label": "API Routes",
        "description": "Create REST or GraphQL API endpoints",
        "needs": {},
        "category": "api"
      },
      "ui": {
        "label": "User Interface",
        "description": "Build responsive user interface components",
        "needs": {},
        "category": "ui"
      },
      "storage": {
        "label": "File Storage",
        "description": "Add file upload and storage capabilities",
        "needs": {},
        "category": "storage"
      },
      "payments": {
        "label": "Payment Processing",
        "description": "Integrate payment processing, subscriptions, and billing management",
        "needs": {
          "database": "required"
        },
        "category": "payments"
      },
      "analytics": {
        "label": "Analytics Tracking",
        "description": "Add user analytics and tracking",
        "needs": {},
        "category": "analytics"
      }
    },
    "hints": {
      "features": {
        "auth": {
          "label": "Authentication System",
          "description": "Add secure user authentication with login/signup flows, password reset, and session management",
          "needs": {
            "database": "required"
          },
          "category": "authentication",
          "tags": ["security", "users", "login"]
        },
        "database": {
          "label": "Database Integration",
          "description": "Set up database connection, schema management, and data access patterns",
          "needs": {},
          "category": "database",
          "tags": ["data", "persistence", "orm"]
        },
        "api": {
          "label": "API Endpoints",
          "description": "Create REST or GraphQL API endpoints with proper routing and middleware",
          "needs": {},
          "category": "api",
          "tags": ["rest", "graphql", "routing"]
        },
        "ui": {
          "label": "User Interface",
          "description": "Build responsive user interface components with modern design patterns",
          "needs": {},
          "category": "ui",
          "tags": ["frontend", "components", "responsive"]
        },
        "storage": {
          "label": "File Storage",
          "description": "Add file upload, storage, and media management capabilities",
          "needs": {},
          "category": "storage",
          "tags": ["files", "upload", "media"]
        },
        "payments": {
          "label": "Payment Processing",
          "description": "Integrate payment processing, subscriptions, and billing management",
          "needs": {
            "database": "required"
          },
          "category": "payments",
          "tags": ["billing", "subscriptions", "commerce"]
        },
        "analytics": {
          "label": "Analytics Tracking",
          "description": "Add user analytics, event tracking, and performance monitoring",
          "needs": {},
          "category": "analytics",
          "tags": ["tracking", "metrics", "insights"]
        }
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
 * Handle lint command for template validation with intelligent suggestions
 */
async function handleLintCommand(options) {
  const { TemplateValidator } = await import('../../lib/validation/template-validator.mjs');
  const fs = await import('fs/promises');

  try {
    const validator = new TemplateValidator();
    const templateFile = options[TERMINOLOGY.OPTION.LINT_FILE] || 'template.json';
    const enableSuggestions = options[TERMINOLOGY.OPTION.SUGGEST] || options[TERMINOLOGY.OPTION.FIX];

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
          if (warning.path && warning.path.length > 0) {
            console.log(`      Path: ${warning.path.join('.')}`);
          }
          if (enableSuggestions && warning.suggestion) {
            console.log(`      💡 Suggestion: ${warning.suggestion}`);
          }
        });
      }
    } else {
      console.log('❌ Template validation failed!');
      console.log('');
      console.log('📋 Validation Summary:');
      console.log(`   • Errors: ${result.errors.length}`);
      console.log(`   • Warnings: ${result.warnings.length}`);
      console.log('');

      // Handle auto-fix if requested
      if (options.fix) {
        const fixesApplied = await applyIntelligentFixes(templateFile, result.errors);
        if (fixesApplied > 0) {
          console.log(`🔧 Applied ${fixesApplied} automatic fix(es)`);
          console.log('');
          // Re-validate after fixes
          console.log('� Re-validating after fixes...');
          const revalidateResult = await validator.validate(templateFile, 'strict');
          if (revalidateResult.valid) {
            console.log('✅ Template validation passed after fixes!');
            return;
          } else {
            console.log('⚠️  Some issues remain after auto-fixes');
            result.errors = revalidateResult.errors;
            result.warnings = revalidateResult.warnings;
          }
        }
      }

      console.log('�🚨 Errors:');
      result.errors.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error.message}`);
        if (error.path && error.path.length > 0) {
          console.log(`      Path: ${error.path.join('.')}`);
        }
        if (enableSuggestions && error.suggestion) {
          console.log(`      💡 Suggestion: ${error.suggestion}`);
        }
        if (enableSuggestions && error.command) {
          console.log(`      🛠️  Command: ${error.command}`);
        }
      });

      if (result.warnings.length > 0) {
        console.log('');
        console.log('⚠️  Warnings:');
        result.warnings.forEach((warning, i) => {
          console.log(`   ${i + 1}. ${warning.message}`);
          if (warning.path && warning.path.length > 0) {
            console.log(`      Path: ${warning.path.join('.')}`);
          }
          if (enableSuggestions && warning.suggestion) {
            console.log(`      💡 Suggestion: ${warning.suggestion}`);
          }
        });
      }

      process.exit(1);
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      handleError(`Template file not found: ${options[TERMINOLOGY.OPTION.LINT_FILE] || 'template.json'}`);
    } else {
      handleError(`Lint failed: ${error.message}`);
    }
  }
}

/**
 * Apply intelligent fixes for safe validation errors
 * @param {string} templateFile - Path to template file
 * @param {Array} errors - Validation errors
 * @returns {Promise<number>} Number of fixes applied
 */
async function applyIntelligentFixes(templateFile, errors) {
  const fs = await import('fs/promises');
  let fixesApplied = 0;

  try {
    // Read current template
    const templateContent = await fs.readFile(templateFile, 'utf8');
    let template = JSON.parse(templateContent);

    for (const error of errors) {
      if (error.type === 'DOMAIN_ERROR' && error.autoFix) {
        try {
          // Apply the fix based on error type
          switch (error.autoFix.type) {
            case 'add-missing-feature-spec':
              if (!template.featureSpecs) {
                template.featureSpecs = {};
              }
              template.featureSpecs[error.autoFix.feature] = {
                label: error.autoFix.feature.charAt(0).toUpperCase() + error.autoFix.feature.slice(1).replace(/_/g, ' '),
                description: `Description for ${error.autoFix.feature} feature`,
                needs: {}
              };
              fixesApplied++;
              console.log(`   ✓ Added missing feature spec for '${error.autoFix.feature}'`);
              break;

            case 'add-missing-dimension':
              if (!template.dimensions) {
                template.dimensions = {};
              }
              template.dimensions[error.autoFix.dimension] = {
                values: []
              };
              fixesApplied++;
              console.log(`   ✓ Added missing dimension '${error.autoFix.dimension}'`);
              break;

            case 'fix-schema-version':
              template.schemaVersion = '1.0.0';
              fixesApplied++;
              console.log(`   ✓ Updated schema version to '1.0.0'`);
              break;

            case 'fix-id-format':
              // Simple heuristic: convert to lowercase and replace spaces/underscores with hyphens
              const fixedId = error.autoFix.currentId.toLowerCase()
                .replace(/[^a-z0-9-/]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');
              if (fixedId.includes('/')) {
                template.id = fixedId;
                fixesApplied++;
                console.log(`   ✓ Fixed ID format to '${fixedId}'`);
              }
              break;
          }
        } catch (fixError) {
          console.log(`   ⚠️  Failed to apply fix for: ${error.message}`);
        }
      }
    }

    // Write back if any fixes were applied
    if (fixesApplied > 0) {
      await fs.writeFile(templateFile, JSON.stringify(template, null, 2));
    }

    return fixesApplied;
  } catch (error) {
    console.log(`   ⚠️  Error during auto-fix: ${error.message}`);
    return fixesApplied;
  }
}

/**
 * Handle add-dimension command for adding dimensions to templates
 */
async function handleAddDimensionCommand(options) {
  const fs = await import('fs/promises');

  try {
    const dimensionName = options[TERMINOLOGY.OPTION.ADD_DIMENSION];
    const templateFile = 'template.json';

    // Validate dimension name
    if (!/^[a-z][a-z0-9_-]*$/.test(dimensionName)) {
      console.log(`❌ Invalid dimension name: ${dimensionName}`);
      console.log('   Dimension names must match pattern: ^[a-z][a-z0-9_-]*$');
      process.exit(1);
    }

    // Check if template.json exists
    try {
      await fs.access(templateFile);
    } catch (error) {
      console.log(`❌ Template file not found: ${templateFile}`);
      console.log('   Run "make-template --init" first to create a template.');
      process.exit(1);
    }

    // Read and parse template
    const templateContent = await fs.readFile(templateFile, 'utf8');
    const template = JSON.parse(templateContent);

    // Check if dimension already exists
    if (template.dimensions && template.dimensions[dimensionName]) {
      console.log(`❌ Dimension '${dimensionName}' already exists in template.`);
      process.exit(1);
    }

    // Initialize dimensions if not present
    if (!template.dimensions) {
      template.dimensions = {};
    }

    // Add the new dimension with default structure
    template.dimensions[dimensionName] = {
      values: []
    };

    // Write back to file
    await fs.writeFile(templateFile, JSON.stringify(template, null, 2));

    console.log(`✅ Added dimension '${dimensionName}' to ${templateFile}`);
    console.log('');
    console.log('📋 Next steps:');
    console.log(`   1. Edit ${templateFile} to add values to the '${dimensionName}' dimension`);
    console.log('   2. Run "make-template --lint" to validate your changes');

  } catch (error) {
    handleError(`Add dimension failed: ${error.message}`);
  }
}

/**
 * Handle set-compat command for setting platform compatibility gates
 */
async function handleSetCompatCommand(options) {
  const fs = await import('fs/promises');

  try {
    const platform = options[TERMINOLOGY.OPTION.SET_COMPAT];
    const templateFile = 'template.json';

    // Validate platform name
    if (!platform || platform.trim() === '') {
      console.log('❌ Platform name is required for --set-compat');
      console.log('   Usage: make-template --set-compat <platform>');
      process.exit(1);
    }

    // Check if template.json exists
    try {
      await fs.access(templateFile);
    } catch (error) {
      console.log(`❌ Template file not found: ${templateFile}`);
      console.log('   Run "make-template --init" first to create a template.');
      process.exit(1);
    }

    // Read and parse template
    const templateContent = await fs.readFile(templateFile, 'utf8');
    const template = JSON.parse(templateContent);

    // Initialize gates if not present
    if (!template.gates) {
      template.gates = {};
    }

    // Check if gate already exists
    if (template.gates[platform]) {
      console.log(`⚠️  Gate for platform '${platform}' already exists.`);
      console.log('   Edit template.json directly to modify existing gates.');
      process.exit(1);
    }

    // Add the new gate with default structure
    template.gates[platform] = {
      platform: platform,
      constraint: `Platform-specific constraints for ${platform}`,
      allowed: {},
      forbidden: {}
    };

    // Write back to file
    await fs.writeFile(templateFile, JSON.stringify(template, null, 2));

    console.log(`✅ Added compatibility gate for platform '${platform}' to ${templateFile}`);
    console.log('');
    console.log('📋 Next steps:');
    console.log(`   1. Edit ${templateFile} to configure allowed/forbidden values for dimensions`);
    console.log('   2. Run "make-template --lint" to validate your changes');

  } catch (error) {
    handleError(`Set compatibility failed: ${error.message}`);
  }
}

/**
 * Handle set-needs command for configuring feature requirements
 */
async function handleSetNeedsCommand(options) {
  const fs = await import('fs/promises');

  try {
    const feature = options[TERMINOLOGY.OPTION.SET_NEEDS];
    const templateFile = 'template.json';

    // Validate feature name
    if (!feature || feature.trim() === '') {
      console.log('❌ Feature name is required for --set-needs');
      console.log('   Usage: make-template --set-needs <feature>');
      process.exit(1);
    }

    // Check if template.json exists
    try {
      await fs.access(templateFile);
    } catch (error) {
      console.log(`❌ Template file not found: ${templateFile}`);
      console.log('   Run "make-template --init" first to create a template.');
      process.exit(1);
    }

    // Read and parse template
    const templateContent = await fs.readFile(templateFile, 'utf8');
    const template = JSON.parse(templateContent);

    // Check if feature exists in dimensions
    if (!template.dimensions?.features?.values?.includes(feature)) {
      console.log(`❌ Feature '${feature}' not found in template dimensions.`);
      console.log('   Add the feature to dimensions.features.values first.');
      process.exit(1);
    }

    // Initialize featureSpecs if not present
    if (!template.featureSpecs) {
      template.featureSpecs = {};
    }

    // Check if feature spec already exists
    if (template.featureSpecs[feature]) {
      console.log(`⚠️  Feature spec for '${feature}' already exists.`);
      console.log('   Edit template.json directly to modify existing feature specs.');
      process.exit(1);
    }

    // Add the new feature spec with default structure
    template.featureSpecs[feature] = {
      label: feature.charAt(0).toUpperCase() + feature.slice(1).replace(/_/g, ' '),
      description: `Description for ${feature} feature`,
      needs: {}
    };

    // Write back to file
    await fs.writeFile(templateFile, JSON.stringify(template, null, 2));

    console.log(`✅ Added feature spec for '${feature}' to ${templateFile}`);
    console.log('');
    console.log('📋 Next steps:');
    console.log(`   1. Edit ${templateFile} to configure needs requirements for the feature`);
    console.log('   2. Run "make-template --lint" to validate your changes');

  } catch (error) {
    handleError(`Set needs failed: ${error.message}`);
  }
}

/**
 * Handle bulk-add-dimensions command for adding multiple dimensions to templates
 */
async function handleBulkAddDimensionsCommand(options) {
  const fs = await import('fs/promises');

  try {
    const dimensionNamesStr = options[TERMINOLOGY.OPTION.BULK_ADD_DIMENSIONS];
    const templateFile = 'template.json';

    // Parse dimension names
    const dimensionNames = dimensionNamesStr.split(',').map(name => name.trim()).filter(name => name.length > 0);

    if (dimensionNames.length === 0) {
      console.log('❌ No dimension names provided');
      console.log('   Usage: make-template --bulk-add-dimensions <name1,name2,name3>');
      process.exit(1);
    }

    // Validate all dimension names
    const invalidNames = dimensionNames.filter(name => !/^[a-z][a-z0-9_-]*$/.test(name));
    if (invalidNames.length > 0) {
      console.log(`❌ Invalid dimension names: ${invalidNames.join(', ')}`);
      console.log('   Dimension names must match pattern: ^[a-z][a-z0-9_-]*$');
      process.exit(1);
    }

    // Check if template.json exists
    try {
      await fs.access(templateFile);
    } catch (error) {
      console.log(`❌ Template file not found: ${templateFile}`);
      console.log('   Run "make-template --init" first to create a template.');
      process.exit(1);
    }

    // Read and parse template
    const templateContent = await fs.readFile(templateFile, 'utf8');
    const template = JSON.parse(templateContent);

    // Initialize dimensions if not present
    if (!template.dimensions) {
      template.dimensions = {};
    }

    // Track added and skipped dimensions
    const added = [];
    const skipped = [];

    for (const dimensionName of dimensionNames) {
      if (template.dimensions[dimensionName]) {
        skipped.push(dimensionName);
      } else {
        template.dimensions[dimensionName] = {
          values: []
        };
        added.push(dimensionName);
      }
    }

    // Write back to file if any dimensions were added
    if (added.length > 0) {
      await fs.writeFile(templateFile, JSON.stringify(template, null, 2));
    }

    // Report results
    if (added.length > 0) {
      console.log(`✅ Added ${added.length} dimension(s) to ${templateFile}:`);
      added.forEach(name => console.log(`   + ${name}`));
    }

    if (skipped.length > 0) {
      console.log(`⚠️  Skipped ${skipped.length} existing dimension(s):`);
      skipped.forEach(name => console.log(`   - ${name} (already exists)`));
    }

    if (added.length > 0) {
      console.log('');
      console.log('📋 Next steps:');
      console.log(`   1. Edit ${templateFile} to add values to the new dimensions`);
      console.log('   2. Run "make-template --lint" to validate your changes');
    }

  } catch (error) {
    handleError(`Bulk add dimensions failed: ${error.message}`);
  }
}

/**
 * Handle bulk-set-compat command for setting compatibility gates for multiple platforms
 */
async function handleBulkSetCompatCommand(options) {
  const fs = await import('fs/promises');

  try {
    const platformsStr = options[TERMINOLOGY.OPTION.BULK_SET_COMPAT];
    const templateFile = 'template.json';

    // Parse platform names
    const platforms = platformsStr.split(',').map(name => name.trim()).filter(name => name.length > 0);

    if (platforms.length === 0) {
      console.log('❌ No platform names provided');
      console.log('   Usage: make-template --bulk-set-compat <platform1,platform2,platform3>');
      process.exit(1);
    }

    // Check if template.json exists
    try {
      await fs.access(templateFile);
    } catch (error) {
      console.log(`❌ Template file not found: ${templateFile}`);
      console.log('   Run "make-template --init" first to create a template.');
      process.exit(1);
    }

    // Read and parse template
    const templateContent = await fs.readFile(templateFile, 'utf8');
    const template = JSON.parse(templateContent);

    // Initialize gates if not present
    if (!template.gates) {
      template.gates = {};
    }

    // Track added and skipped platforms
    const added = [];
    const skipped = [];

    for (const platform of platforms) {
      if (template.gates[platform]) {
        skipped.push(platform);
      } else {
        template.gates[platform] = {
          platform: platform,
          constraint: `Platform-specific constraints for ${platform}`,
          allowed: {},
          forbidden: {}
        };
        added.push(platform);
      }
    }

    // Write back to file if any gates were added
    if (added.length > 0) {
      await fs.writeFile(templateFile, JSON.stringify(template, null, 2));
    }

    // Report results
    if (added.length > 0) {
      console.log(`✅ Added compatibility gates for ${added.length} platform(s) to ${templateFile}:`);
      added.forEach(name => console.log(`   + ${name}`));
    }

    if (skipped.length > 0) {
      console.log(`⚠️  Skipped ${skipped.length} existing platform(s):`);
      skipped.forEach(name => console.log(`   - ${name} (already exists)`));
    }

    if (added.length > 0) {
      console.log('');
      console.log('📋 Next steps:');
      console.log(`   1. Edit ${templateFile} to configure allowed/forbidden values for the new gates`);
      console.log('   2. Run "make-template --lint" to validate your changes');
    }

  } catch (error) {
    handleError(`Bulk set compatibility failed: ${error.message}`);
  }
}

/**
 * Handle bulk-set-needs command for configuring requirements for multiple features
 */
async function handleBulkSetNeedsCommand(options) {
  const fs = await import('fs/promises');

  try {
    const featuresStr = options[TERMINOLOGY.OPTION.BULK_SET_NEEDS];
    const templateFile = 'template.json';

    // Parse feature names
    const features = featuresStr.split(',').map(name => name.trim()).filter(name => name.length > 0);

    if (features.length === 0) {
      console.log('❌ No feature names provided');
      console.log('   Usage: make-template --bulk-set-needs <feature1,feature2,feature3>');
      process.exit(1);
    }

    // Check if template.json exists
    try {
      await fs.access(templateFile);
    } catch (error) {
      console.log(`❌ Template file not found: ${templateFile}`);
      console.log('   Run "make-template --init" first to create a template.');
      process.exit(1);
    }

    // Read and parse template
    const templateContent = await fs.readFile(templateFile, 'utf8');
    const template = JSON.parse(templateContent);

    // Check if features exist in dimensions
    const availableFeatures = template.dimensions?.features?.values || [];
    const missingFeatures = features.filter(feature => !availableFeatures.includes(feature));

    if (missingFeatures.length > 0) {
      console.log(`❌ Features not found in template dimensions: ${missingFeatures.join(', ')}`);
      console.log('   Add these features to dimensions.features.values first.');
      process.exit(1);
    }

    // Initialize featureSpecs if not present
    if (!template.featureSpecs) {
      template.featureSpecs = {};
    }

    // Track added and skipped features
    const added = [];
    const skipped = [];

    for (const feature of features) {
      if (template.featureSpecs[feature]) {
        skipped.push(feature);
      } else {
        template.featureSpecs[feature] = {
          label: feature.charAt(0).toUpperCase() + feature.slice(1).replace(/_/g, ' '),
          description: `Description for ${feature} feature`,
          needs: {}
        };
        added.push(feature);
      }
    }

    // Write back to file if any specs were added
    if (added.length > 0) {
      await fs.writeFile(templateFile, JSON.stringify(template, null, 2));
    }

    // Report results
    if (added.length > 0) {
      console.log(`✅ Added feature specs for ${added.length} feature(s) to ${templateFile}:`);
      added.forEach(name => console.log(`   + ${name}`));
    }

    if (skipped.length > 0) {
      console.log(`⚠️  Skipped ${skipped.length} existing feature(s):`);
      skipped.forEach(name => console.log(`   - ${name} (already exists)`));
    }

    if (added.length > 0) {
      console.log('');
      console.log('📋 Next steps:');
      console.log(`   1. Edit ${templateFile} to configure needs requirements for the new features`);
      console.log('   2. Run "make-template --lint" to validate your changes');
    }

  } catch (error) {
    handleError(`Bulk set needs failed: ${error.message}`);
  }
}

/**
 * Handle preview command for rendering UI preview based on hints
 */
async function handlePreviewCommand(options) {
  const fs = await import('fs/promises');

  try {
    const templateFile = 'template.json';

    // Check if template.json exists
    try {
      await fs.access(templateFile);
    } catch (error) {
      console.log(`❌ Template file not found: ${templateFile}`);
      console.log('   Run "make-template --init" first to create a template.');
      process.exit(1);
    }

    // Read and parse template
    const templateContent = await fs.readFile(templateFile, 'utf8');
    const template = JSON.parse(templateContent);

    console.log('🎨 Template Preview');
    console.log('==================');

    // Display basic template info
    console.log(`Name: ${template.name || 'Unnamed Template'}`);
    console.log(`ID: ${template.id || 'No ID'}`);
    console.log(`Description: ${template.description || 'No description'}`);
    console.log('');

    // Display constants
    if (template.constants) {
      console.log('📋 Constants:');
      Object.entries(template.constants).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
      });
      console.log('');
    }

    // Display dimensions
    if (template.dimensions) {
      console.log('🔧 Dimensions:');
      Object.entries(template.dimensions).forEach(([dimName, dimConfig]) => {
        console.log(`   ${dimName}: [${dimConfig.values?.join(', ') || 'none'}]`);
      });
      console.log('');
    }

    // Display features from hints catalog
    if (template.hints?.features) {
      console.log('✨ Available Features:');
      Object.entries(template.hints.features).forEach(([featureName, featureInfo]) => {
        console.log(`   ${featureInfo.label || featureName}`);
        console.log(`     ${featureInfo.description || 'No description'}`);
        if (featureInfo.category) {
          console.log(`     Category: ${featureInfo.category}`);
        }
        console.log('');
      });
    }

    // Display gates
    if (template.gates) {
      console.log('🚧 Platform Gates:');
      Object.entries(template.gates).forEach(([platform, gateConfig]) => {
        console.log(`   ${platform}: ${gateConfig.constraint || 'No constraint specified'}`);
      });
      console.log('');
    }

  } catch (error) {
    handleError(`Preview failed: ${error.message}`);
  }
}

/**
 * Handle migrate command for upgrading legacy templates to V1
 */
async function handleMigrateCommand(options) {
  const fs = await import('fs/promises');

  try {
    const templateFile = options[TERMINOLOGY.OPTION.MIGRATE_FILE] || 'template.json';

    // Check if template file exists
    try {
      await fs.access(templateFile);
    } catch (error) {
      console.log(`❌ Template file not found: ${templateFile}`);
      process.exit(1);
    }

    // Read and parse template
    const templateContent = await fs.readFile(templateFile, 'utf8');
    const template = JSON.parse(templateContent);

    console.log(`🔄 Migrating ${templateFile} to V1 format...`);

    // Check if already V1
    if (template.schemaVersion === '1.0.0') {
      console.log('✅ Template is already in V1 format.');
      return;
    }

    // Perform migration
    const migratedTemplate = migrateToV1(template);

    // Create backup
    const backupFile = `${templateFile}.backup`;
    await fs.writeFile(backupFile, templateContent);
    console.log(`📋 Created backup: ${backupFile}`);

    // Write migrated template
    await fs.writeFile(templateFile, JSON.stringify(migratedTemplate, null, 2));

    console.log(`✅ Successfully migrated ${templateFile} to V1 format!`);
    console.log('');
    console.log('📋 Next steps:');
    console.log('   1. Run "make-template --lint" to validate the migrated template');
    console.log('   2. Review and customize the new V1 features (gates, hints, etc.)');

  } catch (error) {
    handleError(`Migration failed: ${error.message}`);
  }
}

/**
 * Migrate legacy template to V1 format
 */
function migrateToV1(legacyTemplate) {
  const v1Template = {
    schemaVersion: '1.0.0',
    id: legacyTemplate.id || 'migrated/template',
    name: legacyTemplate.name || 'Migrated Template',
    description: legacyTemplate.description || 'Migrated from legacy format',
    tags: legacyTemplate.tags || [],
    author: legacyTemplate.author || 'Unknown',
    license: legacyTemplate.license || 'MIT',
    constants: {},
    dimensions: {},
    gates: {},
    featureSpecs: {},
    hints: {
      features: {}
    }
  };

  // Migrate dimensions
  if (legacyTemplate.dimensions) {
    v1Template.dimensions = legacyTemplate.dimensions;
  }

  // Migrate gates if they exist in legacy format
  if (legacyTemplate.gates) {
    v1Template.gates = legacyTemplate.gates;
  }

  // Migrate feature specs
  if (legacyTemplate.featureSpecs) {
    v1Template.featureSpecs = legacyTemplate.featureSpecs;
  }

  // Migrate hints
  if (legacyTemplate.hints) {
    v1Template.hints = legacyTemplate.hints;
  }

  return v1Template;
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

  // Load configuration early
  let config = {};
  try {
    const configManager = createConfigManager({
      toolName: 'make-template',
      toolConfigKey: 'make-template',
      envPrefix: 'MAKE_TEMPLATE',
      configFileName: '.m5nvrc',
      migrationSupport: true,
      defaults: {}
    });
    config = await configManager.load();
  } catch (error) {
    // Log config errors but don't fail - tools should be usable without config
    console.warn(`Warning: Failed to load configuration: ${error.message}`);
  }

  // Check if this is a command-based invocation BEFORE parsing arguments
  const firstArg = Array.isArray(argv) ? argv[0] : process.argv[2]; // First argument after 'make-template'

  // List of valid commands
  const validCommands = [TERMINOLOGY.COMMAND.CONVERT, TERMINOLOGY.COMMAND.RESTORE, TERMINOLOGY.COMMAND.INIT, TERMINOLOGY.COMMAND.VALIDATE, TERMINOLOGY.COMMAND.HINTS, TERMINOLOGY.COMMAND.TEST];

  if (firstArg && validCommands.includes(firstArg)) {
    // Use new command routing - dynamically import the command
    let commandModule;
    switch (firstArg) {
      case TERMINOLOGY.COMMAND.CONVERT:
        commandModule = await import('./commands/convert.mjs');
        break;
      case TERMINOLOGY.COMMAND.RESTORE:
        commandModule = await import('./commands/restore.mjs');
        break;
      case TERMINOLOGY.COMMAND.INIT:
        commandModule = await import('./commands/init.mjs');
        break;
      case TERMINOLOGY.COMMAND.VALIDATE:
        commandModule = await import('./commands/validate.mjs');
        break;
      case TERMINOLOGY.COMMAND.HINTS:
        commandModule = await import('./commands/hints.mjs');
        break;
      case TERMINOLOGY.COMMAND.TEST:
        commandModule = await import('./commands/test.mjs');
        break;
    }
    // Pass remaining arguments and config to the command
    const remainingArgs = Array.isArray(argv) ? argv.slice(1) : process.argv.slice(3);
    const exitCode = await commandModule.main(remainingArgs, config);
    process.exit(exitCode);
  }

  // No valid command provided - show help
  displayHelp();
  process.exit(0);
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