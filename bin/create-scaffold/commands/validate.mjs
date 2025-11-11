#!/usr/bin/env node

import { runTemplateValidation, formatValidationResults, formatValidationResultsAsJson } from '../template-validation.mjs';
import { TERMINOLOGY } from '../../../../create/lib/shared/ontology.mjs';
import {
  handleError,
  contextualizeError,
  ErrorContext
} from '../../../lib/shared/utils/error-handler.mjs';

/**
 * Execute the 'validate' command - validate a template
 */
export async function executeValidateCommand(args) {
  try {
    // Get target path from arguments
    const targetPath = args.template || args.path;
    if (!targetPath) {
      throw new Error('Template path is required. Use: create-scaffold validate <template-path>');
    }

    const jsonOutput = Boolean(args[TERMINOLOGY.OPTION.JSON]);
    const verbose = Boolean(args[TERMINOLOGY.OPTION.VERBOSE]);

    // Run template validation
    const validationResult = await runTemplateValidation({ targetPath });

    if (jsonOutput) {
      console.log(formatValidationResultsAsJson(validationResult));
    } else {
      const formatted = formatValidationResults(validationResult);
      console.log(formatted);
    }

    // Return appropriate exit code
    return validationResult.summary.status === 'pass' ? 0 : 1;

  } catch (error) {
    // Use centralized error handling
    const contextualError = contextualizeError(error, {
      context: ErrorContext.RUNTIME,
      suggestions: [
        'Check that the template path exists and is accessible',
        'Ensure template.json is valid JSON',
        'Use --verbose for detailed validation output'
      ]
    });

    handleError(contextualError, { operation: 'validate_command_execution' });
    return 1;
  }
}