#!/usr/bin/env node

/**
 * Shared CLI configuration manager
 * Provides unified configuration loading and management across tools
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Configuration manager class with hierarchical source support
 */
export class ConfigManager {
  constructor(options = {}) {
    this.toolName = options.toolName || 'cli-tool';
    this.configFileName = options.configFileName || `.${this.toolName}rc`;
    this.globalConfigDir = options.globalConfigDir || this.getGlobalConfigDir();
    this.envPrefix = options.envPrefix || this.toolName.toUpperCase().replace(/-/g, '_');
    this.schema = options.schema || {};
    this.defaults = options.defaults || {};

    // Support for tool-specific config sections
    this.toolConfigKey = options.toolConfigKey || this.toolName;

    // Migration support
    this.migrationSupport = options.migrationSupport !== false;
  }

  /**
   * Load configuration from all sources with precedence
   * Priority: environment variables > tool config > local config > global config > defaults
   */
  async load() {
    const sources = await Promise.allSettled([
      this.loadEnvironmentConfig(),
      this.loadToolConfig(),
      this.loadLocalConfig(),
      this.loadGlobalConfig()
    ]);

    let config = { ...this.defaults };

    // Apply sources in reverse priority order (defaults first, then overlay)
    for (const source of sources.reverse()) {
      if (source.status === 'fulfilled' && source.value) {
        config = this.mergeConfigs(config, source.value);
      }
    }

    // Validate final config
    this.validateConfig(config);

    return config;
  }

  /**
   * Load environment variable configuration
   */
  async loadEnvironmentConfig() {
    const config = {};
    const prefix = `${this.envPrefix}_`;

    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith(prefix)) {
        const configKey = key.slice(prefix.length).toLowerCase().replace(/_/g, '-');
        config[configKey] = this.parseEnvValue(value);
      }
    }

    return config;
  }

  /**
   * Load local configuration file
   */
  async loadLocalConfig() {
    const configPath = path.join(process.cwd(), this.configFileName);

    try {
      const content = await fs.readFile(configPath, 'utf8');
      return this.parseConfigFile(content, configPath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      return null;
    }
  }

  /**
   * Load global configuration file
   */
  async loadGlobalConfig() {
    const configPath = path.join(this.globalConfigDir, this.configFileName);

    try {
      const content = await fs.readFile(configPath, 'utf8');
      return this.parseConfigFile(content, configPath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      return null;
    }
  }

  /**
   * Load tool-specific configuration from config files
   * Looks for tool-specific sections in both local and global config files
   */
  async loadToolConfig() {
    // Check local config first
    const localConfigPath = path.join(process.cwd(), this.configFileName);
    const localToolConfig = await this.extractToolConfig(localConfigPath);

    // Check global config
    const globalConfigPath = path.join(this.globalConfigDir, this.configFileName);
    const globalToolConfig = await this.extractToolConfig(globalConfigPath);

    // Merge with precedence: local tool config > global tool config
    return this.mergeConfigs(globalToolConfig || {}, localToolConfig || {});
  }

  /**
   * Extract tool-specific configuration from a config file
   */
  async extractToolConfig(configPath) {
    try {
      const content = await fs.readFile(configPath, 'utf8');
      const parsed = this.parseConfigFile(content, configPath);

      // Check for tool-specific section
      if (parsed && parsed[this.toolConfigKey]) {
        return parsed[this.toolConfigKey];
      }

      return null;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      return null;
    }
  }

  /**
   * Save configuration to file with tool-specific section support
   */
  async save(config, location = 'local') {
    this.validateConfig(config);

    const configPath = location === 'local'
      ? path.join(process.cwd(), this.configFileName)
      : path.join(this.globalConfigDir, this.configFileName);

    // When saving, we need to handle tool-specific sections
    // Read existing config first to preserve other tool sections
    let existingConfig = {};
    try {
      const content = await fs.readFile(configPath, 'utf8');
      existingConfig = JSON.parse(content);
    } catch (_error) {
      // File doesn't exist or is invalid, start with empty config
    }

    // Merge tool-specific config
    existingConfig[this.toolConfigKey] = config;

    const content = this.serializeConfig(existingConfig);
    await fs.writeFile(configPath, content, 'utf8');
  }

  /**
   * Save tool-specific configuration only
   */
  async saveToolConfig(toolConfig, location = 'local') {
    this.validateConfig(toolConfig);

    const configPath = location === 'local'
      ? path.join(process.cwd(), this.configFileName)
      : path.join(this.globalConfigDir, this.configFileName);

    // Read existing config
    let existingConfig = {};
    try {
      const content = await fs.readFile(configPath, 'utf8');
      existingConfig = JSON.parse(content);
    } catch (_error) {
      // File doesn't exist, start fresh
    }

    // Update tool-specific section
    existingConfig[this.toolConfigKey] = toolConfig;

    const content = this.serializeConfig(existingConfig);
    await fs.writeFile(configPath, content, 'utf8');
  }

  /**
   * Get global configuration directory
   */
  getGlobalConfigDir() {
    const home = process.env.HOME || process.env.USERPROFILE;
    return path.join(home, '.config', this.toolName);
  }

  /**
   * Parse environment variable value
   */
  parseEnvValue(value) {
    // Parse boolean values
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    // Parse numeric values
    if (/^\d+$/.test(value)) return parseInt(value, 10);
    if (/^\d*\.\d+$/.test(value)) return parseFloat(value);

    // Parse JSON values
    if (value.startsWith('{') || value.startsWith('[')) {
      try {
        return JSON.parse(value);
      } catch {
        // Not valid JSON, treat as string
      }
    }

    return value;
  }

  /**
   * Parse configuration file content with migration support
   */
  parseConfigFile(content, filePath) {
    const ext = path.extname(filePath);

    let parsed;
    switch (ext) {
      case '.json':
        parsed = JSON.parse(content);
        break;
      case '.js':
      case '.mjs':
        // For JS files, we'd need to evaluate them safely
        // For now, assume JSON
        parsed = JSON.parse(content);
        break;
      default:
        // Assume JSON for .rc files
        parsed = JSON.parse(content);
        break;
    }

    // Apply migrations if enabled
    if (this.migrationSupport) {
      parsed = this.migrateConfig(parsed, filePath);
    }

    return parsed;
  }

  /**
   * Migrate configuration from old formats to new format
   */
  migrateConfig(config, _filePath) {
    if (!config || typeof config !== 'object') {
      return config;
    }

    // Migration 1: Move top-level keys to tool-specific sections
    // This handles the transition from flat config to tool-specific config
    const migrated = { ...config };

    // Define which keys should be moved to tool-specific sections
    const toolSpecificKeys = ['repo', 'branch', 'author', 'placeholders', 'registries'];

    // Check if we have tool-specific keys at the top level
    const hasToolSpecificKeys = toolSpecificKeys.some(key => key in migrated);

    if (hasToolSpecificKeys && !(this.toolConfigKey in migrated)) {
      // Create tool-specific section and move keys
      migrated[this.toolConfigKey] = {};

      for (const key of toolSpecificKeys) {
        if (key in migrated) {
          migrated[this.toolConfigKey][key] = migrated[key];
          delete migrated[key];
        }
      }

      // If we migrated, we could optionally log a warning or update the file
      // For now, we'll just return the migrated config
    }

    return migrated;
  }

  /**
   * Serialize configuration to string
   */
  serializeConfig(config) {
    return JSON.stringify(config, null, 2);
  }

  /**
   * Merge two configuration objects
   */
  mergeConfigs(base, overlay) {
    const result = { ...base };

    for (const [key, value] of Object.entries(overlay)) {
      if (value !== null && value !== undefined) {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Validate configuration against schema with helpful error messages
   */
  validateConfig(config) {
    if (!this.schema) return;

    const errors = [];

    for (const [key, rule] of Object.entries(this.schema)) {
      const value = config[key];

      if (rule.required && (value === null || value === undefined)) {
        errors.push(`Required configuration key '${key}' is missing. ${rule.description || ''}`);
        continue;
      }

      if (value !== null && value !== undefined) {
        if (rule.type && typeof value !== rule.type) {
          errors.push(`Configuration key '${key}' must be of type ${rule.type}, got ${typeof value}. ${rule.description || ''}`);
          continue;
        }

        if (rule.enum && !rule.enum.includes(value)) {
          errors.push(`Configuration key '${key}' must be one of: ${rule.enum.join(', ')}, got '${value}'. ${rule.description || ''}`);
          continue;
        }

        // Custom validation
        if (rule.validate && typeof rule.validate === 'function') {
          try {
            const result = rule.validate(value);
            if (result !== true) {
              errors.push(`Configuration key '${key}' validation failed: ${result}. ${rule.description || ''}`);
            }
          } catch (error) {
            errors.push(`Configuration key '${key}' validation error: ${error.message}. ${rule.description || ''}`);
          }
        }
      }
    }

    if (errors.length > 0) {
      const errorMessage = `Configuration validation failed:\n${errors.map(err => `  • ${err}`).join('\n')}`;
      throw new Error(errorMessage);
    }
  }
}

/**
 * Create a configuration manager instance
 * @param {Object} options - Configuration options
 * @param {string} options.toolName - Name of the tool (used for env prefix and config key)
 * @param {string} options.configFileName - Name of the config file (default: .{toolName}rc)
 * @param {string} options.globalConfigDir - Directory for global config
 * @param {string} options.envPrefix - Environment variable prefix
 * @param {string} options.toolConfigKey - Key for tool-specific config section
 * @param {Object} options.schema - Validation schema
 * @param {Object} options.defaults - Default configuration values
 * @param {boolean} options.migrationSupport - Enable config migration (default: true)
 */
export function createConfigManager(options) {
  return new ConfigManager(options);
}
