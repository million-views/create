#!/usr/bin/env node

/**
 * make-template test command
 * Test templates by creating projects and validating functionality
 */

import { parseArgs } from 'util';
import { realpathSync } from 'fs';
import { TemplateTestingService } from '../../../lib/shared/template-testing-service.mjs';
import { TERMINOLOGY } from '../../../lib/shared/ontology.mjs';
import { handleArgumentParsingError, withErrorHandling } from '../../../lib/shared/error-handler.mjs';
import { Logger } from '../../../lib/shared/utils/logger.mjs';

// Command-specific options schema
const OPTIONS_SCHEMA = {
  // Core test options
  [TERMINOLOGY.OPTION.HELP]: {
    type: 'boolean',
    short: 'h',
    default: false
  },
  'verbose': {
    type: 'boolean',
    short: 'v',
    default: false
  },
  'keep-temp': {
    type: 'boolean',
    default: false
  }
};

/**
 * Execute test command with pre-parsed arguments
 * @param {object} args - Pre-parsed command arguments
 * @returns {Promise<number>} Exit code
 */
export async function executeTestCommand(args) {
  // Convert the args object to the format expected by the existing main function
  const argv = [];

  // Add options
  if (args.verbose) argv.push('--verbose');
  if (args['keep-temp']) argv.push('--keep-temp');

  // Add positional arguments
  if (args.templatePath) argv.push(args.templatePath);

  // Call the existing main function
  return await main(argv);
}

/**
 * Display help text for test command
 */
function displayHelp(logger) {
  const helpText = `
make-template test - Test templates by creating and validating projects

DESCRIPTION:
  Test template functionality by creating temporary projects using the
  create-scaffold tool and validating that the generated projects work
  correctly. Tests include project creation, dependency installation,
  and basic functionality verification.

Usage:
  make-template test [options] <template-path>

OPTIONS:
  -h, --help                    Show this help message
  -v, --verbose                 Show detailed test output and logs
      --keep-temp               Keep temporary test directories after completion

ARGUMENTS:
  template-path                 Path to template directory or template.json file

TEST EXAMPLES:
  make-template test .
    Test template in current directory

  make-template test path/to/template
    Test specific template directory

  make-template test --verbose template.json
    Test with detailed output

  make-template test --keep-temp .
    Test and keep temporary directories for inspection

For more information, visit: https://github.com/m5nv/make-template
`;

  logger.info(helpText.trim());
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
 * Main test command function
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

  // Require template path
  if (positionals.length === 0) {
    handleCliError('Template path is required. Use --help for usage information.');
  }

  const templatePath = positionals[0];

  try {
    const testingService = new TemplateTestingService({
      verbose: options.verbose,
      keepTemp: options['keep-temp']
    });

    logger.info(`🧪 Testing template: ${templatePath}`);
    logger.info('');

    const result = await testingService.testTemplate(templatePath, {
      cleanup: !options['keep-temp']
    });

    if (result.success) {
      logger.success('Template test passed!');
      logger.info('');
      logger.info('📋 Test Summary:');
      logger.info(`   • Project creation: ✅ Successful`);
      logger.info(`   • Dependency installation: ✅ Successful`);
      logger.info(`   • Basic functionality: ✅ Verified`);
      logger.info(`   • Cleanup: ${options['keep-temp'] ? '⏸️  Skipped (temp dirs kept)' : '✅ Completed'}`);

      if (result.details && options.verbose) {
        logger.info('');
        logger.info('📝 Test Details:');
        if (result.details.projectPath) {
          logger.info(`   • Test project: ${result.details.projectPath}`);
        }
        if (result.details.executionTime) {
          logger.info(`   • Execution time: ${result.details.executionTime}ms`);
        }
      }
    } else {
      logger.error('Template test failed!');
      logger.info('');
      logger.info('📋 Test Summary:');
      logger.info(`   • Project creation: ${result.details?.projectCreated ? '✅ Successful' : '❌ Failed'}`);
      logger.info(`   • Dependency installation: ${result.details?.depsInstalled ? '✅ Successful' : '❌ Failed'}`);
      logger.info(`   • Basic functionality: ❌ Failed`);

      if (result.error) {
        logger.info('');
        logger.info('🚨 Error Details:');
        logger.error(`   ${result.error.message}`);

        if (result.error.suggestion) {
          logger.info('');
          logger.info('💡 Suggestion:');
          logger.info(`   ${result.error.suggestion}`);
        }
      }

      if (result.details && options.verbose) {
        logger.info('');
        logger.info('📝 Additional Details:');
        if (result.details.projectPath) {
          logger.info(`   • Test project: ${result.details.projectPath}`);
        }
        if (result.details.errorLogs && result.details.errorLogs.length > 0) {
          logger.info('   • Error logs:');
          result.details.errorLogs.forEach((log, i) => {
            logger.error(`     ${i + 1}. ${log}`);
          });
        }
      }

      process.exit(1);
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      handleCliError(`Template not found: ${templatePath}`);
    } else {
      // Handle ContextualError specially
      if (error.context) {
        logger.error('Template test failed!');
        logger.info('');
        logger.info('🚨 Error Details:');
        logger.error(`   ${error.message}`);

        if (error.suggestions && error.suggestions.length > 0) {
          logger.info('');
          logger.info('💡 Suggestions:');
          error.suggestions.forEach((suggestion, i) => {
            logger.info(`   ${i + 1}. ${suggestion}`);
          });
        }

        if (options.verbose && error.technicalDetails) {
          logger.info('');
          logger.info('🔧 Technical Details:');
          logger.info(`${error.technicalDetails}`);
        }
      } else {
        handleCliError(`Test failed: ${error.message}`);
      }
      process.exit(1);
    }
  }
}

// If this file is executed directly, run main()
if (process.argv[1] && realpathSync(process.argv[1]) === import.meta.url.slice(7)) {
  withErrorHandling(main)();
}
