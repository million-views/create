/**
 * Template Validator - Re-export shim for backward compatibility
 *
 * This file re-exports the TemplateValidator from the schema subdirectory.
 * New code should import from lib/validation/schema/index.mts.
 *
 * @deprecated Import from './schema/index.mts' instead
 * @module lib/validation/template-validator
 */

export { TemplateValidator } from './schema/template-validator.mts';
