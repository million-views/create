#!/usr/bin/env node

/**
 * Inputs API for template setup scripts.
 *
 * @module lib/environment/tools/inputs
 */

import { SetupSandboxError } from '../utils.mjs';

/**
 * Create an inputs API for accessing placeholder values.
 *
 * @param {Record<string, string | number | boolean>} inputs - Placeholder values
 * @returns {Object} Frozen inputs API
 */
export function buildInputsApi(inputs) {
  const reference = inputs ?? Object.freeze({});

  return Object.freeze({
    /**
     * Get a placeholder value.
     * @param {string} name - Placeholder name
     * @param {*} [fallback] - Fallback value if not found
     * @returns {*} The value or fallback
     */
    get(name, fallback) {
      if (typeof name !== 'string' || name.trim() === '') {
        throw new SetupSandboxError('inputs.get requires a placeholder token');
      }
      if (Object.prototype.hasOwnProperty.call(reference, name)) {
        return reference[name];
      }
      return fallback;
    },

    /**
     * Get all placeholder values as a frozen clone.
     * @returns {Record<string, string | number | boolean>}
     */
    all() {
      return Object.freeze({ ...reference });
    }
  });
}
