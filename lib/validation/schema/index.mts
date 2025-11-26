/**
 * Schema Validation Facade
 *
 * Exports all JSON Schema-based validators for template and selection files.
 *
 * @module lib/validation/schema
 */

// Template schema validation (authoring)
export { TemplateValidator } from './template-validator.mts';

// Selection schema validation
export { SelectionValidator } from './selection-validator.mts';

// Template manifest validation (runtime)
export {
  validate as validateManifest,
  validateTemplateManifest
} from './manifest.mts';

export type { ManifestResult } from './manifest.mts';
