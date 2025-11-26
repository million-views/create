/**
 * Error Domain Facade
 *
 * Exports all error classes, handlers, and types for the lib/ error domain.
 * This is the only file that should be imported from lib/error/.
 *
 * @module lib/error
 */

// Error classes
export { ValidationError } from './validation.mts';
export { ContextualError } from './contextual.mts';
export { ViolationError } from './boundary.mts';
export { GateError } from './gate.mts';
export { ArgumentError, PreflightError } from './classes.mts';

// Error handler utilities
export {
  ErrorContext,
  ErrorSeverity,
  ErrorMessages,
  formatErrorMessage,
  handleError,
  withErrorHandling,
  contextualizeError
} from './handler.mts';

// Re-export types
export type { ErrorContext as ErrorContextType, ErrorSeverity as ErrorSeverityType } from './contextual.mts';
export type { ValidationErrorOptions } from '../types.mts';
export type { ViolationErrorOptions } from './boundary.mts';
export type { GateErrorOptions } from './gate.mts';
export type { ContextualErrorOptions } from '../types.mts';
export type { ArgumentErrorOptions } from './classes.mts';
export type {
  FormatErrorOptions,
  HandleErrorOptions,
  ContextualizeErrorOptions
} from './handler.mts';
