#!/usr/bin/env node

/**
 * Centralized error handling utilities for consistent user experience
 * Provides standardized error formatting, context, and suggestions
 */

import { sanitizeErrorMessage } from '../security.mjs';
import { ValidationError } from '../security.mjs';
import { ArgumentError } from '../../../bin/create-scaffold/argument-parser.mjs';
import { PreflightError } from '../../../bin/create-scaffold/preflight-checks.mjs';

/**
 * Error context types for better error categorization
 */
export const ErrorContext = {
  VALIDATION: 'validation',
  NETWORK: 'network',
  FILESYSTEM: 'filesystem',
  TEMPLATE: 'template',
  CONFIGURATION: 'configuration',
  RUNTIME: 'runtime',
  USER_INPUT: 'user_input'
};

/**
 * Error severity levels
 */
export const ErrorSeverity = {
  LOW: 'low',       // Minor issues, warnings
  MEDIUM: 'medium', // Recoverable errors
  HIGH: 'high',     // Critical errors requiring user action
  FATAL: 'fatal'    // System-level failures
};

/**
 * Enhanced error class with context and suggestions
 */
export class ContextualError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'ContextualError';
    this.context = options.context || ErrorContext.RUNTIME;
    this.severity = options.severity || ErrorSeverity.MEDIUM;
    this.suggestions = options.suggestions || [];
    this.technicalDetails = options.technicalDetails;
    this.userFriendlyMessage = options.userFriendlyMessage || message;
  }
}

/**
 * Format error message with consistent styling and context
 * @param {Error} error - The error to format
 * @param {object} options - Formatting options
 * @returns {string} - Formatted error message
 */
export function formatErrorMessage(error, options = {}) {
  const {
    includeSuggestions = true,
    includeTechnical = false,
    maxSuggestions = 3
  } = options;

  let output = '';

  // Main error message with emoji based on context
  const emoji = getContextEmoji(error.context || ErrorContext.RUNTIME);
  output += `❌ ${error.userFriendlyMessage || error.message}\n`;

  // Add technical details if requested and available
  if (includeTechnical && error.technicalDetails) {
    output += `\n🔧 Technical Details:\n`;
    output += `   ${error.technicalDetails}\n`;
  }

  // Add suggestions if available
  if (includeSuggestions && error.suggestions && error.suggestions.length > 0) {
    output += `\n💡 Suggestions:\n`;
    const suggestions = error.suggestions.slice(0, maxSuggestions);
    for (const suggestion of suggestions) {
      output += `   • ${suggestion}\n`;
    }

    if (error.suggestions.length > maxSuggestions) {
      output += `   • ... and ${error.suggestions.length - maxSuggestions} more\n`;
    }
  }

  return output.trim();
}

/**
 * Get appropriate emoji for error context
 * @param {string} context - Error context
 * @returns {string} - Emoji for the context
 */
function getContextEmoji(context) {
  const emojiMap = {
    [ErrorContext.VALIDATION]: '🔍',
    [ErrorContext.NETWORK]: '🌐',
    [ErrorContext.FILESYSTEM]: '📁',
    [ErrorContext.TEMPLATE]: '📋',
    [ErrorContext.CONFIGURATION]: '⚙️',
    [ErrorContext.RUNTIME]: '⚡',
    [ErrorContext.USER_INPUT]: '👤'
  };

  return emojiMap[context] || '❌';
}

/**
 * Create user-friendly error messages for common scenarios
 */
export const ErrorMessages = {
  // Template resolution errors
  templateNotFound: (template) => new ContextualError(
    `Template "${template}" not found`,
    {
      context: ErrorContext.TEMPLATE,
      severity: ErrorSeverity.HIGH,
      suggestions: [
        'Check the template name for typos',
        'Use "registry/official/express-api" for official templates',
        'Run with --list-templates to see available options',
        'Try a GitHub URL like "user/repo"'
      ]
    }
  ),

  templateInvalidUrl: (url, reason) => new ContextualError(
    `Invalid template URL: ${url}`,
    {
      context: ErrorContext.TEMPLATE,
      severity: ErrorSeverity.HIGH,
      technicalDetails: reason,
      suggestions: [
        'Use format: registry/official/template-name',
        'Use format: user/repo for GitHub',
        'Use format: https://github.com/user/repo',
        'Use format: ./path/to/local/template'
      ]
    }
  ),

  // Validation errors
  validationFailed: (field, reason) => new ContextualError(
    `Invalid ${field}: ${reason}`,
    {
      context: ErrorContext.VALIDATION,
      severity: ErrorSeverity.HIGH,
      suggestions: [
        'Check the format and try again',
        'Use --help to see valid options',
        'See documentation for detailed requirements'
      ]
    }
  ),

  // Network errors
  networkError: (operation, reason) => new ContextualError(
    `Network error during ${operation}`,
    {
      context: ErrorContext.NETWORK,
      severity: ErrorSeverity.MEDIUM,
      technicalDetails: reason,
      suggestions: [
        'Check your internet connection',
        'Try again in a few minutes',
        'Use --no-cache to bypass cached data'
      ]
    }
  ),

  // Filesystem errors
  filesystemError: (operation, path, reason) => new ContextualError(
    `File system error during ${operation}`,
    {
      context: ErrorContext.FILESYSTEM,
      severity: ErrorSeverity.HIGH,
      technicalDetails: `Path: ${path}, Reason: ${reason}`,
      suggestions: [
        'Check file permissions',
        'Ensure the path exists and is accessible',
        'Try running with elevated permissions if needed'
      ]
    }
  ),

  // Configuration errors
  configError: (setting, reason) => new ContextualError(
    `Configuration error: ${setting}`,
    {
      context: ErrorContext.CONFIGURATION,
      severity: ErrorSeverity.MEDIUM,
      technicalDetails: reason,
      suggestions: [
        'Check your configuration file',
        'Use default settings by removing custom config',
        'See documentation for configuration options'
      ]
    }
  ),

  // Generic errors with context
  genericError: (message, context = ErrorContext.RUNTIME) => new ContextualError(
    message,
    {
      context,
      severity: ErrorSeverity.MEDIUM,
      suggestions: [
        'Check the error details above',
        'Try running with --verbose for more information',
        'See documentation or file an issue if this persists'
      ]
    }
  )
};

/**
 * Handle errors consistently across the application
 * @param {Error} error - The error to handle
 * @param {object} options - Handling options
 * @returns {number} - Exit code
 */
export function handleError(error, options = {}) {
  const {
    logger = null,
    operation = null,
    exit = true,
    includeSuggestions = true,
    includeTechnical = false
  } = options;

  // Log the error if logger is available
  if (logger) {
    logger.logError(error, { operation }).catch(() => {
      // Ignore logging errors to prevent infinite loops
    });
  }

  // Format and display the error
  const formattedError = formatErrorMessage(error, {
    includeSuggestions,
    includeTechnical
  });

  console.error(`\n${formattedError}`);

  // Return appropriate exit code
  const exitCode = getExitCodeForError(error);
  if (exit) {
    process.exit(exitCode);
  }

  return exitCode;
}

/**
 * Get appropriate exit code for different error types
 * @param {Error} error - The error
 * @returns {number} - Exit code
 */
function getExitCodeForError(error) {
  // Argument/validation errors
  if (error instanceof ValidationError || error instanceof ArgumentError) {
    return 1;
  }

  // Preflight errors (setup issues)
  if (error instanceof PreflightError) {
    return 2;
  }

  // Contextual errors with severity
  if (error instanceof ContextualError) {
    switch (error.severity) {
      case ErrorSeverity.LOW:
        return 0; // Warnings don't exit
      case ErrorSeverity.MEDIUM:
        return 1;
      case ErrorSeverity.HIGH:
        return 1;
      case ErrorSeverity.FATAL:
        return 2;
      default:
        return 1;
    }
  }

  // Network errors
  if (error.message.includes('network') || error.message.includes('timeout')) {
    return 3;
  }

  // File system errors
  if (error.message.includes('ENOENT') || error.message.includes('permission')) {
    return 4;
  }

  // Default exit code
  return 1;
}

/**
 * Wrap async operations with consistent error handling
 * @param {Function} operation - Async operation to wrap
 * @param {object} options - Error handling options
 * @returns {Promise} - Result of the operation
 */
export async function withErrorHandling(operation, options = {}) {
  try {
    return await operation();
  } catch (error) {
    return handleError(error, options);
  }
}

/**
 * Create a contextual error from a generic error
 * @param {Error} originalError - Original error
 * @param {object} contextOptions - Context options
 * @returns {ContextualError} - Contextual error
 */
export function contextualizeError(originalError, contextOptions = {}) {
  if (originalError instanceof ContextualError) {
    return originalError;
  }

  const sanitizedMessage = sanitizeErrorMessage(originalError.message);

  return new ContextualError(sanitizedMessage, {
    context: contextOptions.context || ErrorContext.RUNTIME,
    severity: contextOptions.severity || ErrorSeverity.MEDIUM,
    suggestions: contextOptions.suggestions || [],
    technicalDetails: originalError.message,
    userFriendlyMessage: contextOptions.userFriendlyMessage
  });
}