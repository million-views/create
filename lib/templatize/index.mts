/**
 * Templatize Domain Facade
 *
 * Exports all templatization modules for processing files
 * and converting content to templates.
 *
 * @module lib/templatize
 */

// Strategy exports (file-type processors)
export * as strategy from './strategy/index.mts';

// Direct strategy exports for convenience
export {
  json,
  markdown,
  html,
  jsx,
  config,
  DEFAULT_CONFIG,
  filterPatternsByContext,
  generateConfigFile,
  getPatternsForFile,
  validateConfig,
  loadConfigFromFile,
  // Legacy names
  processJSONFile,
  processMarkdownFile,
  processHTMLFile,
  processJSXFile,
  loadConfig
} from './strategy/index.mts';
