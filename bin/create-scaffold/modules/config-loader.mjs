#!/usr/bin/env node

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  validateRepoUrl,
  sanitizeBranchName,
  ValidationError
} from '../../../lib/security.mjs';

const CONFIG_FILENAME = '.m5nvrc';
const ENV_OVERRIDE_KEY = 'CREATE_SCAFFOLD_CONFIG_PATH';
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
  const envOverride = expandHome(resolveString(env[ENV_OVERRIDE_KEY]));

  if (envOverride) {
    return [path.resolve(envOverride)];
  }

  const projectCandidate = path.resolve(cwd, CONFIG_FILENAME);
  const userConfigPaths = resolveUserConfigPath(env);

  // Return array with project config first, then user configs (primary then fallback)
  return [
    projectCandidate,
    userConfigPaths.primary,
    userConfigPaths.fallback
  ].filter(Boolean);
}

function resolveString(value) {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim();
  return trimmed;
}

function expandHome(inputPath) {
  if (!inputPath || !inputPath.startsWith('~')) {
    return inputPath;
  }

  const homeDir = os.homedir();
  if (!homeDir) {
    return inputPath;
  }

  if (inputPath === '~') {
    return homeDir;
  }

  const remainder = inputPath.slice(1);
  if (remainder.startsWith(path.sep)) {
    return path.join(homeDir, remainder.slice(1));
  }

  if (remainder.startsWith('/')) {
    return path.join(homeDir, remainder.slice(1));
  }

  return inputPath;
}

function resolveUserConfigPath(env) {
  const platform = process.platform;
  const homeDir = resolveString(env.HOME) || os.homedir();

  if (!homeDir) {
    return null;
  }

  // Primary location: ~/.m5nv/rc.json (consistent with cache location)
  const primaryPath = path.join(homeDir, '.m5nv', 'rc.json');

  // For backward compatibility, also check old location during migration
  let fallbackPath = null;
  if (platform === 'win32') {
    const appData = resolveString(env.APPDATA) || path.join(homeDir, 'AppData', 'Roaming');
    fallbackPath = path.resolve(appData, 'm5nv', 'rc.json');
  } else {
    const configBase = path.resolve(homeDir, '.config');
    fallbackPath = path.join(configBase, 'm5nv', 'rc.json');
  }

  // Return both paths - loader will check primary first, then fallback
  return { primary: primaryPath, fallback: fallbackPath };
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
  const knownKeys = new Set(['repo', 'branch', 'author', 'placeholders', 'registries']);
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
    return validateRepoUrl(trimmed);
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
    return sanitizeBranchName(trimmed);
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

    if (typeof templates !== 'object' || Array.isArray(templates)) {
      throw wrapValidationError(
        `Configuration file ${filePath} registry "${registryName}" must be an object mapping template names to URLs`,
        'config.registries'
      );
    }

    const normalizedTemplates = Object.create(null);

    for (const [templateName, url] of Object.entries(templates)) {
      if (typeof templateName !== 'string') {
        throw wrapValidationError(
          `Configuration file ${filePath} template name in registry "${registryName}" must be a string`,
          'config.registries'
        );
      }

      const trimmedTemplateName = templateName.trim();
      if (!trimmedTemplateName) {
        throw wrapValidationError(
          `Configuration file ${filePath} template name in registry "${registryName}" cannot be empty`,
          'config.registries'
        );
      }

      if (typeof url !== 'string') {
        throw wrapValidationError(
          `Configuration file ${filePath} template "${templateName}" in registry "${registryName}" value must be a string`,
          'config.registries'
        );
      }

      const trimmedUrl = url.trim();
      if (!trimmedUrl) {
        throw wrapValidationError(
          `Configuration file ${filePath} template "${templateName}" in registry "${registryName}" value cannot be empty`,
          'config.registries'
        );
      }

      // Basic validation - should be a valid template URL format
      try {
        // Allow any string for now - validation will happen during resolution
        normalizedTemplates[trimmedTemplateName] = trimmedUrl;
      } catch (error) {
        throw wrapValidationError(
          `Configuration file ${filePath} template "${templateName}" in registry "${registryName}" contains invalid URL: ${error.message}`,
          'config.registries'
        );
      }
    }

    registries[trimmedRegistryName] = Object.freeze(normalizedTemplates);
  }

  return Object.freeze(registries);
}

function wrapValidationError(message, field) {
  const suffix = message.endsWith('.') ? '' : '.';
  return new ValidationError(
    `${message}${suffix} Use --no-config to bypass if needed`,
    field
  );
}
