#!/usr/bin/env node

/**
 * Shared CLI error handler
 * Provides consistent error formatting and user-friendly messages
 */

import { ContextualError, ErrorContext, ErrorSeverity } from '../shared/utils/error-handler.mjs';

/**
 * CLI-specific error handler
 */
export class CLIErrorHandler {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.json = options.json || false;
  }

  /**
   * Handle an error and format for CLI output
   */
  handle(error, parsedArgs = {}) {
    const verbose = parsedArgs.globalOptions?.verbose || this.verbose;
    const json = parsedArgs.globalOptions?.json || this.json;

    if (json) {
      return this.formatJsonError(error);
    }

    return this.formatHumanError(error, verbose);
  }

  /**
   * Format error as JSON
   */
  formatJsonError(error) {
    const errorInfo = {
      error: true,
      message: error.message,
      type: error.name,
      context: error.context || ErrorContext.RUNTIME,
      severity: error.severity || ErrorSeverity.MEDIUM
    };

    if (error.suggestions && error.suggestions.length > 0) {
      errorInfo.suggestions = error.suggestions;
    }

    if (error.technicalDetails) {
      errorInfo.technicalDetails = error.technicalDetails;
    }

    return JSON.stringify(errorInfo, null, 2);
  }

  /**
   * Format error for human consumption
   */
  formatHumanError(error, verbose = false) {
    let output = '';

    // Error message
    const userMessage = error.userFriendlyMessage || error.message;
    output += `❌ Error: ${userMessage}\n`;

    // Suggestions
    if (error.suggestions && error.suggestions.length > 0) {
      output += '\n💡 Suggestions:\n';
      for (const suggestion of error.suggestions) {
        output += `   • ${suggestion}\n`;
      }
    }

    // Context-specific help
    const contextHelp = this.getContextHelp(error.context);
    if (contextHelp) {
      output += `\n${contextHelp}\n`;
    }

    // Verbose details
    if (verbose && error.technicalDetails) {
      output += `\n🔧 Technical Details:\n${error.technicalDetails}\n`;
    }

    // Stack trace in verbose mode
    if (verbose && error.stack) {
      output += `\n📋 Stack Trace:\n${error.stack}\n`;
    }

    return output;
  }

  /**
   * Get context-specific help messages
   */
  getContextHelp(context) {
    const helpMessages = {
      [ErrorContext.VALIDATION]: 'Check your input values and try again. Use --help for usage information.',
      [ErrorContext.NETWORK]: 'Check your internet connection and try again. If the issue persists, the service may be unavailable.',
      [ErrorContext.FILESYSTEM]: 'Check file permissions and available disk space. Ensure the path exists and is accessible.',
      [ErrorContext.TEMPLATE]: 'Verify the template URL or path is correct. Use --validate-template to check template integrity.',
      [ErrorContext.CONFIGURATION]: 'Check your configuration files and environment variables. Use --help for configuration options.',
      [ErrorContext.USER_INPUT]: 'Review your command arguments and options. Use --help for correct syntax.',
      [ErrorContext.RUNTIME]: 'This appears to be an internal error. Please report this issue if it persists.'
    };

    return helpMessages[context] || helpMessages[ErrorContext.RUNTIME];
  }

  /**
   * Create a CLI-specific error
   */
  static createError(message, options = {}) {
    return new ContextualError(message, {
      context: options.context || ErrorContext.RUNTIME,
      severity: options.severity || ErrorSeverity.MEDIUM,
      suggestions: options.suggestions || [],
      technicalDetails: options.technicalDetails,
      userFriendlyMessage: options.userFriendlyMessage
    });
  }
}

/**
 * Convenience function to create CLI error handler
 */
export function createErrorHandler(options) {
  return new CLIErrorHandler(options);
}

/**
 * Handle process exit with error
 */
export function exitWithError(error, parsedArgs = {}) {
  const handler = new CLIErrorHandler();
  const message = handler.handle(error, parsedArgs);
  console.error(message);
  process.exit(1);
}