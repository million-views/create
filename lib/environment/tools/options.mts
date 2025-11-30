#!/usr/bin/env node
// @ts-nocheck

/**
 * Options API for template setup scripts (V1.0.0 Schema Compliant).
 * 
 * V1.0.0 Schema: All dimensions are single-select with 'options' array structure.
 * Multi-select functionality is handled via 'features' (separate top-level array).
 *
 * @module lib/environment/tools/options
 */

import { SetupSandboxError } from '../utils.mts';

/**
 * Normalize options by dimension according to V1.0.0 dimension definitions.
 * V1.0.0: All dimensions are single-select with 'options' array.
 * 
 * @param {Record<string, string>} byDimension - Raw options by dimension
 * @param {Record<string, {options?: Array<{id: string}>, default?: string}>} dimensionDefinitions - V1.0.0 dimension definitions
 * @returns {Record<string, string>}
 */
function normalizeByDimension(byDimension, dimensionDefinitions) {
  const normalized = {};

  for (const [dimension, definition] of Object.entries(dimensionDefinitions)) {
    const rawValue = byDimension[dimension];
    
    // V1.0.0: All dimensions are single-select
    normalized[dimension] = typeof rawValue === 'string' ? rawValue : (definition.default ?? null);
  }

  // Handle any dimensions not in definitions
  for (const [dimension, value] of Object.entries(byDimension)) {
    if (normalized[dimension] === undefined) {
      normalized[dimension] = typeof value === 'string' ? value : null;
    }
  }

  return normalized;
}

/**
 * Create an options API for checking user selections (V1.0.0 Schema Compliant).
 * 
 * V1.0.0: All dimensions are single-select.
 *
 * @param {Object} config - Configuration
 * @param {Object} config.options - User options with raw and byDimension
 * @param {Object} config.dimensions - V1.0.0 dimension definitions
 * @returns {Object} Frozen options API
 */
export function buildOptionsApi({ options, dimensions }) {
  const rawList = Array.isArray(options?.raw) ? options.raw.slice() : [];
  const rawSet = new Set(rawList);
  const dimensionDefinitions = dimensions ?? {};
  const normalizedByDimension = normalizeByDimension(options?.byDimension ?? {}, dimensionDefinitions);

  const api = {
    /**
     * Check if a value exists in any dimension.
     * V1.0.0: Checks all single-select dimension values.
     * @param {string} name - Value to check
     * @returns {boolean}
     */
    has(name) {
      if (typeof name !== 'string') {
        return false;
      }

      // V1.0.0: Check if any dimension has this value
      for (const value of Object.values(normalizedByDimension)) {
        if (value === name) {
          return true;
        }
      }

      return rawSet.has(name);
    },

    /**
     * Run callback when any dimension includes value.
     * @param {string} name - Value to check
     * @param {Function} fn - Callback to run
     * @returns {Promise<void> | undefined}
     */
    async when(name, fn) {
      if (api.has(name) && typeof fn === 'function') {
        return await fn();
      }
      return undefined;
    },

    /**
     * Get the selected option for a dimension.
     * V1.0.0: All dimensions are single-select, returns string or null.
     * @param {string} [dimension] - Dimension name
     * @returns {string | string[] | null}
     */
    list(dimension) {
      if (dimension === undefined) {
        return rawList.slice();
      }

      const value = normalizedByDimension[dimension];
      return value ?? null;
    },

    /**
     * Check if a dimension has a specific value.
     * V1.0.0: All dimensions are single-select.
     * @param {string} dimension - Dimension name
     * @param {string} value - Value to check
     * @returns {boolean}
     */
    in(dimension, value) {
      if (typeof dimension !== 'string' || typeof value !== 'string') {
        return false;
      }

      const selected = normalizedByDimension[dimension];
      return selected === value;
    },

    /**
     * Require a value in a dimension (throws if missing).
     * @param {string} arg1 - Dimension name
     * @param {string} arg2 - Required value
     */
    require(arg1, arg2) {
      const dimension = arg1;
      const value = arg2;
      
      if (value === undefined) {
        throw new SetupSandboxError('require() requires two arguments: dimension and value');
      }
      
      if (!api.in(dimension, value)) {
        throw new SetupSandboxError(`Required option "${value}" not selected in dimension "${dimension}".`);
      }
    },

    /**
     * Get shallow clone of options by dimension.
     * @returns {Record<string, string>}
     */
    dimensions() {
      const copy = {};
      for (const [dimension, value] of Object.entries(normalizedByDimension)) {
        copy[dimension] = value;
      }
      return copy;
    },

    /**
     * Get raw option strings.
     * @returns {string[]}
     */
    raw() {
      return rawList.slice();
    }
  };

  return Object.freeze(api);
}
