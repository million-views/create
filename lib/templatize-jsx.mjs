/**
 * JSX Templatization Processor
 *
 * Uses Tree-sitter to parse JSX files and identify string literals
 * for templatization based on CSS selector patterns.
 */

import Parser from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';
import TypeScript from 'tree-sitter-typescript';
import { filterPatternsByContext } from './templatize-config.mjs';

// Cache for parsers to avoid recreation
let jsParser = null;
let tsxParser = null;

/**
 * Get or create JavaScript parser
 */
function getJSParser() {
  if (!jsParser) {
    jsParser = new Parser();
    jsParser.setLanguage(JavaScript);
  }
  return jsParser;
}

/**
 * Get or create TypeScript/TSX parser
 */
function getTSXParser() {
  if (!tsxParser) {
    tsxParser = new Parser();
    tsxParser.setLanguage(TypeScript.tsx);
  }
  return tsxParser;
}

/**
 * Determine which parser to use based on file extension
 */
function getParserForFile(filePath) {
  if (filePath.endsWith('.tsx')) {
    return getTSXParser();
  }
  return getJSParser();
}

/**
 * Parse JSX file content into AST
 */
function parseJSX(content, filePath) {
  try {
    const parser = getParserForFile(filePath);
    return parser.parse(content);
  } catch (error) {
    console.warn(`Failed to parse JSX file ${filePath}: ${error.message}`);
    return null;
  }
}

/**
 * Check if a node is within a skip region
 */
function isInSkipRegion(node, content) {
  // Check the node content itself for skip comments
  const nodeText = content.substring(node.startIndex, node.endIndex);
  if (nodeText.includes('/* @template-skip */') ||
    nodeText.includes('// @template-skip') ||
    nodeText.includes('@template-skip')) {
    return true;
  }

  // Look for @template-skip comments before this node
  const lines = content.substring(0, node.startIndex).split('\n');
  let inSkipRegion = false;

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.includes('/* @end-template-skip */') ||
      line.includes('// @end-template-skip')) {
      break; // Found end, stop looking
    }
    if (line.includes('/* @template-skip */') ||
      line.includes('// @template-skip')) {
      inSkipRegion = true;
      break;
    }
  }

  return inSkipRegion;
}

/**
 * Check if a node contains existing placeholders
 */
function hasExistingPlaceholders(node, content) {
  const nodeText = content.substring(node.startIndex, node.endIndex);
  // Check for placeholder patterns like {PLACEHOLDER_NAME}
  return /\{\w+\}/.test(nodeText);
}

/**
 * Simple CSS selector matching for JSX elements
 * This is a simplified implementation - for complex selectors,
 * we might need a full CSS parser
 */
function matchesSelector(elementNode, parent, selector, content) {
  if (!elementNode || (elementNode.type !== 'jsx_element' && elementNode.type !== 'jsx_self_closing_element')) {
    return false;
  }

  const elementText = content.substring(elementNode.startIndex, elementNode.endIndex);

  // Handle compound selectors (comma-separated) FIRST
  if (selector.includes(',')) {
    const selectors = selector.split(',').map(s => s.trim());
    return selectors.some(sel => matchesSelector(elementNode, parent, sel, content));
  }

  // Handle :first-child pseudo-selector
  if (selector.includes(':first-child')) {
    const baseSelector = selector.replace(':first-child', '');
    if (baseSelector === 'h1') {
      // Check if this element is an h1 and is the first h1 child
      const openingTagMatch = elementText.match(/<\s*[^>]*>/);
      const openingTag = openingTagMatch ? openingTagMatch[0] : '';
      return openingTag.includes('<h1');
    }
    if (baseSelector === 'h2') {
      // Check if this element is an h2 and is the first h2 child
      const openingTagMatch = elementText.match(/<\s*[^>]*>/);
      const openingTag = openingTagMatch ? openingTagMatch[0] : '';
      return openingTag.includes('<h2');
    }
  }

  // Handle class selector
  if (selector.startsWith('.')) {
    const className = selector.substring(1);
    // Extract the opening tag (from first < to first > or />)
    const openingTagMatch = elementText.match(/<\s*[^>]*>/);
    const openingTag = openingTagMatch ? openingTagMatch[0] : '';
    return openingTag.includes(`className="${className}"`) ||
      openingTag.includes(`class="${className}"`);
  }

  // Handle attribute selectors
  if (selector.startsWith('[') && selector.endsWith(']')) {
    const attrSelector = selector.slice(1, -1); // Remove [ and ]
    // Extract the opening tag
    const openingTagMatch = elementText.match(/<\s*[^>]*>/);
    const openingTag = openingTagMatch ? openingTagMatch[0] : '';
    return openingTag.includes(`${attrSelector}=`) ||
      openingTag.includes(`${attrSelector}`);
  }

  // Handle tag[attribute] selectors (e.g., "img[src]", "meta[name]")
  const tagAttrMatch = selector.match(/^(\w+)\[([^\]]+)\]$/);
  if (tagAttrMatch) {
    const [, tagName, attrName] = tagAttrMatch;
    const openingTagMatch = elementText.match(/<\s*[^>]*>/);
    const openingTag = openingTagMatch ? openingTagMatch[0] : '';
    return openingTag.includes(`<${tagName}`) &&
      (openingTag.includes(`${attrName}=`) || openingTag.includes(`${attrName}`));
  }

  // Handle tag name selectors
  if (selector === 'title') {
    return elementText.includes('<title');
  }

  if (selector === 'h1') {
    return elementText.includes('<h1');
  }

  if (selector === 'h2') {
    return elementText.includes('<h2');
  }

  if (selector === 'meta[name=\'description\']') {
    return elementText.includes('<meta') &&
      elementText.includes('name="description"');
  }

  // Handle descendant selectors (e.g., "blockquote p")
  if (selector.includes(' ')) {
    const parts = selector.split(/\s+/);
    if (parts.length === 2) {
      const [ancestorTag, childTag] = parts;
      // Check if current element matches the child tag
      const openingTagMatch = elementText.match(/<\s*(\w+)/);
      const currentTag = openingTagMatch ? openingTagMatch[1] : '';
      if (currentTag !== childTag) {
        return false;
      }
      // Check if parent matches the ancestor tag
      if (!parent) {
        return false;
      }
      const parentText = content.substring(parent.startIndex, parent.endIndex);
      const parentTagMatch = parentText.match(/<\s*(\w+)/);
      const parentTag = parentTagMatch ? parentTagMatch[1] : '';
      return parentTag === ancestorTag;
    }
  }

  // Handle simple tag name matching
  const openingTagMatch = elementText.match(/<\s*(\w+)/);
  const currentTag = openingTagMatch ? openingTagMatch[1] : '';
  return currentTag === selector;
}

/**
 * Extract text content from JSX text nodes within an element
 */
function findJSXTextInElement(elementNode, content) {
  const textNodes = [];

  function traverse(node) {
    if (node.type === 'jsx_text') {
      const text = content.substring(node.startIndex, node.endIndex).trim();
      if (text.length > 0) {
        textNodes.push({
          node,
          text,
          startIndex: node.startIndex,
          endIndex: node.endIndex
        });
      }
    }

    if (node.children) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }

  traverse(elementNode);
  return textNodes;
}

/**
 * Extract attribute name from CSS selector
 * Examples:
 *   img[src] → 'src'
 *   a[href^='mailto'] → 'href'
 *   button[aria-label] → 'aria-label'
 */
function extractAttributeFromSelector(selector) {
  const attrMatch = selector.match(/\[([a-z-]+)(?:[~|^$*]?=)?/i);
  return attrMatch ? attrMatch[1] : null;
}

/**
 * Find JSX attributes matching a pattern
 */
function findJSXAttributes(elementNode, attributeName, content) {
  const attributes = [];

  function traverse(node) {
    if (node.type === 'jsx_attribute') {
      const attrText = content.substring(node.startIndex, node.endIndex);
      if (attrText.includes(`${attributeName}=`)) {
        // Find the string literal value
        const children = node.children || [];
        for (const child of children) {
          if (child.type === 'string') {
            const value = content.substring(child.startIndex + 1, child.endIndex - 1); // Remove quotes
            attributes.push({
              node: child,
              value,
              startIndex: child.startIndex,
              endIndex: child.endIndex
            });
            break;
          }
        }
      }
    }

    if (node.children) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }

  traverse(elementNode);
  return attributes;
}

/**
 * Process JSX file for templatization
 *
 * @param {string} filePath - Path to the JSX file
 * @param {string} content - File content
 * @param {Array} patterns - Templatization patterns to apply
 * @returns {Array} Array of replacement objects
 */
export async function processJSXFile(filePath, content, patterns) {
  const replacements = [];

  // Skip if no patterns for JSX (includes text/jsx and text/jsx#attribute)
  const jsxPatterns = filterPatternsByContext(patterns, ['text/jsx', 'text/jsx#attribute']);
  if (jsxPatterns.length === 0) {
    return replacements;
  }

  // Parse the file
  const tree = parseJSX(content, filePath);
  if (!tree) {
    return replacements; // Parse failed
  }

  // Collect all JSX elements (both regular and self-closing) with parent info
  const jsxElements = [];
  function collectJSXElements(node, parent = null) {
    if (node.type === 'jsx_element' || node.type === 'jsx_self_closing_element') {
      jsxElements.push({ node, parent });
    }
    if (node.children) {
      for (const child of node.children) {
        collectJSXElements(child, node.type === 'jsx_element' || node.type === 'jsx_self_closing_element' ? node : parent);
      }
    }
  }
  collectJSXElements(tree.rootNode);

  // Process each pattern
  for (const pattern of jsxPatterns) {
    for (const elementInfo of jsxElements) {
      const { node: element, parent } = elementInfo;
      if (matchesSelector(element, parent, pattern.selector, content)) {
        if (pattern.context === 'text/jsx') {
          // Find text content
          const textNodes = findJSXTextInElement(element, content);
          for (const textNode of textNodes) {
            if (!isInSkipRegion(textNode.node, content) &&
              !hasExistingPlaceholders(textNode.node, content)) {

              // Check allowMultiple
              const existingCount = replacements.filter(r => r.placeholder === pattern.placeholder).length;
              if (!pattern.allowMultiple && existingCount > 0) {
                continue;
              }

              replacements.push({
                placeholder: pattern.placeholder,
                originalText: textNode.text,
                startIndex: textNode.startIndex,
                endIndex: textNode.endIndex,
                context: 'text/jsx',
                selector: pattern.selector
              });
            }
          }
        } else if (pattern.context === 'text/jsx#attribute') {
          // Extract attribute name from selector (e.g., img[src] → 'src')
          const attributeName = pattern.attribute || extractAttributeFromSelector(pattern.selector);

          if (!attributeName) {
            console.warn(`Could not extract attribute from selector: ${pattern.selector}`);
            continue;
          }

          // Find attribute values
          const attributes = findJSXAttributes(element, attributeName, content);
          for (const attr of attributes) {
            if (!isInSkipRegion(attr.node, content) &&
              !hasExistingPlaceholders(attr.node, content)) {

              // Check allowMultiple
              const existingCount = replacements.filter(r => r.placeholder === pattern.placeholder).length;
              if (!pattern.allowMultiple && existingCount > 0) {
                continue;
              }

              replacements.push({
                placeholder: pattern.placeholder,
                originalText: attr.value,
                startIndex: attr.startIndex,
                endIndex: attr.endIndex,
                context: 'text/jsx#attribute',
                attribute: attributeName,
                selector: pattern.selector
              });
            }
          }
        }
      }
    }
  }

  return replacements;
}
