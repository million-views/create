#!/usr/bin/env node

import fs from 'fs/promises';
import { realpathSync } from 'node:fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArguments, validateArguments, generateHelpText, ArgumentError } from './argument-parser.mjs';
import {
  validateAllInputs,
  sanitizeErrorMessage,
  createSecureTempDir,
  ValidationError,
} from '../../lib/shared/security.mjs';
import {
  runAllPreflightChecks,
  PreflightError
} from './preflight-checks.mjs';
import { createEnvironmentObject } from './environment-factory.mjs';
import { CacheManager } from './cache-manager.mjs';
import { TemplateResolver } from './template-resolver.mjs';
import { Logger } from '../../lib/shared/utils/logger.mjs';
import { TemplateDiscovery } from './template-discovery.mjs';
import { DryRunEngine } from './dry-run-engine.mjs';
import { execCommand } from '../../lib/shared/utils/command-utils.mjs';
import { ensureDirectory, safeCleanup, validateDirectoryExists } from '../../lib/shared/utils/fs-utils.mjs';
import { loadSetupScript, createSetupTools, SetupSandboxError } from './setup-runtime.mjs';
import { shouldIgnoreTemplateEntry, createTemplateIgnoreSet } from '../../lib/shared/utils/template-ignore.mjs';
import { loadTemplateMetadataFromPath } from './template-metadata.mjs';
import { normalizeOptions } from './options-processor.mjs';
import { resolvePlaceholders, PlaceholderResolutionError } from './placeholder-resolver.mjs';
import { InteractiveSession } from './interactive-session.mjs';
import { shouldEnterInteractive } from '../../lib/shared/utils/interactive-utils.mjs';
import { loadConfig } from './config-loader.mjs';
import {
  handleError,
  contextualizeError,
  ErrorMessages,
  ErrorContext
} from '../../lib/shared/utils/error-handler.mjs';

// Import validation classes for new schema validation
import { SelectionValidator } from '../../lib/validation/selection-validator.mjs';

// Import template validation functions
import { runTemplateValidation, formatValidationResults, formatValidationResultsAsJson } from './template-validation.mjs';

// Import guided setup workflow
import { GuidedSetupWorkflow } from './guided-setup-workflow.mjs';

// Default configuration
const DEFAULT_REPO = 'million-views/packages';
const SETUP_SCRIPT = '_setup.mjs';
const DEFAULT_AUTHOR_ASSETS_DIR = '__scaffold__';

/**
 * Validate user selections against template constraints using SelectionValidator
 * @param {object} params - Validation parameters
 * @param {string} params.templatePath - Path to template directory
 * @param {string} params.templateName - Name of the template
 * @param {object} params.optionsByDimension - Normalized user options by dimension
 * @param {object} params.metadata - Template metadata
 * @returns {Promise<{valid: boolean, errors: Array, warnings: Array, derived: object}>}
 */
async function validateUserSelections({ templatePath, templateName, optionsByDimension, metadata }) {
  try {
    // Load template.json from template directory
    const templateJsonPath = path.join(templatePath, 'template.json');
    let templateData;

    try {
      templateData = JSON.parse(await fs.readFile(templateJsonPath, 'utf8'));
    } catch (error) {
      // If template.json doesn't exist or is invalid, skip selection validation
      // This maintains backward compatibility with older templates
      return {
        valid: true,
        errors: [],
        warnings: [{
          type: 'COMPATIBILITY_WARNING',
          message: 'Template does not use new schema validation (template.json not found or invalid)',
          path: []
        }],
        derived: {}
      };
    }

    // Create selection object from user choices
    const selectionData = {
      schemaVersion: '1.0.0',
      templateId: templateData.id || `${templateName}/unknown`,
      version: templateData.version || '1.0.0',
      selections: {}
    };

    // Map user options to selection format
    for (const [dimensionName, dimensionValue] of Object.entries(optionsByDimension)) {
      if (dimensionName === 'features') {
        // Features are stored as array
        selectionData.selections[dimensionName] = Array.isArray(dimensionValue) ? dimensionValue : [dimensionValue];
      } else {
        // Other dimensions are stored as single values
        selectionData.selections[dimensionName] = dimensionValue;
      }
    }

    // Add project metadata if available
    if (metadata?.name) {
      selectionData.project = {
        name: metadata.name,
        packageManager: 'npm' // Default, could be enhanced to detect from context
      };
    }

    // Validate selection against template
    const validator = new SelectionValidator();
    // For validation, construct a template object with processed dimensions
    const templateForValidation = {
      ...templateData,
      dimensions: metadata.dimensions
    };
    const result = await validator.validate(selectionData, templateForValidation);

    return result;
  } catch (error) {
    return {
      valid: false,
      errors: [{
        type: 'VALIDATION_ERROR',
        message: `Selection validation failed: ${error.message}`,
        path: []
      }],
      warnings: [],
      derived: {}
    };
  }
}

/**
 * Main entry point for the create-scaffold CLI tool
 * This is a simplified version that only uses the guided workflow
 */
async function main() {
  try {
    // Parse arguments using native Node.js parseArgs
    const args = parseArguments();

    // Handle early exit modes first
    if (args.help) {
      console.log(generateHelpText());
      process.exit(0);
    }

    if (args.listTemplates) {
      const exitCode = await executeListTemplates({
        jsonOutput: Boolean(args.json)
      });
      process.exit(exitCode);
    }

    if (args.validateTemplate) {
      const exitCode = await executeTemplateValidation({
        targetPath: args.validateTemplate,
        jsonOutput: Boolean(args.json)
      });
      process.exit(exitCode);
    }

    // Initialize cache manager and logger
    const cacheManager = new CacheManager();
    const logger = args.logFile ? new Logger(args.logFile) : null;

    // Load configuration if not disabled
    let configMetadata = null;
    try {
      const configResult = await loadConfig({
        cwd: process.cwd(),
        env: process.env,
        skip: Boolean(args.noConfig)
      });

      if (configResult) {
        configMetadata = {
          path: configResult.path,
          providedKeys: [],
          appliedKeys: [],
          author: configResult.defaults?.author ?? null,
          placeholders: Array.isArray(configResult.defaults?.placeholders)
            ? configResult.defaults.placeholders
            : [],
          defaults: configResult.defaults
        };
      }
    } catch (error) {
      // Configuration errors are non-fatal, just log and continue
      if (logger) {
        await logger.logOperation('config_load_error', {
          error: error.message,
          path: error.path
        });
      }
    }

    // Execute the guided workflow - this is now the only execution path
    const workflow = new GuidedSetupWorkflow({
      cacheManager,
      logger,
      configMetadata,
      args
    });

    const result = await workflow.executeWorkflow();

    if (logger) {
      await logger.logOperation('workflow_complete', {
        success: result.success,
        projectDirectory: result.projectDirectory,
        templateUsed: result.templateUsed
      });
    }

    // Exit with appropriate code
    process.exit(result.success ? 0 : 1);

  } catch (error) {
    // Use centralized error handling
    const contextualError = contextualizeError(error, {
      context: ErrorContext.RUNTIME,
      suggestions: [
        'Check the command syntax with --help',
        'Ensure all required arguments are provided',
        'Verify template and repository URLs are correct'
      ]
    });

    handleError(contextualError, { logger: null, operation: 'main_execution' });
  }
}

/**
 * Ensure repository is cached and return the cached path
 */
async function ensureRepositoryCached(repoUrl, branchName, cacheManager, logger, options = {}) {
  const ttlHours = typeof options.ttlHours === 'number' ? options.ttlHours : undefined;

  // Handle local repositories directly without caching
  if (repoUrl.startsWith('/') || repoUrl.startsWith('./') || repoUrl.startsWith('../') || repoUrl.startsWith('~')) {
    const absolutePath = path.resolve(repoUrl);
    await validateDirectoryExists(absolutePath, 'Local repository path');

    if (logger) {
      await logger.logOperation('local_repo_access', {
        repoUrl,
        absolutePath
      });
    }

    return absolutePath;
  }

  const cachedRepoPath = await cacheManager.getCachedRepo(repoUrl, branchName);

  if (cachedRepoPath) {
    if (logger) {
      await logger.logOperation('cache_hit', {
        repoUrl,
        branchName,
        cachedPath: cachedRepoPath
      });
    }
    return cachedRepoPath;
  }

  const { repoHash, repoDir } = cacheManager.resolveRepoDirectory(repoUrl, branchName);
  const priorMetadata = await cacheManager.getCacheMetadata(repoHash);

  if (logger) {
    await logger.logOperation(priorMetadata ? 'cache_refresh' : 'cache_miss', {
      repoUrl,
      branchName,
      cachePath: repoDir
    });
  }

  try {
    const cachePath = await cacheManager.populateCache(repoUrl, branchName, {
      ttlHours
    });

    if (logger) {
      await logger.logOperation('cache_populate_complete', {
        repoUrl,
        branchName,
        cachedPath: cachePath
      });
    }

    return cachePath;
  } catch (error) {
    if (logger) {
      await logger.logError(error, {
        operation: 'cache_population',
        repoUrl,
        branchName
      });
    }
    throw error;
  }
}

async function loadTemplateMetadata(templatePath, logger) {
  try {
    const metadata = await loadTemplateMetadataFromPath(templatePath);

    if (logger) {
      await logger.logOperation('template_metadata', {
        templatePath,
        handoffCount: metadata.handoffSteps.length,
        authoringMode: metadata.authoringMode,
        dimensions: Object.keys(metadata.dimensions)
      });
    }

    return metadata;
  } catch (error) {
    // For CLI usage, validation errors should cause the command to fail
    // Re-throw validation errors instead of swallowing them
    throw error;
  }
}

/**
 * Clone the template repository using cache-aware operations
 */
async function cloneTemplateRepo(repoUrl, branchName, options = {}) {
  const { noCache, cacheTtl, cacheManager, logger } = options;

  if (logger) {
    await logger.logOperation('git_clone_start', {
      repoUrl,
      branchName,
      noCache: !!noCache,
      cacheTtl
    });
  }

  // If cache is disabled, use direct cloning
  if (noCache) {
    // ast-grep-ignore: no-console-log
    console.log('📥 Cloning template repository (cache disabled)...');
    const tempPath = await directCloneRepo(repoUrl, branchName, logger);
    return {
      path: tempPath,
      temporary: true
    };
  }

  // Use cache-aware repository access
  try {
    // ast-grep-ignore: no-console-log
    console.log('📥 Accessing template repository...');
    const cachedPath = await ensureRepositoryCached(
      repoUrl,
      branchName,
      cacheManager,
      logger,
      {
        ttlHours: cacheTtl
      }
    );

    return {
      path: cachedPath,
      temporary: false
    };
  } catch (error) {
    if (logger) {
      await logger.logError(error, {
        operation: 'git_clone_cached',
        repoUrl,
        branchName
      });
    }

    // Provide helpful error messages based on common issues
    const sanitizedErrorMessage = sanitizeErrorMessage(error.message);

    if (error.message.includes('Repository not found')) {
      throw new Error(
        `Repository not found.\n` +
        'Please check that:\n' +
        '  1. The repository exists\n' +
        '  2. You have access to it\n' +
        '  3. Your git credentials are configured correctly'
      );
    } else if (error.message.includes('branch') && branchName) {
      throw new Error(
        `Branch not found in repository.\n` +
        'Please check the branch name and try again.'
      );
    } else if (error.message.includes('Authentication failed') || error.message.includes('403')) {
      throw new Error(
        'Authentication failed.\n' +
        'Please ensure your git credentials are configured correctly.\n' +
        'For private repositories, you need to set up:\n' +
        '  - SSH keys: https://docs.github.com/en/authentication/connecting-to-github-with-ssh\n' +
        '  - Personal Access Token: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token'
      );
    } else if (error.message.includes('timed out')) {
      throw new Error(
        'Git clone operation timed out.\n' +
        'This may be due to:\n' +
        '  • Network connectivity issues\n' +
        '  • Large repository size\n' +
        '  • Repository server being slow or unavailable\n' +
        '  • Firewall or proxy blocking the connection\n\n' +
        'Please check your network connection and try again.'
      );
    } else {
      throw new Error(`Failed to access repository: ${sanitizedErrorMessage}`);
    }
  }
}

/**
 * Direct clone repository (fallback for --no-cache)
 */
async function directCloneRepo(repoUrl, branchName, logger) {
  const tempDir = createSecureTempDir();

  const cloneArgs = ['clone', '--depth', '1'];

  if (branchName) {
    cloneArgs.push('--branch', branchName);
  }

  // Convert user/repo format to full GitHub URL if needed
  let fullRepoUrl;
  if (repoUrl.startsWith('/') || repoUrl.startsWith('.') || repoUrl.startsWith('~')) {
    fullRepoUrl = repoUrl;
  } else if (repoUrl.includes('://')) {
    fullRepoUrl = repoUrl;
  } else {
    fullRepoUrl = `https://github.com/${repoUrl}.git`;
  }

  cloneArgs.push(fullRepoUrl, tempDir);

  try {
    await execCommand('git', cloneArgs, { timeout: 60000, stdio: ['inherit', 'pipe', 'pipe'] });

    if (logger) {
      await logger.logOperation('git_clone_direct', {
        repoUrl,
        branchName,
        tempDir,
        fullRepoUrl
      });
    }
  } catch (error) {
    // Clean up temp directory if clone failed
    await safeCleanup(tempDir);

    if (logger) {
      await logger.logError(error, {
        operation: 'git_clone_direct',
        repoUrl,
        branchName,
        tempDir
      });
    }

    throw error;
  }

  return tempDir;
}

/**
 * Verify that the template subdirectory exists
 */
async function verifyTemplate(templatePath, templateName) {
  try {
    await validateDirectoryExists(templatePath, `Template "${templateName}"`);
  } catch (error) {
    if (error.message.includes('not found')) {
      const templateError = ErrorMessages.templateNotFound(templateName);
      throw templateError;
    }
    const sanitizedMessage = sanitizeErrorMessage(error.message);
    throw new Error(sanitizedMessage);
  }
}

/**
 * Copy template files to project directory
 */
async function copyTemplate(templatePath, projectDirectory, logger, options = {}) {
  // ast-grep-ignore: no-console-log
  console.log('📋 Copying template files...');

  if (logger) {
    await logger.logOperation('file_copy_start', {
      templatePath,
      projectDirectory
    });
  }

  try {
    // Create project directory
    await ensureDirectory(projectDirectory, 0o755, 'project directory');

    // Copy all files from template to project directory
    const ignoreSet = options.ignoreSet ?? createTemplateIgnoreSet();
    await copyRecursive(templatePath, projectDirectory, logger, ignoreSet);

    // Remove .git directory if it exists in the copied template
    const gitDir = path.join(projectDirectory, '.git');
    await safeCleanup(gitDir);

    if (logger) {
      await logger.logOperation('file_copy_complete', {
        templatePath,
        projectDirectory
      });
    }

  } catch (err) {
    if (logger) {
      await logger.logError(err, {
        operation: 'file_copy',
        templatePath,
        projectDirectory
      });
    }

    const sanitizedMessage = sanitizeErrorMessage(err.message);
    throw new Error(`Failed to copy template: ${sanitizedMessage}`);
  }
}

/**
 * Recursively copy directory contents
 */
async function copyRecursive(src, dest, logger, ignoreSet) {
  const entries = await fs.readdir(src, { withFileTypes: true });

  await ensureDirectory(dest, 0o755, 'destination directory');

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (shouldIgnoreTemplateEntry(entry.name, ignoreSet)) {
      continue;
    }

    if (entry.isDirectory()) {
      await copyRecursive(srcPath, destPath, logger, ignoreSet);
    } else {
      await fs.copyFile(srcPath, destPath);

      if (logger) {
        await logger.logFileCopy(srcPath, destPath);
      }
    }
  }
}

/**
 * Stage author-only assets inside the project directory so setup scripts can
 * consume snippets before the directory is removed from the final scaffold.
 */
async function stageAuthorAssets(templatePath, projectDirectory, authorAssetsDir, logger) {
  const normalizedDir = typeof authorAssetsDir === 'string' && authorAssetsDir.trim()
    ? authorAssetsDir.trim()
    : DEFAULT_AUTHOR_ASSETS_DIR;

  const source = path.join(templatePath, normalizedDir);
  let stats;
  try {
    stats = await fs.stat(source);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return;
    }
    throw error;
  }

  if (!stats.isDirectory()) {
    return;
  }

  const destination = path.join(projectDirectory, normalizedDir);
  await fs.cp(source, destination, {
    recursive: true,
    force: true,
    filter: (src) => !shouldIgnoreTemplateEntry(path.basename(src))
  });

  if (logger) {
    await logger.logOperation('author_assets_staged', {
      templatePath,
      projectDirectory,
      authorAssetsDir: normalizedDir
    });
  }
}

/**
 * Remove staged author assets after setup completes so the generated project
 * remains clean.
 */
async function cleanupAuthorAssets(projectDirectory, authorAssetsDir, logger) {
  const normalizedDir = typeof authorAssetsDir === 'string' && authorAssetsDir.trim()
    ? authorAssetsDir.trim()
    : DEFAULT_AUTHOR_ASSETS_DIR;

  const target = path.join(projectDirectory, normalizedDir);
  try {
    await fs.rm(target, { recursive: true, force: true });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return;
    }
    throw error;
  }

  if (logger) {
    await logger.logOperation('author_assets_removed', {
      projectDirectory,
      authorAssetsDir: normalizedDir
    });
  }
}

async function executeTemplateValidation({ targetPath, jsonOutput }) {
  try {
    const result = await runTemplateValidation({ targetPath });

    if (jsonOutput) {
      // ast-grep-ignore: no-console-log
      console.log(formatValidationResultsAsJson(result));
    } else {
      // ast-grep-ignore: no-console-log
      console.log(formatValidationResults(result));
    }

    return result.status === 'fail' ? 1 : 0;
  } catch (error) {
    const message = sanitizeErrorMessage(error?.message ?? String(error));
    console.error(`❌ Template validation error: ${message}`);
    return 1;
  }
}

/**
 * Execute optional setup script if it exists
 */
async function executeSetupScript({ projectDirectory, projectName, ide, options, authoringMode, dimensions = {}, logger, inputs = Object.freeze({}), author = null }) {
  const setupScriptPath = path.join(projectDirectory, SETUP_SCRIPT);

  // Check if setup script exists
  try {
    await fs.access(setupScriptPath);
  } catch {
    // Setup script doesn't exist - this is fine
    return;
  }

  if (logger) {
    await logger.logOperation('setup_script_start', {
      setupScriptPath,
      projectDirectory,
      ide,
      options: options?.raw ?? []
    });
  }

  // eslint-disable-next-line no-unused-vars
  function printPlaceholderSummary(report) {
    if (!Array.isArray(report) || report.length === 0) {
      return;
    }

    // ast-grep-ignore: no-console-log
    console.log('🧩 Placeholder inputs:');
    for (const entry of report) {
      const source = entry.source ?? 'default';
      const sensitive = entry.sensitive === true;
      const valueDisplay = sensitive ? '[redacted]' : formatPlaceholderValue(entry.value);
      const sensitiveNote = sensitive ? ' (sensitive)' : '';
      const valueSuffix = sensitive ? ' [redacted]' : valueDisplay ? ` (${valueDisplay})` : '';
      // ast-grep-ignore: no-console-log
      console.log(`  ${entry.token} ← ${source}${sensitiveNote}${valueSuffix}`);
    }
    // ast-grep-ignore: no-console-log
    console.log('');
  }

  function formatPlaceholderValue(value) {
    if (value === undefined || value === null) {
      return '';
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  // Setup script exists, ensure it gets cleaned up regardless of what happens
  try {
    // ast-grep-ignore: no-console-log
    console.log('⚙️  Running template setup script...');

    // Import and execute the setup script
    const ctx = createEnvironmentObject({
      projectDirectory,
      projectName,
      cwd: process.cwd(),
      ide,
      options,
      authoringMode,
      inputs,
      author
    });

    const tools = await createSetupTools({
      projectDirectory,
      projectName,
      logger,
      context: ctx,
      dimensions
    });

    await loadSetupScript(setupScriptPath, ctx, tools, logger);

    if (logger) {
      await logger.logSetupScript(setupScriptPath, 'success', 'Setup script executed successfully');
    }

  } catch (err) {
    if (logger) {
      await logger.logSetupScript(setupScriptPath, 'failed', err.message);
      await logger.logError(err, {
        operation: 'setup_script_execution',
        setupScriptPath,
        projectDirectory
      });
    }

    let message = err.message;
    if (err instanceof SetupSandboxError) {
      message = err.message;
    } else {
      message = sanitizeErrorMessage(message);
    }

    console.warn(`⚠️  Warning: Setup script execution failed: ${message}`);
    console.warn('Continuing without setup...');
  } finally {
    // Remove the setup script after execution attempt (success or failure)
    try {
      await fs.unlink(setupScriptPath);

      if (logger) {
        await logger.logOperation('setup_script_cleanup', {
          setupScriptPath,
          removed: true
        });
      }
    } catch {
      // Ignore cleanup errors - setup script may have already been removed
      // or there may be permission issues, but we don't want to fail the entire process
      if (logger) {
        await logger.logOperation('setup_script_cleanup', {
          setupScriptPath,
          removed: false,
          reason: 'cleanup_failed'
        });
      }
    }
  }
}



// Run main function when executed directly
const entryPoint = process.argv[1];
if (entryPoint) {
  const modulePath = fileURLToPath(import.meta.url);
  const resolvedEntry = path.resolve(entryPoint);
  let realEntry = resolvedEntry;

  try {
    realEntry = realpathSync(resolvedEntry);
  } catch {
    // Ignore resolution failures; fall back to resolvedEntry comparison below.
  }

  if (modulePath === resolvedEntry || modulePath === realEntry) {
    main();
  }
}