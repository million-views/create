#!/usr/bin/env node

/**
 * make-template init command
 * Generate skeleton template.json file
 */

import { parseArgs } from 'util';
import { realpathSync } from 'fs';
import { TERMINOLOGY } from '../../../lib/shared/ontology.mjs';

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
function displayHelp() {
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

  console.log(helpText.trim());
}

/**
 * Generate skeleton template.json with proper structure
 */
function generateSkeletonTemplate() {
  return {
    "schemaVersion": "1.0.0",
    "id": "your-org/your-template-name",
    "name": "Your Template Name",
    "description": "A brief description of what this template creates",
    "tags": ["web", "api", "fullstack"],
    "author": "Your Name or Organization",
    "license": "MIT",
    "constants": {
      "language": "typescript",
      "framework": "nextjs",
      "styling": "tailwind",
      "testing": "jest",
      "ci": "github-actions"
    },
    "dimensions": {
      "deployment_target": {
        "values": ["vercel", "netlify", "railway", "render", "fly", "heroku"]
      },
      "features": {
        "values": ["auth", "database", "api", "ui", "storage", "payments", "analytics"]
      },
      "database": {
        "values": ["postgresql", "mysql", "sqlite", "mongodb", "redis", "d1", "tursodb", "none"]
      },
      "storage": {
        "values": ["aws-s3", "cloudflare-r2", "vercel-blob", "local", "none"]
      },
      "auth_providers": {
        "values": ["google", "github", "twitter", "email", "none"]
      },
      "payments": {
        "values": ["stripe", "paypal", "none"]
      },
      "analytics": {
        "values": ["mixpanel", "posthog", "google-analytics", "plausible", "none"]
      }
    },
    "gates": {
      "cloudflare-workers": {
        "platform": "edge",
        "constraint": "Limited runtime capabilities for edge computing",
        "allowed": {
          "database": ["sqlite", "tursodb", "d1", "none"],
          "storage": ["cloudflare-r2", "none"]
        }
      },
      "deno-deploy": {
        "platform": "edge",
        "constraint": "Deno runtime with limited storage options",
        "allowed": {
          "database": ["sqlite", "tursodb", "none"],
          "storage": ["none"]
        }
      },
      "linode": {
        "platform": "vm",
        "constraint": "Full VM with file system access",
        "allowed": {
          "database": ["sqlite", "tursodb", "postgresql", "mysql", "mongodb", "redis", "none"],
          "storage": ["local", "aws-s3", "none"]
        }
      }
    },
    "featureSpecs": {
      "auth": {
        "label": "Authentication",
        "description": "Add user authentication system with login/signup flows",
        "needs": {
          "database": "required"
        },
        "category": "authentication"
      },
      "database": {
        "label": "Database Integration",
        "description": "Set up database connection and schema management",
        "needs": {},
        "category": "database"
      },
      "api": {
        "label": "API Routes",
        "description": "Create REST or GraphQL API endpoints",
        "needs": {},
        "category": "api"
      },
      "ui": {
        "label": "User Interface",
        "description": "Build responsive user interface components",
        "needs": {},
        "category": "ui"
      },
      "storage": {
        "label": "File Storage",
        "description": "Add file upload and storage capabilities",
        "needs": {},
        "category": "storage"
      },
      "payments": {
        "label": "Payment Processing",
        "description": "Integrate payment processing, subscriptions, and billing management",
        "needs": {
          "database": "required"
        },
        "category": "payments"
      },
      "analytics": {
        "label": "Analytics Tracking",
        "description": "Add user analytics and tracking",
        "needs": {},
        "category": "analytics"
      }
    },
    "hints": {
      "features": {
        "auth": {
          "label": "Authentication System",
          "description": "Add secure user authentication with login/signup flows, password reset, and session management",
          "needs": {
            "database": "required"
          },
          "category": "authentication",
          "tags": ["security", "users", "login"]
        },
        "database": {
          "label": "Database Integration",
          "description": "Set up database connection, schema management, migrations, and data access patterns",
          "needs": {},
          "category": "database",
          "tags": ["data", "persistence", "orm"]
        },
        "api": {
          "label": "API Endpoints",
          "description": "Create REST or GraphQL API endpoints with proper routing and middleware",
          "needs": {},
          "category": "api",
          "tags": ["rest", "graphql", "routing"]
        },
        "ui": {
          "label": "User Interface",
          "description": "Build responsive user interface components with modern design patterns",
          "needs": {},
          "category": "ui",
          "tags": ["frontend", "components", "responsive"]
        },
        "storage": {
          "label": "File Storage",
          "description": "Add file storage solutions for uploads, assets, and media management",
          "needs": {},
          "category": "storage",
          "tags": ["files", "upload", "media"]
        },
        "payments": {
          "label": "Payment Processing",
          "description": "Integrate payment processing, subscriptions, and billing management",
          "needs": {
            "database": "required"
          },
          "category": "payments",
          "tags": ["billing", "subscriptions", "commerce"]
        },
        "analytics": {
          "label": "Analytics Tracking",
          "description": "Add user analytics, event tracking, and performance monitoring",
          "needs": {},
          "category": "analytics",
          "tags": ["tracking", "metrics", "insights"]
        }
      }
    }
  };
}

/**
 * Handle CLI errors and exit appropriately
 */
function handleError(message, exitCode = 1) {
  console.error(`Error: ${message}`);
  process.exit(exitCode);
}

/**
 * Main init command function
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

  // Show help if requested
  if (options.help) {
    displayHelp();
    process.exit(0);
  }

  try {
    const fs = await import('fs/promises');
    const path = await import('path');

    const outputFile = options[TERMINOLOGY.OPTION.INIT_FILE] || 'template.json';
    const outputPath = path.resolve(outputFile);

    // Check if file already exists
    try {
      await fs.access(outputPath);
      console.log(`⚠️  File ${outputFile} already exists.`);
      console.log(`   Use --init-file <different-name> to specify a different output file.`);
      process.exit(1);
    } catch (error) {
      // File doesn't exist, which is what we want
    }

    console.log(`📝 Generating skeleton template.json at ${outputFile}...`);

    // Generate skeleton template.json
    const skeletonTemplate = generateSkeletonTemplate();

    // Write to file
    await fs.writeFile(outputPath, JSON.stringify(skeletonTemplate, null, 2));

    console.log('✅ Skeleton template.json generated successfully!');
    console.log('');
    console.log('📋 Next steps:');
    console.log(`   1. Edit ${outputFile} to customize your template`);
    console.log('   2. Run "make-template validate" to validate your template');
    console.log('   3. Test with create-scaffold to ensure it works');

  } catch (error) {
    handleError(`Init failed: ${error.message}`);
  }
}

// If this file is executed directly, run main()
if (process.argv[1] && realpathSync(process.argv[1]) === import.meta.url.slice(7)) {
  main().catch((error) => {
    handleError(error.message);
  });
}