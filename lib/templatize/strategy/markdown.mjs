/**
 * Markdown Templatization Processor
 *
 * Uses Tree-sitter for structured content (headings, frontmatter) and
 * regex patterns for inline content (code, links, images).
 */

import Parser from 'tree-sitter';
import Markdown from '@tree-sitter-grammars/tree-sitter-markdown';
import { parseAllDocuments } from 'yaml';
import { filterPatternsByContext } from './config.mjs';
import { hasAnyPlaceholders } from '../../placeholder/format.mjs';

// Cache for parser to avoid recreation
let markdownParser = null;

/**
 * Get or create Markdown parser
 */
function getMarkdownParser() {
  if (!markdownParser) {
    markdownParser = new Parser();
    markdownParser.setLanguage(Markdown);
  }
  return markdownParser;
}

/**
 * Parse Markdown file content into AST
 */
function parseMarkdown(content) {
  try {
    const parser = getMarkdownParser();
    return parser.parse(content);
  } catch (error) {
    console.warn(`Failed to parse Markdown content: ${error.message}`);
    return null;
  }
}
export async function processMarkdownFile(filePath, content, patterns) {
  const replacements = [];

  // Filter for markdown patterns
  const markdownPatterns = filterPatternsByContext(patterns, 'text/markdown');

  for (const pattern of markdownPatterns) {
    const { selector, placeholder, allowMultiple = true } = pattern;

    if (!placeholder) continue;

    try {
      const matches = findMarkdownMatches(content, selector, placeholder);

      for (const match of matches) {
        // Check for skip comments
        if (hasSkipComment(content, match.start, match.end)) {
          continue;
        }

        // Check for existing placeholders
        if (hasExistingPlaceholders(match.original)) {
          continue;
        }

        // Check allowMultiple
        const existingCount = replacements.filter(r => r.placeholder === placeholder).length;
        if (!allowMultiple && existingCount > 0) {
          continue;
        }

        replacements.push({
          placeholder,
          originalText: match.original,
          startIndex: match.start,
          endIndex: match.end,
          context: pattern.context,
          selector
        });
      }
    } catch (_error) {
      // Invalid selector, skip silently
      continue;
    }
  }

  return replacements;
}

/**
 * Find matches in markdown content based on selector
 * @param {string} content - Markdown content
 * @param {string} selector - CSS-like selector (h1, h2, frontmatter.title, etc.)
 * @param {string} placeholder - Placeholder name
 * @returns {Array} Array of match objects
 */
function findMarkdownMatches(content, selector, placeholder) {
  const matches = [];
  const tree = parseMarkdown(content);

  if (!tree) {
    return matches;
  }

  // Handle frontmatter selectors
  if (selector.startsWith('frontmatter.')) {
    const frontmatterMatches = findFrontmatterMatches(tree, content, selector, placeholder);
    matches.push(...frontmatterMatches);
    return matches;
  }

  // Handle heading selectors
  if (selector.includes('h1') || selector.includes('h2') || selector.includes('h3') ||
    selector.includes('h4') || selector.includes('h5') || selector.includes('h6')) {
    const headingMatches = findHeadingMatches(tree, content, selector, placeholder);
    matches.push(...headingMatches);
    return matches;
  }

  // Handle content selectors with regex
  if (selector === 'code') {
    const codeMatches = findCodeBlockMatches(content, placeholder);
    matches.push(...codeMatches);
    return matches;
  }

  if (selector === 'inline-code') {
    const inlineCodeMatches = findInlineCodeMatches(content, placeholder);
    matches.push(...inlineCodeMatches);
    return matches;
  }

  // Handle link selectors
  if (selector === 'link') {
    const linkMatches = findLinkMatches(content, placeholder);
    matches.push(...linkMatches);
    return matches;
  }

  // Handle image selectors
  if (selector === 'image') {
    const imageMatches = findImageMatches(content, placeholder);
    matches.push(...imageMatches);
    return matches;
  }

  // Handle paragraph selectors
  if (selector === 'p') {
    const paragraphMatches = findParagraphMatches(content, placeholder);
    matches.push(...paragraphMatches);
    return matches;
  }

  return matches;
}

/**
 * Check if text contains existing placeholders in ANY format
 * @param {string} text - Text to check
 * @returns {boolean} True if placeholders found
 */
function hasExistingPlaceholders(text) {
  return hasAnyPlaceholders(text);
}

/**
 * Find frontmatter node in the AST
 * @param {Tree} tree - Parsed markdown tree
 * @returns {Node|null} Frontmatter node or null
 */
function findFrontmatterNode(tree) {
  const root = tree.rootNode;

  // Look for frontmatter node (minus_metadata or plus_metadata)
  for (const child of root.children) {
    if (child.type === 'minus_metadata' || child.type === 'plus_metadata') {
      return child;
    }
  }

  return null;
}

/**
 * Get nested value from object using dot notation
 * @param {object} obj - Object to traverse
 * @param {string} path - Dot-separated path
 * @returns {*} Value at path or undefined
 */
function getNestedValue(obj, path) {
  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Get line number for a position in content
 * @param {string} content - Content string
 * @param {number} position - Character position
 * @returns {number} Line number (1-based)
 */
function getLineNumber(content, position) {
  const lines = content.substring(0, position).split('\n');
  return lines.length;
}

/**
 * Get column number for a position in content
 * @param {string} content - Content string
 * @param {number} position - Character position
 * @returns {number} Column number (1-based)
 */
function getColumnNumber(content, position) {
  const lines = content.substring(0, position).split('\n');
  return lines[lines.length - 1].length + 1;
}

/**
 * Find heading matches using tree-sitter
 * @param {Tree} tree - Parsed markdown tree
 * @param {string} content - Original content
 * @param {string} selector - Heading selector (h1, h2, h3, etc.)
 * @param {string} placeholder - Placeholder name
 * @returns {Array} Array of match objects
 */
function findHeadingMatches(tree, content, selector, placeholder) {
  const matches = [];
  const selectors = selector.split(',').map(s => s.trim());
  const levels = selectors.map(s => {
    if (s === 'h1') return 1;
    if (s === 'h2') return 2;
    if (s === 'h3') return 3;
    if (s === 'h4') return 4;
    if (s === 'h5') return 5;
    if (s === 'h6') return 6;
    return null;
  }).filter(level => level !== null);

  const root = tree.rootNode;

  function traverse(node) {
    if (node.type === 'atx_heading') {
      // Determine level from marker
      const marker = node.children.find(child => child.type.startsWith('atx_h') && child.type.endsWith('_marker'));
      if (marker) {
        const level = parseInt(marker.type.match(/atx_h(\d)_marker/)[1]);
        if (levels.includes(level)) {
          // Find the inline content
          const inlineNode = node.children.find(child => child.type === 'inline');
          if (inlineNode) {
            const headingText = content.slice(inlineNode.startIndex, inlineNode.endIndex).trim();

            matches.push({
              selector,
              placeholder,
              original: headingText,
              start: inlineNode.startIndex,
              end: inlineNode.endIndex,
              line: getLineNumber(content, inlineNode.startIndex),
              column: getColumnNumber(content, inlineNode.startIndex)
            });
          }
        }
      }
    }

    // Continue traversing children
    for (const child of node.children) {
      traverse(child);
    }
  }

  traverse(root);
  return matches;
}

/**
 * Find code block matches using regex
 * @param {string} content - Original content
 * @param {string} placeholder - Placeholder name
 * @returns {Array} Array of match objects
 */
function findCodeBlockMatches(content, placeholder) {
  const matches = [];
  // Match fenced code blocks: ```language\ncode\n```
  const codeBlockRegex = /```[\s\S]*?\n([\s\S]*?)\n```/g;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const codeContent = match[1].trim();
    if (codeContent) {
      matches.push({
        selector: 'code',
        placeholder,
        original: codeContent,
        start: match.index + match[0].indexOf(match[1]),
        end: match.index + match[0].indexOf(match[1]) + match[1].length,
        line: getLineNumber(content, match.index + match[0].indexOf(match[1])),
        column: getColumnNumber(content, match.index + match[0].indexOf(match[1]))
      });
    }
  }

  return matches;
}

/**
 * Find inline code matches using regex
 * @param {string} content - Original content
 * @param {string} placeholder - Placeholder name
 * @returns {Array} Array of match objects
 */
function findInlineCodeMatches(content, placeholder) {
  const matches = [];
  // Match inline code: `code`
  const inlineCodeRegex = /`([^`\n]+)`/g;
  let match;

  while ((match = inlineCodeRegex.exec(content)) !== null) {
    const codeContent = match[1];
    if (codeContent.trim()) {
      matches.push({
        selector: 'inline-code',
        placeholder,
        original: codeContent,
        start: match.index + 1, // Skip the opening `
        end: match.index + 1 + codeContent.length,
        line: getLineNumber(content, match.index + 1),
        column: getColumnNumber(content, match.index + 1)
      });
    }
  }

  return matches;
}

/**
 * Find link matches using regex
 * @param {string} content - Original content
 * @param {string} placeholder - Placeholder name
 * @returns {Array} Array of match objects
 */
function findLinkMatches(content, placeholder) {
  const matches = [];
  // Match links: [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    const url = match[2];
    // Only match URLs (not relative links)
    if (url.startsWith('http')) {
      matches.push({
        selector: 'link',
        placeholder,
        original: url,
        start: match.index + match[0].indexOf('(') + 1,
        end: match.index + match[0].indexOf(')'),
        line: getLineNumber(content, match.index + match[0].indexOf('(') + 1),
        column: getColumnNumber(content, match.index + match[0].indexOf('(') + 1)
      });
    }
  }

  return matches;
}

/**
 * Find image matches using regex
 * @param {string} content - Original content
 * @param {string} placeholder - Placeholder name
 * @returns {Array} Array of match objects
 */
function findImageMatches(content, placeholder) {
  const matches = [];
  // Match images: ![alt](url)
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let match;

  while ((match = imageRegex.exec(content)) !== null) {
    const url = match[2];
    // Match URLs or relative paths
    if (url && (url.startsWith('http') || url.startsWith('/') || url.startsWith('./') || url.startsWith('../'))) {
      matches.push({
        selector: 'image',
        placeholder,
        original: url,
        start: match.index + match[0].indexOf('(') + 1,
        end: match.index + match[0].indexOf(')'),
        line: getLineNumber(content, match.index + match[0].indexOf('(') + 1),
        column: getColumnNumber(content, match.index + match[0].indexOf('(') + 1)
      });
    }
  }

  return matches;
}

/**
 * Find frontmatter matches using tree-sitter
 * @param {Tree} tree - Parsed markdown tree
 * @param {string} content - Original content
 * @param {string} selector - Frontmatter selector (frontmatter.title, frontmatter.description, etc.)
 * @param {string} placeholder - Placeholder name
 * @returns {Array} Array of match objects
 */
function findFrontmatterMatches(tree, content, selector, placeholder) {
  const matches = [];
  const frontmatterNode = findFrontmatterNode(tree);

  if (!frontmatterNode) {
    return matches;
  }

  // Extract frontmatter content and remove the --- delimiters
  const frontmatterContent = content.slice(frontmatterNode.startIndex, frontmatterNode.endIndex);
  const lines = frontmatterContent.split('\n');

  // Remove the first and last --- lines if they exist
  if (lines[0].trim() === '---') {
    lines.shift();
  }
  if (lines[lines.length - 1].trim() === '---') {
    lines.pop();
  }

  const yamlContent = lines.join('\n');

  try {
    // Parse YAML frontmatter - may contain multiple documents separated by ---
    const documents = parseAllDocuments(yamlContent);
    const frontmatterData = documents.length > 0 ? documents[0].toJSON() : {};

    // Extract the path after 'frontmatter.'
    const path = selector.substring('frontmatter.'.length);

    // Get the value using dot notation
    const value = getNestedValue(frontmatterData, path);

    if (value !== undefined && typeof value === 'string') {
      // Find the actual position of the value in the YAML content
      // Use regex to find the key: "value" pattern
      const key = path.split('.').pop(); // Get the last part of the path
      const keyRegex = new RegExp(`${key}:\\s*["']([^"']+)["']`, 'g');
      let match;
      let foundMatch = null;

      while ((match = keyRegex.exec(yamlContent)) !== null) {
        if (match[1] === value) {
          foundMatch = match;
          break;
        }
      }

      if (foundMatch) {
        // Calculate absolute position in original content
        const yamlStartIndex = frontmatterNode.startIndex + (frontmatterContent.startsWith('---\n') ? 4 : 0);
        const valueStartInYaml = foundMatch.index + foundMatch[0].indexOf(foundMatch[1]);
        const start = yamlStartIndex + valueStartInYaml;
        const end = start + value.length;

        matches.push({
          selector,
          placeholder,
          original: value,
          start,
          end,
          line: getLineNumber(content, start),
          column: getColumnNumber(content, start)
        });
      }
    }
  } catch (error) {
    // Invalid YAML, skip
    console.warn(`Failed to parse frontmatter: ${error.message}`);
  }

  return matches;
}

/**
 * Check if a position has a skip comment
 * @param {string} content - Content to check
 * @param {number} position - Position to check around
 * @param {number} endPosition - End position of the match
 * @returns {boolean} True if skip comment found
 */
function hasSkipComment(content, position, endPosition) {
  // Check the matched text itself for skip comments
  const matchedText = content.substring(position, endPosition + 1);
  if (matchedText.includes('<!-- @template-skip -->') ||
    matchedText.includes('@template-skip')) {
    return true;
  }

  // Check for skip regions by looking backwards from the position
  const lines = content.substring(0, position).split('\n');
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
 * Find paragraph matches using regex
 * @param {string} content - Original content
 * @param {string} placeholder - Placeholder name
 * @returns {Array} Array of match objects
 */
function findParagraphMatches(content, placeholder) {
  const matches = [];
  // Match paragraphs: lines that start with non-whitespace and are not headers, code blocks, etc.
  const lines = content.split('\n');
  let currentParagraph = '';
  let startLine = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines, headers, code blocks, etc.
    if (!trimmed ||
      trimmed.startsWith('#') ||
      trimmed.startsWith('```') ||
      trimmed.startsWith('---') ||
      trimmed.startsWith('<!--') ||
      trimmed.startsWith('![') ||
      trimmed.match(/^\[.*\]\(.*\)$/)) {
      // If we have a current paragraph, save it
      if (currentParagraph.trim()) {
        const startPos = content.indexOf(currentParagraph);
        matches.push({
          selector: 'p',
          placeholder,
          original: currentParagraph.trim(),
          start: startPos,
          end: startPos + currentParagraph.trim().length,
          line: getLineNumber(content, startPos),
          column: getColumnNumber(content, startPos)
        });
        currentParagraph = '';
        startLine = -1;
      }
      continue;
    }

    // Start or continue a paragraph
    if (startLine === -1) {
      startLine = i;
    }
    currentParagraph += (currentParagraph ? '\n' : '') + line;
  }

  // Handle the last paragraph
  if (currentParagraph.trim()) {
    const startPos = content.indexOf(currentParagraph);
    matches.push({
      selector: 'p',
      placeholder,
      original: currentParagraph.trim(),
      start: startPos,
      end: startPos + currentParagraph.trim().length,
      line: getLineNumber(content, startPos),
      column: getColumnNumber(content, startPos)
    });
  }

  return matches;
}
