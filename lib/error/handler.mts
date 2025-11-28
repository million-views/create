/**
 * Error Handler Module
 *
 * Centralized error handling utilities for consistent user experience.
 * Provides standardized error formatting, context, and suggestions.
 *
 * @module lib/error/handler
 */

import { error as sanitizeError } from '../security/sanitize.mts';
import { ValidationError } from './validation.mts';
import { ContextualError } from './contextual.mts';
import { ArgumentError, PreflightError } from './classes.mts';
import type { ErrorContext as ErrorContextType, ErrorSeverity as ErrorSeverityType } from '../types.mts';

/**
 * Error context types for better error categorization.
 * Use these constants for runtime values.
 */
export const ErrorContext = {
  VALIDATION: 'validation',
  NETWORK: 'network',
  FILESYSTEM: 'filesystem',
  TEMPLATE: 'template',
  CONFIGURATION: 'configuration',
  RUNTIME: 'runtime',
  USER_INPUT: 'user_input',
  SECURITY: 'security'
} as const satisfies Record<string, ErrorContextType>;

/**
 * Error severity levels.
 * Use these constants for runtime values.
 */
export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  FATAL: 'fatal'
} as const satisfies Record<string, ErrorSeverityType>;

/**
 * Options for formatting error messages
 */
export interface FormatErrorOptions {
  /** Include suggestions in output */
  includeSuggestions?: boolean;
  /** Include technical details in output */
  includeTechnical?: boolean;
  /** Maximum number of suggestions to show */
  maxSuggestions?: number;
}

/**
 * Format error message with consistent styling and context
 */
export function formatErrorMessage(error: Error & {
  context?: ErrorContextType;
  userFriendlyMessage?: string;
  technicalDetails?: string;
  suggestions?: string[];
}, options: FormatErrorOptions = {}): string {
  const {
    includeSuggestions = true,
    includeTechnical = false,
    maxSuggestions = 3
  } = options;

  let output = '';

  // Main error message with emoji based on context
  const _emoji = getContextEmoji(error.context || ErrorContext.RUNTIME);
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
 */
function getContextEmoji(context: ErrorContextType): string {
  const emojiMap: Record<ErrorContextType, string> = {
    validation: '🔍',
    network: '🌐',
    filesystem: '📁',
    template: '📋',
    configuration: '⚙️',
    runtime: '⚡',
    user_input: '👤',
    security: '🔒'
  };

  return emojiMap[context] || '❌';
}

/**
 * Error message factory for common scenarios
 */
export const ErrorMessages = {
  // Template resolution errors
  templateNotFound: (template: string) => new ContextualError(
    `Template "${template}" not found`,
    {
      context: ErrorContext.TEMPLATE,
      severity: ErrorSeverity.HIGH,
      suggestions: [
        'Check the template name for typos',
        'Use "favorites/express-api" for configured templates',
        'Run "create scaffold list" to see available templates',
        'Try a GitHub URL like "user/repo"'
      ]
    }
  ),

  templateInvalidUrl: (url: string, reason: string) => new ContextualError(
    `Invalid template URL: ${url}`,
    {
      context: ErrorContext.TEMPLATE,
      severity: ErrorSeverity.HIGH,
      technicalDetails: reason,
      suggestions: [
        'Use format: registry/template-name (configure registries in .m5nvrc)',
        'Use format: user/repo for GitHub',
        'Use format: https://github.com/user/repo',
        'Use format: ./path/to/local/template'
      ]
    }
  ),

  // Validation errors
  validationFailed: (field: string, reason: string) => new ContextualError(
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
  networkError: (operation: string, reason: string) => new ContextualError(
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
  filesystemError: (operation: string, path: string, reason: string) => new ContextualError(
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
  configError: (setting: string, reason: string) => new ContextualError(
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
  genericError: (message: string, context: ErrorContextType = ErrorContext.RUNTIME) => new ContextualError(
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
  ),

  // CLI-specific errors
  unknownCommand: (command: string) => new ContextualError(
    `Unknown command: ${command}`,
    {
      context: ErrorContext.USER_INPUT,
      severity: ErrorSeverity.HIGH,
      suggestions: [
        'Use "new" to create a new project from a template',
        'Use "list" to see available templates and registries',
        'Use "info <template>" to get detailed information about a template',
        'Use "validate <path>" to validate a template directory',
        'Use --help to see all available commands and options'
      ]
    }
  ),

  missingRequiredArgument: (argument: string, command: string) => new ContextualError(
    `Missing required argument: ${argument}`,
    {
      context: ErrorContext.USER_INPUT,
      severity: ErrorSeverity.HIGH,
      suggestions: [
        `Specify ${argument} for the ${command} command`,
        `Use "${command} --help" for command-specific usage`,
        'Check the command syntax in the examples'
      ]
    }
  ),

  invalidArgumentValue: (argument: string, value: string, expected: string) => new ContextualError(
    `Invalid value for ${argument}: "${value}"`,
    {
      context: ErrorContext.USER_INPUT,
      severity: ErrorSeverity.HIGH,
      suggestions: [
        `Expected: ${expected}`,
        'Use --help to see valid options and formats',
        'Check documentation for detailed requirements'
      ]
    }
  ),

  commandValidationFailed: (command: string, reason: string) => new ContextualError(
    `Command validation failed for "${command}": ${reason}`,
    {
      context: ErrorContext.VALIDATION,
      severity: ErrorSeverity.HIGH,
      suggestions: [
        `Use "${command} --help" for command-specific help`,
        'Check the command syntax and required arguments',
        'Use --help to see general usage examples',
        'Ensure all required options are provided'
      ]
    }
  )
};

/**
 * Logger interface for error handling
 */
interface ErrorLogger {
  logError(error: Error, options?: { operation?: string | null }): Promise<void>;
}

/**
 * Options for handleError function
 */
export interface HandleErrorOptions {
  /** Logger instance for error logging */
  logger?: ErrorLogger | null;
  /** Operation context for logging */
  operation?: string | null;
  /** Whether to exit the process */
  exit?: boolean;
  /** Include suggestions in output */
  includeSuggestions?: boolean;
  /** Include technical details in output */
  includeTechnical?: boolean;
}

/**
 * Handle errors consistently across the application
 */
export function handleError(error: Error, options: HandleErrorOptions = {}): number {
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
  const formattedError = formatErrorMessage(error as Parameters<typeof formatErrorMessage>[0], {
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
 */
function getExitCodeForError(error: Error): number {
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
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  options: HandleErrorOptions = {}
): Promise<T | number> {
  try {
    return await operation();
  } catch (error) {
    return handleError(error as Error, options);
  }
}

/**
 * Options for contextualizing errors
 */
export interface ContextualizeErrorOptions {
  /** Error context */
  context?: ErrorContextType;
  /** Error severity */
  severity?: ErrorSeverityType;
  /** Suggestions for fixing the error */
  suggestions?: string[];
  /** User-friendly message override */
  userFriendlyMessage?: string;
}

/**
 * Create a contextual error from a generic error
 */
export function contextualizeError(
  originalError: Error,
  contextOptions: ContextualizeErrorOptions = {}
): ContextualError {
  if (originalError instanceof ContextualError) {
    return originalError;
  }

  const sanitizedMessage = sanitizeError(originalError.message);

  return new ContextualError(sanitizedMessage, {
    context: contextOptions.context || ErrorContext.RUNTIME,
    severity: contextOptions.severity || ErrorSeverity.MEDIUM,
    suggestions: contextOptions.suggestions || [],
    technicalDetails: originalError.message,
    userFriendlyMessage: contextOptions.userFriendlyMessage
  });
}
