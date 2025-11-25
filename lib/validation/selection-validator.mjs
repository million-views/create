/**
 * Selection Validator - Re-export shim for backward compatibility
 *
 * This file re-exports the SelectionValidator from the schema subdirectory.
 * New code should import from lib/validation/schema/index.mts.
 *
 * @deprecated Import from './schema/index.mts' instead
 * @module lib/validation/selection-validator
 */

export { SelectionValidator } from './schema/index.mts';
