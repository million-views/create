#!/usr/bin/env node

/**
 * make-template restore command
 * Restores templatized projects back to working state
 */

import { parseArgs } from 'util';
import { access, constants, realpathSync } from 'fs/promises';
import { RestorationEngine } from '../../../lib/shared/make-template/restoration-engine.mjs';
import { TERMINOLOGY } from '../../../lib/shared/ontology.mjs';

// Command-specific options schema
const OPTIONS_SCHEMA = {
  // Core restore options
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
  [TERMINOLOGY.OPTION.SILENT]: {
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
  'sanitize-undo': {
    type: 'boolean',
    default: false
  }
};

/**
 * Display help text for restore command
 */
function displayHelp() {
  const helpText = `
make-template restore - Restore template back to working project

DESCRIPTION:
  Restore templatized projects back to their original working state for
  template development and testing workflows. Uses the .template-undo.json
  file created during templatization to restore project-specific values.

Usage:
  make-template restore [options]

OPTIONS:
  -h, --help                    Show this help message
      --dry-run                 Preview restoration without making changes
  -y, --yes                     Skip confirmation prompts
        --silent                 Suppress prompts and non-essential output (useful for tests)
      --restore-files <files>   Restore only specified files (comma-separated)
      --restore-placeholders    Restore only placeholder values, keep files
      --generate-defaults       Generate .restore-defaults.json configuration
      --sanitize-undo           Remove sensitive data from undo log

RESTORATION EXAMPLES:
  make-template restore --dry-run
    Preview restoration without making changes

  make-template restore --yes
    Restore template to working state, skip confirmations

  make-template restore --restore-files "package.json,README.md"
    Restore only specific files from undo log

  make-template restore --restore-placeholders --dry-run
    Preview placeholder restoration only

  make-template restore --generate-defaults
    Create .restore-defaults.json with default values

  make-template restore --sanitize-undo
    Restore from sanitized undo log (prompts for missing values)

UNDO LOG MANAGEMENT:
  • .template-undo.json contains restoration data for template authors
  • Safe to commit for template maintenance (use --sanitize-undo for privacy)
  • create-scaffold ignores .template-undo.json automatically
  • Keep undo log for template development, gitignore for public templates
  • Use .restore-defaults.json to automate sanitized restoration

TROUBLESHOOTING:
  Undo log not found:
    → Run make-template convert first to create template with undo log
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

For more information, visit: https://github.com/m5nv/make-template
`;

  console.log(helpText.trim());
}

/**
 * Validate CLI arguments
 */
function validateArguments(options) {
  const errors = [];

  // Validate restoration option combinations
  const restorationOptions = [
    TERMINOLOGY.OPTION.RESTORE_FILES,
    TERMINOLOGY.OPTION.RESTORE_PLACEHOLDERS,
    TERMINOLOGY.OPTION.GENERATE_DEFAULTS
  ];
  const activeRestorationOptions = restorationOptions.filter(opt => options[opt]);

  if (activeRestorationOptions.length > 1) {
    if (options[TERMINOLOGY.OPTION.GENERATE_DEFAULTS] && activeRestorationOptions.length > 1) {
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

  return errors;
}

/**
 * Generate .restore-defaults.json configuration file
 */
async function generateDefaultsFile() {
  const { DefaultsManager } = await import('../../../lib/restoration/defaults-manager.js');
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
    console.log('💡 Use this file with: make-template restore');
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
  console.error(`Error: ${message}`);
  process.exit(exitCode);
}

/**
 * Main restore command function
 */
export async function main(argv = null, _config = {}) {
  let parsedArgs;

  try {
    // Parse command line arguments
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

  // Show help if requested
  if (options.help) {
    displayHelp();
    process.exit(0);
  }

  // Handle generate-defaults workflow
  if (options[TERMINOLOGY.OPTION.GENERATE_DEFAULTS]) {
    await generateDefaultsFile();
    return;
  }

  // Validate arguments
  const argumentErrors = validateArguments(options);
  if (argumentErrors.length > 0) {
    argumentErrors.forEach(error => console.error(`Error: ${error}`));
    console.error('Try --help for usage information');
    process.exit(1);
  }

  // For restoration workflows we do not require package.json to exist
  // (templates may be restored in minimal directories). Instead, ensure
  // the undo log (.template-undo.json) exists and is readable so the
  // restoration engine can proceed.
  try {
    await access('.template-undo.json', constants.F_OK);
  } catch (_err) {
    handleError('.template-undo.json not found. Cannot restore without an undo log.', 1);
  }

  try {
    // Initialize and run restoration engine
    const restorationEngine = new RestorationEngine();
    await restorationEngine.restore(options);
  } catch (error) {
    handleError(error.message);
  }
}

// If this file is executed directly, run main()
if (process.argv[1] && realpathSync(process.argv[1]) === import.meta.url.slice(7)) {
  main().catch((error) => {
    handleError(error.message);
  });
}
