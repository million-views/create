#!/usr/bin/env node

/**
 * Shared error classes for consistent error handling across the CLI ecosystem
 */

/**
 * Base argument error class for CLI argument parsing errors
 */
export class ArgumentError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'ArgumentError';
    this.field = options.field;
    this.suggestions = options.suggestions || [];
  }
}