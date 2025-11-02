#!/usr/bin/env node

import { ValidationError } from '../security.mjs';

const SUPPORTED_TYPES = new Set(['string', 'number', 'boolean']);
const PLACEHOLDER_NAME_PATTERN = /^[A-Z0-9_]+$/;

/**
 * Normalize placeholder entries declared in template.json metadata.
 * @param {Array<any>} entries
 * @returns {Array<{token: string, raw: string, description: string|null, required: boolean, defaultValue: string|number|boolean|null, sensitive: boolean, type: 'string'|'number'|'boolean'}>}
 */
export function normalizePlaceholders(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return [];
  }

  const seen = new Set();
  const normalized = [];

  for (const rawEntry of entries) {
    if (!rawEntry || typeof rawEntry !== 'object') {
      throw new ValidationError('metadata.placeholders entries must be objects', 'metadata.placeholders');
    }

    const rawName = rawEntry.name;
    if (typeof rawName !== 'string') {
      throw new ValidationError('metadata.placeholders entries must include a name string', 'metadata.placeholders');
    }

    const trimmed = rawName.trim();
    const match = trimmed.match(/^\{\{([^{}]+)\}\}$/);
    if (!match) {
      throw new ValidationError(`Invalid placeholder name: ${rawName}`, 'metadata.placeholders');
    }

    const token = match[1].trim();
    if (!PLACEHOLDER_NAME_PATTERN.test(token)) {
      throw new ValidationError(
        `Placeholder token must use A-Z, 0-9, or underscore characters: ${token}`,
        'metadata.placeholders'
      );
    }

    if (seen.has(token)) {
      throw new ValidationError(`Duplicate placeholder token detected: ${token}`, 'metadata.placeholders');
    }
    seen.add(token);

    const type = normalizeType(rawEntry.type, token);
    const defaultValue = normalizeDefault(rawEntry.default, type, token);
    const required = rawEntry.required === true;
    const sensitive = rawEntry.sensitive === true;
    const description = typeof rawEntry.description === 'string'
      ? rawEntry.description.trim() || null
      : null;

    normalized.push({
      token,
      raw: trimmed,
      description,
      required,
      defaultValue,
      sensitive,
      type
    });
  }

  return normalized;
}

function normalizeType(value, token) {
  if (value === undefined || value === null) {
    return 'string';
  }

  if (typeof value !== 'string') {
    throw new ValidationError(
      `Placeholder ${token} has invalid type hint (expected string)`,
      'metadata.placeholders'
    );
  }

  const normalized = value.trim().toLowerCase();
  if (!SUPPORTED_TYPES.has(normalized)) {
    throw new ValidationError(
      `Placeholder ${token} has unsupported type hint: ${value}`,
      'metadata.placeholders'
    );
  }

  return normalized;
}

function normalizeDefault(defaultValue, type, token) {
  if (defaultValue === undefined || defaultValue === null) {
    return null;
  }

  if (type === 'string') {
    if (typeof defaultValue !== 'string') {
      throw new ValidationError(
        `Placeholder ${token} has invalid default (expected string)`,
        'metadata.placeholders'
      );
    }
    return defaultValue;
  }

  if (type === 'number') {
    const coerced = typeof defaultValue === 'number'
      ? defaultValue
      : Number.parseFloat(defaultValue);

    if (!Number.isFinite(coerced)) {
      throw new ValidationError(
        `Placeholder ${token} has default that cannot be coerced to number`,
        'metadata.placeholders'
      );
    }
    return coerced;
  }

  // boolean
  if (typeof defaultValue === 'boolean') {
    return defaultValue;
  }

  if (typeof defaultValue === 'string') {
    const lowered = defaultValue.trim().toLowerCase();
    if (lowered === 'true') {
      return true;
    }
    if (lowered === 'false') {
      return false;
    }
  }

  throw new ValidationError(
    `Placeholder ${token} has default that cannot be coerced to boolean`,
    'metadata.placeholders'
  );
}

export const supportedPlaceholderTypes = Object.freeze([...SUPPORTED_TYPES]);
