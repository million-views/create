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
 *
 * @module lib/util/path
 */

import os from 'node:os';
import nodePath from 'node:path';

/**
 * Environment variables type
 */
type EnvVars = Record<string, string | undefined>;

/**
 * Resolve the user's home directory
 * @param env - Environment variables (defaults to process.env)
 * @returns Home directory path
 */
export function resolveHomeDirectory(env: EnvVars = process.env): string {
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
 * @param env - Environment variables (defaults to process.env)
 * @returns M5NV base directory path
 */
export function resolveM5nvBase(env: EnvVars = process.env): string {
  // If M5NV_HOME is set, use it directly (absolute path expected)
  if (env.M5NV_HOME) {
    return env.M5NV_HOME;
  }

  // Default: ~/.m5nv
  const homeDir = resolveHomeDirectory(env);
  return nodePath.join(homeDir, '.m5nv');
}

/**
 * Resolve the cache base directory for Git repositories
 * @param env - Environment variables (defaults to process.env)
 * @returns Cache directory path
 */
export function resolveCacheDirectory(env: EnvVars = process.env): string {
  const m5nvBase = resolveM5nvBase(env);
  return nodePath.join(m5nvBase, 'cache');
}

/**
 * Resolve the cache directory for template metadata (registry cache)
 * @param env - Environment variables (defaults to process.env)
 * @returns Template cache directory path
 */
export function resolveTemplateCacheDirectory(env: EnvVars = process.env): string {
  const cacheBase = resolveCacheDirectory(env);
  return nodePath.join(cacheBase, 'templates');
}

/**
 * Resolve the user configuration file path
 * @param env - Environment variables (defaults to process.env)
 * @returns User config file path
 */
export function resolveUserConfigPath(env: EnvVars = process.env): string {
  const m5nvBase = resolveM5nvBase(env);
  return nodePath.join(m5nvBase, 'rc.json');
}
