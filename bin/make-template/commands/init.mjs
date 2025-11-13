#!/usr/bin/env node

/**
 * make-template init command
 * Generate skeleton template.json file
 */

import { parseArgs } from 'util';
import { validateFileDoesNotExist } from '../../../lib/shared/utils/fs-utils.mjs';
import { realpathSync } from 'fs';
import { TERMINOLOGY } from '../../../lib/shared/ontology.mjs';
import { handleArgumentParsingError, withErrorHandling } from '../../../lib/shared/error-handler.mjs';
import { Logger } from '../../../lib/shared/utils/logger.mjs';

// Command-specific options schema
const OPTIONS_SCHEMA = {
  // Core init options
  [TERMINOLOGY.OPTION.HELP]: {
    type: 'boolean',
    short: 'h',
    default: false
  },
  [TERMINOLOGY.OPTION.INIT_FILE]: {
    type: 'string'
  }
};

/**
 * Display help text for init command
 */
function displayHelp(logger) {
  const helpText = `
make-template init - Generate skeleton template.json file

DESCRIPTION:
  Generate a skeleton template.json file with proper structure and examples
  to help you get started with template authoring.

Usage:
  make-template init [options]

OPTIONS:
  -h, --help                    Show this help message
      --init-file <file>        Specify output file for skeleton (default: template.json)

INIT EXAMPLES:
  make-template init
    Generate skeleton template.json in current directory

  make-template init --init-file my-template.json
    Generate skeleton with custom filename

TEMPLATE AUTHOR WORKFLOW:
  1. make-template init                    # Generate skeleton template.json
  2. Edit template.json to customize your template
  3. make-template validate                # Validate your template
  4. Test template with create-scaffold

For more information, visit: https://github.com/m5nv/make-template
`;

  logger.info(helpText.trim());
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
    'setup': {
      'authoringMode': 'composable',
      'policy': 'lenient',
      'dimensions': {
        'deployment_target': {
          'type': 'single',
          'values': ['vercel', 'netlify', 'railway', 'render', 'fly', 'heroku'],
          'default': 'vercel'
        },
        'features': {
          'type': 'multi',
          'values': ['auth', 'database', 'api', 'ui', 'storage', 'payments', 'analytics'],
          'default': []
        },
        'database': {
          'type': 'single',
          'values': ['postgresql', 'mysql', 'sqlite', 'mongodb', 'redis', 'd1', 'tursodb', 'none'],
          'default': 'none'
        },
        'storage': {
          'type': 'single',
          'values': ['aws-s3', 'cloudflare-r2', 'vercel-blob', 'local', 'none'],
          'default': 'none'
        },
        'auth_providers': {
          'type': 'multi',
          'values': ['google', 'github', 'twitter', 'email', 'none'],
          'default': ['none']
        },
        'payments': {
          'type': 'single',
          'values': ['stripe', 'paypal', 'none'],
          'default': 'none'
        },
        'analytics': {
          'type': 'single',
          'values': ['mixpanel', 'posthog', 'google-analytics', 'plausible', 'none'],
          'default': 'none'
        }
      },
      'gates': {
        'cloudflare-workers': {
          'database': ['sqlite', 'tursodb', 'd1', 'none'],
          'storage': ['cloudflare-r2', 'none']
        },
        'deno-deploy': {
          'database': ['sqlite', 'tursodb', 'none'],
          'storage': ['none']
        },
        'linode': {
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
    'constants': {
      'language': 'typescript',
      'framework': 'nextjs',
      'styling': 'tailwind',
      'ci_cd': 'github-actions',
      'code_quality': 'prettier',
      'transactional_emails': 'gmail-org-service-account'
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
          'description': 'Set up database connection, schema management, migrations, and data access patterns',
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
          'description': 'Add file storage solutions for uploads, assets, and media management',
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
 * Handle CLI errors and exit appropriately
 */
function handleCliError(message, exitCode = 1) {
  const logger = Logger.getInstance();
  logger.error(message);
  process.exit(exitCode);
}

/**
 * Main init command function
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

  try {
    const fs = await import('fs/promises');
    const path = await import('path');

    const outputFile = options[TERMINOLOGY.OPTION.INIT_FILE] || 'template.json';
    const outputPath = path.resolve(outputFile);

    // Check if file already exists
    const fileErrors = await validateFileDoesNotExist(outputPath, 'template initialization');
    if (fileErrors.length > 0) {
      fileErrors.forEach(error => logger.warn(error));
      logger.warn(`Use --init-file <different-name> to specify a different output file.`);
      process.exit(1);
    }

    logger.info(`📝 Generating skeleton template.json at ${outputFile}...`);

    // Generate skeleton template.json
    const skeletonTemplate = generateSkeletonTemplate();

    // Write to file
    await fs.writeFile(outputPath, JSON.stringify(skeletonTemplate, null, 2));

    logger.success('Skeleton template.json generated successfully!');
    logger.info('');
    logger.info('📋 Next steps:');
    logger.info(`   1. Edit ${outputFile} to customize your template`);
    logger.info('   2. Run "make-template validate" to validate your template');
    logger.info('   3. Test with create-scaffold to ensure it works');

  } catch (error) {
    handleCliError(`Init failed: ${error.message}`);
  }
}

// If this file is executed directly, run main()
if (process.argv[1] && realpathSync(process.argv[1]) === import.meta.url.slice(7)) {
  withErrorHandling(main)();
}
