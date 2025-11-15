#!/usr/bin/env node

/**
 * Help validation script
 * Ensures all CLI help text is complete and follows standards
 * Run this during development and CI to catch help maintenance issues
 */

import { validateToolHelpDefinitions } from '../lib/cli/framework.mjs';
import { CREATE_SCAFFOLD_HELP } from '../bin/create-scaffold/help-definitions.mjs';
import { MAKE_TEMPLATE_HELP } from '../bin/make-template/help-definitions.mjs';

try {
  // Validate create-scaffold help definitions
  validateToolHelpDefinitions(CREATE_SCAFFOLD_HELP, 'create-scaffold');

  // Validate make-template help definitions
  validateToolHelpDefinitions(MAKE_TEMPLATE_HELP, 'make-template');

  console.log('🎉 All help validation passed!');
  process.exit(0);
} catch (error) {
  console.error('❌ Help validation failed:');
  console.error(error.message);
  process.exit(1);
}
