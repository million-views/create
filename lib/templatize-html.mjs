/**
 * HTML Templatization Processor
 *
 * Uses DOM parsing to identify text content and attributes
 * in HTML files for templatization based on CSS selector patterns.
 */

import { JSDOM } from 'jsdom';
import { filterPatternsByContext } from './templatize-config.mjs';
import { hasAnyPlaceholders } from './placeholder-formats.mjs';

/**
 * Extract attribute name from CSS selector
 * Examples:
 *   img[src] → 'src'
 *   meta[name='description'] → 'name'
 *   link[href] → 'href'
 */
function extractAttributeFromSelector(selector) {
  const attrMatch = selector.match(/\[([a-z-]+)(?:[~|^$*]?=)?/i);
  return attrMatch ? attrMatch[1] : null;
}

/**
 * Check if a value is a string that can be templatized
 */
function isTemplatizableString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Check if a position is within a skip region
 */
function isInSkipRegion(content, startIndex, endIndex) {
  // Check the matched text itself for skip comments
  const matchedText = content.substring(startIndex, endIndex + 1);
  if (matchedText.includes('<!-- @template-skip -->') ||
    matchedText.includes('@template-skip')) {
    return true;
  }

  // Look for @template-skip comments before this position
  const lines = content.substring(0, startIndex).split('\n');
  let inSkipRegion = false;

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.includes('<!-- @end-template-skip -->')) {
      break; // Found end, stop looking
    }
    if (line.includes('<!-- @template-skip -->')) {
      inSkipRegion = true;
      break;
    }
  }

  return inSkipRegion;
}

/**
 * Check if a text node has existing placeholders in ANY format
 */
function hasExistingPlaceholders(text) {
  return hasAnyPlaceholders(text);
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
          !hasExistingPlaceholders(node.textContent)) {
          // Calculate approximate position for skip region check
          const text = node.textContent.trim();
          const startIndex = content.indexOf(text);
          if (startIndex !== -1 && !isInSkipRegion(content, startIndex, startIndex + text.length)) {
            elements.push({
              node,
              text,
              type: 'text'
            });
          }
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
        // Check if this position is in a skip region
        if (isInSkipRegion(content, startIndex, startIndex + searchText.length)) {
          continue;
        }

        matches.push({
          placeholder,
          originalText: element.text,
          startIndex,
          endIndex: startIndex + searchText.length,
          context: 'text/html',
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
  const htmlPatterns = filterPatternsByContext(patterns, 'text/html');
  if (htmlPatterns.length === 0) {
    return replacements;
  }

  // Process each pattern
  for (const pattern of htmlPatterns) {
    try {
      // Check if pattern is for attribute extraction based on context
      if (pattern.context === 'text/html#attribute') {
        // Extract attribute values
        const attributeName = pattern.attribute || extractAttributeFromSelector(pattern.selector);
        if (attributeName) {
          const attrMatches = findHTMLAttributeMatches(content, pattern.selector, attributeName, pattern.placeholder);
          for (const match of attrMatches) {
            const existingCount = replacements.filter(r => r.placeholder === pattern.placeholder).length;
            if (!pattern.allowMultiple && existingCount > 0) {
              continue;
            }
            replacements.push(match);
          }
        }
      } else {
        // Extract text content (context === 'html')
        const matches = findHTMLMatches(content, pattern.selector, pattern.placeholder);
        for (const match of matches) {
          const existingCount = replacements.filter(r => r.placeholder === pattern.placeholder).length;
          if (!pattern.allowMultiple && existingCount > 0) {
            continue;
          }
          replacements.push(match);
        }
      }
    } catch (_error) {
      // Invalid selector or other error - skip this pattern
      continue;
    }
  }

  return replacements;
}

/**
 * Find HTML attribute values based on CSS selector
 */
function findHTMLAttributeMatches(content, selector, attributeName, placeholder) {
  const matches = [];

  try {
    const dom = new JSDOM(content);
    const document = dom.window.document;

    // Remove the attribute part from selector for querySelectorAll
    // e.g., meta[name='description'] → meta[name='description']
    const elements = Array.from(document.querySelectorAll(selector));

    for (const element of elements) {
      const attrValue = element.getAttribute(attributeName);

      if (isTemplatizableString(attrValue) && !hasExistingPlaceholders(attrValue)) {
        // Find attribute value position in original content
        const searchPattern = new RegExp(`${attributeName}=["']([^"']*)["']`, 'i');
        const attrMatch = content.match(searchPattern);

        if (attrMatch) {
          const startIndex = content.indexOf(attrMatch[1]);
          if (startIndex !== -1 && !isInSkipRegion(content, startIndex, startIndex + attrMatch[1].length)) {
            matches.push({
              placeholder,
              originalText: attrValue,
              startIndex,
              endIndex: startIndex + attrValue.length,
              context: 'text/html#attribute',
              selector,
              attribute: attributeName
            });
          }
        }
      }
    }
  } catch (error) {
    console.warn(`Failed to extract HTML attributes: ${error.message}`);
  }

  return matches;
}
