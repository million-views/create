#!/usr/bin/env node

/**
 * make-template convert command
 * Converts existing Node.js projects into reusable templates
 */

import { validateMakeTemplateArguments } from '../../../lib/shared/validators/make-template-args.mjs';
import { ConversionEngine } from '../../../lib/shared/make-template/engine.mjs';
import { TERMINOLOGY } from '../../../lib/shared/ontology.mjs';
import { parseArgs } from 'util';
import { readFile, access, constants } from 'fs/promises';
import { realpathSync } from 'fs';
import { handleArgumentParsingError, withErrorHandling } from '../../../lib/shared/error-handler.mjs';

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

  ⚠️  SAFETY: This command includes built-in safeguards to prevent accidental
  conversion of development repositories. It will detect and warn about directories
  that appear to be tool source code or development environments.

Usage:
  make-template convert [options]

OPTIONS:
  -h, --help                    Show this help message
      --dry-run                 Preview changes without executing them
  -y, --yes                     Skip confirmation prompts (including safety warnings)
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

For more information, visit: https://github.com/million-views/create
`;

  console.log(helpText.trim());
}

/**
 * Validate project directory and required files
 */
async function validateProjectDirectory() {
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
 * Check if current directory appears to be a development repository
 * This helps prevent accidental conversion of tool source code
 */
async function detectDevelopmentRepository() {
  const indicators = [];

  try {
    // Check for .git directory (strong indicator of development repo)
    await access('.git', constants.F_OK);
    indicators.push('.git directory found');
  } catch {
    // No .git, continue checking
  }

  try {
    // Read package.json to check for development indicators
    const packageContent = await readFile('package.json', 'utf8');
    const packageJson = JSON.parse(packageContent);

    // Check for bin field (indicates CLI tool)
    if (packageJson.bin) {
      indicators.push('package.json contains bin field (CLI tool)');
    }

    // Check for development-related scripts
    if (packageJson.scripts) {
      const devScripts = ['lint', 'test', 'build', 'dev', 'validate', 'schema:build'];
      const foundScripts = devScripts.filter(script => packageJson.scripts[script]);
      if (foundScripts.length > 0) {
        indicators.push(`development scripts found: ${foundScripts.join(', ')}`);
      }
    }

    // Check for specific tool names that indicate development repos
    if (packageJson.name && (
      packageJson.name.includes('create-scaffold') ||
      packageJson.name.includes('make-template') ||
      packageJson.name === 'create-scaffold' ||
      packageJson.name === 'make-template'
    )) {
      indicators.push(`package name indicates tool repository: ${packageJson.name}`);
    }
  } catch {
    // Can't read package.json, skip these checks
  }

  // Check for development directory structure
  const devDirs = ['lib', 'src', 'test', 'scripts', 'docs', 'bin'];
  for (const dir of devDirs) {
    try {
      await access(dir, constants.F_OK);
      indicators.push(`development directory found: ${dir}/`);
    } catch {
      // Directory doesn't exist
    }
  }

  return indicators;
}

/**
 * Handle CLI errors and exit appropriately
 */
function handleCliError(message, exitCode = 1) {
  console.error(`Error: ${message}`);
  process.exit(exitCode);
}

/**
 * Main convert command function
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
    handleArgumentParsingError(error, handleCliError);
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
  const argumentErrors = validateMakeTemplateArguments(options, 'convert');
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
    // Check if we're running on a development repository
    const devIndicators = await detectDevelopmentRepository();
    if (devIndicators.length > 0) {
      console.warn('⚠️  WARNING: This directory appears to be a development repository!');
      console.warn('⚠️  Running make-template convert on development repositories can corrupt source code.');
      console.warn('');
      console.warn('Development indicators detected:');
      devIndicators.forEach(indicator => console.warn(`   • ${indicator}`));
      console.warn('');

      if (!options.yes) {
        console.warn('If you really want to proceed, use --yes to skip this warning.');
        console.warn('Otherwise, consider using test fixtures or a separate project for testing.');
        console.warn('');
        process.exit(1);
      } else {
        console.warn('⚠️  Proceeding with --yes flag despite development repository warnings.');
        console.warn('⚠️  Make sure you have backups and understand the risks.');
        console.warn('');
      }
    }

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
    } catch (_error) {
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
    handleCliError(error.message);
  }
}

// If this file is executed directly, run main()
if (process.argv[1] && realpathSync(process.argv[1]) === import.meta.url.slice(7)) {
  withErrorHandling(main)();
}
