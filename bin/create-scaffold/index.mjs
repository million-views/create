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
 * Main function to orchestrate the scaffolding process
 */
async function main() {
  let repositoryPath = null;
  let cleanupRepository = false;
  let projectDirectory = null;
  let projectCreated = false;

  try {
    // Parse arguments using native Node.js parseArgs
    const args = parseArguments();
    const cacheManager = new CacheManager();
    const templateResolver = new TemplateResolver(cacheManager);
    let logger = null;

    // Handle template URL resolution if --template flag is provided
    let templateResolution = null;
    let directTemplatePath = null;
    
    if (args.template) {
      // Check if it's a local template directory path
      if (args.template.startsWith('/') || args.template.startsWith('./') || args.template.startsWith('../')) {
        // Direct path to template directory - validate it exists
        const fs = await import('fs/promises');
        try {
          await fs.access(args.template);
          directTemplatePath = args.template;
        } catch (error) {
          console.error(`❌ Template directory not found: "${args.template}"`);
          process.exit(1);
        }
      } else if (args.template.includes('/') || args.template.includes('://') || args.template.startsWith('registry/')) {
        // This looks like a URL or registry shorthand, use the template resolver
        try {
          templateResolution = await templateResolver.resolveTemplate(args.template, {
            branch: args.branch,
            logger
          });

          // Override repo and template arguments for backward compatibility
          args.repo = null; // Template resolver handles the source
          args.fromTemplate = null; // We'll extract template name from resolved path

          if (logger) {
            await logger.logOperation('template_url_resolution', {
              templateUrl: args.template,
              resolvedPath: templateResolution.templatePath,
              parameters: templateResolution.parameters
            });
          }
        } catch (error) {
          const templateError = ErrorMessages.templateInvalidUrl(args.template, error.message);
          handleError(templateError, { logger, operation: 'template_resolution', exit: true, includeTechnical: true });
        }
      } else {
        // Simple template name - treat as legacy mode
        // args.template remains as-is for legacy validation
      }
    }

    if (args.validateTemplate) {
      const exitCode = await executeTemplateValidation({
        targetPath: args.validateTemplate,
        jsonOutput: Boolean(args.json)
      });
      process.exit(exitCode);
    }

    let configMetadata = null;
    let configDefaults = null;
    let configAuthor = null;
    let configPlaceholders = Object.freeze([]);

    try {
      const configResult = await loadConfig({
        cwd: process.cwd(),
        env: process.env,
        skip: Boolean(args.noConfig)
      });

      if (configResult) {
        configDefaults = configResult.defaults;
        configPlaceholders = Array.isArray(configDefaults.placeholders)
          ? configDefaults.placeholders
          : Object.freeze([]);
        configAuthor = configDefaults.author ?? null;

        const providedKeys = [];
        const appliedKeys = [];

        if (configDefaults.repo !== undefined && configDefaults.repo !== null) {
          providedKeys.push('repo');
          if (args.repo === undefined) {
            args.repo = configDefaults.repo;
            appliedKeys.push('repo');
          }
        }

        if (configDefaults.branch !== undefined && configDefaults.branch !== null) {
          providedKeys.push('branch');
          if (args.branch === undefined) {
            args.branch = configDefaults.branch;
            appliedKeys.push('branch');
          }
        }

        if (configAuthor !== null) {
          providedKeys.push('author');
        }

        if (configPlaceholders.length > 0) {
          providedKeys.push('placeholders');
        }

        configMetadata = {
          path: configResult.path,
          providedKeys,
          appliedKeys,
          author: configAuthor,
          placeholders: configPlaceholders,
          defaults: configDefaults
        };
      }
    } catch (error) {
      const configError = contextualizeError(error, {
        context: ErrorContext.CONFIGURATION,
        userFriendlyMessage: 'Configuration error',
        suggestions: [
          'Check your .m5nvrc configuration file',
          'Ensure the configuration file is valid JSON',
          'Try running without configuration using --no-config'
        ]
      });
      handleError(configError, { logger: null, operation: 'config_loading', exit: true });
    }

    const interactiveDecision = shouldEnterInteractive({
      args,
      env: process.env,
      tty: {
        stdin: Boolean(process.stdin?.isTTY),
        stdout: Boolean(process.stdout?.isTTY)
      }
    });

    const interactiveEvent = {
      triggered: interactiveDecision.enter,
      reason: interactiveDecision.reason,
      status: interactiveDecision.enter ? 'pending' : 'skipped'
    };

    if (interactiveDecision.enter) {
      try {
        const session = new InteractiveSession({
          cacheManager,
          logger,
          defaults: {
            repo: args.repo ?? configDefaults?.repo ?? DEFAULT_REPO,
            branch: args.branch ?? configDefaults?.branch ?? null
          },
          env: process.env,
          configurationProvider: configMetadata
            ? {
                async load() {
                  return {
                    repo: configDefaults?.repo ?? null,
                    branch: configDefaults?.branch ?? null,
                    placeholders: configMetadata?.placeholders ?? []
                  };
                }
              }
            : undefined
        });

        const sessionResult = await session.collectInputs(args);

        if (sessionResult?.cancelled) {
          interactiveEvent.status = 'cancelled';
          // ast-grep-ignore: no-console-log
          console.log('\nℹ️  Interactive session cancelled. No changes were made.');
          return;
        }

        if (sessionResult.projectDirectory !== undefined) {
          args.projectDirectory = sessionResult.projectDirectory;
        }
        if (sessionResult.template !== undefined) {
          args.template = sessionResult.template;
        }
        if (sessionResult.repo !== undefined) {
          args.repo = sessionResult.repo;
        }
        if (sessionResult.branch !== undefined) {
          args.branch = sessionResult.branch || undefined;
        }
        if (sessionResult.ide !== undefined) {
          const ideValue = sessionResult.ide === null || sessionResult.ide === ''
            ? undefined
            : sessionResult.ide;
          args.ide = ideValue;
        }
        if (sessionResult.options !== undefined) {
          const optionsValue = typeof sessionResult.options === 'string' && sessionResult.options.trim().length > 0
            ? sessionResult.options
            : undefined;
          args.options = optionsValue;
        }
        if (sessionResult.logFile !== undefined) {
          const logFileValue = sessionResult.logFile === null || sessionResult.logFile === ''
            ? undefined
            : sessionResult.logFile;
          args.logFile = logFileValue;
        }
        if (sessionResult.noCache !== undefined) {
          args.noCache = Boolean(sessionResult.noCache);
        }
        if (sessionResult.cacheTtl !== undefined) {
          const ttlValue = sessionResult.cacheTtl === null || sessionResult.cacheTtl === ''
            ? undefined
            : sessionResult.cacheTtl;
          args.cacheTtl = ttlValue;
        }
        if (sessionResult.placeholders !== undefined) {
          args.placeholders = Array.isArray(sessionResult.placeholders)
            ? sessionResult.placeholders
            : args.placeholders;
        }
        if (sessionResult.experimentalPlaceholderPrompts !== undefined) {
          args.experimentalPlaceholderPrompts = Boolean(sessionResult.experimentalPlaceholderPrompts);
        }
        if (sessionResult.listTemplates !== undefined) {
          args.listTemplates = Boolean(sessionResult.listTemplates);
        }
        if (sessionResult.dryRun !== undefined) {
          args.dryRun = Boolean(sessionResult.dryRun);
        }

        args.interactive = true;
        args.noInteractive = false;
        interactiveEvent.status = 'completed';
      } catch (error) {
        interactiveEvent.status = 'failed';
        throw error;
      }
    }

    // Validate arguments
    const validation = validateArguments(args);

    // Show help if requested or if validation failed
    if (validation.showHelp || args.help) {
      // ast-grep-ignore: no-console-log
      console.log(generateHelpText());
      process.exit(0);
    }

    // Handle validation errors
    if (!validation.isValid) {
      const errorMessage = validation.errors.length > 0
        ? `Invalid command arguments:\n${validation.errors.map(err => `  • ${err}`).join('\n')}`
        : 'Invalid command arguments';
      const argError = new ArgumentError(errorMessage, {
        suggestions: [
          'Use --help to see correct usage',
          'Check that all required arguments are provided',
          'Verify argument formats match the documentation'
        ]
      });
      handleError(argError, { logger, operation: 'argument_validation', exit: true });
    }

    // Initialize logger if log file is specified
    if (args.logFile) {
      logger = new Logger(args.logFile);
      await logger.logOperation('cli_start', {
        args: args,
        timestamp: new Date().toISOString()
      });
    }

    if (logger) {
      await logger.logOperation('cli_interactive_mode', {
        triggered: interactiveEvent.triggered,
        reason: interactiveEvent.reason,
        status: interactiveEvent.status
      });
    }

    if (configMetadata) {
      if (args.verbose) {
        const appliedSummary = configMetadata.appliedKeys.length > 0
          ? `applied: ${configMetadata.appliedKeys.join(', ')}`
          : 'applied: none';
        // ast-grep-ignore: no-console-log
        console.log(`ℹ️  Using configuration defaults from ${configMetadata.path} (${appliedSummary})`);
      }

      if (logger) {
        await logger.logOperation('config_load', {
          path: configMetadata.path,
          providedKeys: configMetadata.providedKeys,
          appliedKeys: configMetadata.appliedKeys
        });
      }
    }

    // Handle special modes that don't require full scaffolding
    if (args.listTemplates) {
      if (directTemplatePath) {
        // Direct template path - check if it's a template or repo
        const templateDiscovery = new TemplateDiscovery(cacheManager);
        try {
          // Check if this is a template directory or a repo with templates
          const stats = await fs.stat(directTemplatePath);
          if (stats.isDirectory()) {
            // Check if it looks like a template directory
            const isTemplate = await templateDiscovery.isTemplateDirectory(directTemplatePath);
            if (isTemplate) {
              // Show info about this single template
              const metadata = await templateDiscovery.getTemplateMetadata(directTemplatePath);
              // ast-grep-ignore: no-console-log
              console.log(`📋 Template information:\n`);
              // ast-grep-ignore: no-console-log
              console.log(`📦 ${metadata.name}`);
              // ast-grep-ignore: no-console-log
              console.log(`   ${metadata.description}`);
              // ast-grep-ignore: no-console-log
              console.log(`   v${metadata.version}`);
              // ast-grep-ignore: no-console-log
              console.log(`   Path: ${directTemplatePath}`);
            } else {
              // Assume it's a repo directory, list templates
              // ast-grep-ignore: no-console-log
              console.log(`📋 Discovering templates from ${args.template}...\n`);

              const templates = await templateDiscovery.listTemplatesFromPath(directTemplatePath);
              const formattedOutput = templateDiscovery.formatTemplateList(templates);
              // ast-grep-ignore: no-console-log
              console.log(formattedOutput);
            }
          } else {
            console.error(`❌ "${directTemplatePath}" is not a directory`);
            process.exit(1);
          }
        } catch (error) {
          console.error(`❌ Failed to read from "${directTemplatePath}": ${error.message}`);
          process.exit(1);
        }
      } else if (templateResolution) {
        // Template URL provided - list templates from resolved path
        const templateDiscovery = new TemplateDiscovery(cacheManager);
        try {
          // ast-grep-ignore: no-console-log
          console.log(`📋 Discovering templates from ${args.template}...\n`);

          const templates = await templateDiscovery.listTemplatesFromPath(templateResolution.templatePath);
          const formattedOutput = templateDiscovery.formatTemplateList(templates);
          // ast-grep-ignore: no-console-log
          console.log(formattedOutput);

          if (logger) {
            await logger.logOperation('template_discovery', {
              templateUrl: args.template,
              resolvedPath: templateResolution.templatePath,
              templateCount: templates.length,
              templates: templates.map(t => ({ name: t.name, description: t.description }))
            });
          }
        } catch (error) {
          const listError = contextualizeError(error, {
            context: ErrorContext.TEMPLATE,
            userFriendlyMessage: `Failed to list templates from "${args.template}"`,
            suggestions: [
              'Check that the template URL is correct',
              'Ensure the repository is accessible',
              'Try with --no-cache to refresh cached data'
            ]
          });
          handleError(listError, { logger, operation: 'template_discovery', exit: true });
        }
      } else {
        // Legacy repo + template mode
        const templateDiscovery = new TemplateDiscovery(cacheManager);
        const repoUrl = args.repo || DEFAULT_REPO;
        const branchName = args.branch;

        try {
          // ast-grep-ignore: no-console-log
          console.log(`📋 Discovering templates from ${repoUrl}${branchName ? ` (${branchName})` : ''}...\n`);

          // First ensure repository is cached by attempting to clone it
          const cachedRepoPath = await ensureRepositoryCached(repoUrl, branchName, cacheManager, logger);

          const templates = await templateDiscovery.listTemplatesFromPath(cachedRepoPath);
          const formattedOutput = templateDiscovery.formatTemplateList(templates);
          // ast-grep-ignore: no-console-log
          console.log(formattedOutput);

          if (logger) {
            await logger.logOperation('template_discovery', {
              repoUrl,
              branchName,
              templateCount: templates.length,
              templates: templates.map(t => ({ name: t.name, description: t.description }))
            });
          }
        } catch (error) {
          const listError = contextualizeError(error, {
            context: ErrorContext.TEMPLATE,
            userFriendlyMessage: 'Error listing templates',
            suggestions: [
              'Check repository URL and branch',
              'Ensure repository is accessible',
              'Try with --no-cache to refresh cached data'
            ]
          });
          handleError(listError, { logger, operation: 'template_discovery', exit: true });
        }
      }

      process.exit(0);
    }

    if (args.dryRun) {
      // Validate required arguments for dry run
      if (!args.projectDirectory) {
        console.error('❌ Error: Project directory is required for dry run mode\n');
        console.error('Use --help for usage information.');
        process.exit(1);
      }

      // Check template argument based on mode
      if (directTemplatePath) {
        // Direct template path mode - template path is already validated
      } else if (templateResolution) {
        // Template URL mode - already resolved
      } else {
        // Legacy mode - require template name
        if (!args.template) {
          console.error('❌ Error: --from-template is required for dry run mode\n');
          console.error('Use --help for usage information.');
          process.exit(1);
        }
      }

      const dryRunEngine = new DryRunEngine(cacheManager, logger);

      let dryRunTemplatePath;
      let dryRunTemplateName;
      let dryRunRepoUrl;
      let dryRunBranchName;

      if (directTemplatePath) {
        // Direct template path mode
        dryRunTemplatePath = directTemplatePath;
        dryRunTemplateName = path.basename(directTemplatePath);
        dryRunRepoUrl = null;
        dryRunBranchName = null;
      } else if (templateResolution) {
        // Template URL mode
        dryRunTemplatePath = templateResolution.templatePath;
        dryRunTemplateName = path.basename(templateResolution.templatePath);
        dryRunRepoUrl = args.template;
        dryRunBranchName = args.branch;
      } else {
        // Legacy mode
        const repoUrl = args.repo || DEFAULT_REPO;
        const branchName = args.branch;
        dryRunRepoUrl = repoUrl;
        dryRunBranchName = branchName;
        dryRunTemplateName = args.template;

        const cachedRepoPath = await ensureRepositoryCached(repoUrl, branchName, cacheManager, logger);
        dryRunTemplatePath = path.join(cachedRepoPath, args.template);
      }

      try {
        // Load template metadata for validation
        await verifyTemplate(dryRunTemplatePath, dryRunTemplateName);
        const metadata = await loadTemplateMetadata(dryRunTemplatePath, logger);

        // Validate options against template dimensions (same as normal execution)
        const validatedInputs = validateAllInputs({
          projectDirectory: args.projectDirectory,
          template: dryRunTemplateName,
          repo: templateResolution ? null : dryRunRepoUrl, // Don't validate registry URLs as repo URLs
          branch: dryRunBranchName,
          ide: args.ide ?? null,
          options: args.options
        });

        const options = validatedInputs.options ?? [];
        const normalizedOptionResult = normalizeOptions({
          rawTokens: options,
          dimensions: metadata.dimensions
        });

        if (normalizedOptionResult.unknown.length > 0) {
          throw new ValidationError(
            `Template "${dryRunTemplateName}" does not support: ${normalizedOptionResult.unknown.join(', ')}`,
            'options'
          );
        }

        for (const warning of normalizedOptionResult.warnings) {
          console.warn(`⚠️  ${warning}`);
        }

        const optionsByDimension = { ...normalizedOptionResult.byDimension };
        if (validatedInputs.ide && metadata.dimensions.ide && metadata.dimensions.ide.type === 'single') {
          optionsByDimension.ide = validatedInputs.ide;
        }

        // Validate user selections against template constraints
        const selectionValidationResult = await validateUserSelections({
          templatePath: dryRunTemplatePath,
          templateName: dryRunTemplateName,
          optionsByDimension,
          metadata
        });

        if (!selectionValidationResult.valid) {
          // Format validation errors for display
          const errorMessages = selectionValidationResult.errors.map(error => {
            let message = error.message;
            if (error.path && error.path.length > 0) {
              message += ` (path: ${error.path.join('.')})`;
            }
            return message;
          });

          throw new ValidationError(
            `Selection validation failed:\n${errorMessages.map(msg => `  • ${msg}`).join('\n')}`,
            'selection'
          );
        }

        // Log warnings for non-blocking issues
        for (const warning of selectionValidationResult.warnings) {
          console.warn(`⚠️  ${warning.message}`);
        }

        const preview = await dryRunEngine.previewScaffoldingFromPath(
          path.dirname(dryRunTemplatePath),
          path.basename(dryRunTemplatePath),
          args.projectDirectory
        );

        const previewOutput = dryRunEngine.displayPreview({
          operations: preview.operations,
          summary: preview.summary,
          templateName: dryRunTemplateName,
          repoUrl: dryRunRepoUrl,
          projectDir: args.projectDirectory,
          templatePath: preview.templatePath
        });

        // ast-grep-ignore: no-console-log
        console.log(previewOutput);

        const treePreview = await dryRunEngine.generateTreePreview(preview.templatePath, preview.ignoreSet);
        if (treePreview.available && treePreview.output) {
          // ast-grep-ignore: no-console-log
          console.log('🌲 Template structure (depth 2):');
          // ast-grep-ignore: no-console-log
          console.log(`${treePreview.output}\n`);
        } else {
          // ast-grep-ignore: no-console-log
          console.log(`🌲 Tree preview unavailable: ${treePreview.reason}\n`);
        }

        // ast-grep-ignore: no-console-log
        console.log('✅ Dry run completed - no actual changes were made');

        if (logger) {
          await logger.logOperation('dry_run_preview', {
            repoUrl: dryRunRepoUrl,
            branchName: dryRunBranchName,
            template: dryRunTemplateName,
            projectDirectory: args.projectDirectory,
            operationCount: preview.operations.length,
            summary: preview.summary?.counts || null,
            treePreview: treePreview.available
              ? { available: true }
              : { available: false, reason: treePreview.reason }
          });
        }
      } catch (error) {
        const dryRunError = contextualizeError(error, {
          context: ErrorContext.RUNTIME,
          userFriendlyMessage: `Dry run failed: ${error.message}`,
          suggestions: [
            'Check template configuration and options',
            'Run without --dry-run to see more detailed errors',
            'Verify template exists and is accessible'
          ]
        });
        handleError(dryRunError, { logger, operation: 'dry_run', exit: true });
      }

      process.exit(0);
    }

    // Perform comprehensive input validation and sanitization
    let validatedInputs;
    let templatePath;
    let templateName;
    let repoUrl;
    let branchName;

    if (directTemplatePath) {
      // Direct template directory path mode
      validatedInputs = validateAllInputs({
        projectDirectory: args.projectDirectory,
        template: path.basename(directTemplatePath), // Use directory name as template name
        repo: null, // Not applicable for direct path mode
        branch: args.branch,
        ide: args.ide,
        options: args.options
      });

      templatePath = directTemplatePath;
      templateName = path.basename(templatePath);
      repoUrl = null; // No repository for direct paths
      branchName = null; // No branch for direct paths
    } else if (templateResolution) {
      // Template URL mode - use resolved template
      validatedInputs = validateAllInputs({
        projectDirectory: args.projectDirectory,
        template: path.basename(templateResolution.templatePath), // Use directory name as template name
        repo: null, // Not applicable for URL mode
        branch: args.branch,
        ide: args.ide,
        options: args.options
      });

      templatePath = templateResolution.templatePath;
      templateName = path.basename(templatePath);
      repoUrl = args.template; // Use the original URL for display
      branchName = args.branch;
    } else {
      // Legacy repo + template mode
      validatedInputs = validateAllInputs({
        projectDirectory: args.projectDirectory,
        template: args.template,
        repo: args.repo || DEFAULT_REPO,
        branch: args.branch,
        ide: args.ide,
        options: args.options
      });

      templateName = validatedInputs.template;
      repoUrl = validatedInputs.repo;
      branchName = validatedInputs.branch;
    }

    projectDirectory = validatedInputs.projectDirectory;

    // Extract ide and options from validated arguments
    const ide = validatedInputs.ide ?? null;
    const options = validatedInputs.options ?? [];

    // Handle repository setup based on mode
    let repositoryPath = null;
    let cleanupRepository = false;

    if (directTemplatePath) {
      // Direct template directory path mode - no repository setup needed
      repositoryPath = null;
      cleanupRepository = false;

      // ast-grep-ignore: no-console-log
      console.log(`\n🚀 Creating project: ${projectDirectory}`);
      // ast-grep-ignore: no-console-log
      console.log(`📦 Template: ${templateName}`);
      // ast-grep-ignore: no-console-log
      console.log(`📁 Template path: ${directTemplatePath}`);
      // ast-grep-ignore: no-console-log
      console.log('');
    } else if (templateResolution) {
      // Template URL mode - template is already resolved
      repositoryPath = path.dirname(templatePath);
      cleanupRepository = false; // Template resolver handles caching

      // ast-grep-ignore: no-console-log
      console.log(`\n🚀 Creating project: ${projectDirectory}`);
      // ast-grep-ignore: no-console-log
      console.log(`📦 Template: ${templateName}`);
      // ast-grep-ignore: no-console-log
      console.log(`🔗 Template URL: ${repoUrl}`);
      if (branchName) {
        // ast-grep-ignore: no-console-log
        console.log(`🌿 Branch: ${branchName}`);
      }
      // ast-grep-ignore: no-console-log
      console.log('');
    } else {
      // Legacy repo + template mode - need to clone/setup repository
      // Run comprehensive preflight checks
      await runAllPreflightChecks(args, repoUrl);

      // ast-grep-ignore: no-console-log
      console.log(`\n🚀 Creating project: ${projectDirectory}`);
      // ast-grep-ignore: no-console-log
      console.log(`📦 Template: ${templateName}`);
      // ast-grep-ignore: no-console-log
      console.log(`📁 Repository: ${repoUrl}`);
      if (branchName) {
        // ast-grep-ignore: no-console-log
        console.log(`🌿 Branch: ${branchName}`);
      }
      // ast-grep-ignore: no-console-log
      console.log('');

      // Clone the template repository using cache-aware operations
      const cloneResult = await cloneTemplateRepo(repoUrl, branchName, {
        noCache: args.noCache,
        cacheTtl: args.cacheTtl ? parseInt(args.cacheTtl) : undefined,
        cacheManager,
        logger
      });
      repositoryPath = cloneResult.path;
      cleanupRepository = cloneResult.temporary;

      // For legacy mode, construct template path
      templatePath = path.join(repositoryPath, templateName);
    }

    // Verify template exists and load metadata
    await verifyTemplate(templatePath, templateName);
    const metadata = await loadTemplateMetadata(templatePath, logger);

    const placeholderDefinitions = Array.isArray(metadata.placeholders) ? metadata.placeholders : [];
    let resolvedPlaceholderInputs = Object.freeze({});
    let placeholderReport = [];

    if (placeholderDefinitions.length > 0) {
      if (!args.experimentalPlaceholderPrompts) {
        const overridesNotice = args.placeholders.length > 0
          ? ' Placeholder overrides provided on the command line were ignored.'
          : '';
        // ast-grep-ignore: no-console-log
        console.log(`ℹ️  Template declares placeholders. Re-run with --experimental-placeholder-prompts to configure these values. Current run will skip placeholder resolution.${overridesNotice}`);
      } else {
        try {
          const resolution = await resolvePlaceholders({
            definitions: placeholderDefinitions,
            flagInputs: args.placeholders,
            configDefaults: configMetadata?.placeholders ?? [],
            env: process.env,
            interactive: process.stdout.isTTY && process.stdin.isTTY,
            noInputPrompts: args.noInputPrompts
          });

          resolvedPlaceholderInputs = resolution.values;
          placeholderReport = resolution.report;

          if (resolution.unknownTokens.length > 0) {
            console.warn(`⚠️  Ignored unknown placeholders: ${resolution.unknownTokens.join(', ')}`);
          }

          if (args.verbose && placeholderReport.length > 0) {
            printPlaceholderSummary(placeholderReport);
          }

          if (logger) {
            await logger.logOperation('placeholder_resolution', {
              enabled: true,
              placeholders: placeholderReport.map(entry => ({
                token: entry.token,
                source: entry.source,
                sensitive: entry.sensitive,
                value: entry.sensitive ? '[REDACTED]' : entry.value
              })),
              unknownTokens: resolution.unknownTokens
            });
          }
        } catch (error) {
          if (error instanceof PlaceholderResolutionError) {
            throw new ValidationError(error.message, 'metadata.placeholders');
          }
          throw error;
        }
      }
    }

    const normalizedOptionResult = normalizeOptions({
      rawTokens: options,
      dimensions: metadata.dimensions
    });

    if (normalizedOptionResult.unknown.length > 0) {
      throw new ValidationError(
        `Template "${templateName}" does not support: ${normalizedOptionResult.unknown.join(', ')}`,
        'options'
      );
    }

    for (const warning of normalizedOptionResult.warnings) {
      console.warn(`⚠️  ${warning}`);
    }

    if (logger && normalizedOptionResult.warnings.length > 0) {
      await logger.logOperation('template_option_warnings', {
        template: templateName,
        warnings: normalizedOptionResult.warnings
      });
    }

    const optionsByDimension = { ...normalizedOptionResult.byDimension };
    if (ide && metadata.dimensions.ide && metadata.dimensions.ide.type === 'single') {
      optionsByDimension.ide = ide;
    }

    const optionsPayload = {
      raw: options,
      byDimension: optionsByDimension
    };

    // Validate user selections against template constraints
    const selectionValidationResult = await validateUserSelections({
      templatePath,
      templateName,
      optionsByDimension,
      metadata
    });

    if (!selectionValidationResult.valid) {
      // Format validation errors for display
      const errorMessages = selectionValidationResult.errors.map(error => {
        let message = error.message;
        if (error.path && error.path.length > 0) {
          message += ` (path: ${error.path.join('.')})`;
        }
        return message;
      });

      throw new ValidationError(
        `Selection validation failed:\n${errorMessages.map(msg => `  • ${msg}`).join('\n')}`,
        'selection'
      );
    }

    // Log warnings for non-blocking issues
    for (const warning of selectionValidationResult.warnings) {
      console.warn(`⚠️  ${warning.message}`);
    }

    if (logger && selectionValidationResult.warnings.length > 0) {
      await logger.logOperation('selection_validation_warnings', {
        template: templateName,
        warnings: selectionValidationResult.warnings
      });
    }

    const inputsPayload = placeholderDefinitions.length > 0 && args.experimentalPlaceholderPrompts
      ? resolvedPlaceholderInputs
      : Object.freeze({});

    // Copy template to project directory (skip author assets + internal artifacts)
    const ignoreSet = createTemplateIgnoreSet({
      authorAssetsDir: metadata.authorAssetsDir ?? DEFAULT_AUTHOR_ASSETS_DIR
    });

    await copyTemplate(templatePath, projectDirectory, logger, { ignoreSet });
    projectCreated = true;

    await stageAuthorAssets(templatePath, projectDirectory, metadata.authorAssetsDir, logger);

    // Clean up temp directory after successful copy
    if (cleanupRepository) {
      await safeCleanup(repositoryPath);
      repositoryPath = null;
      cleanupRepository = false;
    }

    // Execute setup script if it exists
    let setupError = null;
    try {
      await executeSetupScript({
        projectDirectory,
        projectName: projectDirectory,
        ide,
        options: optionsPayload,
        authoringMode: metadata.authoringMode,
        dimensions: metadata.dimensions,
        logger,
        inputs: inputsPayload,
        author: configAuthor
      });
    } catch (error) {
      setupError = error;
    }

    try {
      await cleanupAuthorAssets(projectDirectory, metadata.authorAssetsDir, logger);
    } catch (error) {
      const sanitized = sanitizeErrorMessage(error.message);
      console.warn(`⚠️  Failed to remove author asset directory: ${sanitized}`);
      if (logger) {
        await logger.logError(error, {
          operation: 'author_assets_cleanup',
          projectDirectory,
          authorAssetsDir: metadata.authorAssetsDir ?? DEFAULT_AUTHOR_ASSETS_DIR
        });
      }
    }

    if (setupError) {
      throw setupError;
    }

    // ast-grep-ignore: no-console-log
    console.log('\n✅ Project created successfully!');
    // ast-grep-ignore: no-console-log
    console.log(`\n📂 Next steps:`);
    // ast-grep-ignore: no-console-log
    console.log(`  cd ${projectDirectory}`);

    const resolvedHandoff = metadata.handoffSteps.length > 0
      ? metadata.handoffSteps
      : ['Review README.md for additional instructions'];

    for (const step of resolvedHandoff) {
      // ast-grep-ignore: no-console-log
      console.log(`  - ${step}`);
    }

    // ast-grep-ignore: no-console-log
    console.log('');

    if (logger) {
      await logger.logOperation('handoff_instructions', {
        projectDirectory,
        instructions: resolvedHandoff
      });
    }

  } catch (error) {
    // Clean up resources on any error
    if (cleanupRepository && repositoryPath) {
      await safeCleanup(repositoryPath);
    }

    // Clean up partially created project directory if it was created but process failed
    if (projectCreated && projectDirectory) {
      await safeCleanup(projectDirectory);
    }

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
