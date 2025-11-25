/**
 * Strategy Index - Templatize Strategies Facade
 *
 * Exports all file-type specific templatization strategies.
 *
 * @module lib/templatize/strategy
 */

// JSON strategy
export { processJSONFile as json } from './json.mjs';

// Markdown strategy
export { processMarkdownFile as markdown } from './markdown.mjs';

// HTML strategy
export { processHTMLFile as html } from './html.mjs';

// JSX/TSX strategy
export { processJSXFile as jsx } from './jsx.mjs';

// Config strategy
export {
  loadConfig as config,
  DEFAULT_CONFIG,
  filterPatternsByContext,
  generateConfigFile,
  getPatternsForFile,
  validateConfig,
  loadConfigFromFile
} from './config.mjs';

// Legacy re-exports for backward compatibility
export { processJSONFile } from './json.mjs';
export { processMarkdownFile } from './markdown.mjs';
export { processHTMLFile } from './html.mjs';
export { processJSXFile } from './jsx.mjs';
export { loadConfig } from './config.mjs';
