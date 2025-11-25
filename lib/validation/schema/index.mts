/**
 * Schema Validation Facade
 *
 * Exports all JSON Schema-based validators for template and selection files.
 *
 * @module lib/validation/schema
 */

// Template schema validation
export { TemplateValidator } from './template-validator.mjs';

// Selection schema validation
export { SelectionValidator } from './selection-validator.mjs';
