#!/usr/bin/env node

/**
 * Path Resolver - Centralized M5NV home and cache directory resolution
 *
 * Provides consistent path resolution for:
 * - M5NV_HOME environment variable (overrides default ~/.m5nv)
 * - Cache directories (repositories and template metadata)
 * - User configuration files
 *
 * This module ensures all tools use the same path resolution logic,
 * enabling hermetic testing and custom installation locations.
 */

import os from 'os';
import path from 'path';

/**
 * Resolve the user's home directory
 * @param {Record<string, string>} [env] - Environment variables (defaults to process.env)
 * @returns {string} - Home directory path
 */
export function resolveHomeDirectory(env = process.env) {
  // Try standard environment variables first
  const home = env.HOME || env.USERPROFILE;
  if (home) {
    return home;
  }

  // Fall back to os.homedir()
  return os.homedir();
}

/**
 * Resolve the M5NV base directory
 * This is where all M5NV data is stored (cache, config, etc.)
 *
 * Priority:
 * 1. M5NV_HOME environment variable (for testing and custom installations)
 * 2. ~/.m5nv (default)
 *
 * @param {Record<string, string>} [env] - Environment variables (defaults to process.env)
 * @returns {string} - M5NV base directory path
 */
export function resolveM5nvBase(env = process.env) {
  // If M5NV_HOME is set, use it directly (absolute path expected)
  if (env.M5NV_HOME) {
    return env.M5NV_HOME;
  }

  // Default: ~/.m5nv
  const homeDir = resolveHomeDirectory(env);
  return path.join(homeDir, '.m5nv');
}

/**
 * Resolve the cache base directory for Git repositories
 * @param {Record<string, string>} [env] - Environment variables (defaults to process.env)
 * @returns {string} - Cache directory path
 */
export function resolveCacheDirectory(env = process.env) {
  const m5nvBase = resolveM5nvBase(env);
  return path.join(m5nvBase, 'cache');
}

/**
 * Resolve the cache directory for template metadata (registry cache)
 * @param {Record<string, string>} [env] - Environment variables (defaults to process.env)
 * @returns {string} - Template cache directory path
 */
export function resolveTemplateCacheDirectory(env = process.env) {
  const cacheBase = resolveCacheDirectory(env);
  return path.join(cacheBase, 'templates');
}

/**
 * Resolve the user configuration file path
 * @param {Record<string, string>} [env] - Environment variables (defaults to process.env)
 * @returns {string} - User config file path
 */
export function resolveUserConfigPath(env = process.env) {
  const m5nvBase = resolveM5nvBase(env);
  return path.join(m5nvBase, 'rc.json');
}
