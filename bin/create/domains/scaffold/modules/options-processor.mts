#!/usr/bin/env node
// @ts-nocheck

import { ValidationError } from '@m5nv/create/lib/error/validation.mts';

/**
 * V1.0.0 Schema Compliant - Valid dimension names
 * @see schema/template.v1.json - 7 fixed infrastructure dimensions
 */
const VALID_DIMENSIONS = ['deployment', 'database', 'storage', 'identity', 'billing', 'analytics', 'monitoring'];

/**
 * Get valid option IDs from a V1.0.0 dimension definition.
 * V1.0.0: dimensions have 'options' array with {id, label} objects.
 * @param {object} definition - Dimension definition
 * @returns {Set<string>} Set of valid option IDs
 */
function getValidOptionIds(definition) {
  if (!definition || !Array.isArray(definition.options)) {
    return new Set();
  }
  return new Set(definition.options.map(opt => opt.id));
}

/**
 * Normalize CLI-supplied options against template dimensions (V1.0.0 compliant).
 * 
 * V1.0.0 Schema: All dimensions are single-select with 'options' array structure.
 * Multi-select functionality is handled via 'features' (separate top-level array).
 * 
 * @param {Object} params
 * @param {string[]} params.rawTokens - sanitized option tokens (e.g. ["deployment=cloudflare-workers"])
 * @param {Record<string, object>} params.dimensions - V1.0.0 dimension definitions with 'options' array
 * @returns {{ byDimension: Record<string, string>, unknown: string[], warnings: string[] }}
 */
export function normalizeOptions({ rawTokens = [], dimensions = {} }) {
  const byDimension = {};
  const warnings = [];
  const unknown = [];

  // V1.0.0: Initialize with defaults (all dimensions are single-select)
  for (const [name, definition] of Object.entries(dimensions)) {
    // V1.0.0: 'default' is a string (single-select)
    byDimension[name] = definition.default ?? null;
  }

  // V1.0.0: All dimensions are single-select, no catch-all for multi-select
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

      // V1.0.0: All dimensions are single-select
      if (values.length > 1) {
        throw new ValidationError(
          `Dimension "${key}" accepts a single value. Received: ${values.join(', ')}`,
          'options'
        );
      }

      const selected = values[0];
      const validIds = getValidOptionIds(definition);
      
      if (validIds.size > 0 && !validIds.has(selected)) {
        handleOutOfRangeValue({ dimensionName: key, value: selected, definition, warnings, unknown, token });
        continue;
      }
      
      byDimension[key] = selected;
    } else {
      // V1.0.0: Bare tokens not supported (no multi-select catch-all)
      unknown.push(token);
    }
  }

  return {
    byDimension,
    warnings,
    unknown
  };
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
