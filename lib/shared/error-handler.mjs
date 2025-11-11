#!/usr/bin/env node

/**
 * Shared error handling utilities for make-template commands
 * Provides consistent error handling across all commands
 */

/**
 * Standard error handler for make-template commands
 * @param {string} message - Error message to display
 * @param {number} exitCode - Exit code (default: 1)
 */
export function handleError(message, exitCode = 1) {
  console.error(`Error: ${message}`);
  process.exit(exitCode);
}

/**
 * Handle argument parsing errors consistently across commands
 * @param {Error} error - The parsing error from parseArgs
 * @param {Function} errorHandler - Error handler function (defaults to handleError)
 */
export function handleArgumentParsingError(error, errorHandler = handleError) {
  if (error.code === 'ERR_PARSE_ARGS_UNKNOWN_OPTION') {
    errorHandler(`Unknown option: ${error.message.split("'")[1]}`);
  } else if (error.code === 'ERR_PARSE_ARGS_INVALID_OPTION_VALUE') {
    if (error.message.includes('argument missing')) {
      const optionMatch = error.message.match(/Option '([^']+)'/);
      if (optionMatch) {
        const option = optionMatch[1];
        errorHandler(`Option ${option} requires a value`);
      } else {
        errorHandler(`Missing value for option`);
      }
    } else {
      errorHandler(`Invalid argument: ${error.message}`);
    }
  } else {
    errorHandler(`Argument parsing error: ${error.message}`);
  }
}

/**
 * Wrap main function with standard error handling
 * @param {Function} mainFunction - The main function to wrap
 * @param {Function} errorHandler - Error handler function (defaults to handleError)
 */
export function withErrorHandling(mainFunction, errorHandler = handleError) {
  return async (...args) => {
    try {
      await mainFunction(...args);
    } catch (error) {
      errorHandler(error.message);
    }
  };
}
