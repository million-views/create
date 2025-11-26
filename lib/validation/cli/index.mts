/**
 * CLI Validation Facade
 *
 * Exports all CLI input validators for command options and parameters.
 *
 * @module lib/validation/cli
 */

// CLI option validators
export {
  ide,
  authoringMode,
  authorAssetsDir,
  logFilePath,
  cacheTtl,
  // Legacy names
  validateIdeParameter,
  validateAuthoringMode,
  validateAuthorAssetsDir,
  validateLogFilePath,
  validateCacheTtl,
  // Constants
  SUPPORTED_IDES,
  AUTHORING_MODES,
  DEFAULT_AUTHOR_ASSETS_DIR
} from './option.mts';

export type { SupportedIde, AuthoringMode } from './option.mts';

// CLI input validators
export {
  repoUrl,
  templateName,
  projectDirectory,
  allInputs,
  // Legacy names
  validateRepoUrl,
  validateTemplateName,
  validateProjectDirectory,
  validateAllInputs
} from './input.mts';

export type { AllInputs, ValidatedInputs } from './input.mts';
