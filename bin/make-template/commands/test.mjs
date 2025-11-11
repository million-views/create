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
 * Display help text for test command
 */
function displayHelp() {
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

  console.log(helpText.trim());
}

/**
 * Handle CLI errors and exit appropriately
 */
function handleCliError(message, exitCode = 1) {
  console.error(`Error: ${message}`);
  process.exit(exitCode);
}

/**
 * Main test command function
 */
export async function main(argv = null, _config = {}) {
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
    displayHelp();
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

    console.log(`🧪 Testing template: ${templatePath}`);
    console.log('');

    const result = await testingService.testTemplate(templatePath, {
      cleanup: !options['keep-temp']
    });

    if (result.success) {
      console.log('✅ Template test passed!');
      console.log('');
      console.log('📋 Test Summary:');
      console.log(`   • Project creation: ✅ Successful`);
      console.log(`   • Dependency installation: ✅ Successful`);
      console.log(`   • Basic functionality: ✅ Verified`);
      console.log(`   • Cleanup: ${options['keep-temp'] ? '⏸️  Skipped (temp dirs kept)' : '✅ Completed'}`);

      if (result.details && options.verbose) {
        console.log('');
        console.log('📝 Test Details:');
        if (result.details.projectPath) {
          console.log(`   • Test project: ${result.details.projectPath}`);
        }
        if (result.details.executionTime) {
          console.log(`   • Execution time: ${result.details.executionTime}ms`);
        }
      }
    } else {
      console.log('❌ Template test failed!');
      console.log('');
      console.log('📋 Test Summary:');
      console.log(`   • Project creation: ${result.details?.projectCreated ? '✅ Successful' : '❌ Failed'}`);
      console.log(`   • Dependency installation: ${result.details?.depsInstalled ? '✅ Successful' : '❌ Failed'}`);
      console.log(`   • Basic functionality: ❌ Failed`);

      if (result.error) {
        console.log('');
        console.log('🚨 Error Details:');
        console.log(`   ${result.error.message}`);

        if (result.error.suggestion) {
          console.log('');
          console.log('💡 Suggestion:');
          console.log(`   ${result.error.suggestion}`);
        }
      }

      if (result.details && options.verbose) {
        console.log('');
        console.log('📝 Additional Details:');
        if (result.details.projectPath) {
          console.log(`   • Test project: ${result.details.projectPath}`);
        }
        if (result.details.errorLogs && result.details.errorLogs.length > 0) {
          console.log('   • Error logs:');
          result.details.errorLogs.forEach((log, i) => {
            console.log(`     ${i + 1}. ${log}`);
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
        console.log('❌ Template test failed!');
        console.log('');
        console.log('🚨 Error Details:');
        console.log(`   ${error.message}`);

        if (error.suggestions && error.suggestions.length > 0) {
          console.log('');
          console.log('💡 Suggestions:');
          error.suggestions.forEach((suggestion, i) => {
            console.log(`   ${i + 1}. ${suggestion}`);
          });
        }

        if (options.verbose && error.technicalDetails) {
          console.log('');
          console.log('🔧 Technical Details:');
          console.log(`${error.technicalDetails}`);
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
