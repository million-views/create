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
        context: 'application/json',
        path: '$.name',
        placeholder: 'PACKAGE_NAME'
      },
      {
        context: 'application/json',
        path: '$.description',
        placeholder: 'PACKAGE_DESCRIPTION'
      },
      {
        context: 'application/json',
        path: '$.author',
        placeholder: 'PACKAGE_AUTHOR'
      }
    ],
    'README.md': [
      {
        context: 'text/markdown#heading',
        selector: 'h1',
        placeholder: 'CONTENT_TITLE',
        allowMultiple: false
      },
      {
        context: 'text/markdown#paragraph',
        selector: 'p',
        placeholder: 'CONTENT_DESCRIPTION',
        allowMultiple: false
      }
    ],
    '.jsx': [
      {
        context: 'text/jsx',
        selector: 'h1:first-child',
        placeholder: 'CONTENT_TITLE',
        allowMultiple: false
      },
      {
        context: 'text/jsx',
        selector: 'h2:first-child',
        placeholder: 'CONTENT_SUBTITLE',
        allowMultiple: false
      },
      {
        context: 'text/jsx',
        selector: '.description, [data-description]',
        placeholder: 'CONTENT_DESCRIPTION',
        allowMultiple: true
      },
      {
        context: 'text/jsx#attribute',
        selector: '[title]',
        placeholder: 'CONTENT_TITLE',
        allowMultiple: true
      },
      {
        context: 'text/jsx#attribute',
        selector: '[aria-label]',
        placeholder: 'CONTENT_LABEL',
        allowMultiple: true
      }
    ],
    '.html': [
      {
        context: 'text/html',
        selector: 'title',
        placeholder: 'CONTENT_TITLE',
        allowMultiple: false
      },
      {
        context: 'text/html#attribute',
        selector: 'meta[name=\'description\'][content]',
        placeholder: 'CONTENT_DESCRIPTION',
        allowMultiple: false
      },
      {
        context: 'text/html',
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
 * Pattern type registry - defines validation rules and required properties for each context
 */
const PATTERN_REGISTRY = {
  'application/json': {
    requiredProperties: ['path'],
    description: 'JSONPath expression for extracting JSON values'
  },
  'text/jsx': {
    requiredProperties: ['selector'],
    description: 'CSS selector for JSX text content'
  },
  'text/jsx#attribute': {
    requiredProperties: ['selector'],
    description: 'CSS selector for JSX element attributes'
  },
  'text/html': {
    requiredProperties: ['selector'],
    description: 'CSS selector for HTML text content'
  },
  'text/html#attribute': {
    requiredProperties: ['selector'],
    description: 'CSS selector for HTML element attributes'
  },
  'text/markdown#heading': {
    requiredProperties: ['selector'],
    description: 'Selector for markdown headings (h1-h6)'
  },
  'text/markdown#paragraph': {
    requiredProperties: ['selector'],
    description: 'Selector for markdown paragraphs'
  }
};

/**
 * Check if a context matches a pattern type
 *
 * @param {string} context - Pattern context to check
 * @param {string} baseContext - Base context to match against
 * @returns {boolean} True if context matches
 */
function contextMatches(context, baseContext) {
  return context === baseContext || context.startsWith(baseContext + '#');
}

/**
 * Get pattern specification from registry
 *
 * @param {string} context - Pattern context
 * @returns {object|null} Pattern spec or null if unknown
 */
function getPatternSpec(context) {
  // Exact match
  if (PATTERN_REGISTRY[context]) {
    return PATTERN_REGISTRY[context];
  }

  // Check for base context match (e.g., 'text/jsx' for 'text/jsx#attribute')
  for (const [registeredContext, spec] of Object.entries(PATTERN_REGISTRY)) {
    if (contextMatches(context, registeredContext)) {
      return spec;
    }
  }

  return null;
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
  if (typeof pattern.context !== 'string') {
    throw new Error(`Pattern in ${filePattern} must have a context string (MIME-type format)`);
  }

  if (typeof pattern.placeholder !== 'string') {
    throw new Error(`Pattern in ${filePattern} must have a placeholder string`);
  }

  // Context-specific validation using registry
  const spec = getPatternSpec(pattern.context);

  if (spec) {
    // Validate required properties for this pattern type
    for (const requiredProp of spec.requiredProperties) {
      if (typeof pattern[requiredProp] !== 'string') {
        throw new Error(
          `${pattern.context} pattern in ${filePattern} must have a ${requiredProp} property (${spec.description})`
        );
      }
    }
  } else {
    // Unknown contexts are allowed for forwards compatibility
    console.warn(`Unknown context '${pattern.context}' in ${filePattern} - treating as valid (forwards compatibility)`);
  }

  // Optional fields with defaults
  if (pattern.allowMultiple !== undefined && typeof pattern.allowMultiple !== 'boolean') {
    throw new Error(`allowMultiple in ${filePattern} must be a boolean`);
  }
}

/**
 * Filter patterns by context type
 *
 * @param {Array} patterns - Array of pattern objects
 * @param {string|Array<string>} contexts - Context or array of contexts to filter by
 * @returns {Array} Filtered patterns
 */
export function filterPatternsByContext(patterns, contexts) {
  const contextArray = Array.isArray(contexts) ? contexts : [contexts];

  return patterns.filter(pattern => {
    if (!pattern.context) return false;

    return contextArray.some(ctx =>
      pattern.context === ctx || pattern.context.startsWith(ctx + '#')
    );
  });
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

    // Check for relative path match (e.g., "src/components/Hero.jsx")
    if (filePath === pattern || filePath.endsWith(path.sep + pattern) || filePath.endsWith('/' + pattern.replace(/\\/g, '/'))) {
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
