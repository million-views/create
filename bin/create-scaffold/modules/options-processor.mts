#!/usr/bin/env node
// @ts-nocheck

import { ValidationError } from '@m5nv/create-scaffold/lib/error/index.mts';

/**
 * Normalize CLI-supplied options against template dimensions.
 * @param {Object} params
 * @param {string[]} params.rawTokens - sanitized option tokens (e.g. ["auth","stack=react-vite"])
 * @param {Record<string, object>} params.dimensions - normalized dimension metadata
 * @returns {{ byDimension: Record<string, string|string[]>, unknown: string[], warnings: string[] }}
 */
export function normalizeOptions({ rawTokens = [], dimensions = {} }) {
  const byDimension = {};
  const warnings = [];
  const unknown = [];

  // Initialize with defaults
  for (const [name, definition] of Object.entries(dimensions)) {
    if (definition.type === 'single') {
      byDimension[name] = definition.default ?? null;
    } else {
      byDimension[name] = Array.isArray(definition.default)
        ? [...definition.default]
        : [];
    }
  }

  const multiDefaultDimension = pickCatchAllDimension(dimensions);

  for (const token of rawTokens) {
    if (token.includes('=')) {
      const [rawKey, rawValues] = token.split('=');
      const key = rawKey.trim();
      const definition = dimensions[key];

      if (!definition) {
        unknown.push(token);
        continue;
      }

      const values = (rawValues ?? '')
        .split('+')
        .map(value => value.trim())
        .filter(Boolean);

      if (values.length === 0) {
        throw new ValidationError(
          `Option "${token}" is missing a value`,
          'options'
        );
      }

      if (definition.type === 'single') {
        if (values.length > 1) {
          throw new ValidationError(
            `Dimension "${key}" accepts a single value. Received: ${values.join(', ')}`,
            'options'
          );
        }
        const selected = values[0];
        if (!definition.values.includes(selected)) {
          handleOutOfRangeValue({ dimensionName: key, value: selected, definition, warnings, unknown, token });
          continue;
        }
        byDimension[key] = selected;
      } else {
        const current = new Set(byDimension[key] ?? []);
        for (const value of values) {
          if (!definition.values.includes(value)) {
            handleOutOfRangeValue({ dimensionName: key, value, definition, warnings, unknown, token });
            continue;
          }
          current.add(value);
        }
        byDimension[key] = Array.from(current);
      }
    } else {
      const targetDimension = multiDefaultDimension;
      if (!targetDimension) {
        unknown.push(token);
        continue;
      }
      const definition = dimensions[targetDimension];
      if (!definition) {
        unknown.push(token);
        continue;
      }
      if (!definition.values.includes(token)) {
        handleOutOfRangeValue({
          dimensionName: targetDimension,
          value: token,
          definition,
          warnings,
          unknown,
          token
        });
        continue;
      }
      const current = new Set(byDimension[targetDimension] ?? []);
      current.add(token);
      byDimension[targetDimension] = Array.from(current);
    }
  }

  enforceDependencies(byDimension, dimensions);
  enforceConflicts(byDimension, dimensions);

  // Ensure arrays remain sorted deterministically
  for (const [name, definition] of Object.entries(dimensions)) {
    if (definition.type === 'multi') {
      const values = Array.from(new Set(byDimension[name] ?? []));
      values.sort();
      byDimension[name] = values;
    }
  }

  return {
    byDimension,
    warnings,
    unknown
  };
}

function pickCatchAllDimension(dimensions) {
  if (dimensions.capabilities && dimensions.capabilities.type === 'multi') {
    return 'capabilities';
  }

  for (const [name, definition] of Object.entries(dimensions)) {
    if (definition.type === 'multi') {
      return name;
    }
  }

  return null;
}

function handleOutOfRangeValue({ dimensionName, value, definition, warnings, unknown, token }) {
  if (definition.policy === 'warn') {
    warnings.push(
      `Dimension "${dimensionName}" does not list value "${value}", but policy is "warn" so continuing.`
    );
  } else {
    unknown.push(token);
  }
}

function enforceDependencies(byDimension, dimensions) {
  for (const [name, definition] of Object.entries(dimensions)) {
    if (!definition.requires || Object.keys(definition.requires).length === 0) {
      continue;
    }

    const selected = definition.type === 'single'
      ? (byDimension[name] ? [byDimension[name]] : [])
      : (byDimension[name] ?? []);

    const selectedSet = new Set(selected);
    for (const value of selected) {
      const requirements = definition.requires[value] ?? [];
      for (const required of requirements) {
        if (!selectedSet.has(required)) {
          throw new ValidationError(
            `Dimension "${name}" value "${value}" requires "${required}"`,
            'options'
          );
        }
      }
    }
  }
}

function enforceConflicts(byDimension, dimensions) {
  for (const [name, definition] of Object.entries(dimensions)) {
    if (!definition.conflicts || Object.keys(definition.conflicts).length === 0) {
      continue;
    }

    const selected = definition.type === 'single'
      ? (byDimension[name] ? [byDimension[name]] : [])
      : (byDimension[name] ?? []);

    const selectedSet = new Set(selected);
    for (const value of selected) {
      const conflicts = definition.conflicts[value] ?? [];
      for (const conflict of conflicts) {
        if (selectedSet.has(conflict)) {
          throw new ValidationError(
            `Dimension "${name}" value "${value}" cannot be used with "${conflict}"`,
            'options'
          );
        }
      }
    }
  }
}
