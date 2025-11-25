/**
 * Validation Domain Facade
 *
 * Exports all validation modules organized by purpose:
 * - schema: JSON Schema validators (template.json, selection.json)
 * - domain: Business rule validators (placeholders, dimensions)
 * - cli: CLI input validators (options, parameters)
 *
 * @module lib/validation
 */

// Schema validators
export * as schema from './schema/index.mts';

// Domain validators
export * as domain from './domain/index.mts';

// CLI validators
export * as cli from './cli/index.mts';
