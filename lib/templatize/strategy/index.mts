/**
 * Strategy Index - Templatize Strategies Facade
 *
 * Exports all file-type specific templatization strategies.
 *
 * @module lib/templatize/strategy
 */

// JSON strategy
export { processJSONFile as json } from './json.mts';

// Markdown strategy
export { processMarkdownFile as markdown } from './markdown.mts';

// HTML strategy
export { processHTMLFile as html } from './html.mts';

// JSX/TSX strategy
export { processJSXFile as jsx } from './jsx.mts';

// Config strategy
export {
  loadConfig as config,
  DEFAULT_CONFIG,
  filterPatternsByContext,
  generateConfigFile,
  getPatternsForFile,
  validateConfig,
  loadConfigFromFile
} from './config.mts';

// Legacy re-exports for backward compatibility
export { processJSONFile } from './json.mts';
export { processMarkdownFile } from './markdown.mts';
export { processHTMLFile } from './html.mts';
export { processJSXFile } from './jsx.mts';
export { loadConfig } from './config.mts';
