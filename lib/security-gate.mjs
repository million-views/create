#!/usr/bin/env node

/**
 * Security Gate - Re-export shim for backward compatibility
 *
 * This file re-exports the Gate class from the security domain.
 * New code should import directly from lib/security/index.mts.
 *
 * @deprecated Import from './security/index.mts' instead
 * @module lib/security-gate
 */

// Re-export everything from the security domain
export {
  Gate as SecurityGate,
  Gate
} from './security/index.mts';

// Re-export GateError from error domain (also exported as SecurityGateError for compatibility)
export { GateError, GateError as SecurityGateError } from './error/index.mts';
