#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import minimist from 'minimist';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default configuration
const DEFAULT_REPO = 'million-views/templates';
const SETUP_SCRIPT = '_setup.mjs';

/**
 * Main function to orchestrate the scaffolding process
 */
async function main() {
  try {
    // Parse arguments
    const args = minimist(process.argv.slice(2), {
      string: ['template', 'repo', 'branch'],
      alias: {
        t: 'template',
        r: 'repo',
        b: 'branch'
      }
    });

    // Extract project directory (first positional argument)
    const projectDirectory = args._[0];

    // Validate required arguments
    if (!projectDirectory) {
      console.error('❌ Error: Project directory is required.');
      console.error('\nUsage:');
      console.error('  npm create @m5nv <project-directory> -- --template <template-name> [--repo <user/repo>] [--branch <branch-name>]');
      console.error('  npx @m5nv/create@latest <project-directory> --template <template-name> [--repo <user/repo>] [--branch <branch-name>]');
      process.exit(1);
    }

    if (!args.template) {
      console.error('❌ Error: --template flag is required.');
      console.error('\nUsage:');
      console.error('  npm create @m5nv <project-directory> -- --template <template-name> [--repo <user/repo>] [--branch <branch-name>]');
      console.error('  npx @m5nv/create@latest <project-directory> --template <template-name> [--repo <user/repo>] [--branch <branch-name>]');
      process.exit(1);
    }

    const templateName = args.template;
    const repoUrl = args.repo || DEFAULT_REPO;
    const branchName = args.branch;

    // Preflight checks
    await checkGitInstallation();
    await checkProjectDirectory(projectDirectory);

    console.log(`\n🚀 Creating project: ${projectDirectory}`);
    console.log(`📦 Template: ${templateName}`);
    console.log(`📁 Repository: ${repoUrl}`);
    if (branchName) {
      console.log(`🌿 Branch: ${branchName}`);
    }
    console.log('');

    // Clone the template repository
    const tempDir = await cloneTemplateRepo(repoUrl, branchName);

    // Verify template exists
    const templatePath = path.join(tempDir, templateName);
    await verifyTemplate(templatePath, templateName);

    // Copy template to project directory
    await copyTemplate(templatePath, projectDirectory);

    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });

    // Execute setup script if it exists
    await executeSetupScript(projectDirectory, projectDirectory);

    console.log('\n✅ Project created successfully!');
    console.log(`\n📂 Next steps:`);
    console.log(`  cd ${projectDirectory}`);
    console.log('');

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Check if git is installed and available
 */
async function checkGitInstallation() {
  try {
    await execCommand('git', ['--version']);
  } catch (error) {
    throw new Error(
      'Git is not installed or not available in PATH.\n' +
      'Please install git and try again.\n' +
      'Visit: https://git-scm.com/downloads'
    );
  }
}

/**
 * Check if project directory already exists
 */
async function checkProjectDirectory(projectDirectory) {
  try {
    await fs.access(projectDirectory);
    throw new Error(
      `Directory "${projectDirectory}" already exists.\n` +
      'Please choose a different name or remove the existing directory.'
    );
  } catch (error) {
    // Directory doesn't exist - this is what we want
    if (error.code === 'ENOENT') {
      return;
    }
    // Re-throw if it's our custom error
    throw error;
  }
}

/**
 * Clone the template repository to a temporary directory
 */
async function cloneTemplateRepo(repoUrl, branchName) {
  const tempDir = path.join(
    process.cwd(),
    `.tmp-template-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  );

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
    await execCommand('git', cloneArgs);
  } catch (error) {
    // Clean up temp directory if clone failed
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {}

    // Provide helpful error messages based on common issues
    if (error.message.includes('Repository not found')) {
      throw new Error(
        `Repository "${repoUrl}" not found.\n` +
        'Please check that:\n' +
        '  1. The repository exists\n' +
        '  2. You have access to it\n' +
        '  3. Your git credentials are configured correctly'
      );
    } else if (error.message.includes('branch') && branchName) {
      throw new Error(
        `Branch "${branchName}" not found in repository "${repoUrl}".\n` +
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
    } else {
      throw new Error(`Failed to clone repository: ${error.message}`);
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
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(
        `Template "${templateName}" not found in the repository.\n` +
        'Please check the template name and try again.'
      );
    }
    throw error;
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
    } catch {}

  } catch (error) {
    throw new Error(`Failed to copy template: ${error.message}`);
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

  try {
    await fs.access(setupScriptPath);
  } catch (error) {
    // Setup script doesn't exist - this is fine
    return;
  }

  console.log('⚙️  Running template setup script...');

  try {
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

    // Remove the setup script after execution
    await fs.unlink(setupScriptPath);

  } catch (error) {
    console.warn(`⚠️  Warning: Setup script execution failed: ${error.message}`);
    console.warn('Continuing without setup...');
  }
}

/**
 * Execute a command and return stdout
 */
function execCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['inherit', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

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
      reject(error);
    });

    child.on('close', (code) => {
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
