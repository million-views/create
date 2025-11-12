#!/usr/bin/env node

/**
 * @m5nv/make-template CLI Entry Point
 *
 * Converts existing Node.js projects into reusable templates
 * compatible with @m5nv/create-scaffold.
 */

import { access, constants } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { realpathSync } from 'node:fs';
import { PROJECT_TYPES } from '../../lib/shared/make-template/config.mjs';
import { TERMINOLOGY } from '../../lib/shared/ontology.mjs';
import { createConfigManager } from '../../lib/cli/config-manager.mjs';
import { generateHelp } from '../../lib/cli/help-generator.mjs';
import { handleError, ErrorMessages, ErrorContext } from '../../lib/shared/utils/error-handler.mjs';
import { Logger } from '../../lib/shared/utils/Logger.getInstance().mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// When tests call main(argv) in-process we set this flag so error handling
// can throw instead of calling process.exit which would kill the test runner.
let IN_PROCESS = false;

/**
 * Display help text and usage information
 */
function displayHelp(disclosureLevel = 'basic') {
  const helpText = generateHelp({
    toolName: '@m5nv/make-template',
    description: 'Convert existing Node.js projects into reusable templates compatible with @m5nv/create-scaffold',
    commands: {
      convert: {
        description: 'Convert project to template',
        disclosureLevel: 'basic',
        options: {
          'dry-run': { type: 'boolean', description: 'Preview changes without executing them', disclosureLevel: 'basic' },
          'yes': { type: 'boolean', short: 'y', description: 'Skip confirmation prompts', disclosureLevel: 'basic' },
          'silent': { type: 'boolean', description: 'Suppress prompts and non-essential output', disclosureLevel: 'intermediate' },
          'type': { type: 'string', description: 'Force specific project type detection', disclosureLevel: 'intermediate' },
          'placeholder-format': { type: 'string', description: 'Specify placeholder format', disclosureLevel: 'advanced' },
          'sanitize-undo': { type: 'boolean', description: 'Remove sensitive data from undo log', disclosureLevel: 'advanced' }
        }
      },
      restore: {
        description: 'Restore template to project',
        disclosureLevel: 'basic',
        options: {
          'restore-files': { type: 'string', description: 'Restore only specified files (comma-separated)', disclosureLevel: 'intermediate' },
          'restore-placeholders': { type: 'boolean', description: 'Restore only placeholder values, keep files', disclosureLevel: 'intermediate' },
          'generate-defaults': { type: 'boolean', description: 'Generate .restore-defaults.json configuration', disclosureLevel: 'advanced' }
        }
      },
      init: {
        description: 'Generate skeleton template.json',
        disclosureLevel: 'basic',
        options: {
          'init-file': { type: 'string', description: 'Specify output file for skeleton', disclosureLevel: 'intermediate' }
        }
      },
      validate: {
        description: 'Validate template.json',
        disclosureLevel: 'basic',
        options: {
          'lint-file': { type: 'string', description: 'Validate specific template.json file', disclosureLevel: 'intermediate' },
          'suggest': { type: 'boolean', description: 'Show intelligent fix suggestions', disclosureLevel: 'intermediate' },
          'fix': { type: 'boolean', description: 'Auto-apply safe fixes', disclosureLevel: 'advanced' }
        }
      },
      hints: {
        description: 'Show hints catalog',
        disclosureLevel: 'intermediate'
      },
      test: {
        description: 'Test template functionality',
        disclosureLevel: 'intermediate'
      }
    },
    globalOptions: {
      help: { type: 'boolean', short: 'h', description: 'Show help information', disclosureLevel: 'basic' }
    },
    examples: [
      'convert --dry-run    # Preview conversion without making changes',
      'convert --type vite-react --yes    # Convert as Vite React project, skip confirmations',
      'restore --dry-run    # Preview restoration without making changes',
      'restore --yes    # Restore template to working state, skip confirmations',
      'init    # Generate skeleton template.json',
      'validate    # Validate template.json in current directory',
      'hints    # Display hints catalog'
    ],
    disclosureLevel
  });

  Logger.getInstance().info(helpText);
}

/**
 * Validate CLI arguments
 */
function _validateArguments(options) {
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
  const restorationOptions = [
    TERMINOLOGY.OPTION.RESTORE,
    TERMINOLOGY.OPTION.RESTORE_FILES,
    TERMINOLOGY.OPTION.RESTORE_PLACEHOLDERS,
    TERMINOLOGY.OPTION.GENERATE_DEFAULTS
  ];
  const activeRestorationOptions = restorationOptions.filter(
    opt => options[opt]
  );

  if (activeRestorationOptions.length > 1) {
    // Allow restore with restore-files or restore-placeholders
    if (options[TERMINOLOGY.OPTION.RESTORE] &&
        (options[TERMINOLOGY.OPTION.RESTORE_FILES] || options[TERMINOLOGY.OPTION.RESTORE_PLACEHOLDERS])) {
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
/**
 * Validate project directory
 */
async function _validateProjectDirectory() {
  const errors = [];

  try {
    // Check if package.json exists
    await access('package.json', constants.F_OK);
  } catch (_error) {
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
async function _generateDefaultsFile() {
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

    Logger.getInstance().info('✅ Generated .restore-defaults.json configuration file');
    Logger.getInstance().info('');
    Logger.getInstance().info('📝 Edit this file to customize default values for restoration:');
    Logger.getInstance().info('   • Use ${VARIABLE} for environment variable substitution');
    Logger.getInstance().info('   • Set promptForMissing: false to use defaults without prompting');
    Logger.getInstance().info('   • Add your project-specific placeholders and default values');
    Logger.getInstance().info('');
    Logger.getInstance().info('💡 Use this file with: make-template --restore');
  } catch (error) {
    if (error.message.includes('already exists')) {
      Logger.getInstance().info('⚠️  .restore-defaults.json already exists');
      Logger.getInstance().info('💡 Delete the existing file first or edit it directly');
      return;
    }
    handleError(`Failed to create .restore-defaults.json: ${error.message}`);
  }
}

/**
 * Handle CLI errors and exit appropriately
 */
function handleCliError(message, exitCode = 1) {
  if (IN_PROCESS) {
    // Log the error to stderr so in-process test harnesses that capture
    // stderr receive the same messages as spawned CLI invocations.
    Logger.getInstance().error(`Error: ${message}`);
    // Throw an error that tests can catch; include exit code for assertions
    const err = new Error(message);
    err.code = exitCode;
    throw err;
  }

  // Use shared error handler for consistent formatting and suggestions
  const contextualError = ErrorMessages.genericError(
    message,
    ErrorContext.RUNTIME
  );
  handleError(contextualError, { exit: true });
}

/**
 * Handle init command for skeleton template generation
 */
async function _handleInitCommand(options) {
  const fs = await import('fs/promises');
  const path = await import('path');

  try {
    const outputFile = options[TERMINOLOGY.OPTION.INIT_FILE] || 'template.json';
    const outputPath = path.resolve(outputFile);

    // Check if file already exists
    try {
      await fs.access(outputPath);
      Logger.getInstance().info(`⚠️  File ${outputFile} already exists.`);
      Logger.getInstance().info(`   Use --init-file <different-name> to specify a different output file.`);
      process.exit(1);
    } catch (_error) {
      // File doesn't exist, which is what we want
    }

    Logger.getInstance().info(`📝 Generating skeleton template.json at ${outputFile}...`);

    // Generate skeleton template.json
    const skeletonTemplate = generateSkeletonTemplate();

    // Write to file
    await fs.writeFile(outputPath, JSON.stringify(skeletonTemplate, null, 2));

    Logger.getInstance().info('✅ Skeleton template.json generated successfully!');
    Logger.getInstance().info('');
    Logger.getInstance().info('📋 Next steps:');
    Logger.getInstance().info(`   1. Edit ${outputFile} to customize your template`);
    Logger.getInstance().info('   2. Run "make-template --lint" to validate your template');
    Logger.getInstance().info('   3. Test with create-scaffold to ensure it works');

  } catch (error) {
    handleError(`Init failed: ${error.message}`);
  }
}

/**
 * Generate skeleton template.json with proper structure
 */
function generateSkeletonTemplate() {
  return {
    'schemaVersion': '1.0.0',
    'id': 'your-org/your-template-name',
    'name': 'Your Template Name',
    'description': 'A brief description of what this template creates',
    'tags': ['web', 'api', 'fullstack'],
    'author': 'Your Name or Organization',
    'license': 'MIT',
    'constants': {
      'language': 'typescript',
      'framework': 'nextjs',
      'styling': 'tailwind',
      'testing': 'jest',
      'ci': 'github-actions'
    },
    'dimensions': {
      'deployment_target': {
        'values': ['vercel', 'netlify', 'railway', 'render', 'fly', 'heroku']
      },
      'features': {
        'values': ['auth', 'database', 'api', 'ui', 'storage', 'payments', 'analytics']
      },
      'database': {
        'values': ['postgresql', 'mysql', 'sqlite', 'mongodb', 'redis', 'd1', 'tursodb', 'none']
      },
      'storage': {
        'values': ['aws-s3', 'cloudflare-r2', 'vercel-blob', 'local', 'none']
      },
      'auth_providers': {
        'values': ['google', 'github', 'twitter', 'email', 'none']
      },
      'payments': {
        'values': ['stripe', 'paypal', 'none']
      },
      'analytics': {
        'values': ['mixpanel', 'posthog', 'google-analytics', 'plausible', 'none']
      }
    },
    'gates': {
      'cloudflare-workers': {
        'platform': 'edge',
        'constraint': 'Limited runtime capabilities for edge computing',
        'allowed': {
          'database': ['sqlite', 'tursodb', 'd1', 'none'],
          'storage': ['cloudflare-r2', 'none']
        }
      },
      'deno-deploy': {
        'platform': 'edge',
        'constraint': 'Deno runtime with limited storage options',
        'allowed': {
          'database': ['sqlite', 'tursodb', 'none'],
          'storage': ['none']
        }
      },
      'linode': {
        'platform': 'vm',
        'constraint': 'Full VM with file system access',
        'allowed': {
          'database': ['sqlite', 'tursodb', 'postgresql', 'mysql', 'mongodb', 'redis', 'none'],
          'storage': ['local', 'aws-s3', 'none']
        }
      }
    },
    'featureSpecs': {
      'auth': {
        'label': 'Authentication',
        'description': 'Add user authentication system with login/signup flows',
        'needs': {
          'database': 'required'
        },
        'category': 'authentication'
      },
      'database': {
        'label': 'Database Integration',
        'description': 'Set up database connection and schema management',
        'needs': {},
        'category': 'database'
      },
      'api': {
        'label': 'API Routes',
        'description': 'Create REST or GraphQL API endpoints',
        'needs': {},
        'category': 'api'
      },
      'ui': {
        'label': 'User Interface',
        'description': 'Build responsive user interface components',
        'needs': {},
        'category': 'ui'
      },
      'storage': {
        'label': 'File Storage',
        'description': 'Add file upload and storage capabilities',
        'needs': {},
        'category': 'storage'
      },
      'payments': {
        'label': 'Payment Processing',
        'description': 'Integrate payment processing, subscriptions, and billing management',
        'needs': {
          'database': 'required'
        },
        'category': 'payments'
      },
      'analytics': {
        'label': 'Analytics Tracking',
        'description': 'Add user analytics and tracking',
        'needs': {},
        'category': 'analytics'
      }
    },
    'hints': {
      'features': {
        'auth': {
          'label': 'Authentication System',
          'description': 'Add secure user authentication with login/signup flows, password reset, and session management',
          'needs': {
            'database': 'required'
          },
          'category': 'authentication',
          'tags': ['security', 'users', 'login']
        },
        'database': {
          'label': 'Database Integration',
          'description': 'Set up database connection, schema management, and data access patterns',
          'needs': {},
          'category': 'database',
          'tags': ['data', 'persistence', 'orm']
        },
        'api': {
          'label': 'API Endpoints',
          'description': 'Create REST or GraphQL API endpoints with proper routing and middleware',
          'needs': {},
          'category': 'api',
          'tags': ['rest', 'graphql', 'routing']
        },
        'ui': {
          'label': 'User Interface',
          'description': 'Build responsive user interface components with modern design patterns',
          'needs': {},
          'category': 'ui',
          'tags': ['frontend', 'components', 'responsive']
        },
        'storage': {
          'label': 'File Storage',
          'description': 'Add file upload, storage, and media management capabilities',
          'needs': {},
          'category': 'storage',
          'tags': ['files', 'upload', 'media']
        },
        'payments': {
          'label': 'Payment Processing',
          'description': 'Integrate payment processing, subscriptions, and billing management',
          'needs': {
            'database': 'required'
          },
          'category': 'payments',
          'tags': ['billing', 'subscriptions', 'commerce']
        },
        'analytics': {
          'label': 'Analytics Tracking',
          'description': 'Add user analytics, event tracking, and performance monitoring',
          'needs': {},
          'category': 'analytics',
          'tags': ['tracking', 'metrics', 'insights']
        }
      }
    }
  };
}

/**
 * Handle hints command for displaying hints catalog
 */
async function _handleHintsCommand(_options) {
  Logger.getInstance().info('💡 Available Hints Catalog for Template Authoring');
  Logger.getInstance().info('================================================');
  Logger.getInstance().info('');

  Logger.getInstance().info('📋 Feature Hints:');
  Logger.getInstance().info('   These hints provide guidance for template authors when defining features.');
  Logger.getInstance().info('   Use them in your template.json under hints.features to help users understand');
  Logger.getInstance().info('   what each feature provides.');
  Logger.getInstance().info('');

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
    Logger.getInstance().info(`   • ${feature}: ${hint}`);
  }

  Logger.getInstance().info('');
  Logger.getInstance().info('📖 Usage in template.json:');
  Logger.getInstance().info('   {');
  Logger.getInstance().info('     "hints": {');
  Logger.getInstance().info('       "features": {');
  Logger.getInstance().info('         "auth": "Add secure user authentication..."');
  Logger.getInstance().info('       }');
  Logger.getInstance().info('     }');
  Logger.getInstance().info('   }');
  Logger.getInstance().info('');
  Logger.getInstance().info('💡 Tip: Use these hints to provide clear, actionable guidance for template users!');
}

/**
 * Handle lint command for template validation with intelligent suggestions
 */
async function _handleLintCommand(options) {
  const { TemplateValidator } = await import('../../lib/validation/template-validator.mjs');
  const _fs = await import('fs/promises');

  try {
    const validator = new TemplateValidator();
    const templateFile = options[TERMINOLOGY.OPTION.LINT_FILE] || 'template.json';
    const enableSuggestions = options[TERMINOLOGY.OPTION.SUGGEST] || options[TERMINOLOGY.OPTION.FIX];

    Logger.getInstance().info(`🔍 Validating ${templateFile}...`);

    const result = await validator.validate(templateFile, 'strict');

    if (result.valid) {
      Logger.getInstance().info('✅ Template validation passed!');
      Logger.getInstance().info('');
      Logger.getInstance().info('📋 Validation Summary:');
      Logger.getInstance().info(`   • Schema validation: ✅ Passed`);
      Logger.getInstance().info(`   • Domain validation: ✅ Passed`);
      Logger.getInstance().info(`   • Warnings: ${result.warnings.length}`);

      if (result.warnings.length > 0) {
        Logger.getInstance().info('');
        Logger.getInstance().info('⚠️  Warnings:');
        result.warnings.forEach((warning, i) => {
          Logger.getInstance().info(`   ${i + 1}. ${warning.message}`);
          if (warning.path && warning.path.length > 0) {
            Logger.getInstance().info(`      Path: ${warning.path.join('.')}`);
          }
          if (enableSuggestions && warning.suggestion) {
            Logger.getInstance().info(`      💡 Suggestion: ${warning.suggestion}`);
          }
        });
      }
    } else {
      Logger.getInstance().info('❌ Template validation failed!');
      Logger.getInstance().info('');
      Logger.getInstance().info('📋 Validation Summary:');
      Logger.getInstance().info(`   • Errors: ${result.errors.length}`);
      Logger.getInstance().info(`   • Warnings: ${result.warnings.length}`);
      Logger.getInstance().info('');

      // Handle auto-fix if requested
      if (options.fix) {
        const fixesApplied = await applyIntelligentFixes(templateFile, result.errors);
        if (fixesApplied > 0) {
          Logger.getInstance().info(`🔧 Applied ${fixesApplied} automatic fix(es)`);
          Logger.getInstance().info('');
          // Re-validate after fixes
          Logger.getInstance().info('� Re-validating after fixes...');
          const revalidateResult = await validator.validate(templateFile, 'strict');
          if (revalidateResult.valid) {
            Logger.getInstance().info('✅ Template validation passed after fixes!');
            return;
          } else {
            Logger.getInstance().info('⚠️  Some issues remain after auto-fixes');
            result.errors = revalidateResult.errors;
            result.warnings = revalidateResult.warnings;
          }
        }
      }

      Logger.getInstance().info('�🚨 Errors:');
      result.errors.forEach((error, i) => {
        Logger.getInstance().info(`   ${i + 1}. ${error.message}`);
        if (error.path && error.path.length > 0) {
          Logger.getInstance().info(`      Path: ${error.path.join('.')}`);
        }
        if (enableSuggestions && error.suggestion) {
          Logger.getInstance().info(`      💡 Suggestion: ${error.suggestion}`);
        }
        if (enableSuggestions && error.command) {
          Logger.getInstance().info(`      🛠️  Command: ${error.command}`);
        }
      });

      if (result.warnings.length > 0) {
        Logger.getInstance().info('');
        Logger.getInstance().info('⚠️  Warnings:');
        result.warnings.forEach((warning, i) => {
          Logger.getInstance().info(`   ${i + 1}. ${warning.message}`);
          if (warning.path && warning.path.length > 0) {
            Logger.getInstance().info(`      Path: ${warning.path.join('.')}`);
          }
          if (enableSuggestions && warning.suggestion) {
            Logger.getInstance().info(`      💡 Suggestion: ${warning.suggestion}`);
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
    const template = JSON.parse(templateContent);

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
              Logger.getInstance().info(`   ✓ Added missing feature spec for '${error.autoFix.feature}'`);
              break;

            case 'add-missing-dimension':
              if (!template.dimensions) {
                template.dimensions = {};
              }
              template.dimensions[error.autoFix.dimension] = {
                values: []
              };
              fixesApplied++;
              Logger.getInstance().info(`   ✓ Added missing dimension '${error.autoFix.dimension}'`);
              break;

            case 'fix-schema-version':
              template.schemaVersion = '1.0.0';
              fixesApplied++;
              Logger.getInstance().info(`   ✓ Updated schema version to '1.0.0'`);
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
                Logger.getInstance().info(`   ✓ Fixed ID format to '${fixedId}'`);
              }
              break;
          }
        } catch (_fixError) {
          Logger.getInstance().info(`   ⚠️  Failed to apply fix for: ${error.message}`);
        }
      }
    }

    // Write back if any fixes were applied
    if (fixesApplied > 0) {
      await fs.writeFile(templateFile, JSON.stringify(template, null, 2));
    }

    return fixesApplied;
  } catch (error) {
    Logger.getInstance().info(`   ⚠️  Error during auto-fix: ${error.message}`);
    return fixesApplied;
  }
}

/**
 * Handle add-dimension command for adding dimensions to templates
 */
async function _handleAddDimensionCommand(options) {
  const fs = await import('fs/promises');

  try {
    const dimensionName = options[TERMINOLOGY.OPTION.ADD_DIMENSION];
    const templateFile = 'template.json';

    // Validate dimension name
    if (!/^[a-z][a-z0-9_-]*$/.test(dimensionName)) {
      Logger.getInstance().info(`❌ Invalid dimension name: ${dimensionName}`);
      Logger.getInstance().info('   Dimension names must match pattern: ^[a-z][a-z0-9_-]*$');
      process.exit(1);
    }

    // Check if template.json exists
    try {
      await fs.access(templateFile);
    } catch (_error) {
      Logger.getInstance().info(`❌ Template file not found: ${templateFile}`);
      Logger.getInstance().info('   Run "make-template --init" first to create a template.');
      process.exit(1);
    }

    // Read and parse template
    const templateContent = await fs.readFile(templateFile, 'utf8');
    const template = JSON.parse(templateContent);

    // Check if dimension already exists
    if (template.dimensions && template.dimensions[dimensionName]) {
      Logger.getInstance().info(`❌ Dimension '${dimensionName}' already exists in template.`);
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

    Logger.getInstance().info(`✅ Added dimension '${dimensionName}' to ${templateFile}`);
    Logger.getInstance().info('');
    Logger.getInstance().info('📋 Next steps:');
    Logger.getInstance().info(`   1. Edit ${templateFile} to add values to the '${dimensionName}' dimension`);
    Logger.getInstance().info('   2. Run "make-template --lint" to validate your changes');

  } catch (error) {
    handleError(`Add dimension failed: ${error.message}`);
  }
}

/**
 * Handle set-compat command for setting platform compatibility gates
 */
async function _handleSetCompatCommand(options) {
  const fs = await import('fs/promises');

  try {
    const platform = options[TERMINOLOGY.OPTION.SET_COMPAT];
    const templateFile = 'template.json';

    // Validate platform name
    if (!platform || platform.trim() === '') {
      Logger.getInstance().info('❌ Platform name is required for --set-compat');
      Logger.getInstance().info('   Usage: make-template --set-compat <platform>');
      process.exit(1);
    }

    // Check if template.json exists
    try {
      await fs.access(templateFile);
    } catch (_error) {
      Logger.getInstance().info(`❌ Template file not found: ${templateFile}`);
      Logger.getInstance().info('   Run "make-template --init" first to create a template.');
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
      Logger.getInstance().info(`⚠️  Gate for platform '${platform}' already exists.`);
      Logger.getInstance().info('   Edit template.json directly to modify existing gates.');
      process.exit(1);
    }

    // Add the new gate with default structure
    template.gates[platform] = {
      platform,
      constraint: `Platform-specific constraints for ${platform}`,
      allowed: {},
      forbidden: {}
    };

    // Write back to file
    await fs.writeFile(templateFile, JSON.stringify(template, null, 2));

    Logger.getInstance().info(`✅ Added compatibility gate for platform '${platform}' to ${templateFile}`);
    Logger.getInstance().info('');
    Logger.getInstance().info('📋 Next steps:');
    Logger.getInstance().info(`   1. Edit ${templateFile} to configure allowed/forbidden values for dimensions`);
    Logger.getInstance().info('   2. Run "make-template --lint" to validate your changes');

  } catch (error) {
    handleError(`Set compatibility failed: ${error.message}`);
  }
}

/**
 * Handle set-needs command for configuring feature requirements
 */
async function _handleSetNeedsCommand(options) {
  const fs = await import('fs/promises');

  try {
    const feature = options[TERMINOLOGY.OPTION.SET_NEEDS];
    const templateFile = 'template.json';

    // Validate feature name
    if (!feature || feature.trim() === '') {
      Logger.getInstance().info('❌ Feature name is required for --set-needs');
      Logger.getInstance().info('   Usage: make-template --set-needs <feature>');
      process.exit(1);
    }

    // Check if template.json exists
    try {
      await fs.access(templateFile);
    } catch (_error) {
      Logger.getInstance().info(`❌ Template file not found: ${templateFile}`);
      Logger.getInstance().info('   Run "make-template --init" first to create a template.');
      process.exit(1);
    }

    // Read and parse template
    const templateContent = await fs.readFile(templateFile, 'utf8');
    const template = JSON.parse(templateContent);

    // Check if feature exists in dimensions
    if (!template.dimensions?.features?.values?.includes(feature)) {
      Logger.getInstance().info(`❌ Feature '${feature}' not found in template dimensions.`);
      Logger.getInstance().info('   Add the feature to dimensions.features.values first.');
      process.exit(1);
    }

    // Initialize featureSpecs if not present
    if (!template.featureSpecs) {
      template.featureSpecs = {};
    }

    // Check if feature spec already exists
    if (template.featureSpecs[feature]) {
      Logger.getInstance().info(`⚠️  Feature spec for '${feature}' already exists.`);
      Logger.getInstance().info('   Edit template.json directly to modify existing feature specs.');
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

    Logger.getInstance().info(`✅ Added feature spec for '${feature}' to ${templateFile}`);
    Logger.getInstance().info('');
    Logger.getInstance().info('📋 Next steps:');
    Logger.getInstance().info(`   1. Edit ${templateFile} to configure needs requirements for the feature`);
    Logger.getInstance().info('   2. Run "make-template --lint" to validate your changes');

  } catch (error) {
    handleError(`Set needs failed: ${error.message}`);
  }
}

/**
 * Handle bulk-add-dimensions command for adding multiple dimensions to templates
 */
async function _handleBulkAddDimensionsCommand(options) {
  const fs = await import('fs/promises');

  try {
    const dimensionNamesStr = options[TERMINOLOGY.OPTION.BULK_ADD_DIMENSIONS];
    const templateFile = 'template.json';

    // Parse dimension names
    const dimensionNames = dimensionNamesStr.split(',').map(name => name.trim()).filter(name => name.length > 0);

    if (dimensionNames.length === 0) {
      Logger.getInstance().info('❌ No dimension names provided');
      Logger.getInstance().info('   Usage: make-template --bulk-add-dimensions <name1,name2,name3>');
      process.exit(1);
    }

    // Validate all dimension names
    const invalidNames = dimensionNames.filter(name => !/^[a-z][a-z0-9_-]*$/.test(name));
    if (invalidNames.length > 0) {
      Logger.getInstance().info(`❌ Invalid dimension names: ${invalidNames.join(', ')}`);
      Logger.getInstance().info('   Dimension names must match pattern: ^[a-z][a-z0-9_-]*$');
      process.exit(1);
    }

    // Check if template.json exists
    try {
      await fs.access(templateFile);
    } catch (_error) {
      Logger.getInstance().info(`❌ Template file not found: ${templateFile}`);
      Logger.getInstance().info('   Run "make-template --init" first to create a template.');
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
      Logger.getInstance().info(`✅ Added ${added.length} dimension(s) to ${templateFile}:`);
      added.forEach(name => Logger.getInstance().info(`   + ${name}`));
    }

    if (skipped.length > 0) {
      Logger.getInstance().info(`⚠️  Skipped ${skipped.length} existing dimension(s):`);
      skipped.forEach(name => Logger.getInstance().info(`   - ${name} (already exists)`));
    }

    if (added.length > 0) {
      Logger.getInstance().info('');
      Logger.getInstance().info('📋 Next steps:');
      Logger.getInstance().info(`   1. Edit ${templateFile} to add values to the new dimensions`);
      Logger.getInstance().info('   2. Run "make-template --lint" to validate your changes');
    }

  } catch (error) {
    handleError(`Bulk add dimensions failed: ${error.message}`);
  }
}

/**
 * Handle bulk-set-compat command for setting compatibility gates for multiple platforms
 */
async function _handleBulkSetCompatCommand(options) {
  const fs = await import('fs/promises');

  try {
    const platformsStr = options[TERMINOLOGY.OPTION.BULK_SET_COMPAT];
    const templateFile = 'template.json';

    // Parse platform names
    const platforms = platformsStr.split(',').map(name => name.trim()).filter(name => name.length > 0);

    if (platforms.length === 0) {
      Logger.getInstance().info('❌ No platform names provided');
      Logger.getInstance().info('   Usage: make-template --bulk-set-compat <platform1,platform2,platform3>');
      process.exit(1);
    }

    // Check if template.json exists
    try {
      await fs.access(templateFile);
    } catch (_error) {
      Logger.getInstance().info(`❌ Template file not found: ${templateFile}`);
      Logger.getInstance().info('   Run "make-template --init" first to create a template.');
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
          platform,
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
      Logger.getInstance().info(`✅ Added compatibility gates for ${added.length} platform(s) to ${templateFile}:`);
      added.forEach(name => Logger.getInstance().info(`   + ${name}`));
    }

    if (skipped.length > 0) {
      Logger.getInstance().info(`⚠️  Skipped ${skipped.length} existing platform(s):`);
      skipped.forEach(name => Logger.getInstance().info(`   - ${name} (already exists)`));
    }

    if (added.length > 0) {
      Logger.getInstance().info('');
      Logger.getInstance().info('📋 Next steps:');
      Logger.getInstance().info(`   1. Edit ${templateFile} to configure allowed/forbidden values for the new gates`);
      Logger.getInstance().info('   2. Run "make-template --lint" to validate your changes');
    }

  } catch (error) {
    handleError(`Bulk set compatibility failed: ${error.message}`);
  }
}

/**
 * Handle bulk-set-needs command for configuring requirements for multiple features
 */
async function _handleBulkSetNeedsCommand(options) {
  const fs = await import('fs/promises');

  try {
    const featuresStr = options[TERMINOLOGY.OPTION.BULK_SET_NEEDS];
    const templateFile = 'template.json';

    // Parse feature names
    const features = featuresStr.split(',').map(name => name.trim()).filter(name => name.length > 0);

    if (features.length === 0) {
      Logger.getInstance().info('❌ No feature names provided');
      Logger.getInstance().info('   Usage: make-template --bulk-set-needs <feature1,feature2,feature3>');
      process.exit(1);
    }

    // Check if template.json exists
    try {
      await fs.access(templateFile);
    } catch (_error) {
      Logger.getInstance().info(`❌ Template file not found: ${templateFile}`);
      Logger.getInstance().info('   Run "make-template --init" first to create a template.');
      process.exit(1);
    }

    // Read and parse template
    const templateContent = await fs.readFile(templateFile, 'utf8');
    const template = JSON.parse(templateContent);

    // Check if features exist in dimensions
    const availableFeatures = template.dimensions?.features?.values || [];
    const missingFeatures = features.filter(feature => !availableFeatures.includes(feature));

    if (missingFeatures.length > 0) {
      Logger.getInstance().info(`❌ Features not found in template dimensions: ${missingFeatures.join(', ')}`);
      Logger.getInstance().info('   Add these features to dimensions.features.values first.');
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
      Logger.getInstance().info(`✅ Added feature specs for ${added.length} feature(s) to ${templateFile}:`);
      added.forEach(name => Logger.getInstance().info(`   + ${name}`));
    }

    if (skipped.length > 0) {
      Logger.getInstance().info(`⚠️  Skipped ${skipped.length} existing feature(s):`);
      skipped.forEach(name => Logger.getInstance().info(`   - ${name} (already exists)`));
    }

    if (added.length > 0) {
      Logger.getInstance().info('');
      Logger.getInstance().info('📋 Next steps:');
      Logger.getInstance().info(`   1. Edit ${templateFile} to configure needs requirements for the new features`);
      Logger.getInstance().info('   2. Run "make-template --lint" to validate your changes');
    }

  } catch (error) {
    handleError(`Bulk set needs failed: ${error.message}`);
  }
}

/**
 * Handle preview command for rendering UI preview based on hints
 */
async function _handlePreviewCommand(_options) {
  const fs = await import('fs/promises');

  try {
    const templateFile = 'template.json';

    // Check if template.json exists
    try {
      await fs.access(templateFile);
    } catch (_error) {
      Logger.getInstance().info(`❌ Template file not found: ${templateFile}`);
      Logger.getInstance().info('   Run "make-template --init" first to create a template.');
      process.exit(1);
    }

    // Read and parse template
    const templateContent = await fs.readFile(templateFile, 'utf8');
    const template = JSON.parse(templateContent);

    Logger.getInstance().info('🎨 Template Preview');
    Logger.getInstance().info('==================');

    // Display basic template info
    Logger.getInstance().info(`Name: ${template.name || 'Unnamed Template'}`);
    Logger.getInstance().info(`ID: ${template.id || 'No ID'}`);
    Logger.getInstance().info(`Description: ${template.description || 'No description'}`);
    Logger.getInstance().info('');

    // Display constants
    if (template.constants) {
      Logger.getInstance().info('📋 Constants:');
      Object.entries(template.constants).forEach(([key, value]) => {
        Logger.getInstance().info(`   ${key}: ${value}`);
      });
      Logger.getInstance().info('');
    }

    // Display dimensions
    if (template.dimensions) {
      Logger.getInstance().info('🔧 Dimensions:');
      Object.entries(template.dimensions).forEach(([dimName, dimConfig]) => {
        Logger.getInstance().info(`   ${dimName}: [${dimConfig.values?.join(', ') || 'none'}]`);
      });
      Logger.getInstance().info('');
    }

    // Display features from hints catalog
    if (template.hints?.features) {
      Logger.getInstance().info('✨ Available Features:');
      Object.entries(template.hints.features).forEach(([featureName, featureInfo]) => {
        Logger.getInstance().info(`   ${featureInfo.label || featureName}`);
        Logger.getInstance().info(`     ${featureInfo.description || 'No description'}`);
        if (featureInfo.category) {
          Logger.getInstance().info(`     Category: ${featureInfo.category}`);
        }
        Logger.getInstance().info('');
      });
    }

    // Display gates
    if (template.gates) {
      Logger.getInstance().info('🚧 Platform Gates:');
      Object.entries(template.gates).forEach(([platform, gateConfig]) => {
        Logger.getInstance().info(`   ${platform}: ${gateConfig.constraint || 'No constraint specified'}`);
      });
      Logger.getInstance().info('');
    }

  } catch (error) {
    handleError(`Preview failed: ${error.message}`);
  }
}

/**
 * Handle migrate command for upgrading legacy templates to V1
 */
async function _handleMigrateCommand(options) {
  const fs = await import('fs/promises');

  try {
    const templateFile = options[TERMINOLOGY.OPTION.MIGRATE_FILE] || 'template.json';

    // Check if template file exists
    try {
      await fs.access(templateFile);
    } catch (_error) {
      Logger.getInstance().info(`❌ Template file not found: ${templateFile}`);
      process.exit(1);
    }

    // Read and parse template
    const templateContent = await fs.readFile(templateFile, 'utf8');
    const template = JSON.parse(templateContent);

    Logger.getInstance().info(`🔄 Migrating ${templateFile} to V1 format...`);

    // Check if already V1
    if (template.schemaVersion === '1.0.0') {
      Logger.getInstance().info('✅ Template is already in V1 format.');
      return;
    }

    // Perform migration
    const migratedTemplate = migrateToV1(template);

    // Create backup
    const backupFile = `${templateFile}.backup`;
    await fs.writeFile(backupFile, templateContent);
    Logger.getInstance().info(`📋 Created backup: ${backupFile}`);

    // Write migrated template
    await fs.writeFile(templateFile, JSON.stringify(migratedTemplate, null, 2));

    Logger.getInstance().info(`✅ Successfully migrated ${templateFile} to V1 format!`);
    Logger.getInstance().info('');
    Logger.getInstance().info('📋 Next steps:');
    Logger.getInstance().info('   1. Run "make-template --lint" to validate the migrated template');
    Logger.getInstance().info('   2. Review and customize the new V1 features (gates, hints, etc.)');

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
  // Create logger for CLI output
  // const logger = new Logger('console', 'info'); // Not needed - use Logger.getInstance() directly

  let _parsedArgs;
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
    Logger.getInstance().warn(`Warning: Failed to load configuration: ${error.message}`);
  }

  // Check if this is a command-based invocation BEFORE parsing arguments
  const firstArg = Array.isArray(argv) ? argv[0] : process.argv[2]; // First arg after 'make-template'

  // Check for help flags and determine disclosure level
  let showHelp = false;
  let disclosureLevel = 'basic';

  // Check for --help <level> syntax first
  const rawArgs = Array.isArray(argv) ? argv : process.argv.slice(2);
  const helpIndex = rawArgs.indexOf('--help');
  if (helpIndex !== -1) {
    // Check if this is command-specific help (command followed by --help)
    const potentialCommand = rawArgs[helpIndex - 1];
    const validCommands = [
      TERMINOLOGY.COMMAND.CONVERT,
      TERMINOLOGY.COMMAND.RESTORE,
      TERMINOLOGY.COMMAND.INIT,
      TERMINOLOGY.COMMAND.VALIDATE,
      TERMINOLOGY.COMMAND.HINTS,
      TERMINOLOGY.COMMAND.TEST
    ];

    if (potentialCommand && validCommands.includes(potentialCommand)) {
      // This is command-specific help, don't intercept it
      showHelp = false;
    } else {
      // This is global help
      showHelp = true;
      if (helpIndex + 1 < rawArgs.length) {
        const levelArg = rawArgs[helpIndex + 1];
        if (levelArg === 'interactive') {
          disclosureLevel = 'advanced';
        } else if (levelArg === 'advanced') {
          disclosureLevel = 'advanced';
        } else if (levelArg === 'intermediate') {
          disclosureLevel = 'intermediate';
        }
      }
    }
  } else if (firstArg === '--help-interactive') {
    showHelp = true;
    disclosureLevel = 'advanced'; // Interactive shows all
  } else if (firstArg === '--help' || firstArg === '-h') {
    showHelp = true;
  }

  if (showHelp) {
    displayHelp(disclosureLevel);
    process.exit(0);
  }

  // List of valid commands
  const validCommands = [
    TERMINOLOGY.COMMAND.CONVERT,
    TERMINOLOGY.COMMAND.RESTORE,
    TERMINOLOGY.COMMAND.INIT,
    TERMINOLOGY.COMMAND.VALIDATE,
    TERMINOLOGY.COMMAND.HINTS,
    TERMINOLOGY.COMMAND.TEST
  ];

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
process.on('unhandledRejection', (reason, _promise) => {
  // During tests we must not exit the process - allow test harness to
  // surface the rejection. When running normally, exit with failure.
  const runningUnderNodeTest = Array.isArray(process.execArgv) && process.execArgv.includes('--test');
  if (!runningUnderNodeTest && !IN_PROCESS) {
    const contextualError = ErrorMessages.genericError(
      `Unhandled promise rejection: ${reason}`,
      ErrorContext.RUNTIME
    );
    handleError(contextualError, { exit: true });
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  const runningUnderNodeTest = Array.isArray(process.execArgv) && process.execArgv.includes('--test');
  if (!runningUnderNodeTest && !IN_PROCESS) {
    const contextualError = ErrorMessages.genericError(
      `Uncaught exception: ${error.message}`,
      ErrorContext.RUNTIME
    );
    handleError(contextualError, { exit: true });
  }
});

// If this file is executed directly (not imported), run main().
// Check if this is the main module by comparing the resolved script path
// with the actual file path, handling symlinks correctly.
if (process.argv[1] && realpathSync(process.argv[1]) === __filename) {
  main().catch((error) => {
    handleCliError(error.message);
  });
}
