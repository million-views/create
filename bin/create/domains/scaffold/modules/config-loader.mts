#!/usr/bin/env node
// @ts-nocheck

import fs from 'node:fs/promises';
import path from 'node:path';
import * as sanitize from '@m5nv/create/lib/security/sanitize.mts';
import * as cli from '@m5nv/create/lib/validation/cli/input.mts';
import { ValidationError } from '@m5nv/create/lib/error/validation.mts';
import { resolveUserConfigPath } from '@m5nv/create/lib/util/path.mts';

const CONFIG_FILENAME = '.m5nvrc';
const PLACEHOLDER_TOKEN_PATTERN = /^[A-Z0-9_]+$/;

/**
 * Load configuration defaults from project, user, or override locations.
 * @param {Object} params
 * @param {string} [params.cwd]
 * @param {Record<string, any>} [params.env]
 * @param {boolean} [params.skip]
 * @returns {Promise<{ path: string, defaults: Readonly<Record<string, any>> } | null>}
 */
export async function loadConfig({ cwd = process.cwd(), env = process.env, skip = false } = {}) {
  if (skip) {
    return null;
  }

  const normalizedCwd = typeof cwd === 'string' && cwd.trim() ? cwd : process.cwd();
  const normalizedEnv = typeof env === 'object' && env !== null ? env : process.env;

  const candidates = resolveCandidatePaths({ cwd: normalizedCwd, env: normalizedEnv });

  for (const candidatePath of candidates) {
    if (!candidatePath) {
      continue;
    }

    const parsed = await readConfigFile(candidatePath);
    if (parsed === null) {
      continue;
    }

    const defaults = normalizeConfigPayload(parsed, candidatePath);
    return Object.freeze({
      path: candidatePath,
      defaults
    });
  }

  return null;
}

function resolveCandidatePaths({ cwd, env }) {
  const projectCandidate = path.resolve(cwd, CONFIG_FILENAME);
  const userConfigPath = resolveUserConfigPath(env);

  // Return array with project config first, then user config
  return [
    projectCandidate,
    userConfigPath
  ].filter(Boolean);
}

async function readConfigFile(filePath) {
  let rawContents;

  try {
    rawContents = await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return null;
    }
    throw wrapValidationError(
      `Unable to read configuration file ${filePath}: ${error.message}`,
      'config.read'
    );
  }

  try {
    return JSON.parse(rawContents);
  } catch (error) {
    throw wrapValidationError(
      `Configuration file ${filePath} is not valid JSON: ${error.message}`,
      'config.parse'
    );
  }
}

function normalizeConfigPayload(payload, filePath) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw wrapValidationError(
      `Configuration file ${filePath} must contain a JSON object`,
      'config.shape'
    );
  }

  // Allow known top-level keys plus product-specific sections
  const knownKeys = new Set(['repo', 'branch', 'author', 'placeholders', 'registries', 'templates']);
  for (const key of Object.keys(payload)) {
    // Allow any key that could be a product name (kebab-case, camelCase, etc.)
    // Only reject obviously invalid keys
    if (!knownKeys.has(key) && !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(key)) {
      throw wrapValidationError(
        `Configuration file ${filePath} contains invalid key "${key}"`,
        'config.keys'
      );
    }
  }

  const defaults = Object.create(null);

  if (Object.prototype.hasOwnProperty.call(payload, 'repo')) {
    defaults.repo = sanitizeRepoField(payload.repo, filePath);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'branch')) {
    defaults.branch = sanitizeBranchField(payload.branch, filePath);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'author')) {
    const author = normalizeAuthor(payload.author, filePath);
    if (author !== undefined) {
      defaults.author = author;
    }
  }

  defaults.placeholders = normalizePlaceholders(payload.placeholders, filePath);

  // Handle registries - check both top-level and product-specific locations
  let registries = null;

  // First check top-level registries (backward compatibility)
  if (Object.prototype.hasOwnProperty.call(payload, 'registries')) {
    registries = payload.registries;
  }

  // Then check product-specific registries (new structure)
  const productName = 'create-scaffold'; // This could be made configurable
  if (payload[productName] && typeof payload[productName] === 'object' &&
    payload[productName].registries) {
    registries = payload[productName].registries;
  }

  if (registries) {
    defaults.registries = normalizeRegistries(registries, filePath);
  }

  // Handle templates (template aliases for new command)
  let templates = null;

  // Check top-level templates
  if (Object.prototype.hasOwnProperty.call(payload, 'templates')) {
    templates = payload.templates;
  }

  // Check product-specific templates
  if (payload[productName] && typeof payload[productName] === 'object' &&
    payload[productName].templates) {
    templates = payload[productName].templates;
  }

  if (templates) {
    defaults.templates = normalizeTemplates(templates, filePath);
  }

  return Object.freeze(defaults);
}

function sanitizeRepoField(value, filePath) {
  if (value === undefined || value === null) {
    throw wrapValidationError(
      `Configuration file ${filePath} repo value must be a string`,
      'config.repo'
    );
  }

  if (typeof value !== 'string') {
    throw wrapValidationError(
      `Configuration file ${filePath} repo value must be a string`,
      'config.repo'
    );
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw wrapValidationError(
      `Configuration file ${filePath} repo value cannot be empty`,
      'config.repo'
    );
  }

  try {
    return cli.repoUrl(trimmed);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw wrapValidationError(
        `Configuration file ${filePath} repo is invalid: ${error.message}`,
        'config.repo'
      );
    }
    throw error;
  }
}

function sanitizeBranchField(value, filePath) {
  if (value === undefined || value === null) {
    throw wrapValidationError(
      `Configuration file ${filePath} branch value must be a string`,
      'config.branch'
    );
  }

  if (typeof value !== 'string') {
    throw wrapValidationError(
      `Configuration file ${filePath} branch value must be a string`,
      'config.branch'
    );
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw wrapValidationError(
      `Configuration file ${filePath} branch value cannot be empty`,
      'config.branch'
    );
  }

  try {
    return sanitize.branch(trimmed);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw wrapValidationError(
        `Configuration file ${filePath} branch is invalid: ${error.message}`,
        'config.branch'
      );
    }
    throw error;
  }
}

function normalizeAuthor(value, filePath) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    throw wrapValidationError(
      `Configuration file ${filePath} author must be an object`,
      'config.author'
    );
  }

  const allowedKeys = new Set(['name', 'email', 'url']);
  const normalized = {};

  for (const [key, raw] of Object.entries(value)) {
    if (!allowedKeys.has(key)) {
      throw wrapValidationError(
        `Configuration file ${filePath} author contains unsupported key "${key}"`,
        'config.author'
      );
    }

    if (raw === undefined || raw === null) {
      continue;
    }

    if (typeof raw !== 'string') {
      throw wrapValidationError(
        `Configuration file ${filePath} author.${key} must be a string`,
        'config.author'
      );
    }

    const trimmed = raw.trim();
    if (!trimmed) {
      continue;
    }

    if (trimmed.includes('\0')) {
      throw wrapValidationError(
        `Configuration file ${filePath} author.${key} contains null bytes`,
        'config.author'
      );
    }

    if (/[\r\n]/.test(trimmed)) {
      throw wrapValidationError(
        `Configuration file ${filePath} author.${key} cannot contain newlines`,
        'config.author'
      );
    }

    normalized[key] = trimmed;
  }

  if (Object.keys(normalized).length === 0) {
    return null;
  }

  return Object.freeze(normalized);
}

function normalizePlaceholders(value, filePath) {
  if (value === undefined || value === null) {
    return Object.freeze([]);
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    throw wrapValidationError(
      `Configuration file ${filePath} placeholders must be an object`,
      'config.placeholders'
    );
  }

  const entries = [];

  for (const [token, raw] of Object.entries(value)) {
    if (!PLACEHOLDER_TOKEN_PATTERN.test(token)) {
      throw wrapValidationError(
        `Configuration file ${filePath} placeholder token "${token}" is invalid`,
        'config.placeholders'
      );
    }

    if (raw === undefined || raw === null) {
      throw wrapValidationError(
        `Configuration file ${filePath} placeholder ${token} must have a value`,
        'config.placeholders'
      );
    }

    if (typeof raw !== 'string') {
      throw wrapValidationError(
        `Configuration file ${filePath} placeholder ${token} value must be a string`,
        'config.placeholders'
      );
    }

    const valueString = raw;
    if (valueString.includes('\0')) {
      throw wrapValidationError(
        `Configuration file ${filePath} placeholder ${token} contains null bytes`,
        'config.placeholders'
      );
    }

    entries.push(`${token}=${valueString}`);
  }

  return Object.freeze(entries);
}

function normalizeRegistries(value, filePath) {
  if (value === undefined || value === null) {
    return Object.freeze({});
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    throw wrapValidationError(
      `Configuration file ${filePath} registries must be an object`,
      'config.registries'
    );
  }

  const registries = Object.create(null);

  for (const [registryName, templates] of Object.entries(value)) {
    if (typeof registryName !== 'string') {
      throw wrapValidationError(
        `Configuration file ${filePath} registry name must be a string`,
        'config.registries'
      );
    }

    const trimmedRegistryName = registryName.trim();
    if (!trimmedRegistryName) {
      throw wrapValidationError(
        `Configuration file ${filePath} registry name cannot be empty`,
        'config.registries'
      );
    }

    // Registries can be either:
    // 1. Typed registry objects (for list command) - { type: "git", url: "..." } or { type: "local", path: "..." }
    // 2. Objects mapping template names to URLs/paths (for new command aliases)
    if (typeof templates === 'object' && templates !== null && !Array.isArray(templates)) {
      // Check if this is a typed registry object
      if (templates.type) {
        // Typed registry format - validate fields
        const { type, url, path } = templates;
        if (type !== 'git' && type !== 'local') {
          throw wrapValidationError(
            `Configuration file ${filePath} registry "${registryName}" type must be "git" or "local"`,
            'config.registries'
          );
        }
        if (type === 'git' && !url) {
          throw wrapValidationError(
            `Configuration file ${filePath} registry "${registryName}" git type requires "url" field`,
            'config.registries'
          );
        }
        if (type === 'local' && !path) {
          throw wrapValidationError(
            `Configuration file ${filePath} registry "${registryName}" local type requires "path" field`,
            'config.registries'
          );
        }
        registries[trimmedRegistryName] = Object.freeze({
          type,
          url: url?.trim(),
          path: path?.trim()
        });
      } else {
        // Template mapping object format (legacy support)
        const templateMappings = Object.create(null);
        for (const [templateName, templateUrl] of Object.entries(templates)) {
          // Note: Object.entries() always returns string keys, no type check needed for templateName
          if (typeof templateUrl !== 'string') {
            throw wrapValidationError(
              `Configuration file ${filePath} registry "${registryName}" template "${templateName}" must be a URL/path string`,
              'config.registries'
            );
          }
          const trimmedTemplateName = templateName.trim();
          const trimmedTemplateUrl = templateUrl.trim();
          if (!trimmedTemplateName || !trimmedTemplateUrl) {
            throw wrapValidationError(
              `Configuration file ${filePath} registry "${registryName}" template "${templateName}" cannot be empty`,
              'config.registries'
            );
          }
          templateMappings[trimmedTemplateName] = trimmedTemplateUrl;
        }
        registries[trimmedRegistryName] = Object.freeze(templateMappings);
      }
    } else {
      throw wrapValidationError(
        `Configuration file ${filePath} registry "${registryName}" must be a typed registry object or an object mapping template names to URLs/paths`,
        'config.registries'
      );
    }
  }

  return Object.freeze(registries);
}

function normalizeTemplates(value, filePath) {
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw wrapValidationError(
      `Configuration file ${filePath} templates must be an object`,
      'config.templates'
    );
  }

  const templates = Object.create(null);

  for (const [templateAlias, templateConfig] of Object.entries(value)) {
    // Note: Object.entries() always returns string keys, no type check needed
    const trimmedAlias = templateAlias.trim();
    if (!trimmedAlias) {
      throw wrapValidationError(
        `Configuration file ${filePath} template alias cannot be empty`,
        'config.templates'
      );
    }

    if (typeof templateConfig !== 'object' || Array.isArray(templateConfig) || templateConfig === null) {
      throw wrapValidationError(
        `Configuration file ${filePath} template "${templateAlias}" must be an object`,
        'config.templates'
      );
    }

    // Template config should have template name to URL/path mappings
    const normalizedMappings = Object.create(null);
    for (const [templateName, templatePath] of Object.entries(templateConfig)) {
      // Note: Object.entries() always returns string keys, no type check needed for templateName
      if (typeof templatePath !== 'string') {
        throw wrapValidationError(
          `Configuration file ${filePath} template "${templateAlias}" template "${templateName}" must be a URL/path string`,
          'config.templates'
        );
      }

      const trimmedName = templateName.trim();
      const trimmedPath = templatePath.trim();
      if (!trimmedName || !trimmedPath) {
        throw wrapValidationError(
          `Configuration file ${filePath} template "${templateAlias}" template "${templateName}" cannot be empty`,
          'config.templates'
        );
      }
      normalizedMappings[trimmedName] = trimmedPath;
    }

    templates[trimmedAlias] = Object.freeze(normalizedMappings);
  }

  return Object.freeze(templates);
}

function wrapValidationError(message, field) {
  const suffix = message.endsWith('.') ? '' : '.';
  return new ValidationError(
    `${message}${suffix} Use --no-config to bypass if needed`,
    field
  );
}
