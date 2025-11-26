/**
 * Util Domain Facade
 *
 * Exports utility modules for file, shell, text, path, fs, command, and logging operations.
 *
 * @module lib/util
 */

// File utilities (high-level class)
export { File } from './file.mjs';

// Shell utilities
export { Shell } from './shell.mjs';

// Text utilities
export { Text } from './text.mjs';

// Path resolution utilities
export {
  resolveHomeDirectory,
  resolveM5nvBase,
  resolveCacheDirectory,
  resolveTemplateCacheDirectory,
  resolveUserConfigPath
} from './path.mts';

// File system utilities (low-level functions)
export * as Fs from './fs.mts';

// Command execution utilities
export { execCommand } from './command.mts';
export type { ExecCommandOptions } from './command.mts';

// Logger
export { Logger } from './logger.mjs';
