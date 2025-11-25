/**
 * JSON Templatization Processor
 *
 * Uses JSONPath to identify string values in JSON files
 * for templatization based on JSONPath selector patterns.
 */

import { JSONPath } from 'jsonpath-plus';
import { filterPatternsByContext } from './config.mjs';
import { hasAnyPlaceholders } from '../../placeholder/format.mjs';

/**
 * Check if a value is a string that can be templatized
 */
function isTemplatizableString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Check if a value contains existing placeholders in ANY format
 */
function hasExistingPlaceholders(value) {
  return hasAnyPlaceholders(value);
}

/**
 * Check if a position is within a skip region
 */
function isInSkipRegion(content, startIndex, endIndex) {
  // Check the matched text itself for skip comments
  const matchedText = content.substring(startIndex, endIndex + 1);
  if (matchedText.includes('// @template-skip') ||
    matchedText.includes('@template-skip')) {
    return true;
  }

  // Look for @template-skip comments before this position
  const lines = content.substring(0, startIndex).split('\n');
  let inSkipRegion = false;

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.includes('// @end-template-skip')) {
      break; // Found end, stop looking
    }
    if (line.includes('// @template-skip')) {
      inSkipRegion = true;
      break;
    }
  }

  return inSkipRegion;
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
  const jsonPatterns = filterPatternsByContext(patterns, 'application/json');
  if (jsonPatterns.length === 0) {
    return replacements;
  }

  // Parse JSON (strip comments for JSONC support)
  let jsonData;
  try {
    // Strip single-line (//) and multi-line (/* */) comments for JSONC files
    // Only strip // comments at the start of lines (to avoid breaking URLs)
    const jsonWithoutComments = content
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove /* */ comments
      .split('\n')
      .map(line => {
        // Remove lines that are only comments (whitespace + //)
        const trimmed = line.trim();
        if (trimmed.startsWith('//')) {
          return '';
        }
        return line;
      })
      .join('\n');

    jsonData = JSON.parse(jsonWithoutComments);
  } catch (_error) {
    // Malformed JSON - return empty array
    return replacements;
  }

  // Process each pattern
  for (const pattern of jsonPatterns) {
    try {
      // Use JSONPath to find matching values
      const results = JSONPath({
        path: pattern.path,
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

          // Skip if within a skip region
          if (isInSkipRegion(content, match.index, match.index + match[0].length)) {
            continue;
          }

          replacements.push({
            placeholder: pattern.placeholder,
            originalText: value,
            startIndex: match.index + 1, // Skip opening quote
            endIndex: match.index + match[0].length - 1, // Skip closing quote
            context: pattern.context,
            path: pattern.path,
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
