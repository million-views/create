#!/usr/bin/env node

import { spawn } from 'child_process';
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

    // Run comprehensive preflight checks
    await runAllPreflightChecks(args, repoUrl);

    console.log(`\n🚀 Creating project: ${projectDirectory}`);
    console.log(`📦 Template: ${templateName}`);
    console.log(`📁 Repository: ${repoUrl}`);
    if (branchName) {
      console.log(`🌿 Branch: ${branchName}`);
    }
    console.log('');

    // Clone the template repository using secure temporary directory
    tempDir = await cloneTemplateRepo(repoUrl, branchName);

    // Verify template exists
    const templatePath = path.join(tempDir, templateName);
    await verifyTemplate(templatePath, templateName);

    // Copy template to project directory
    await copyTemplate(templatePath, projectDirectory);
    projectCreated = true;

    // Clean up temp directory after successful copy
    await fs.rm(tempDir, { recursive: true, force: true });
    tempDir = null; // Mark as cleaned up

    // Execute setup script if it exists
    await executeSetupScript(projectDirectory, projectDirectory);

    console.log('\n✅ Project created successfully!');
    console.log(`\n📂 Next steps:`);
    console.log(`  cd ${projectDirectory}`);
    console.log('');

  } catch (error) {
    // Clean up resources on any error
    if (tempDir) {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors to avoid masking the original error
      }
    }

    // Clean up partially created project directory if it was created but process failed
    if (projectCreated && projectDirectory) {
      try {
        await fs.rm(projectDirectory, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors to avoid masking the original error
      }
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
 * Clone the template repository to a secure temporary directory
 */
async function cloneTemplateRepo(repoUrl, branchName) {
  const tempDir = createSecureTempDir();

  console.log('📥 Cloning template repository...');

  const cloneArgs = ['clone', '--depth', '1'];
  
  if (branchName) {
    cloneArgs.push('--branch', branchName);
  }

  // Convert user/repo format to full GitHub URL if needed
  // Check if it's a local path or a full URL
  let fullRepoUrl;
  if (repoUrl.startsWith('/') || repoUrl.startsWith('.') || repoUrl.startsWith('~')) {
    // Local path
    fullRepoUrl = repoUrl;
  } else if (repoUrl.includes('://')) {
    // Full URL
    fullRepoUrl = repoUrl;
  } else {
    // GitHub user/repo format
    fullRepoUrl = `https://github.com/${repoUrl}.git`;
  }

  cloneArgs.push(fullRepoUrl, tempDir);

  try {
    await execCommand('git', cloneArgs, { timeout: 60000 }); // 60 second timeout for git clone
  } catch (error) {
    // Clean up temp directory if clone failed
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors to avoid masking the original error
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
      throw new Error(`Failed to clone repository: ${sanitizedErrorMessage}`);
    }
  }

  return tempDir;
}

/**
 * Verify that the template subdirectory exists
 */
async function verifyTemplate(templatePath, templateName) {
  try {
    const stats = await fs.stat(templatePath);
    if (!stats.isDirectory()) {
      throw new Error(`Template "${templateName}" exists but is not a directory.`);
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(
        `Template not found in the repository.\n` +
        'Please check the template name and try again.'
      );
    }
    const sanitizedMessage = sanitizeErrorMessage(err.message);
    throw new Error(sanitizedMessage);
  }
}

/**
 * Copy template files to project directory
 */
async function copyTemplate(templatePath, projectDirectory) {
  console.log('📋 Copying template files...');

  try {
    // Create project directory
    await fs.mkdir(projectDirectory, { recursive: true });

    // Copy all files from template to project directory
    await copyRecursive(templatePath, projectDirectory);

    // Remove .git directory if it exists in the copied template
    const gitDir = path.join(projectDirectory, '.git');
    try {
      await fs.rm(gitDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors - .git directory may not exist
    }

  } catch (err) {
    const sanitizedMessage = sanitizeErrorMessage(err.message);
    throw new Error(`Failed to copy template: ${sanitizedMessage}`);
  }
}

/**
 * Recursively copy directory contents
 */
async function copyRecursive(src, dest) {
  const entries = await fs.readdir(src, { withFileTypes: true });

  await fs.mkdir(dest, { recursive: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      // Skip .git directories during copy
      if (entry.name === '.git') {
        continue;
      }
      await copyRecursive(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

/**
 * Execute optional setup script if it exists
 */
async function executeSetupScript(projectDirectory, projectName) {
  const setupScriptPath = path.join(projectDirectory, SETUP_SCRIPT);

  // Check if setup script exists
  try {
    await fs.access(setupScriptPath);
  } catch {
    // Setup script doesn't exist - this is fine
    return;
  }

  // Setup script exists, ensure it gets cleaned up regardless of what happens
  try {
    console.log('⚙️  Running template setup script...');

    // Import and execute the setup script
    const setupScriptUrl = `file://${path.resolve(setupScriptPath)}`;
    const setupModule = await import(setupScriptUrl);

    // Call the default export or setup function
    if (typeof setupModule.default === 'function') {
      await setupModule.default({
        projectDirectory,
        projectName,
        cwd: process.cwd()
      });
    } else if (typeof setupModule.setup === 'function') {
      await setupModule.setup({
        projectDirectory,
        projectName,
        cwd: process.cwd()
      });
    }

  } catch (err) {
    const sanitizedMessage = sanitizeErrorMessage(err.message);
    console.warn(`⚠️  Warning: Setup script execution failed: ${sanitizedMessage}`);
    console.warn('Continuing without setup...');
  } finally {
    // Remove the setup script after execution attempt (success or failure)
    try {
      await fs.unlink(setupScriptPath);
    } catch {
      // Ignore cleanup errors - setup script may have already been removed
      // or there may be permission issues, but we don't want to fail the entire process
    }
  }
}

/**
 * Execute a command with timeout and return stdout
 */
function execCommand(command, args, options = {}) {
  const { timeout = 30000 } = options; // Default 30 second timeout for git operations
  
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['inherit', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    let timeoutId;

    // Set up timeout
    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Command timed out after ${timeout}ms`));
      }, timeout);
    }

    if (child.stdout) {
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
    }

    child.on('error', (error) => {
      if (timeoutId) clearTimeout(timeoutId);
      reject(error);
    });

    child.on('close', (code) => {
      if (timeoutId) clearTimeout(timeoutId);
      
      if (code === 0) {
        resolve(stdout);
      } else {
        const error = new Error(stderr || stdout || `Command failed with exit code ${code}`);
        reject(error);
      }
    });
  });
}

// Run main function
main();
