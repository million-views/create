#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import {
  ValidationError
} from '../../../lib/shared/security.mjs';
import { CacheManager } from '../cache-manager.mjs';
import { TemplateResolver } from '../template-resolver.mjs';
import { Logger } from '../../../lib/shared/utils/logger.mjs';
import { DryRunEngine } from '../dry-run-engine.mjs';
import { execCommand } from '../../../lib/shared/utils/command-utils.mjs';
import { validateDirectoryExists } from '../../../lib/shared/utils/fs-utils.mjs';
import { createTemplateIgnoreSet, stripIgnoredFromTree } from '../../../lib/shared/utils/template-ignore.mjs';
import { loadTemplateMetadataFromPath } from '../../../lib/shared/utils/template-discovery.mjs';
import { normalizeOptions } from '../options-processor.mjs';
import { resolvePlaceholders } from '../placeholder-resolver.mjs';
import { loadConfig } from '../config-loader.mjs';
import {
  handleError,
  contextualizeError,
  ErrorContext
} from '../../../lib/shared/utils/error-handler.mjs';

// Import guided setup workflow
import { GuidedSetupWorkflow } from '../guided-setup-workflow.mjs';

// Import terminology
import { TERMINOLOGY } from '../../../../create/lib/shared/ontology.mjs';

const DEFAULT_REPO = 'million-views/packages';

/**
 * Execute the 'new' command - create a new project from a template
 */
export async function executeNewCommand(args) {
  // const logger = Logger.getInstance(); // Not needed - use Logger.getInstance() directly

  try {
    // Load configuration early for early exit modes that might need it
    let configMetadata = null;
    try {
      const configResult = await loadConfig({
        cwd: process.cwd(),
        env: process.env,
        skip: Boolean(args[TERMINOLOGY.OPTION.NO_CONFIG])
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
      // For other modes, just log and continue
      console.error(`Warning: Failed to load configuration: ${error.message}`);
    }

    // Initialize cache manager and logger
    const cacheManager = new CacheManager();
    const logger = args[TERMINOLOGY.OPTION.LOG_FILE] ? new Logger('file', 'info', args[TERMINOLOGY.OPTION.LOG_FILE]) : Logger.getInstance();

    // Template resolution logic - handle different template input types
    let templatePath, templateName, repoUrl, branchName, metadata;
    let _allowFallback = false;

    // First, check if the template is a registry alias and resolve it
    let resolvedTemplate = args[TERMINOLOGY.OPTION.TEMPLATE];
    if (args[TERMINOLOGY.OPTION.TEMPLATE] && !args[TERMINOLOGY.OPTION.TEMPLATE].includes('://') && !args[TERMINOLOGY.OPTION.TEMPLATE].startsWith('/') && !args[TERMINOLOGY.OPTION.TEMPLATE].startsWith('./') && !args[TERMINOLOGY.OPTION.TEMPLATE].startsWith('../')) {
      const tempResolver = new TemplateResolver(cacheManager, configMetadata);
      resolvedTemplate = tempResolver.resolveRegistryAlias(args[TERMINOLOGY.OPTION.TEMPLATE]);
    }

    // Validate template for security issues before processing
    if (args[TERMINOLOGY.OPTION.TEMPLATE]) {
      // Check for injection characters
      if (args[TERMINOLOGY.OPTION.TEMPLATE].includes('\0')) {
        handleError(new ValidationError('Template contains null bytes', 'template'), { operation: 'template_validation', exit: true });
      }
      if (args[TERMINOLOGY.OPTION.TEMPLATE].includes(';') || args[TERMINOLOGY.OPTION.TEMPLATE].includes('|') ||
          args[TERMINOLOGY.OPTION.TEMPLATE].includes('&') || args[TERMINOLOGY.OPTION.TEMPLATE].includes('`') ||
          args[TERMINOLOGY.OPTION.TEMPLATE].includes('$(') || args[TERMINOLOGY.OPTION.TEMPLATE].includes('${')) {
        handleError(new ValidationError('Template not accessible', 'template'), { operation: 'template_validation', exit: true });
      }
    }

    if (args[TERMINOLOGY.OPTION.TEMPLATE]) {
      // Process template URL
      // Handle different template input types
      if (args[TERMINOLOGY.OPTION.TEMPLATE].startsWith('/') || args[TERMINOLOGY.OPTION.TEMPLATE].startsWith('./') || args[TERMINOLOGY.OPTION.TEMPLATE].startsWith('../') ||
          resolvedTemplate.startsWith('/') || resolvedTemplate.startsWith('./') || resolvedTemplate.startsWith('../')) {
        console.error('DEBUG: Taking local path branch');
        // Direct template directory path - validate for security (prevent path traversal)
        const templateToUse = (resolvedTemplate.startsWith('/') || resolvedTemplate.startsWith('./') || resolvedTemplate.startsWith('../'))
          ? resolvedTemplate
          : args[TERMINOLOGY.OPTION.TEMPLATE];
        if (templateToUse.includes('..')) {
          handleError(new ValidationError('Path traversal attempts are not allowed in template paths', 'template'), { operation: 'template_validation', exit: true });
        }
        templatePath = templateToUse;
        templateName = path.basename(templateToUse);
        repoUrl = path.dirname(templateToUse);
        branchName = null;
        _allowFallback = false; // Local paths should not fallback
      } else if (resolvedTemplate.includes('://') || resolvedTemplate.includes('#') || resolvedTemplate.includes('/')) {
        // Template URL, URL with branch syntax, or repo/template shorthand - use TemplateResolver
        const templateResolver = new TemplateResolver(cacheManager, configMetadata);
        const templateResolution = await templateResolver.resolveTemplate(resolvedTemplate, {
          branch: args[TERMINOLOGY.OPTION.BRANCH],
          logger
        });
        templatePath = templateResolution.templatePath;
        templateName = path.basename(templatePath);
        repoUrl = resolvedTemplate;
        branchName = args[TERMINOLOGY.OPTION.BRANCH];
        _allowFallback = false; // URLs and repo/template specs should not fallback
      } else {
        console.error('DEBUG: Taking repository shorthand branch');
        // Repository shorthand - assume it's a template name in default repo
        const repoUrlResolved = args.repo || DEFAULT_REPO;
        const branchNameResolved = args[TERMINOLOGY.OPTION.BRANCH];
        const cachedRepoPath = await ensureRepositoryCached(
          repoUrlResolved,
          branchNameResolved,
          cacheManager,
          logger,
          { ttlHours: args[TERMINOLOGY.OPTION.CACHE_TTL] }
        );
        templatePath = path.join(cachedRepoPath, args[TERMINOLOGY.OPTION.TEMPLATE]);
        templateName = args[TERMINOLOGY.OPTION.TEMPLATE];
        repoUrl = repoUrlResolved;
        branchName = branchNameResolved;
        _allowFallback = true; // Repository templates should fallback
      }
    } else {
      // No template specified - this will be handled by the guided workflow
      templatePath = null;
      templateName = null;
      repoUrl = args.repo || DEFAULT_REPO;
      branchName = args[TERMINOLOGY.OPTION.BRANCH];
      _allowFallback = true; // No template specified should allow fallback
    }

    // Load template metadata if we have a template path
    if (templatePath) {
      metadata = await loadTemplateMetadata(templatePath, logger);
    }

    // Prepare options and placeholders
    let options = {};
    let placeholders = {};

    if (args.options && metadata) {
      const normalizedOptionResult = normalizeOptions({
        rawTokens: Array.isArray(args.options) ? args.options : [args.options],
        dimensions: metadata.dimensions
      });
      options = normalizedOptionResult.byDimension;
    }

    if (args[TERMINOLOGY.OPTION.PLACEHOLDER] && args[TERMINOLOGY.OPTION.EXPERIMENTAL_PLACEHOLDER_PROMPTS] && metadata) {
      const placeholderDefinitions = Array.isArray(metadata.placeholders) ? metadata.placeholders : [];
      if (placeholderDefinitions.length > 0) {
        const resolution = await resolvePlaceholders({
          definitions: placeholderDefinitions,
          flagInputs: args[TERMINOLOGY.OPTION.PLACEHOLDER],
          configDefaults: configMetadata?.placeholders ?? [],
          env: process.env,
          interactive: false,
          noInputPrompts: args[TERMINOLOGY.OPTION.NO_INPUT_PROMPTS]
        });
        placeholders = resolution.values;
      }
    }

    // Handle dry-run mode
    if (args[TERMINOLOGY.OPTION.DRY_RUN]) {
      if (!templatePath || !templateName) {
        throw new Error(`--${TERMINOLOGY.OPTION.DRY_RUN} requires a template to be specified`);
      }

      const dryRunEngine = new DryRunEngine(cacheManager, logger);
      let preview;

      // Check if this is a local template directory (templatePath is set and repoUrl is local)
      if (templatePath && repoUrl && (repoUrl.startsWith('/') || repoUrl.startsWith('./') || repoUrl.startsWith('../') || repoUrl === '.')) {
        // For local template directories, use previewScaffoldingFromPath directly
        preview = await dryRunEngine.previewScaffoldingFromPath(templatePath, args.projectDirectory);
      } else if (repoUrl) {
        // Otherwise, use previewScaffolding for remote repositories
        preview = await dryRunEngine.previewScaffolding(repoUrl, branchName || 'main', templateName, args.projectDirectory);
      } else {
        // For local template paths without repoUrl, use previewScaffoldingFromPath
        const repoPath = path.dirname(templatePath);
        preview = await dryRunEngine.previewScaffoldingFromPath(repoPath, templateName, args.projectDirectory);
      }

      // Display preview output
      logger.info('🔍 DRY RUN - Preview Mode');
      logger.info('================================');
      logger.info(`Template: ${templateName}`);
      logger.info(`Source: ${repoUrl}${branchName ? ` (${branchName})` : ''}`);
      logger.info(`Target: ${args.projectDirectory}`);
      logger.info('');

      logger.info('📋 Operations Preview:');
      logger.info(`• Files: ${preview.summary.fileCount}`);
      logger.info(`• Directories: ${preview.summary.directoryCount}`);
      logger.info(`• Total operations: ${preview.operations.length}`);
      logger.info('');

      if (preview.operations.length > 0) {
        logger.info('File Operations:');
        // Group operations by type
        const fileOps = preview.operations.filter(op => op.type === 'file_copy');
        const dirOps = preview.operations.filter(op => op.type === 'directory_create');

        if (dirOps.length > 0) {
          logger.info('• Directory Creation:');
          for (const op of dirOps.slice(0, 5)) { // Show first 5
            logger.info(`  • ${op.relativePath}`);
          }
          if (dirOps.length > 5) {
            logger.info(`  ... and ${dirOps.length - 5} more directories`);
          }
        }

        if (fileOps.length > 0) {
          logger.info('• File Copy:');
          // Group by directory for readability
          const byDir = {};
          for (const op of fileOps) {
            const dir = path.dirname(op.relativePath);
            if (!byDir[dir]) byDir[dir] = [];
            byDir[dir].push(path.basename(op.relativePath));
          }

          for (const [dir, files] of Object.entries(byDir)) {
            logger.info(`  • ./${dir}/ (${files.length} files)`);
          }
        }
      }

      // Check for tree command availability
      const treeCommand = process.env.CREATE_SCAFFOLD_TREE_COMMAND || 'tree';
      try {
        if (treeCommand === 'tree') {
          await execCommand(treeCommand, ['--version'], { stdio: 'pipe' });
        } else if (treeCommand.endsWith('.js') || treeCommand.endsWith('.mjs')) {
          // For JS files, check if file exists
          await fs.access(treeCommand, fs.constants.F_OK);
        } else {
          // For other commands, check if they exist
          await execCommand('which', [treeCommand], { stdio: 'pipe' });
        }
        // Tree command available, show tree preview
        logger.info('');
        logger.info('Directory Structure Preview:');
        logger.info('-----------------------------');
        let treeCmd, treeArgs;
        if (treeCommand === 'tree') {
          treeCmd = treeCommand;
          treeArgs = ['-a', '-I', '.git', templatePath];
        } else if (treeCommand.endsWith('.js') || treeCommand.endsWith('.mjs')) {
          // For JavaScript tree commands, execute with node
          treeCmd = 'node';
          treeArgs = [treeCommand, templatePath];
        } else {
          // For other custom tree commands, execute directly
          treeCmd = treeCommand;
          treeArgs = [treeCommand, templatePath];
        }
        const treeResult = await execCommand(treeCmd, treeArgs, { stdio: 'pipe' });
        const ignoreSet = createTemplateIgnoreSet();
        const filteredTreeResult = stripIgnoredFromTree(treeResult, ignoreSet);
        logger.info(filteredTreeResult);
      } catch {
        logger.info('');
        logger.info(`Note: Tree command (${treeCommand}) is unavailable for directory structure preview`);
      }

      logger.info('');
      logger.info('✅ Dry run completed - no files were created or modified');

      // Wait for any pending log writes to complete
      if (logger) {
        await logger.writeQueue;
      }

      return 0; // Exit dry-run mode without creating project
    }

    // Execute the guided workflow with all resolved parameters
    // Always use guided workflow as the default
    console.error('DEBUG: About to call workflow for project:', args.projectDirectory, 'template:', templatePath);
    console.error('DEBUG: Template path exists:', !!templatePath);
    console.error('DEBUG: Project directory:', args.projectDirectory);
    console.error('DEBUG: NODE_ENV:', process.env.NODE_ENV);
    console.error('DEBUG: About to create GuidedSetupWorkflow with:', {
      projectDirectory: args.projectDirectory,
      templatePath,
      templateName,
      options: !!options,
      placeholders: !!placeholders,
      metadata: !!metadata
    });
    const workflow = new GuidedSetupWorkflow({
      cacheManager,
      logger,
      promptAdapter: process.env.NODE_ENV === 'test' || !process.stdin.isTTY ? {
        write: (text) => process.stderr.write(text),
        question: async (question) => {
          // In test/non-interactive mode, provide default answers
          if (question.includes('project name') || question.includes('Project name')) {
            return args.projectDirectory || './tmp/test-project';
          }
          if (question.includes('template') || question.includes('Template')) {
            return templateName || 'basic';
          }
          if (question.includes('repository') || question.includes('Repository')) {
            return repoUrl || DEFAULT_REPO;
          }
          if (question.includes('Enter choice')) {
            return '1'; // Choose first option in menus
          }
          // For other questions, provide empty string or skip
          return '';
        }
      } : {
        write: (text) => process.stdout.write(text),
        question: async (question) => {
          process.stdout.write(question);
          return new Promise((resolve) => {
            process.stdin.once('data', (data) => {
              resolve(data.toString().trim());
            });
          });
        }
      },
      projectDirectory: args.projectDirectory,
      templatePath,
      templateName,
      repoUrl,
      branchName,
      options,
      placeholders,
      metadata,
      selectionFilePath: args.selection
    });

    let result;
    try {
      result = await workflow.executeWorkflow();
    } catch (error) {
      result = {
        success: false,
        projectDirectory: args.projectDirectory,
        templateUsed: templateName,
        error: error.message
      };
    }

    if (logger) {
      await logger.logOperation('workflow_complete', {
        success: result.success,
        projectDirectory: result.projectDirectory,
        templateUsed: result.templateUsed
      });
    }

    // Exit with appropriate code
    return result.success ? 0 : 1;

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

    handleError(contextualError, { logger: null, operation: 'new_command_execution' });
    return 1;
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
    return absolutePath;
  }

  // For remote repositories, use cache manager
  return await cacheManager.ensureRepositoryCached(repoUrl, branchName, { ttlHours }, logger);
}

/**
 * Load template metadata from path
 */
async function loadTemplateMetadata(templatePath, logger) {
  try {
    return await loadTemplateMetadataFromPath(templatePath);
  } catch (error) {
    if (logger) {
      await logger.logOperation('template_metadata_load_failed', {
        templatePath,
        error: error.message
      });
    }
    // Return minimal metadata if loading fails
    return {
      name: path.basename(templatePath),
      version: 'unknown',
      placeholders: [],
      dimensions: {}
    };
  }
}
