#!/usr/bin/env node

import fs from 'fs/promises';
import { realpathSync } from 'node:fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArguments, validateArguments, generateHelpText, ArgumentError } from './argumentParser.mjs';
import {
  validateAllInputs,
  sanitizeErrorMessage,
  createSecureTempDir,
  ValidationError,
} from './security.mjs';
import {
  runAllPreflightChecks,
  PreflightError
} from './preflightChecks.mjs';
import { createEnvironmentObject } from './environmentFactory.mjs';
import { CacheManager } from './cacheManager.mjs';
import { Logger } from './logger.mjs';
import { TemplateDiscovery } from './templateDiscovery.mjs';
import { DryRunEngine } from './dryRunEngine.mjs';
import { execCommand } from './utils/commandUtils.mjs';
import { ensureDirectory, safeCleanup, validateDirectoryExists } from './utils/fsUtils.mjs';
import { loadSetupScript, createSetupTools, SetupSandboxError } from './setupRuntime.mjs';
import { shouldIgnoreTemplateEntry, createTemplateIgnoreSet } from './utils/templateIgnore.mjs';
import { loadTemplateMetadataFromPath } from './templateMetadata.mjs';
import { normalizeOptions } from './optionsProcessor.mjs';
import { resolvePlaceholders, PlaceholderResolutionError } from './placeholderResolver.mjs';
import { InteractiveSession } from './interactiveSession.mjs';
import { shouldEnterInteractive } from './utils/interactiveUtils.mjs';
import { loadConfig } from './configLoader.mjs';
import {
  runTemplateValidation,
  formatValidationResults,
  formatValidationResultsAsJson
} from './templateValidation.mjs';

// Default configuration
const DEFAULT_REPO = 'million-views/templates';
const SETUP_SCRIPT = '_setup.mjs';
const DEFAULT_AUTHOR_ASSETS_DIR = '__scaffold__';

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
    let logger = null;

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
      const sanitized = sanitizeErrorMessage(error.message ?? String(error));
      console.error(`❌ Configuration error: ${sanitized}`);
      process.exit(1);
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
      console.error('❌ Error: Invalid arguments\n');
      for (const error of validation.errors) {
        console.error(`  ${error}`);
      }
      console.error('\nUse --help for usage information.');
      process.exit(1);
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
        const sanitizedMessage = sanitizeErrorMessage(error.message);
        console.error(`❌ Error listing templates: ${sanitizedMessage}`);

        if (logger) {
          await logger.logError(error, { operation: 'template_discovery', repoUrl, branchName });
        }

        process.exit(1);
      }

      process.exit(0);
    }

    if (args.dryRun) {
      // Validate required arguments for dry run
      if (!args.projectDirectory || !args.template) {
        console.error('❌ Error: Project directory and --from-template are required for dry run mode\n');
        console.error('Use --help for usage information.');
        process.exit(1);
      }

      const dryRunEngine = new DryRunEngine(cacheManager, logger);
      const repoUrl = args.repo || DEFAULT_REPO;
      const branchName = args.branch;

      try {
        const cachedRepoPath = await ensureRepositoryCached(repoUrl, branchName, cacheManager, logger);

        const preview = await dryRunEngine.previewScaffoldingFromPath(
          cachedRepoPath,
          args.template,
          args.projectDirectory
        );

        const previewOutput = dryRunEngine.displayPreview({
          operations: preview.operations,
          summary: preview.summary,
          templateName: args.template,
          repoUrl,
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
            repoUrl,
            branchName,
            template: args.template,
            projectDirectory: args.projectDirectory,
            operationCount: preview.operations.length,
            summary: preview.summary?.counts || null,
            treePreview: treePreview.available
              ? { available: true }
              : { available: false, reason: treePreview.reason }
          });
        }
      } catch (error) {
        const sanitizedMessage = sanitizeErrorMessage(error.message);
        console.error(`❌ Error in dry run: ${sanitizedMessage}`);

        if (logger) {
          await logger.logError(error, {
            operation: 'dry_run_preview',
            repoUrl,
            branchName,
            template: args.template
          });
        }

        process.exit(1);
      }

      process.exit(0);
    }

    // Perform comprehensive input validation and sanitization
    const validatedInputs = validateAllInputs({
      projectDirectory: args.projectDirectory,
      template: args.template,
      repo: args.repo || DEFAULT_REPO,
      branch: args.branch,
      ide: args.ide,
      options: args.options
    });

    projectDirectory = validatedInputs.projectDirectory;
    const templateName = validatedInputs.template;
    const repoUrl = validatedInputs.repo;
    const branchName = validatedInputs.branch;

    // Extract ide and options from validated arguments
    const ide = validatedInputs.ide ?? null;
    const options = validatedInputs.options ?? [];

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

    // Verify template exists
    const templatePath = path.join(repositoryPath, templateName);
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

    if (error instanceof ArgumentError || error instanceof ValidationError || error instanceof PreflightError) {
      console.error(`\n❌ ${error.message}`);
      process.exit(1);
    } else {
      // Sanitize error messages to prevent information disclosure
      const sanitizedMessage = sanitizeErrorMessage(error.message);
      console.error(`\n❌ Error: ${sanitizedMessage}`);
      process.exit(1);
    }
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
    const sanitized = sanitizeErrorMessage(error.message);
    console.warn(`⚠️  template.json could not be processed: ${sanitized}`);
    if (logger) {
      await logger.logError(error, {
        operation: 'template_metadata_error',
        templatePath
      });
    }
    return {
      raw: null,
      authoringMode: 'wysiwyg',
      authorAssetsDir: DEFAULT_AUTHOR_ASSETS_DIR,
      dimensions: {},
      handoffSteps: [],
      supportedOptions: []
    };
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
      throw new Error(
        `Template not found in the repository.\n` +
        'Please check the template name and try again.'
      );
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
      console.log(formatValidationResultsAsJson(result));
    } else {
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
