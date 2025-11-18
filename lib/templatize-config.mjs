/**
 * Templatization Configuration Management
 *
 * Handles loading, validating, and generating .templatize.json configuration files
 * for the templatization system.
 */

import fs from 'fs';
import path from 'path';

/**
 * Default templatization configuration
 * Comprehensive rules for common file types and patterns
 */
export const DEFAULT_CONFIG = {
  version: '1.0',
  autoDetect: true,
  rules: {
    'package.json': [
      {
        type: 'json-value',
        path: '$.name',
        placeholder: 'PACKAGE_NAME'
      },
      {
        type: 'json-value',
        path: '$.description',
        placeholder: 'PACKAGE_DESCRIPTION'
      },
      {
        type: 'json-value',
        path: '$.author',
        placeholder: 'PACKAGE_AUTHOR'
      }
    ],
    'README.md': [
      {
        type: 'markdown-heading',
        level: 1,
        placeholder: 'CONTENT_TITLE',
        allowMultiple: false
      },
      {
        type: 'markdown-paragraph',
        position: 'first',
        placeholder: 'CONTENT_DESCRIPTION',
        allowMultiple: false
      }
    ],
    '.jsx': [
      {
        type: 'string-literal',
        context: 'jsx-text',
        selector: 'h1:first-child',
        placeholder: 'CONTENT_TITLE',
        allowMultiple: false
      },
      {
        type: 'string-literal',
        context: 'jsx-text',
        selector: 'h2:first-child',
        placeholder: 'CONTENT_SUBTITLE',
        allowMultiple: false
      },
      {
        type: 'string-literal',
        context: 'jsx-text',
        selector: '.description, [data-description]',
        placeholder: 'CONTENT_DESCRIPTION',
        allowMultiple: true
      },
      {
        type: 'string-literal',
        context: 'jsx-attribute',
        selector: '[title]',
        attribute: 'title',
        placeholder: 'CONTENT_TITLE',
        allowMultiple: true
      },
      {
        type: 'string-literal',
        context: 'jsx-attribute',
        selector: '[aria-label]',
        attribute: 'aria-label',
        placeholder: 'CONTENT_LABEL',
        allowMultiple: true
      }
    ],
    '.html': [
      {
        type: 'html-text',
        selector: 'title',
        placeholder: 'CONTENT_TITLE',
        allowMultiple: false
      },
      {
        type: 'html-attribute',
        selector: 'meta[name=\'description\']',
        attribute: 'content',
        placeholder: 'CONTENT_DESCRIPTION',
        allowMultiple: false
      },
      {
        type: 'html-text',
        selector: 'h1:first-child',
        placeholder: 'CONTENT_TITLE',
        allowMultiple: false
      }
    ]
  }
};

/**
 * Load and validate templatization configuration from a project directory
 *
 * @param {string} projectPath - Path to the project directory
 * @returns {object} Validated configuration object
 * @throws {Error} If configuration is invalid or cannot be loaded
 */
export function loadConfig(projectPath) {
  const configPath = path.join(projectPath, '.templatize.json');

  // Require config file for pre-release system
  if (!fs.existsSync(configPath)) {
    throw new Error(`Configuration file .templatize.json not found in ${projectPath}. Create one using 'npx make-template init' or provide a custom config file.`);
  }

  try {
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configContent);

    // Validate the configuration
    validateConfig(config);

    console.debug('Loaded templatization configuration from', configPath);
    return config;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in .templatize.json: ${error.message}`);
    }
    throw new Error(`Failed to load .templatize.json: ${error.message}`);
  }
}

/**
 * Load configuration from a specific file path
 *
 * @param {string} configFilePath - Path to the configuration file
 * @returns {object} Validated configuration object
 */
export function loadConfigFromFile(configFilePath) {
  // Require config file
  if (!fs.existsSync(configFilePath)) {
    throw new Error(`Configuration file not found: ${configFilePath}`);
  }

  try {
    const configContent = fs.readFileSync(configFilePath, 'utf8');
    const config = JSON.parse(configContent);

    // Validate the configuration
    validateConfig(config);

    console.debug('Loaded templatization configuration from', configFilePath);
    return config;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in ${configFilePath}: ${error.message}`);
    }
    throw new Error(`Failed to load ${configFilePath}: ${error.message}`);
  }
}

/**
 * Validate templatization configuration structure
 *
 * Implements forwards compatibility - unknown properties are logged but allowed
 *
 * @param {object} config - Configuration object to validate
 * @throws {Error} If required fields are missing or invalid
 */
export function validateConfig(config) {
  if (!config || typeof config !== 'object') {
    throw new Error('Configuration must be a valid object');
  }

  // Required fields
  if (typeof config.version !== 'string') {
    throw new Error('Configuration must have a version string');
  }

  if (typeof config.autoDetect !== 'boolean') {
    throw new Error('Configuration autoDetect must be a boolean');
  }

  if (!config.rules || typeof config.rules !== 'object') {
    throw new Error('Configuration must have a rules object');
  }

  // Validate rules structure
  for (const [filePattern, patterns] of Object.entries(config.rules)) {
    if (!Array.isArray(patterns)) {
      throw new Error(`Rules for ${filePattern} must be an array of patterns`);
    }

    for (const pattern of patterns) {
      validatePattern(pattern, filePattern);
    }
  }

  // Log unknown top-level properties for forwards compatibility
  const knownKeys = new Set(['version', 'autoDetect', 'rules']);
  for (const key of Object.keys(config)) {
    if (!knownKeys.has(key)) {
      console.warn(`Unknown configuration property '${key}' - ignoring (forwards compatibility)`);
    }
  }
}

/**
 * Validate a single pattern configuration
 *
 * @param {object} pattern - Pattern object to validate
 * @param {string} filePattern - File pattern this belongs to (for error messages)
 * @throws {Error} If pattern is invalid
 */
function validatePattern(pattern, filePattern) {
  if (!pattern || typeof pattern !== 'object') {
    throw new Error(`Pattern in ${filePattern} must be an object`);
  }

  // Required fields
  if (typeof pattern.type !== 'string') {
    throw new Error(`Pattern in ${filePattern} must have a type string`);
  }

  if (typeof pattern.placeholder !== 'string') {
    throw new Error(`Pattern in ${filePattern} must have a placeholder string`);
  }

  // Type-specific validation
  switch (pattern.type) {
    case 'json-value':
      if (typeof pattern.path !== 'string') {
        throw new Error(`json-value pattern in ${filePattern} must have a path string`);
      }
      break;

    case 'markdown-heading':
      if (typeof pattern.level !== 'number' || pattern.level < 1 || pattern.level > 6) {
        throw new Error(`markdown-heading pattern in ${filePattern} must have a valid level (1-6)`);
      }
      break;

    case 'string-literal':
      if (typeof pattern.context !== 'string') {
        throw new Error(`string-literal pattern in ${filePattern} must have a context`);
      }
      if (typeof pattern.selector !== 'string') {
        throw new Error(`string-literal pattern in ${filePattern} must have a selector`);
      }
      if (pattern.context === 'jsx-attribute' && typeof pattern.attribute !== 'string') {
        throw new Error(`jsx-attribute pattern in ${filePattern} must have an attribute name`);
      }
      break;

    case 'html-text':
    case 'html-attribute':
      if (typeof pattern.selector !== 'string') {
        throw new Error(`${pattern.type} pattern in ${filePattern} must have a selector`);
      }
      if (pattern.type === 'html-attribute' && typeof pattern.attribute !== 'string') {
        throw new Error(`html-attribute pattern in ${filePattern} must have an attribute name`);
      }
      break;

    default:
      // Unknown pattern types are allowed for forwards compatibility
      console.warn(`Unknown pattern type '${pattern.type}' in ${filePattern} - treating as valid (forwards compatibility)`);
  }

  // Optional fields with defaults
  if (pattern.allowMultiple !== undefined && typeof pattern.allowMultiple !== 'boolean') {
    throw new Error(`allowMultiple in ${filePattern} must be a boolean`);
  }
}

/**
 * Generate default configuration file in a project directory
 *
 * @param {string} projectPath - Path to the project directory
 * @param {object} [overrides] - Optional overrides for the default config
 */
export function generateConfigFile(projectPath, overrides = {}) {
  const config = {
    ...DEFAULT_CONFIG,
    ...overrides,
    rules: {
      ...DEFAULT_CONFIG.rules,
      ...(overrides.rules || {})
    }
  };

  const configPath = path.join(projectPath, '.templatize.json');
  const configContent = JSON.stringify(config, null, 2);

  fs.writeFileSync(configPath, configContent, 'utf8');
  console.info('Generated .templatize.json configuration file');
}

/**
 * Check if a file pattern matches any configured rules
 *
 * @param {string} filePath - File path to check
 * @param {object} config - Configuration object
 * @returns {Array} Array of matching patterns
 */
export function getPatternsForFile(filePath, config) {
  const fileName = path.basename(filePath);

  const matchingPatterns = [];

  for (const [pattern, rules] of Object.entries(config.rules)) {
    // Check for exact filename match
    if (pattern === fileName) {
      matchingPatterns.push(...rules);
      continue;
    }

    // Check for extension match (e.g., ".jsx" matches "App.jsx")
    if (pattern.startsWith('.') && filePath.endsWith(pattern)) {
      matchingPatterns.push(...rules);
      continue;
    }

    // Could add glob pattern matching here if needed in the future
  }

  return matchingPatterns;
}
