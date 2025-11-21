/**
 * Placeholder Format Configuration
 *
 * Centralized configuration for all placeholder delimiter formats.
 * Ensures consistency across make-template conversion and create-scaffold replacement.
 */

/**
 * Supported placeholder format types
 */
export const FORMAT_TYPES = {
  UNICODE: 'unicode',    // ⦃TOKEN⦄ - default, React-friendly, avoids JSX conflicts
  MUSTACHE: 'mustache',  // {{TOKEN}} - works everywhere, but conflicts with JSX
  DOLLAR: 'dollar',      // $TOKEN$ - avoids conflicts with template literals
  PERCENT: 'percent'     // %TOKEN% - avoids conflicts with CSS/custom syntax
};

/**
 * Default format (used when no format specified)
 */
export const DEFAULT_FORMAT = FORMAT_TYPES.UNICODE;

/**
 * Format specifications with delimiter patterns
 */
export const FORMAT_SPECS = {
  [FORMAT_TYPES.UNICODE]: {
    name: 'unicode',
    template: '⦃NAME⦄',
    opening: '⦃',
    closing: '⦄',
    description: 'Unicode delimiters (default, React-friendly, avoids JSX conflicts)'
  },
  [FORMAT_TYPES.MUSTACHE]: {
    name: 'mustache',
    template: '{{NAME}}',
    opening: '{{',
    closing: '}}',
    description: 'Mustache-style delimiters (works everywhere, but conflicts with JSX)'
  },
  [FORMAT_TYPES.DOLLAR]: {
    name: 'dollar',
    template: '$NAME$',
    opening: '$',
    closing: '$',
    description: 'Dollar delimiters (avoids conflicts with template literals)'
  },
  [FORMAT_TYPES.PERCENT]: {
    name: 'percent',
    template: '%NAME%',
    opening: '%',
    closing: '%',
    description: 'Percent delimiters (avoids conflicts with CSS/custom syntax)'
  }
};

/**
 * Escape special regex characters in a string
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalize format name to standard format type
 * @param {string} format - Format name (unicode, mustache, dollar, percent, or template pattern)
 * @returns {string} Normalized format type
 * @throws {Error} If format is invalid
 */
export function normalizeFormat(format) {
  if (!format || typeof format !== 'string') {
    return DEFAULT_FORMAT;
  }

  const lowerFormat = format.toLowerCase().trim();

  // Check if it's a named format
  if (FORMAT_SPECS[lowerFormat]) {
    return lowerFormat;
  }

  // Legacy support: check if it's a template pattern
  if (format.includes('NAME')) {
    // Map template patterns to format types
    if (format === '⦃NAME⦄') return FORMAT_TYPES.UNICODE;
    if (format === '{{NAME}}') return FORMAT_TYPES.MUSTACHE;
    if (format === '$NAME$') return FORMAT_TYPES.DOLLAR;
    if (format === '%NAME%') return FORMAT_TYPES.PERCENT;
  }

  throw new Error(
    `Invalid placeholder format: "${format}". ` +
    `Must be one of: ${Object.values(FORMAT_TYPES).join(', ')}`
  );
}

/**
 * Get format specification for a format type
 * @param {string} format - Format type
 * @returns {Object} Format specification
 * @throws {Error} If format is invalid
 */
export function getFormatSpec(format) {
  const normalizedFormat = normalizeFormat(format);
  const spec = FORMAT_SPECS[normalizedFormat];

  if (!spec) {
    throw new Error(`Unknown format type: ${normalizedFormat}`);
  }

  return spec;
}

/**
 * Format a placeholder token with specified format
 * @param {string} token - Token name (e.g., 'PACKAGE_NAME')
 * @param {string} format - Format type
 * @returns {string} Formatted placeholder (e.g., '⦃PACKAGE_NAME⦄')
 */
export function formatPlaceholder(token, format = DEFAULT_FORMAT) {
  const spec = getFormatSpec(format);
  return spec.template.replace('NAME', token);
}

/**
 * Create a regex pattern to match a specific token in a format
 * Allows optional whitespace around the token for flexibility
 *
 * @param {string} token - Token name (e.g., 'PACKAGE_NAME')
 * @param {string} format - Format type
 * @param {string} flags - Regex flags (default: 'g')
 * @returns {RegExp} Regex pattern to match the token
 */
export function createTokenPattern(token, format = DEFAULT_FORMAT, flags = 'g') {
  const spec = getFormatSpec(format);
  const escapedOpening = escapeRegExp(spec.opening);
  const escapedClosing = escapeRegExp(spec.closing);
  const escapedToken = escapeRegExp(token);

  // Pattern allows optional whitespace around token
  const pattern = `${escapedOpening}\\s*${escapedToken}\\s*${escapedClosing}`;
  return new RegExp(pattern, flags);
}

/**
 * Create a regex pattern to match ANY placeholder in a format
 * Useful for detecting existing placeholders
 *
 * @param {string} format - Format type
 * @param {string} flags - Regex flags (default: 'g')
 * @returns {RegExp} Regex pattern to match any placeholder
 */
export function createFormatPattern(format = DEFAULT_FORMAT, flags = 'g') {
  const spec = getFormatSpec(format);
  const escapedOpening = escapeRegExp(spec.opening);
  const escapedClosing = escapeRegExp(spec.closing);

  // Match opening + word characters/underscores + closing
  const pattern = `${escapedOpening}\\s*[A-Z][A-Z0-9_]*\\s*${escapedClosing}`;
  return new RegExp(pattern, flags);
}

/**
 * Create patterns to detect ANY of the 4 supported formats
 * Returns an array of regex patterns, one for each format
 *
 * @param {string} flags - Regex flags (default: '')
 * @returns {RegExp[]} Array of regex patterns
 */
export function createAllFormatsPatterns(flags = '') {
  return Object.values(FORMAT_TYPES).map(format =>
    createFormatPattern(format, flags)
  );
}

/**
 * Check if text contains placeholders in ANY supported format
 * @param {string} text - Text to check
 * @returns {boolean} True if placeholders found
 */
export function hasAnyPlaceholders(text) {
  if (typeof text !== 'string') {
    return false;
  }

  const patterns = createAllFormatsPatterns();
  return patterns.some(pattern => pattern.test(text));
}

/**
 * Extract all placeholder tokens from text in a specific format
 * @param {string} text - Text to extract from
 * @param {string} format - Format type
 * @returns {string[]} Array of unique token names
 */
export function extractPlaceholders(text, format = DEFAULT_FORMAT) {
  if (typeof text !== 'string') {
    return [];
  }

  const spec = getFormatSpec(format);
  const pattern = createFormatPattern(format, 'g');
  const matches = text.matchAll(pattern);
  const tokens = new Set();

  for (const match of matches) {
    // Extract token name by removing delimiters and whitespace
    let token = match[0];
    token = token.slice(spec.opening.length, -spec.closing.length).trim();
    tokens.add(token);
  }

  return Array.from(tokens).sort();
}

/**
 * Validate that a format type is supported
 * @param {string} format - Format type to validate
 * @returns {boolean} True if valid
 */
export function isValidFormat(format) {
  try {
    normalizeFormat(format);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get list of all supported format types
 * @returns {string[]} Array of format type names
 */
export function getSupportedFormats() {
  return Object.values(FORMAT_TYPES);
}

/**
 * Get human-readable description of all formats
 * @returns {Object[]} Array of format info objects
 */
export function getFormatDescriptions() {
  return Object.values(FORMAT_SPECS).map(spec => ({
    name: spec.name,
    example: spec.template,
    description: spec.description
  }));
}
