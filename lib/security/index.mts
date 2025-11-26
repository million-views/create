/**
 * Security Domain Facade
 *
 * Exports all security-related classes, functions, and types.
 * This is the only file that should be imported from lib/security/.
 *
 * @module lib/security
 */

// Sanitization utilities
export * as sanitize from './sanitize.mts';

// Package identity and validation
export * as identity from './identity.mts';

// Gate - Security validation at entry points
export { Gate, SecurityGate } from './gate.mts';
export type { GateOptions, GateContext, GateResult, GateCacheStats } from './gate.mts';

// Boundary - Path boundary enforcement
export { Boundary, BoundaryValidator, createBoundary, createBoundaryValidator } from './boundary.mts';
export type { BoundaryOptions, FsModule } from './boundary.mts';

// Legacy re-exports for backward compatibility during migration
export {
  path as sanitizePath,
  branch as sanitizeBranchName,
  error as sanitizeErrorMessage,
  _createSecureTempPath as createSecureTempDir
} from './sanitize.mts';

export {
  PACKAGE_NAME,
  getPackageName,
  generateInstallationInstructions,
  generatePackageValidationError,
  validatePackageName,
  validatePackageIdentity
} from './identity.mts';
