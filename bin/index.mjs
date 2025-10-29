#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
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
    
    // Validate arguments
    const validation = validateArguments(args);
    
    // Show help if requested or if validation failed
    if (validation.showHelp || args.help) {
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
    let logger = null;
    if (args.logFile) {
      logger = new Logger(args.logFile);
      await logger.logOperation('cli_start', {
        args: args,
        timestamp: new Date().toISOString()
      });
    }

    // Initialize cache manager
    const cacheManager = new CacheManager();
    
    // Handle special modes that don't require full scaffolding
    if (args.listTemplates) {
      const templateDiscovery = new TemplateDiscovery(cacheManager);
      const repoUrl = args.repo || DEFAULT_REPO;
      const branchName = args.branch;
      
      try {
        console.log(`📋 Discovering templates from ${repoUrl}${branchName ? ` (${branchName})` : ''}...\n`);
        
        // First ensure repository is cached by attempting to clone it
        const cachedRepoPath = await ensureRepositoryCached(repoUrl, branchName, cacheManager, logger);
        
        const templates = await templateDiscovery.listTemplatesFromPath(cachedRepoPath);
        const formattedOutput = templateDiscovery.formatTemplateList(templates);
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

        console.log(previewOutput);

        const treePreview = await dryRunEngine.generateTreePreview(preview.templatePath, preview.ignoreSet);
        if (treePreview.available && treePreview.output) {
          console.log('🌲 Template structure (depth 2):');
          console.log(`${treePreview.output}\n`);
        } else {
          console.log(`🌲 Tree preview unavailable: ${treePreview.reason}\n`);
        }

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

    console.log(`\n🚀 Creating project: ${projectDirectory}`);
    console.log(`📦 Template: ${templateName}`);
    console.log(`📁 Repository: ${repoUrl}`);
    if (branchName) {
      console.log(`🌿 Branch: ${branchName}`);
    }
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
        logger
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

    console.log('\n✅ Project created successfully!');
    console.log(`\n📂 Next steps:`);
    console.log(`  cd ${projectDirectory}`);

    const resolvedHandoff = metadata.handoffSteps.length > 0
      ? metadata.handoffSteps
      : ['Review README.md for additional instructions'];

    for (const step of resolvedHandoff) {
      console.log(`  - ${step}`);
    }

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
    console.log('📥 Cloning template repository (cache disabled)...');
    const tempPath = await directCloneRepo(repoUrl, branchName, logger);
    return {
      path: tempPath,
      temporary: true
    };
  }

  // Use cache-aware repository access
  try {
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

/**
 * Execute optional setup script if it exists
 */
async function executeSetupScript({ projectDirectory, projectName, ide, options, authoringMode, dimensions = {}, logger }) {
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

  // Setup script exists, ensure it gets cleaned up regardless of what happens
  try {
    console.log('⚙️  Running template setup script...');

    // Import and execute the setup script
    const ctx = createEnvironmentObject({
      projectDirectory,
      projectName,
      cwd: process.cwd(),
      ide,
      options,
      authoringMode
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



// Run main function
main();
