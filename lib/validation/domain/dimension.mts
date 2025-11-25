/**
 * Dimension Domain Validator
 *
 * Validates dimension metadata in template setup scripts.
 * Dimensions allow templates to define variation points with type-safe values.
 *
 * @module lib/validation/domain/dimension
 */

import { ValidationError } from '../../error/index.mts';

/**
 * Dimension type (single selection or multi-selection).
 */
export type DimensionType = 'single' | 'multi';

/**
 * Dimension policy for handling validation failures.
 */
export type DimensionPolicy = 'strict' | 'warn';

/**
 * Raw dimension definition from user input.
 */
export interface RawDimensionDefinition {
  type?: string;
  values?: unknown[];
  default?: unknown;
  requires?: Record<string, unknown[]>;
  conflicts?: Record<string, unknown[]>;
  policy?: string;
  description?: string;
}

/**
 * Normalized dimension definition after validation.
 */
export interface NormalizedDimension {
  type: DimensionType;
  values: readonly string[];
  default: string | null | readonly string[];
  requires: Readonly<Record<string, readonly string[]>>;
  conflicts: Readonly<Record<string, readonly string[]>>;
  policy: DimensionPolicy;
  description: string | null;
}

const dimensionNamePattern = /^[a-z][a-z0-9_-]{0,49}$/;
const valuePattern = /^[a-zA-Z0-9_-]+$/;

/**
 * Validate and normalize dimensions metadata.
 *
 * @param dimensions - Raw dimensions object from setup script
 * @returns Normalized and frozen dimensions object
 * @throws ValidationError if dimensions are invalid
 */
export function validate(
  dimensions: unknown
): Record<string, NormalizedDimension> {
  if (dimensions === undefined || dimensions === null) {
    return {};
  }

  if (typeof dimensions !== 'object' || Array.isArray(dimensions)) {
    throw new ValidationError('setup.dimensions must be an object', 'dimensions');
  }

  const normalized: Record<string, NormalizedDimension> = {};

  for (const [name, rawDefinition] of Object.entries(dimensions as Record<string, unknown>)) {
    if (!dimensionNamePattern.test(name)) {
      throw new ValidationError(
        `Invalid dimension name "${name}". Dimension names must start with a letter and contain only letters, numbers, hyphens, or underscores (max 50 characters).`,
        'dimensions'
      );
    }

    if (typeof rawDefinition !== 'object' || rawDefinition === null || Array.isArray(rawDefinition)) {
      throw new ValidationError(
        `Dimension "${name}" must be an object`,
        'dimensions'
      );
    }

    const def = rawDefinition as RawDimensionDefinition;
    
    const type = validateType(name, def.type);
    const values = validateValues(name, def.values);
    const defaultValue = validateDefault(name, type, values, def.default);
    const requires = validateRequires(name, values, def.requires);
    const conflicts = validateConflicts(name, values, def.conflicts);
    const policy = validatePolicy(name, def.policy);
    const description = validateDescription(def.description);

    const frozenValues = Object.freeze([...values]);
    const frozenDefault =
      type === 'single'
        ? defaultValue
        : Object.freeze([...(defaultValue as string[] ?? [])]);

    const frozenRequires = Object.freeze(
      Object.fromEntries(
        Object.entries(requires).map(([key, deps]) => [
          key,
          Object.freeze([...deps])
        ])
      )
    );

    const frozenConflicts = Object.freeze(
      Object.fromEntries(
        Object.entries(conflicts).map(([key, deps]) => [
          key,
          Object.freeze([...deps])
        ])
      )
    );

    normalized[name] = Object.freeze({
      type,
      values: frozenValues,
      default: frozenDefault as string | null | readonly string[],
      requires: frozenRequires,
      conflicts: frozenConflicts,
      policy,
      description
    });
  }

  return normalized;
}

function validateType(name: string, type: unknown): DimensionType {
  if (type === 'multi') return 'multi';
  if (type === 'single') return 'single';
  
  throw new ValidationError(
    `Dimension "${name}" must declare type "single" or "multi"`,
    'dimensions'
  );
}

function validateValues(name: string, rawValues: unknown): string[] {
  if (!Array.isArray(rawValues) || rawValues.length === 0) {
    throw new ValidationError(
      `Dimension "${name}" must declare a non-empty values array`,
      'dimensions'
    );
  }

  const values: string[] = [];
  const seenValues = new Set<string>();

  for (const rawValue of rawValues) {
    if (typeof rawValue !== 'string') {
      throw new ValidationError(
        `Dimension "${name}" values must be strings`,
        'dimensions'
      );
    }

    const trimmed = rawValue.trim();
    if (!trimmed) {
      throw new ValidationError(
        `Dimension "${name}" values cannot be empty`,
        'dimensions'
      );
    }

    if (!valuePattern.test(trimmed)) {
      throw new ValidationError(
        `Dimension "${name}" has invalid value "${rawValue}". Values must contain only letters, numbers, hyphens, or underscores`,
        'dimensions'
      );
    }

    if (trimmed.length > 50) {
      throw new ValidationError(
        `Dimension "${name}" value "${trimmed}" exceeds 50 characters`,
        'dimensions'
      );
    }

    if (!seenValues.has(trimmed)) {
      seenValues.add(trimmed);
      values.push(trimmed);
    }
  }

  return values;
}

function validateDefault(
  name: string,
  type: DimensionType,
  values: string[],
  rawDefault: unknown
): string | null | string[] {
  let defaultValue = rawDefault ?? (type === 'single' ? null : []);

  if (type === 'single') {
    if (defaultValue !== null) {
      if (typeof defaultValue !== 'string') {
        throw new ValidationError(
          `Dimension "${name}" default must be a string or null`,
          'dimensions'
        );
      }
      const normalizedDefault = (defaultValue as string).trim();
      if (normalizedDefault && !values.includes(normalizedDefault)) {
        throw new ValidationError(
          `Dimension "${name}" default "${normalizedDefault}" must be one of the declared values`,
          'dimensions'
        );
      }
      return normalizedDefault || null;
    }
    return null;
  } else {
    if (!Array.isArray(defaultValue)) {
      defaultValue = [];
    }

    const multiDefaults: string[] = [];
    for (const rawVal of defaultValue as unknown[]) {
      if (typeof rawVal !== 'string') {
        throw new ValidationError(
          `Dimension "${name}" multi default entries must be strings`,
          'dimensions'
        );
      }
      const trimmedDefault = rawVal.trim();
      if (!values.includes(trimmedDefault)) {
        throw new ValidationError(
          `Dimension "${name}" default value "${trimmedDefault}" must be one of the declared values`,
          'dimensions'
        );
      }
      if (!multiDefaults.includes(trimmedDefault)) {
        multiDefaults.push(trimmedDefault);
      }
    }
    return multiDefaults;
  }
}

function validateRequires(
  name: string,
  values: string[],
  rawRequires: unknown
): Record<string, string[]> {
  if (rawRequires === undefined) {
    return {};
  }

  if (typeof rawRequires !== 'object' || rawRequires === null || Array.isArray(rawRequires)) {
    throw new ValidationError(
      `Dimension "${name}" requires must be an object`,
      'dimensions'
    );
  }

  const normalizedRequires: Record<string, string[]> = {};

  for (const [value, deps] of Object.entries(rawRequires as Record<string, unknown>)) {
    if (!values.includes(value)) {
      throw new ValidationError(
        `Dimension "${name}" requires references unknown value "${value}"`,
        'dimensions'
      );
    }

    if (!Array.isArray(deps) || deps.length === 0) {
      throw new ValidationError(
        `Dimension "${name}" requires entry for "${value}" must be a non-empty array`,
        'dimensions'
      );
    }

    const normalizedDeps: string[] = [];
    for (const dep of deps) {
      if (typeof dep !== 'string') {
        throw new ValidationError(
          `Dimension "${name}" requires for "${value}" must be strings`,
          'dimensions'
        );
      }
      const trimmedDep = dep.trim();
      if (!values.includes(trimmedDep)) {
        throw new ValidationError(
          `Dimension "${name}" requires for "${value}" references unknown value "${trimmedDep}"`,
          'dimensions'
        );
      }
      if (!normalizedDeps.includes(trimmedDep)) {
        normalizedDeps.push(trimmedDep);
      }
    }
    normalizedRequires[value] = normalizedDeps;
  }

  return normalizedRequires;
}

function validateConflicts(
  name: string,
  values: string[],
  rawConflicts: unknown
): Record<string, string[]> {
  if (rawConflicts === undefined) {
    return {};
  }

  if (typeof rawConflicts !== 'object' || rawConflicts === null || Array.isArray(rawConflicts)) {
    throw new ValidationError(
      `Dimension "${name}" conflicts must be an object`,
      'dimensions'
    );
  }

  const normalizedConflicts: Record<string, string[]> = {};

  for (const [value, conflicts] of Object.entries(rawConflicts as Record<string, unknown>)) {
    if (!values.includes(value)) {
      throw new ValidationError(
        `Dimension "${name}" conflicts references unknown value "${value}"`,
        'dimensions'
      );
    }

    if (!Array.isArray(conflicts) || conflicts.length === 0) {
      throw new ValidationError(
        `Dimension "${name}" conflicts entry for "${value}" must be a non-empty array`,
        'dimensions'
      );
    }

    const normalizedConflictsForValue: string[] = [];
    for (const conflict of conflicts) {
      if (typeof conflict !== 'string') {
        throw new ValidationError(
          `Dimension "${name}" conflicts for "${value}" must be strings`,
          'dimensions'
        );
      }
      const trimmedConflict = conflict.trim();
      if (!values.includes(trimmedConflict)) {
        throw new ValidationError(
          `Dimension "${name}" conflicts for "${value}" references unknown value "${trimmedConflict}"`,
          'dimensions'
        );
      }
      if (trimmedConflict === value) {
        throw new ValidationError(
          `Dimension "${name}" conflicts for "${value}" cannot reference itself`,
          'dimensions'
        );
      }
      if (!normalizedConflictsForValue.includes(trimmedConflict)) {
        normalizedConflictsForValue.push(trimmedConflict);
      }
    }
    normalizedConflicts[value] = normalizedConflictsForValue;
  }

  return normalizedConflicts;
}

function validatePolicy(name: string, rawPolicy: unknown): DimensionPolicy {
  if (rawPolicy === undefined) {
    return 'strict';
  }

  if (typeof rawPolicy !== 'string') {
    throw new ValidationError(
      `Dimension "${name}" policy must be a string`,
      'dimensions'
    );
  }

  const normalizedPolicy = rawPolicy.trim().toLowerCase();
  if (normalizedPolicy !== 'strict' && normalizedPolicy !== 'warn') {
    throw new ValidationError(
      `Dimension "${name}" policy must be "strict" or "warn"`,
      'dimensions'
    );
  }

  return normalizedPolicy as DimensionPolicy;
}

function validateDescription(rawDescription: unknown): string | null {
  if (typeof rawDescription === 'string') {
    const trimmed = rawDescription.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

// Re-export for backward compatibility
export { validate as validateDimensionsMetadata };
