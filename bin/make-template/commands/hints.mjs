#!/usr/bin/env node

/**
 * make-template hints command
 * Display available hints catalog for authoring assistance
 */

import { parseArgs } from 'util';
import { realpathSync } from 'fs';
import { TERMINOLOGY } from '../../../lib/shared/ontology.mjs';
import { handleArgumentParsingError, withErrorHandling } from '../../../lib/shared/error-handler.mjs';

// Command-specific options schema
const OPTIONS_SCHEMA = {
  // Core hints options
  [TERMINOLOGY.OPTION.HELP]: {
    type: 'boolean',
    short: 'h',
    default: false
  }
};

/**
 * Display help text for hints command
 */
function displayHelp() {
  const helpText = `
make-template hints - Display available hints catalog for authoring assistance

DESCRIPTION:
  Display the catalog of available hints for template authoring assistance.
  These hints provide guidance for template authors when defining features
  and help users understand what each feature provides.

Usage:
  make-template hints [options]

OPTIONS:
  -h, --help                    Show this help message

HINTS EXAMPLES:
  make-template hints
    Display the complete hints catalog

TEMPLATE AUTHORING:
  Use these hints in your template.json under hints.features to provide
  clear, actionable guidance for template users.

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
 * Main hints command function
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

  // Show help if requested
  if (options.help) {
    displayHelp();
    process.exit(0);
  }

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

// If this file is executed directly, run main()
if (process.argv[1] && realpathSync(process.argv[1]) === import.meta.url.slice(7)) {
  withErrorHandling(main)();
}
