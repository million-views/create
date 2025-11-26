#!/usr/bin/env node
// @ts-nocheck

/**
 * Options API for template setup scripts.
 *
 * @module lib/environment/tools/options
 */

import { SetupSandboxError } from '../utils.mts';

/**
 * Normalize options by dimension according to dimension definitions.
 * @param {Record<string, string | string[]>} byDimension - Raw options by dimension
 * @param {Record<string, {type: string, default?: unknown}>} dimensionDefinitions - Dimension definitions
 * @returns {Record<string, string | string[]>}
 */
function normalizeByDimension(byDimension, dimensionDefinitions) {
  const normalized = {};

  for (const [dimension, definition] of Object.entries(dimensionDefinitions)) {
    const rawValue = byDimension[dimension];

    if (definition.type === 'single') {
      normalized[dimension] = typeof rawValue === 'string' ? rawValue : (rawValue ?? definition.default ?? null);
    } else {
      if (Array.isArray(rawValue)) {
        normalized[dimension] = rawValue.map(value => value);
      } else {
        normalized[dimension] = Array.isArray(definition.default) ? definition.default.slice() : [];
      }
    }
  }

  for (const [dimension, value] of Object.entries(byDimension)) {
    if (normalized[dimension] === undefined) {
      normalized[dimension] = Array.isArray(value) ? value.map(v => v) : value;
    }
  }

  return normalized;
}

/**
 * Pick the default multi-select dimension.
 * @param {Record<string, {type: string}>} dimensions - Dimension definitions
 * @returns {string | null}
 */
function pickDefaultDimension(dimensions) {
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

/**
 * Create an options API for checking user selections.
 *
 * @param {Object} config - Configuration
 * @param {Object} config.options - User options with raw and byDimension
 * @param {Object} config.dimensions - Dimension definitions
 * @returns {Object} Frozen options API
 */
export function buildOptionsApi({ options, dimensions }) {
  const rawList = Array.isArray(options?.raw) ? options.raw.slice() : [];
  const rawSet = new Set(rawList);
  const dimensionDefinitions = dimensions ?? {};
  const normalizedByDimension = normalizeByDimension(options?.byDimension ?? {}, dimensionDefinitions);
  const defaultDimension = pickDefaultDimension(dimensionDefinitions);

  const api = {
    /**
     * Check if default multi-select dimension includes a value.
     * @param {string} name - Value to check
     * @returns {boolean}
     */
    has(name) {
      if (typeof name !== 'string') {
        return false;
      }

      if (defaultDimension) {
        const selected = normalizedByDimension[defaultDimension];
        if (Array.isArray(selected)) {
          return selected.includes(name);
        }
      }

      return rawSet.has(name);
    },

    /**
     * Run callback when default dimension includes value.
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
     * List options for a dimension or all raw options.
     * @param {string} [dimension] - Dimension name
     * @returns {string[] | string | null}
     */
    list(dimension) {
      if (dimension === undefined) {
        return rawList.slice();
      }

      const definition = dimensionDefinitions[dimension];
      const value = normalizedByDimension[dimension];

      if (!definition) {
        return Array.isArray(value) ? value.slice() : value ?? null;
      }

      if (definition.type === 'single') {
        return value ?? null;
      }

      return Array.isArray(value) ? value.slice() : [];
    },

    /**
     * Check if a dimension includes a value.
     * @param {string} dimension - Dimension name
     * @param {string} value - Value to check
     * @returns {boolean}
     */
    in(dimension, value) {
      if (typeof dimension !== 'string' || typeof value !== 'string') {
        return false;
      }

      const definition = dimensionDefinitions[dimension];
      const selected = normalizedByDimension[dimension];

      if (!definition) {
        if (Array.isArray(selected)) {
          return selected.includes(value);
        }
        return selected === value;
      }

      if (definition.type === 'single') {
        return selected === value;
      }

      return Array.isArray(selected) && selected.includes(value);
    },

    /**
     * Require a value in a dimension (throws if missing).
     * @param {string} arg1 - Value (if 1 arg) or dimension (if 2 args)
     * @param {string} [arg2] - Value (if 2 args)
     */
    require(arg1, arg2) {
      if (arg2 === undefined) {
        const dimension = defaultDimension;
        const value = arg1;
        if (!dimension) {
          throw new SetupSandboxError('No default dimension is configured for require(). Specify a dimension explicitly.');
        }
        if (!api.in(dimension, value)) {
          throw new SetupSandboxError(`Required option "${value}" not selected in dimension "${dimension}".`);
        }
        return;
      }

      const dimension = arg1;
      const value = arg2;
      if (!api.in(dimension, value)) {
        throw new SetupSandboxError(`Required option "${value}" not selected in dimension "${dimension}".`);
      }
    },

    /**
     * Get shallow clone of options by dimension.
     * @returns {Record<string, string | string[]>}
     */
    dimensions() {
      const copy = {};
      for (const [dimension, value] of Object.entries(normalizedByDimension)) {
        copy[dimension] = Array.isArray(value) ? value.slice() : value;
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
