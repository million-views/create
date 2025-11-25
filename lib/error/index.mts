/**
 * Error Domain Facade
 *
 * Exports all error classes and types for the lib/ error domain.
 * This is the only file that should be imported from lib/error/.
 *
 * @module lib/error
 */

// Error classes
export { ValidationError } from './validation.mts';
export { ContextualError } from './contextual.mts';
export { ViolationError } from './boundary.mts';
export { GateError } from './gate.mts';

// Re-export types from contextual (ErrorContext, ErrorSeverity)
export type { ErrorContext, ErrorSeverity } from './contextual.mts';

// Re-export option types for constructors
export type { ValidationErrorOptions } from '../types.mts';
export type { ViolationErrorOptions } from './boundary.mts';
export type { GateErrorOptions } from './gate.mts';
export type { ContextualErrorOptions } from '../types.mts';
