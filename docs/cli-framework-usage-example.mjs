#!/usr/bin/env node
/* eslint-disable */
/**
 * Example: How to use the CLI Framework in a new project
 * This demonstrates how the separated architecture enables reuse
 */

// In a new project, you would install: npm install @m5nv/cli-framework

// Import the reusable CLI framework
import {
  createCommandRouter,
  HELP_PATTERNS,
  validateToolHelpDefinitions,
  generateHelp
} from '@m5nv/cli-framework';

// Define your tool's help (stays with your tool)
const MY_TOOL_HELP = {
  build: {
    description: 'Build the project',
    detailedDescription: 'Compile and bundle the project for production deployment.',
    options: {
      ...HELP_PATTERNS.DRY_RUN, // Reuse common patterns
      output: {
        type: 'string',
        short: 'o',
        description: 'Output directory',
        detailedDescription: 'Directory where build artifacts will be written.'
      }
    }
  },
  deploy: {
    description: 'Deploy the project',
    detailedDescription: 'Deploy the built project to the specified environment.',
    options: {
      environment: {
        type: 'string',
        short: 'e',
        description: 'Target environment',
        detailedDescription: 'Environment to deploy to (staging, production, etc.).'
      },
      ...HELP_PATTERNS.FORCE_MODE // Reuse common patterns
    }
  }
};

// Validate your help definitions
validateToolHelpDefinitions(MY_TOOL_HELP, 'my-tool');

// Use the framework to create your CLI
const router = createCommandRouter({
  commandHandlers: {
    build: async ({ options }) => { /* build logic */ },
    deploy: async ({ options }) => { /* deploy logic */ }
  },
  helpGenerator: { generateHelp },
  toolName: 'my-tool',
  commands: MY_TOOL_HELP
  // ... other config
});

export { MY_TOOL_HELP };
