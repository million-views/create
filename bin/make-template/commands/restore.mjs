#!/usr/bin/env node

/**
 * make-template restore command
 * Restores templatized projects back to working state
 */

import { validateMakeTemplateArguments } from '../../../lib/shared/validators/make-template-args.mjs';
import { RestorationEngine } from '../../../lib/shared/make-template/restoration-engine.mjs';
import { TERMINOLOGY } from '../../../lib/shared/ontology.mjs';
import { parseArgs } from 'util';
import { rm, readdir } from 'fs/promises';
import { realpathSync } from 'fs';
import { validateTemplateRestorable } from '../../../lib/shared/utils/fs-utils.mjs';
import { handleArgumentParsingError, withErrorHandling } from '../../../lib/shared/error-handler.mjs';
import { Logger } from '../../../lib/shared/utils/logger.mjs';

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
 * Execute restore command with pre-parsed arguments
 * @param {object} args - Pre-parsed command arguments
 * @returns {Promise<number>} Exit code
 */
export async function executeRestoreCommand(args) {
  // Convert the args object to the format expected by the existing main function
  const argv = [];

  // Add options
  if (args['dry-run']) argv.push('--dry-run');
  if (args.yes) argv.push('--yes');
  if (args.silent) argv.push('--silent');
  if (args['restore-files']) {
    argv.push('--restore-files');
    argv.push(args['restore-files']);
  }
  if (args['restore-placeholders']) argv.push('--restore-placeholders');
  if (args['generate-defaults']) argv.push('--generate-defaults');

  // Add positional arguments
  if (args.projectDirectory) argv.push(args.projectDirectory);

  // Call the existing main function
  return await main(argv);
}

/**
 * Logger instance for user interactions
 */
const logger = Logger.getInstance();

/**
 * Display help text for restore command
 */
function displayHelp(logger) {
  const helpText = `
make-template restore - Restore template back to working project

DESCRIPTION:
  Restore templatized projects back to their original working state for
  template development and testing workflows. Uses the .template-undo.json
  file created during templatization to restore project-specific values.

  After successful restoration, automatically cleans up make-template artifacts
  including the undo log, setup script, and backup files.

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

  logger.info(helpText.trim());
}

/**
 * Validate CLI arguments
 */
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

    logger.success('Generated .restore-defaults.json configuration file');
    logger.info('');
    logger.info('📝 Edit this file to customize default values for restoration:');
    logger.info('   • Use ${VARIABLE} for environment variable substitution');
    logger.info('   • Set promptForMissing: false to use defaults without prompting');
    logger.info('   • Add your project-specific placeholders and default values');
    logger.info('');
    logger.info('💡 Use this file with: make-template restore');
  } catch (error) {
    if (error.message.includes('already exists')) {
      logger.warn('.restore-defaults.json already exists');
      logger.info('💡 Delete the existing file first or edit it directly');
      return;
    }
    handleCliError(`Failed to create .restore-defaults.json: ${error.message}`);
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
 * Clean up make-template artifacts after successful restoration
 */
async function cleanupArtifacts(logger) {
  const artifacts = ['.template-undo.json', '_setup.mjs'];
  let cleanedCount = 0;

  // Clean up specific artifact files
  for (const artifact of artifacts) {
    try {
      await rm(artifact, { force: true });
      cleanedCount++;
    } catch {
      // File doesn't exist or can't be removed, continue
    }
  }

  // Clean up backup files (*.backup-*)
  try {
    const files = await readdir('.');
    const backupFiles = files.filter(file => file.startsWith('package.json.backup-') ||
                                              file.startsWith('README.md.backup-'));
    for (const backupFile of backupFiles) {
      await rm(backupFile, { force: true });
      cleanedCount++;
    }
  } catch {
    // Can't read directory or remove files, continue
  }

  if (cleanedCount > 0) {
    logger.info(`🧹 Cleaned up ${cleanedCount} make-template artifact(s)`);
  }
}

/**
 * Main restore command function
 */
export async function main(argv = null, _config = {}) {
  // Create logger for CLI output
  const logger = Logger.getInstance();

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
    handleArgumentParsingError(error, handleCliError);
    return;
  }

  const options = parsedArgs.values;

  // Show help if requested
  if (options.help) {
    displayHelp(logger);
    process.exit(0);
  }

  // Handle generate-defaults workflow
  if (options[TERMINOLOGY.OPTION.GENERATE_DEFAULTS]) {
    await generateDefaultsFile();
    return;
  }

  // Validate arguments
  const argumentErrors = validateMakeTemplateArguments(options, 'restore');
  if (argumentErrors.length > 0) {
    argumentErrors.forEach(error => logger.error(error));
    logger.error('Try --help for usage information');
    process.exit(1);
  }

  // For restoration workflows we do not require package.json to exist
  // (templates may be restored in minimal directories). Instead, ensure
  // the undo log (.template-undo.json) exists and is readable so the
  // restoration engine can proceed.
  const restoreErrors = await validateTemplateRestorable();
  if (restoreErrors.length > 0) {
    restoreErrors.forEach(error => logger.error(error));
    process.exit(1);
  }

  try {
    // Initialize and run restoration engine
    const restorationEngine = new RestorationEngine();
    await restorationEngine.restore(options);

    // Clean up artifacts after successful restoration (unless dry-run)
    if (!options.dryRun) {
      await cleanupArtifacts(logger);
    }
  } catch (error) {
    handleCliError(error.message);
  }
}

// If this file is executed directly, run main()
if (process.argv[1] && realpathSync(process.argv[1]) === import.meta.url.slice(7)) {
  withErrorHandling(main)();
}
