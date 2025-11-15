#!/usr/bin/env node

/**
 * make-template validate command
 * Validates template.json against schema with intelligent suggestions
 */

import { parseArgs } from 'util';
import { realpathSync } from 'fs';
import { TemplateValidator } from '../../../lib/validation/template-validator.mjs';
import { TERMINOLOGY } from '../../../lib/shared/ontology.mjs';
import { handleArgumentParsingError, withErrorHandling } from '../../../lib/shared/error-handler.mjs';
import { Logger } from '../../../lib/shared/utils/logger.mjs';

// Command-specific options schema
const OPTIONS_SCHEMA = {
  // Core validate options
  [TERMINOLOGY.OPTION.HELP]: {
    type: 'boolean',
    short: 'h',
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
  }
};

/**
 * Execute validate command with pre-parsed arguments
 * @param {object} args - Pre-parsed command arguments
 * @returns {Promise<number>} Exit code
 */
export async function executeValidateCommand(args) {
  // Convert the args object to the format expected by the existing main function
  const argv = [];

  // Add options
  if (args['lint-file']) {
    argv.push('--lint-file');
    argv.push(args['lint-file']);
  }
  if (args.suggest) argv.push('--suggest');
  if (args.fix) argv.push('--fix');

  // Add positional arguments
  if (args.templatePath) argv.push(args.templatePath);

  // Call the existing main function
  return await main(argv);
}

/**
 * Display help text for validate command
 */
function displayHelp(logger) {
  const helpText = `
make-template validate - Validate template.json against schema

DESCRIPTION:
  Validate template.json files against the schema with intelligent fix
  suggestions and automatic corrections for common issues.

Usage:
  make-template validate [options] [template-file]

OPTIONS:
  -h, --help                    Show this help message
      --lint-file <file>        Validate specific template.json file
      --suggest                 Show intelligent fix suggestions for validation errors
      --fix                     Auto-apply safe fixes for validation errors

ARGUMENTS:
  template-file                Template file to validate (default: template.json)

VALIDATION EXAMPLES:
  make-template validate
    Validate template.json in current directory

  make-template validate path/to/template.json
    Validate specific template.json file

  make-template validate --suggest
    Validate and show fix suggestions

  make-template validate --fix
    Validate and auto-apply safe fixes

For more information, visit: https://github.com/m5nv/make-template
`;

  logger.info(helpText.trim());
}

/**
 * Apply intelligent fixes for safe validation errors
 * @param {string} templateFile - Path to template file
 * @param {Array} errors - Validation errors
 * @param {Logger} logger - Logger instance
 * @returns {Promise<number>} Number of fixes applied
 */
async function applyIntelligentFixes(templateFile, errors, logger) {
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
              logger.info(`   ✓ Added missing feature spec for '${error.autoFix.feature}'`);
              break;

            case 'add-missing-dimension':
              if (!template.dimensions) {
                template.dimensions = {};
              }
              template.dimensions[error.autoFix.dimension] = {
                values: []
              };
              fixesApplied++;
              logger.info(`   ✓ Added missing dimension '${error.autoFix.dimension}'`);
              break;

            case 'fix-schema-version':
              template.schemaVersion = '1.0.0';
              fixesApplied++;
              logger.info(`   ✓ Updated schema version to '1.0.0'`);
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
                logger.info(`   ✓ Fixed ID format to '${fixedId}'`);
              }
              break;
          }
        } catch (_fixError) {
          logger.warn(`   Failed to apply fix for: ${error.message}`);
        }
      }
    }

    // Write back if any fixes were applied
    if (fixesApplied > 0) {
      await fs.writeFile(templateFile, JSON.stringify(template, null, 2));
    }

    return fixesApplied;
  } catch (error) {
    logger.warn(`   Error during auto-fix: ${error.message}`);
    return fixesApplied;
  }
}

/**
 * Handle CLI errors and exit appropriately
 */
function handleCliError(message, exitCode = 1) {
  const logger = Logger.getInstance();
  logger.error(message);
  process.exit(exitCode);
}

/**
 * Main validate command function
 */
export async function main(argv = null, _config = {}) {
  // Create logger for CLI output
  const logger = Logger.getInstance();

  let parsedArgs;

  try {
    // Parse command line arguments
    const parseOptions = {
      options: OPTIONS_SCHEMA,
      allowPositionals: true
    };
    if (Array.isArray(argv)) parseOptions.args = argv;
    parsedArgs = parseArgs(parseOptions);
  } catch (error) {
    handleArgumentParsingError(error, handleCliError);
    return;
  }

  const options = parsedArgs.values;
  const positionals = parsedArgs.positionals;

  // Show help if requested
  if (options.help) {
    displayHelp(logger);
    process.exit(0);
  }

  try {
    const validator = new TemplateValidator();
    const templateFile = options[TERMINOLOGY.OPTION.LINT_FILE] || positionals[0] || 'template.json';
    const enableSuggestions = options[TERMINOLOGY.OPTION.SUGGEST] || options[TERMINOLOGY.OPTION.FIX];

    logger.info(`🔍 Validating ${templateFile}...`);

    const result = await validator.validate(templateFile, 'strict');

    if (result.valid) {
      logger.success('Template validation passed!');
      logger.info('');
      logger.info('📋 Validation Summary:');
      logger.info(`   • Schema validation: ✅ Passed`);
      logger.info(`   • Domain validation: ✅ Passed`);
      logger.info(`   • Warnings: ${result.warnings.length}`);

      if (result.warnings.length > 0) {
        logger.info('');
        logger.warn('Warnings:');
        result.warnings.forEach((warning, i) => {
          logger.warn(`   ${i + 1}. ${warning.message}`);
          if (warning.path && warning.path.length > 0) {
            logger.warn(`      Path: ${warning.path.join('.')}`);
          }
          if (enableSuggestions && warning.suggestion) {
            logger.info(`      💡 Suggestion: ${warning.suggestion}`);
          }
        });
      }
    } else {
      logger.error('Template validation failed!');
      logger.info('');
      logger.info('📋 Validation Summary:');
      logger.info(`   • Errors: ${result.errors.length}`);
      logger.info(`   • Warnings: ${result.warnings.length}`);
      logger.info('');

      // Handle auto-fix if requested
      if (options.fix) {
        const fixesApplied = await applyIntelligentFixes(templateFile, result.errors, logger);
        if (fixesApplied > 0) {
          logger.info(`🔧 Applied ${fixesApplied} automatic fix(es)`);
          logger.info('');
          // Re-validate after fixes
          logger.info('🔄 Re-validating after fixes...');
          const revalidateResult = await validator.validate(templateFile, 'strict');
          if (revalidateResult.valid) {
            logger.success('Template validation passed after fixes!');
            return;
          } else {
            logger.warn('Some issues remain after auto-fixes');
            result.errors = revalidateResult.errors;
            result.warnings = revalidateResult.warnings;
          }
        }
      }

      logger.error('Errors:');
      result.errors.forEach((error, i) => {
        logger.error(`   ${i + 1}. ${error.message}`);
        if (error.path && error.path.length > 0) {
          logger.error(`      Path: ${error.path.join('.')}`);
        }
        if (enableSuggestions && error.suggestion) {
          logger.info(`      💡 Suggestion: ${error.suggestion}`);
        }
        if (enableSuggestions && error.command) {
          logger.info(`      🛠️  Command: ${error.command}`);
        }
      });

      if (result.warnings.length > 0) {
        logger.info('');
        logger.warn('Warnings:');
        result.warnings.forEach((warning, i) => {
          logger.warn(`   ${i + 1}. ${warning.message}`);
          if (warning.path && warning.path.length > 0) {
            logger.warn(`      Path: ${warning.path.join('.')}`);
          }
          if (enableSuggestions && warning.suggestion) {
            logger.info(`      💡 Suggestion: ${warning.suggestion}`);
          }
        });
      }

      process.exit(1);
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      handleCliError(`Template file not found: ${options[TERMINOLOGY.OPTION.LINT_FILE] || positionals[0] || 'template.json'}`);
    } else {
      handleCliError(`Validation failed: ${error.message}`);
    }
  }
}

// If this file is executed directly, run main()
if (process.argv[1] && realpathSync(process.argv[1]) === import.meta.url.slice(7)) {
  withErrorHandling(main)();
}
