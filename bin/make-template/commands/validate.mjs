#!/usr/bin/env node

/**
 * make-template validate command
 * Validates template.json against schema with intelligent suggestions
 */

import { parseArgs } from 'util';
import { realpathSync } from 'fs';
import { TemplateValidator } from '../../../lib/validation/template-validator.mjs';
import { TERMINOLOGY } from '../../../lib/shared/ontology.mjs';

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
 * Display help text for validate command
 */
function displayHelp() {
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

  console.log(helpText.trim());
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
 * Handle CLI errors and exit appropriately
 */
function handleError(message, exitCode = 1) {
  console.error(`Error: ${message}`);
  process.exit(exitCode);
}

/**
 * Main validate command function
 */
export async function main(argv = null, config = {}) {
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
    if (error.code === 'ERR_PARSE_ARGS_UNKNOWN_OPTION') {
      handleError(`Unknown option: ${error.message.split("'")[1]}`);
    } else if (error.code === 'ERR_PARSE_ARGS_INVALID_OPTION_VALUE') {
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
  const positionals = parsedArgs.positionals;

  // Show help if requested
  if (options.help) {
    displayHelp();
    process.exit(0);
  }

  try {
    const validator = new TemplateValidator();
    const templateFile = options[TERMINOLOGY.OPTION.LINT_FILE] || positionals[0] || 'template.json';
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
          console.log('🔄 Re-validating after fixes...');
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

      console.log('🚨 Errors:');
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
      handleError(`Template file not found: ${options[TERMINOLOGY.OPTION.LINT_FILE] || positionals[0] || 'template.json'}`);
    } else {
      handleError(`Validation failed: ${error.message}`);
    }
  }
}

// If this file is executed directly, run main()
if (process.argv[1] && realpathSync(process.argv[1]) === import.meta.url.slice(7)) {
  main().catch((error) => {
    handleError(error.message);
  });
}