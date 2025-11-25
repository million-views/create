/**
 * Domain Validation Facade
 *
 * Exports all domain/business-rule validators for placeholders, dimensions, etc.
 *
 * @module lib/validation/domain
 */

// Placeholder validation
export * as placeholder from './placeholder.mts';

// Dimension validation
export * as dimension from './dimension.mts';
export type {
  DimensionType,
  DimensionPolicy,
  RawDimensionDefinition,
  NormalizedDimension
} from './dimension.mts';
