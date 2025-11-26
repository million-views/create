/**
 * Util Domain Facade
 *
 * Exports utility modules for file, shell, path, and logging operations.
 *
 * @module lib/util
 */

// File utilities (high-level class)
export { File } from './file.mts';

// Shell utilities
export { Shell } from './shell.mts';

// Path resolution utilities
export {
  resolveHomeDirectory,
  resolveM5nvBase,
  resolveCacheDirectory,
  resolveTemplateCacheDirectory,
  resolveUserConfigPath
} from './path.mts';

// Logger
export { Logger } from './logger.mts';
