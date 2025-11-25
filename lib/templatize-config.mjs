/**
 * Templatization Config - Re-export shim for backward compatibility
 *
 * This file re-exports from the templatize domain.
 * New code should import from lib/templatize/index.mts.
 *
 * @deprecated Import from './templatize/index.mts' instead
 * @module lib/templatize-config
 */

export {
  DEFAULT_CONFIG,
  loadConfig,
  loadConfigFromFile,
  validateConfig,
  filterPatternsByContext,
  generateConfigFile,
  getPatternsForFile
} from './templatize/strategy/config.mjs';
