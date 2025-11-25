#!/usr/bin/env node

/**
 * Boundary Validator - Re-export shim for backward compatibility
 *
 * This file re-exports the Boundary class from the security domain.
 * New code should import directly from lib/security/index.mts.
 *
 * @deprecated Import from './security/index.mts' instead
 * @module lib/boundary-validator
 */

// Re-export everything from the security domain
export {
  Boundary as BoundaryValidator,
  Boundary,
  createBoundary as createBoundaryValidator,
  createBoundary
} from './security/index.mts';

// Re-export ViolationError from error domain (also exported as BoundaryViolationError for compatibility)
export { ViolationError, ViolationError as BoundaryViolationError } from './error/index.mts';
