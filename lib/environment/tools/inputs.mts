#!/usr/bin/env node

/**
 * Inputs API for template setup scripts.
 *
 * @module lib/environment/tools/inputs
 */

import { SetupSandboxError } from '../utils.mts';

type InputValue = string | number | boolean;
type InputRecord = Record<string, InputValue>;

/**
 * Create an inputs API for accessing placeholder values.
 */
export function buildInputsApi(inputs: InputRecord | undefined) {
  const reference: InputRecord = inputs ?? {};

  return Object.freeze({
    /**
     * Get a placeholder value.
     */
    get(name: string, fallback?: unknown): unknown {
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
     */
    all(): Readonly<InputRecord> {
      return Object.freeze({ ...reference });
    }
  });
}
