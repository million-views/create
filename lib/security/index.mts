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

// Gate - Security validation at entry points
export { Gate, SecurityGate } from './gate.mts';
export type { GateOptions, GateContext, GateResult, GateCacheStats } from './gate.mts';

// Boundary - Path boundary enforcement
export { Boundary, BoundaryValidator, createBoundary, createBoundaryValidator } from './boundary.mts';
export type { BoundaryOptions, FsModule } from './boundary.mts';
