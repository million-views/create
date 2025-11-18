/**
 * JSON Templatization Processor
 *
 * Uses JSONPath to identify string values in JSON files
 * for templatization based on JSONPath selector patterns.
 */

import { JSONPath } from 'jsonpath-plus';

/**
 * Check if a value is a string that can be templatized
 */
function isTemplatizableString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Check if a value contains existing placeholders
 */
function hasExistingPlaceholders(value) {
  if (typeof value !== 'string') {
    return false;
  }
  // Check for placeholder patterns like {PLACEHOLDER_NAME}
  return /\{\w+\}/.test(value);
}

/**
 * Process JSON file for templatization
 *
 * @param {string} filePath - Path to the JSON file
 * @param {string} content - File content
 * @param {Array} patterns - Templatization patterns to apply
 * @returns {Array} Array of replacement objects
 */
export async function processJSONFile(filePath, content, patterns) {
  const replacements = [];

  // Skip if no patterns for JSON
  const jsonPatterns = patterns.filter(p => p.type === 'string-literal' && p.context === 'json-value');
  if (jsonPatterns.length === 0) {
    return replacements;
  }

  // Parse JSON
  let jsonData;
  try {
    jsonData = JSON.parse(content);
  } catch (_error) {
    // Malformed JSON - return empty array
    return replacements;
  }

  // Process each pattern
  for (const pattern of jsonPatterns) {
    try {
      // Use JSONPath to find matching values
      const results = JSONPath({
        path: pattern.selector,
        json: jsonData,
        resultType: 'all'
      });

      for (const result of results) {
        const value = result.value;

        // Only process string values
        if (!isTemplatizableString(value)) {
          continue;
        }

        // Check for existing placeholders
        if (hasExistingPlaceholders(value)) {
          continue;
        }

        // Check allowMultiple
        const existingCount = replacements.filter(r => r.placeholder === pattern.placeholder).length;
        if (!pattern.allowMultiple && existingCount > 0) {
          continue;
        }

        // Find the value in the content (approximate)
        const searchPattern = new RegExp(`"${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g');
        const matches = [...content.matchAll(searchPattern)];

        // For simplicity, use the first match (this is not perfect for duplicate values)
        if (matches.length > 0) {
          const match = matches[0];
          replacements.push({
            placeholder: pattern.placeholder,
            originalText: value,
            startIndex: match.index + 1, // Skip opening quote
            endIndex: match.index + match[0].length - 1, // Skip closing quote
            context: 'json-value',
            selector: pattern.selector,
            jsonPath: result.path
          });
        }
      }
    } catch (_error) {
      // Invalid JSONPath or other error - skip this pattern
      continue;
    }
  }

  return replacements;
}
