#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { parseArguments, validateArguments, generateHelpText, ArgumentError } from './argumentParser.mjs';
import { 
  validateAllInputs, 
  sanitizeErrorMessage, 
  createSecureTempDir,
  ValidationError 
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

// Default configuration
const DEFAULT_REPO = 'million-views/templates';
const SETUP_SCRIPT = '_setup.mjs';

/**
 * Main function to orchestrate the scaffolding process
 */
async function main() {
  let tempDir = null;
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
        console.log('🔍 DRY RUN MODE - Preview of operations (no changes will be made)\n');
        
        // First ensure repository is cached
        const cachedRepoPath = await ensureRepositoryCached(repoUrl, branchName, cacheManager, logger);
        
        const preview = await dryRunEngine.previewScaffoldingFromPath(
          cachedRepoPath,
          args.template, 
          args.projectDirectory
        );
        
        dryRunEngine.displayPreview(preview.operations);
        
        if (logger) {
          await logger.logOperation('dry_run_preview', {
            repoUrl,
            branchName,
            template: args.template,
            projectDirectory: args.projectDirectory,
            operationCount: preview.operations.length
          });
        }
        
        console.log('\n✅ Dry run completed - no actual changes were made');
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
      branch: args.branch
    });

    projectDirectory = validatedInputs.projectDirectory;
    const templateName = validatedInputs.template;
    const repoUrl = validatedInputs.repo;
    const branchName = validatedInputs.branch;
    
    // Extract ide and options from validated arguments
    const ide = args.ide;
    const options = args.options;

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
    tempDir = await cloneTemplateRepo(repoUrl, branchName, { 
      noCache: args.noCache, 
      cacheTtl: args.cacheTtl ? parseInt(args.cacheTtl) : undefined,
      cacheManager,
      logger 
    });

    // Verify template exists
    const templatePath = path.join(tempDir, templateName);
    await verifyTemplate(templatePath, templateName);

    // Copy template to project directory
    await copyTemplate(templatePath, projectDirectory, logger);
    projectCreated = true;

    // Clean up temp directory after successful copy
    await safeCleanup(tempDir);
    tempDir = null; // Mark as cleaned up

    // Execute setup script if it exists
    await executeSetupScript(projectDirectory, projectDirectory, ide, options, logger);

    console.log('\n✅ Project created successfully!');
    console.log(`\n📂 Next steps:`);
    console.log(`  cd ${projectDirectory}`);
    console.log('');

  } catch (error) {
    // Clean up resources on any error
    if (tempDir) {
      await safeCleanup(tempDir);
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
async function ensureRepositoryCached(repoUrl, branchName, cacheManager, logger) {
  // Check if repository is already cached
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

  // Repository not cached, clone it directly and return the path
  if (logger) {
    await logger.logOperation('cache_miss', {
      repoUrl,
      branchName
    });
  }

  return await directCloneRepo(repoUrl, branchName, logger);
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
    return await directCloneRepo(repoUrl, branchName, logger);
  }

  // Use cache-aware repository access
  try {
    console.log('📥 Accessing template repository...');
    return await ensureRepositoryCached(repoUrl, branchName, cacheManager, logger);
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
async function copyTemplate(templatePath, projectDirectory, logger) {
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
    await copyRecursive(templatePath, projectDirectory, logger);

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
async function copyRecursive(src, dest, logger) {
  const entries = await fs.readdir(src, { withFileTypes: true });

  await ensureDirectory(dest, 0o755, 'destination directory');

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      // Skip .git directories during copy
      if (entry.name === '.git') {
        continue;
      }
      await copyRecursive(srcPath, destPath, logger);
    } else {
      await fs.copyFile(srcPath, destPath);
      
      if (logger) {
        await logger.logFileCopy(srcPath, destPath);
      }
    }
  }
}

/**
 * Execute optional setup script if it exists
 */
async function executeSetupScript(projectDirectory, projectName, ide, options, logger) {
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
      options
    });
  }

  // Setup script exists, ensure it gets cleaned up regardless of what happens
  try {
    console.log('⚙️  Running template setup script...');

    // Import and execute the setup script
    const setupScriptUrl = `file://${path.resolve(setupScriptPath)}`;
    const setupModule = await import(setupScriptUrl);

    // Create Environment_Object with all necessary context
    const env = createEnvironmentObject({
      projectDirectory,
      projectName,
      cwd: process.cwd(),
      ide,
      options
    });

    // Validate that setup script exports a default function
    if (typeof setupModule.default !== 'function') {
      throw new Error(
        'Setup script must export a default function\n' +
        'Example: export default function setup(env) { ... }\n' +
        'Current export type: ' + typeof setupModule.default
      );
    }

    // Execute the setup script with Environment_Object
    await setupModule.default(env);

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

    const sanitizedMessage = sanitizeErrorMessage(err.message);
    console.warn(`⚠️  Warning: Setup script execution failed: ${sanitizedMessage}`);
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
