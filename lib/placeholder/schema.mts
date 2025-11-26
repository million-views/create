#!/usr/bin/env node
// @ts-nocheck

import { ValidationError } from '../error/index.mts';

// New schema supports 6 types: text, number, boolean, email, password, url
// 'text' is the new default (replaces 'string' from old schema)
const SUPPORTED_TYPES = new Set(['text', 'number', 'boolean', 'email', 'password', 'url']);
// Legacy support: map old 'string' type to new 'text' type
const TYPE_ALIASES = { string: 'text' };
const PLACEHOLDER_NAME_PATTERN = /^[A-Z0-9_]+$/;

/**
 * Normalize placeholder entries declared in template.json metadata.
 * @param {Array<any>} entries
 * @returns {Array<{
 *   token: string,
 *   raw: string,
 *   description: string|null,
 *   required: boolean,
 *   defaultValue: string|number|boolean|null,
 *   sensitive: boolean,
 *   type: 'string'|'number'|'boolean'
 * }>}
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
    // New schema: required defaults to true (was false in old schema)
    const required = rawEntry.required !== undefined ? rawEntry.required : true;
    // New schema: 'secure' replaces 'sensitive' (but keep both for compatibility)
    const sensitive = rawEntry.sensitive === true || rawEntry.secure === true;
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
    return 'text'; // New schema default (was 'string' in old schema)
  }

  if (typeof value !== 'string') {
    throw new ValidationError(
      `Placeholder ${token} has invalid type hint (expected string)`,
      'metadata.placeholders'
    );
  }

  const normalized = value.trim().toLowerCase();

  // Handle legacy type aliases
  const resolvedType = TYPE_ALIASES[normalized] || normalized;

  if (!SUPPORTED_TYPES.has(resolvedType)) {
    throw new ValidationError(
      `Placeholder ${token} has unsupported type hint: ${value}. Supported: ${[...SUPPORTED_TYPES].join(', ')}`,
      'metadata.placeholders'
    );
  }

  return resolvedType;
}

function normalizeDefault(defaultValue, type, token) {
  if (defaultValue === undefined || defaultValue === null) {
    return null;
  }

  // Text-based types (text, email, password, url) all expect string values
  if (type === 'text' || type === 'email' || type === 'password' || type === 'url') {
    if (typeof defaultValue !== 'string') {
      throw new ValidationError(
        `Placeholder ${token} has invalid default (expected string for type ${type})`,
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
