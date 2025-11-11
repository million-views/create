#!/usr/bin/env node

import { ValidationError } from '../security.mjs';
import { normalizePlaceholders } from './placeholder-schema.mjs';

const PLACEHOLDER_NAME_PATTERN = /^[a-z]+$/;
const SUPPORTED_TYPES = new Set(['string', 'number', 'boolean']);

export const CANONICAL_VARIABLES = Object.freeze({
  author: Object.freeze({
    token: 'AUTHOR',
    description: 'Author name recorded in generated documentation and metadata.',
    type: 'string',
    required: true,
    sensitive: false,
    defaultValue: undefined
  }),
  license: Object.freeze({
    token: 'LICENSE',
    description: 'Open-source license identifier applied to generated project content.',
    type: 'string',
    required: false,
    sensitive: false,
    defaultValue: 'MIT'
  })
});

/**
 * Normalize canonical variable manifest entries and convert them into placeholder definitions.
 * @param {unknown} entries
 * @returns {ReadonlyArray<{
 *   id: keyof typeof CANONICAL_VARIABLES,
 *   placeholder: ReturnType<typeof normalizePlaceholders>[number]
 * }>}
 */
export function normalizeCanonicalVariables(entries) {
  if (entries === undefined || entries === null) {
    return Object.freeze([]);
  }

  if (!Array.isArray(entries)) {
    throw new ValidationError('metadata.variables must be an array', 'metadata.variables');
  }

  if (entries.length === 0) {
    return Object.freeze([]);
  }

  const prepared = [];
  const names = [];
  const seen = new Set();

  for (const rawEntry of entries) {
    if (!rawEntry || typeof rawEntry !== 'object' || Array.isArray(rawEntry)) {
      throw new ValidationError('metadata.variables entries must be objects', 'metadata.variables');
    }

    const nameValue = rawEntry.name;
    if (typeof nameValue !== 'string') {
      throw new ValidationError('metadata.variables entries must include a name string', 'metadata.variables');
    }

    const normalizedName = nameValue.trim().toLowerCase();
    if (!PLACEHOLDER_NAME_PATTERN.test(normalizedName)) {
      throw new ValidationError(`Invalid canonical variable name: ${nameValue}`, 'metadata.variables');
    }

    if (!Object.prototype.hasOwnProperty.call(CANONICAL_VARIABLES, normalizedName)) {
      throw new ValidationError(`Unknown canonical variable: ${nameValue}`, 'metadata.variables');
    }

    if (seen.has(normalizedName)) {
      throw new ValidationError(`Duplicate canonical variable declared: ${normalizedName}`, 'metadata.variables');
    }
    seen.add(normalizedName);

    const base = CANONICAL_VARIABLES[normalizedName];
    const overrides = rawEntry.overrides;

    if (overrides !== undefined) {
      if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) {
        throw new ValidationError('metadata.variables overrides must be objects', 'metadata.variables');
      }
    }

    const typeOverride = overrides?.type;
    if (typeOverride !== undefined) {
      if (typeof typeOverride !== 'string') {
        throw new ValidationError('metadata.variables overrides.type must be a string', 'metadata.variables');
      }
      const normalizedType = typeOverride.trim().toLowerCase();
      if (!SUPPORTED_TYPES.has(normalizedType)) {
        throw new ValidationError(
          `metadata.variables overrides.type must be one of: ${Array.from(SUPPORTED_TYPES).join(', ')}`,
          'metadata.variables'
        );
      }
    }

    const resolvedType = (typeOverride ?? base.type);

    const requiredOverride = rawEntry.required;
    if (requiredOverride !== undefined && typeof requiredOverride !== 'boolean') {
      throw new ValidationError('metadata.variables required flag must be a boolean', 'metadata.variables');
    }

    if (overrides?.sensitive !== undefined && typeof overrides.sensitive !== 'boolean') {
      throw new ValidationError('metadata.variables overrides.sensitive must be a boolean', 'metadata.variables');
    }

    if (overrides?.default === null) {
      throw new ValidationError('metadata.variables overrides.default cannot be null', 'metadata.variables');
    }

    const placeholderInput = {
      name: `{{${base.token}}}`,
      required: requiredOverride === undefined ? base.required : requiredOverride,
      sensitive: overrides?.sensitive === undefined ? base.sensitive : overrides.sensitive,
      type: String(resolvedType).toLowerCase()
    };

    const description = overrides?.description ?? base.description;
    if (description !== undefined) {
      if (description !== null && typeof description !== 'string') {
        throw new ValidationError('metadata.variables overrides.description must be a string', 'metadata.variables');
      }
      if (typeof description === 'string' && description.trim().length === 0) {
        throw new ValidationError('metadata.variables overrides.description must not be empty', 'metadata.variables');
      }
      placeholderInput.description = typeof description === 'string' ? description.trim() : description;
    }

    const defaultOverride = overrides?.default;
    const resolvedDefault = defaultOverride !== undefined ? defaultOverride : base.defaultValue;
    if (resolvedDefault !== undefined) {
      placeholderInput.default = resolvedDefault;
    }

    prepared.push(placeholderInput);
    names.push(normalizedName);
  }

  const normalizedPlaceholders = normalizePlaceholders(prepared);

  const result = normalizedPlaceholders.map((placeholder, index) =>
    Object.freeze({ id: names[index], placeholder: Object.freeze({ ...placeholder }) })
  );

  return Object.freeze(result);
}

/**
 * Merge canonical placeholders with author-defined ones.
 * @param {{
 *   canonical?: ReturnType<typeof normalizeCanonicalVariables>,
 *   placeholders?: ReturnType<typeof normalizePlaceholders>
 * }} params
 * @returns {ReadonlyArray<ReturnType<typeof normalizePlaceholders>[number]>}
 */
export function mergeCanonicalPlaceholders({ canonical = [], placeholders = [] } = {}) {
  const byToken = new Map();

  for (const entry of canonical) {
    const { placeholder } = entry;
    byToken.set(placeholder.token, { ...placeholder });
  }

  for (const placeholder of placeholders) {
    const existing = byToken.get(placeholder.token);
    if (!existing) {
      byToken.set(placeholder.token, { ...placeholder });
      continue;
    }

    if (placeholder.type !== existing.type) {
      throw new ValidationError(
        `Canonically defined placeholder ${placeholder.token} type conflict`,
        'metadata.placeholders'
      );
    }

    const mergedDefault = placeholder.defaultValue !== null
      ? placeholder.defaultValue
      : existing.defaultValue;

    const mergedDescription = placeholder.description ?? existing.description ?? null;

    byToken.set(placeholder.token, {
      ...existing,
      description: mergedDescription,
      required: placeholder.required,
      defaultValue: mergedDefault,
      sensitive: placeholder.sensitive,
      type: placeholder.type
    });
  }

  const result = [];
  const canonicalTokens = canonical.map(entry => entry.placeholder.token);

  for (const token of canonicalTokens) {
    if (byToken.has(token)) {
      result.push({ ...byToken.get(token) });
      byToken.delete(token);
    }
  }

  for (const placeholder of placeholders) {
    if (canonicalTokens.includes(placeholder.token)) {
      continue;
    }
    if (byToken.has(placeholder.token)) {
      result.push({ ...byToken.get(placeholder.token) });
      byToken.delete(placeholder.token);
    } else {
      result.push({ ...placeholder });
    }
  }

  for (const [, value] of byToken) {
    result.push({ ...value });
  }

  return Object.freeze(result.map((placeholder) => Object.freeze(placeholder)));
}
