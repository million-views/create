#!/usr/bin/env node

/**
 * make-template convert command
 * Converts existing Node.js projects into reusable templates
 */

import { parseArgs } from 'util';
import { readFile, access } from 'fs/promises';
import { constants } from 'fs';
import { realpathSync } from 'fs';
import { ConversionEngine } from '../../../lib/shared/make-template/engine.mjs';
import { TERMINOLOGY } from '../../../lib/shared/ontology.mjs';

// Command-specific options schema
const OPTIONS_SCHEMA = {
  // Core conversion options
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
  [TERMINOLOGY.OPTION.TYPE]: {
    type: 'string'
  },
  'placeholder-format': {
    type: 'string'
  },
  'sanitize-undo': {
    type: 'boolean',
    default: false
  }
};

/**
 * Display help text for convert command
 */
function displayHelp() {
  const helpText = `
make-template convert - Convert existing Node.js projects into reusable templates

DESCRIPTION:
  Convert existing Node.js projects into reusable templates compatible with
  @m5nv/create-scaffold. Analyzes project structure, identifies project types,
  replaces project-specific values with placeholders, and generates template files.

Usage:
  make-template convert [options]

OPTIONS:
  -h, --help                    Show this help message
      --dry-run                 Preview changes without executing them
  -y, --yes                     Skip confirmation prompts
        --silent                 Suppress prompts and non-essential output (useful for tests)
      --type <type>             Force specific project type detection
      --placeholder-format <fmt> Specify placeholder format
      --sanitize-undo           Remove sensitive data from undo log

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

  make-template convert --placeholder-format __NAME__ --dry-run
    Use double-underscore placeholders, preview only

  make-template convert --sanitize-undo --dry-run
    Preview conversion with sanitized undo log

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
  if (options.type) {
    const PROJECT_TYPES = {
      'cf-d1': 'Cloudflare Worker with D1 database',
      'cf-turso': 'Cloudflare Worker with Turso database',
      'vite-react': 'Vite-based React project',
      'generic': 'Generic Node.js project'
    };

    if (!Object.keys(PROJECT_TYPES).includes(options.type)) {
      errors.push(`Invalid project type: ${options.type}. Supported types: ${Object.keys(PROJECT_TYPES).join(', ')}`);
    }
  }

  // Validate placeholder format if specified
  if (options['placeholder-format']) {
    const format = options['placeholder-format'];
    const supportedFormats = ['{{NAME}}', '__NAME__', '%NAME%'];

    if (!supportedFormats.includes(format)) {
      errors.push(`Invalid placeholder format: ${format}. Must contain NAME substitution mechanism. Supported formats: {{NAME}}, __NAME__, %NAME%`);
    }
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
 * Handle CLI errors and exit appropriately
 */
function handleError(message, exitCode = 1) {
  console.error(`Error: ${message}`);
  process.exit(exitCode);
}

/**
 * Main convert command function
 */
export async function main(argv = null, config = {}) {
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

  // Normalize kebab-case options to camelCase expected by engines/tests
  if (options['placeholder-format'] !== undefined) options.placeholderFormat = options['placeholder-format'];

  // Show help if requested
  if (options.help) {
    displayHelp();
    process.exit(0);
  }

  // Validate arguments
  const argumentErrors = validateArguments(options);
  if (argumentErrors.length > 0) {
    argumentErrors.forEach(error => console.error(`Error: ${error}`));
    console.error('Try --help for usage information');
    process.exit(1);
  }

  // Validate project directory
  const projectErrors = await validateProjectDirectory();
  if (projectErrors.length > 0) {
    projectErrors.forEach(error => console.error(`Error: ${error}`));
    console.error('No changes were made - validation failed before execution');
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
    await engine.convert(options);
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