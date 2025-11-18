/**
 * HTML Templatization Processor
 *
 * Uses DOM parsing to identify text content and attributes
 * in HTML files for templatization based on CSS selector patterns.
 */

import { JSDOM } from 'jsdom';

/**
 * Check if a value is a string that can be templatized
 */
function isTemplatizableString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Check if a node is within a skip region
 * For HTML, skip regions are not currently supported
 */
function isInSkipRegion() {
  // HTML skip regions could be implemented with comments like <!-- templatize:skip -->
  // For now, return false
  return false;
}

/**
 * Check if a text node has existing placeholders
 */
function hasExistingPlaceholders(text) {
  if (typeof text !== 'string') {
    return false;
  }
  // Check for placeholder patterns like {PLACEHOLDER_NAME}
  return /\{\w+\}/.test(text);
}

/**
 * Find HTML matches based on selector patterns
 */
function findHTMLMatches(content, selector, placeholder) {
  const matches = [];

  try {
    const dom = new JSDOM(content);
    const document = dom.window.document;

    // Handle different selector types
    let elements = [];

    if (selector === 'text') {
      // Find all text nodes
      const walker = document.createTreeWalker(
        document.body,
        dom.window.NodeFilter.SHOW_TEXT,
        null,
        false
      );

      let node;
      while (node = walker.nextNode()) {
        if (isTemplatizableString(node.textContent) &&
            !hasExistingPlaceholders(node.textContent) &&
            !isInSkipRegion()) {
          elements.push({
            node,
            text: node.textContent.trim(),
            type: 'text'
          });
        }
      }
    } else {
      // Use CSS selector to find elements
      try {
        const selectedElements = Array.from(document.querySelectorAll(selector));
        elements = selectedElements
          .filter(element => {
            const text = element.textContent.trim();
            return isTemplatizableString(text) && !hasExistingPlaceholders(text);
          })
          .map(element => ({
            node: element,
            text: element.textContent.trim(),
            type: 'element'
          }));
      } catch (_error) {
        // Invalid selector
        return matches;
      }
    }

    for (const element of elements) {
      if (!isTemplatizableString(element.text)) {
        continue;
      }

      // Calculate position in original content
      // This is approximate since DOM parsing may normalize whitespace
      const searchText = element.text;

      // Find the text in the original content
      let startIndex = content.indexOf(searchText);
      if (startIndex === -1) {
        // Try to find a close match
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const lineIndex = content.indexOf(lines[i]);
          if (lines[i].includes(searchText.trim())) {
            startIndex = lineIndex + lines[i].indexOf(searchText.trim());
            break;
          }
        }
      }

      if (startIndex !== -1) {
        matches.push({
          placeholder,
          originalText: element.text,
          startIndex,
          endIndex: startIndex + searchText.length,
          context: 'html',
          selector,
          nodeType: element.type
        });
      }
    }

  } catch (error) {
    // Malformed HTML or other parsing error
    console.warn(`Failed to parse HTML content: ${error.message}`);
  }

  return matches;
}

/**
 * Process HTML file for templatization
 *
 * @param {string} filePath - Path to the HTML file
 * @param {string} content - HTML content
 * @param {Array} patterns - Array of pattern objects with selector, placeholder, etc.
 * @returns {Array} Array of replacement objects
 */
export async function processHTMLFile(filePath, content, patterns) {
  const replacements = [];

  // Skip if no patterns for HTML
  const htmlPatterns = patterns.filter(p => p.type === 'string-literal' && p.context === 'html');
  if (htmlPatterns.length === 0) {
    return replacements;
  }

  // Process each pattern
  for (const pattern of htmlPatterns) {
    try {
      const matches = findHTMLMatches(content, pattern.selector, pattern.placeholder);

      for (const match of matches) {
        // Check allowMultiple
        const existingCount = replacements.filter(r => r.placeholder === pattern.placeholder).length;
        if (!pattern.allowMultiple && existingCount > 0) {
          continue;
        }

        replacements.push(match);
      }
    } catch (_error) {
      // Invalid selector or other error - skip this pattern
      continue;
    }
  }

  return replacements;
}
