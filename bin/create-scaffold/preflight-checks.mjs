#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { sanitizeErrorMessage, getPackageName, validatePackageIdentity } from '../../lib/shared/security.mjs';
import { execCommand } from '../../lib/shared/utils/command-utils.mjs';
import { validateDirectoryExists } from '../../lib/shared/utils/fs-utils.mjs';
import { Logger } from '../../lib/shared/utils/logger.mjs';

/**
 * Logger instance for user interactions
 */
const logger = Logger.getInstance();

/**
 * Comprehensive preflight checks module
 * Implements enhanced validation and verification before main operations begin
 */

/**
 * Custom error class for preflight check failures
 */
export class PreflightError extends Error {
  constructor(message, code = null) {
    super(message);
    this.name = 'PreflightError';
    this.code = code;
  }
}

/**
 * Enhanced git installation verification with comprehensive error messages
 * @throws {PreflightError} - If git is not available or improperly configured
 */
export async function checkGitInstallation() {
  try {
    // Check if git command is available
    const gitVersion = await execCommand('git', ['--version'], { timeout: 5000 });

    // Verify git version is reasonable (git 2.0+ recommended)
    const versionMatch = gitVersion.match(/git version (\d+)\.(\d+)/);
    if (versionMatch) {
      const majorVersion = parseInt(versionMatch[1]);
      const minorVersion = parseInt(versionMatch[2]);

      if (majorVersion < 2) {
        logger.warn(`⚠️  Warning: Git version ${majorVersion}.${minorVersion} detected. Version 2.0+ is recommended for best compatibility.`);
      }
    }

    // Check git configuration for basic user info (helpful for commits in setup scripts)
    try {
      await execCommand('git', ['config', 'user.name'], { timeout: 3000 });
      await execCommand('git', ['config', 'user.email'], { timeout: 3000 });
    } catch {
      logger.warn('⚠️  Warning: Git user configuration not found. Some template setup scripts may require git user.name and user.email to be configured.');
      logger.warn('   Configure with: git config --global user.name "Your Name"');
      logger.warn('   Configure with: git config --global user.email "your.email@example.com"');
    }

  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new PreflightError(
        'Git is not installed or not available in PATH.\n\n' +
        'Git is required to clone template repositories for @m5nv/create-scaffold.\n\n' +
        'Installation instructions:\n' +
        '  • macOS: Install Xcode Command Line Tools or use Homebrew (brew install git)\n' +
        '  • Windows: Download from https://git-scm.com/download/win\n' +
        '  • Linux: Use your package manager (apt install git, yum install git, etc.)\n' +
        '  • Or visit: https://git-scm.com/downloads\n\n' +
        'After installation, restart your terminal and try again.',
        'GIT_NOT_FOUND'
      );
    } else if (error.message.includes('timeout')) {
      throw new PreflightError(
        'Git command timed out. This may indicate:\n' +
        '  • Git is installed but not responding properly\n' +
        '  • System performance issues\n' +
        '  • Network connectivity problems\n\n' +
        'Please check your git installation and try again.',
        'GIT_TIMEOUT'
      );
    } else {
      const sanitizedMessage = sanitizeErrorMessage(error.message);
      throw new PreflightError(
        `Git verification failed: ${sanitizedMessage}\n\n` +
        'Please ensure git is properly installed and accessible from your PATH.',
        'GIT_ERROR'
      );
    }
  }
}

/**
 * Comprehensive argument validation before operations begin
 * @param {Object} args - Parsed command line arguments
 * @throws {PreflightError} - If arguments are invalid or incomplete
 */
export async function validateAllArguments(args) {
  const errors = [];

  // Validate project directory
  if (!args.projectDirectory) {
    errors.push('Project directory name is required as the first argument');
  } else if (typeof args.projectDirectory !== 'string' || args.projectDirectory.trim().length === 0) {
    errors.push('Project directory name must be a non-empty string');
  }

  // Validate template requirement
  if (!args.template) {
    errors.push('Template name is required (use --from-template or -t flag)');
  } else if (typeof args.template !== 'string' || args.template.trim().length === 0) {
    errors.push('Template name must be a non-empty string');
  }

  // Validate repository format if provided
  if (args.repo && (typeof args.repo !== 'string' || args.repo.trim().length === 0)) {
    errors.push('Repository URL must be a non-empty string if provided');
  }

  // Validate branch name if provided
  if (args.branch && (typeof args.branch !== 'string' || args.branch.trim().length === 0)) {
    errors.push('Branch name must be a non-empty string if provided');
  }

  // Check for conflicting or invalid argument combinations
  if (args.template && args.template.includes('..')) {
    errors.push('Template name cannot contain path traversal sequences (..)');
  }

  if (args.projectDirectory && args.projectDirectory.includes('/')) {
    errors.push('Project directory name cannot contain path separators (use simple directory names only)');
  }

  if (errors.length > 0) {
    const packageName = getPackageName();
    throw new PreflightError(
      'Invalid command line arguments:\n' +
      errors.map(error => `  • ${error}`).join('\n') + '\n\n' +
      `Use --help for usage information and examples.\n\n` +
      `Correct usage: npm create @m5nv/scaffold <project-name> -- --from-template <template-name>\n` +
      `Alternative: npx ${packageName}@latest <project-name> --from-template <template-name>`,
      'INVALID_ARGUMENTS'
    );
  }
}

/**
 * Enhanced project directory conflict detection with user guidance
 * @param {string} projectDirectory - Target project directory name
 * @throws {PreflightError} - If directory conflicts exist or cannot be created
 */
export async function checkProjectDirectoryConflicts(projectDirectory) {
  const targetPath = path.resolve(process.cwd(), projectDirectory);

  try {
    const stats = await fs.stat(targetPath);

    if (stats.isDirectory()) {
      // Check if directory is empty
      try {
        const contents = await fs.readdir(targetPath);
        const nonHiddenContents = contents.filter(item => !item.startsWith('.'));

        if (nonHiddenContents.length > 0) {
          throw new PreflightError(
            `Directory "${projectDirectory}" already exists and is not empty.\n\n` +
            'This could overwrite existing files. Please:\n' +
            '  • Choose a different project name, or\n' +
            '  • Remove the existing directory, or\n' +
            '  • Move the existing directory to a backup location\n\n' +
            `Current directory contents: ${nonHiddenContents.slice(0, 5).join(', ')}${nonHiddenContents.length > 5 ? '...' : ''}`,
            'DIRECTORY_NOT_EMPTY'
          );
        } else {
          logger.warn(`⚠️  Warning: Directory "${projectDirectory}" exists but is empty. Proceeding with template creation.`);
        }
      } catch (readdirError) {
        if (readdirError.code === 'EACCES' || readdirError.code === 'EPERM') {
          throw new PreflightError(
            `Directory "${projectDirectory}" already exists but cannot be read due to permission restrictions.\n\n` +
            'Please choose a different project name or check directory permissions.',
            'DIRECTORY_PERMISSION_ERROR'
          );
        } else {
          throw new PreflightError(
            `Directory "${projectDirectory}" already exists.\n\n` +
            'Please choose a different project name or remove the existing directory.',
            'DIRECTORY_EXISTS'
          );
        }
      }
    } else if (stats.isFile()) {
      throw new PreflightError(
        `A file named "${projectDirectory}" already exists.\n\n` +
        'Please choose a different project name or remove the existing file.',
        'FILE_CONFLICT'
      );
    } else {
      throw new PreflightError(
        `"${projectDirectory}" exists but is not a regular directory or file.\n\n` +
        'Please choose a different project name.',
        'SPECIAL_FILE_CONFLICT'
      );
    }
  } catch (error) {
    if (error instanceof PreflightError) {
      throw error;
    }

    if (error.code === 'ENOENT') {
      // Directory doesn't exist - this is what we want
      // Check if we can create it by testing parent directory permissions
      const parentDir = path.dirname(targetPath);
      try {
        await fs.access(parentDir, fs.constants.W_OK);
      } catch {
        throw new PreflightError(
          `Cannot create project directory "${projectDirectory}".\n\n` +
          'The parent directory either doesn\'t exist or you don\'t have write permissions.\n' +
          `Parent directory: ${parentDir}\n\n` +
          'Please check permissions or choose a different location.',
          'PARENT_DIRECTORY_ACCESS'
        );
      }
      return; // All good, directory can be created
    } else if (error.code === 'EACCES' || error.code === 'EPERM') {
      throw new PreflightError(
        `Permission denied accessing "${projectDirectory}".\n\n` +
        'You don\'t have sufficient permissions to access this location.\n' +
        'Please choose a different project name or check your permissions.',
        'PERMISSION_DENIED'
      );
    } else {
      const sanitizedMessage = sanitizeErrorMessage(error.message);
      throw new PreflightError(
        `Error checking project directory: ${sanitizedMessage}\n\n` +
        'Please try a different project name or check your file system.',
        'DIRECTORY_CHECK_ERROR'
      );
    }
  }
}

/**
 * Repository accessibility validation with comprehensive error handling
 * @param {string} repoUrl - Repository URL or identifier
 * @param {string} [branchName] - Optional branch name to validate
 * @throws {PreflightError} - If repository is not accessible or invalid
 */
export async function validateRepositoryAccessibility(repoUrl, branchName = null) {
  // Convert user/repo format to full GitHub URL if needed
  let fullRepoUrl;
  if (repoUrl.startsWith('/') || repoUrl.startsWith('./') || repoUrl.startsWith('~/')) {
    // Local path - validate it exists
    try {
      const resolvedPath = path.resolve(repoUrl);
      await validateDirectoryExists(resolvedPath, 'Local repository path');

      // Check if it's a git repository
      const gitDir = path.join(resolvedPath, '.git');
      try {
        await fs.access(gitDir);
      } catch {
        throw new PreflightError(
          `Local path "${repoUrl}" is not a git repository.\n\n` +
          'Please provide a valid git repository path or use a remote repository URL.',
          'LOCAL_REPO_NOT_GIT'
        );
      }

      fullRepoUrl = resolvedPath;
    } catch (error) {
      if (error instanceof PreflightError) {
        throw error;
      }

      // Handle validation errors from validateDirectoryExists
      if (error.message.includes('not found') || error.message.includes('not a directory')) {
        throw new PreflightError(
          `Local repository path "${repoUrl}" does not exist or is not a directory.\n\n` +
          'Please check the path and try again, or use a remote repository URL.',
          'LOCAL_REPO_NOT_FOUND'
        );
      } else {
        const sanitizedMessage = sanitizeErrorMessage(error.message);
        throw new PreflightError(
          `Error accessing local repository: ${sanitizedMessage}`,
          'LOCAL_REPO_ACCESS_ERROR'
        );
      }
    }
  } else if (repoUrl.includes('://')) {
    // Full URL
    fullRepoUrl = repoUrl;
  } else {
    // GitHub user/repo format
    fullRepoUrl = `https://github.com/${repoUrl}.git`;
  }

  // Test repository accessibility with git ls-remote
  try {
    logger.info('🔍 Validating repository accessibility...');

    const lsRemoteArgs = ['ls-remote', '--heads'];
    if (branchName) {
      lsRemoteArgs.push('--exit-code');
    }
    lsRemoteArgs.push(fullRepoUrl);

    const output = await execCommand('git', lsRemoteArgs, { timeout: 30000 });

    // If branch name is specified, verify it exists
    if (branchName) {
      const branches = output.split('\n').filter(line => line.trim());
      const branchExists = branches.some(line =>
        line.includes(`refs/heads/${branchName}`)
      );

      if (!branchExists) {
        // Get available branches for helpful error message
        const availableBranches = branches
          .map(line => line.split('\t')[1])
          .filter(ref => ref && ref.startsWith('refs/heads/'))
          .map(ref => ref.replace('refs/heads/', ''))
          .slice(0, 10); // Limit to first 10 branches

        throw new PreflightError(
          `Branch "${branchName}" not found in repository.\n\n` +
          (availableBranches.length > 0
            ? `Available branches: ${availableBranches.join(', ')}${branches.length > 10 ? '...' : ''}\n\n`
            : 'No branches found in repository.\n\n'
          ) +
          'Please check the branch name or omit the --branch flag to use the default branch.',
          'BRANCH_NOT_FOUND'
        );
      }
    }

  } catch (error) {
    if (error instanceof PreflightError) {
      throw error;
    }

    const sanitizedMessage = sanitizeErrorMessage(error.message);

    if (error.message.includes('Repository not found') ||
      error.message.includes('not found') ||
      error.message.includes('404') ||
      error.message.includes('Could not resolve host') ||
      error.message.includes('ENOTFOUND') ||
      error.message.includes('Name or service not known')) {
      throw new PreflightError(
        `Repository not found: ${repoUrl}\n\n` +
        'Please verify that:\n' +
        '  • The repository exists\n' +
        '  • The repository name is spelled correctly\n' +
        '  • You have access to the repository (for private repos)\n' +
        '  • Your git credentials are configured correctly\n\n' +
        'For private repositories, ensure you have:\n' +
        '  • SSH keys configured: https://docs.github.com/en/authentication/connecting-to-github-with-ssh\n' +
        '  • Or a Personal Access Token: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token',
        'REPOSITORY_NOT_FOUND'
      );
    } else if (error.message.includes('Authentication failed') ||
      error.message.includes('403') ||
      error.message.includes('Permission denied')) {
      throw new PreflightError(
        `Authentication failed for repository: ${repoUrl}\n\n` +
        'This repository requires authentication. Please ensure:\n' +
        '  • Your git credentials are configured correctly\n' +
        '  • You have access to this repository\n' +
        '  • For SSH URLs: Your SSH keys are set up properly\n' +
        '  • For HTTPS URLs: Your Personal Access Token is configured\n\n' +
        'Authentication setup guides:\n' +
        '  • SSH: https://docs.github.com/en/authentication/connecting-to-github-with-ssh\n' +
        '  • HTTPS: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token',
        'AUTHENTICATION_FAILED'
      );
    } else if (error.message.includes('timeout') || error.message.includes('timed out')) {
      throw new PreflightError(
        `Repository validation timed out: ${repoUrl}\n\n` +
        'This may be due to:\n' +
        '  • Network connectivity issues\n' +
        '  • Repository server being slow or unavailable\n' +
        '  • Firewall or proxy blocking the connection\n\n' +
        'Please check your network connection and try again.',
        'REPOSITORY_TIMEOUT'
      );
    } else {
      throw new PreflightError(
        `Repository validation failed: ${sanitizedMessage}\n\n` +
        'Please check the repository URL and your network connection.',
        'REPOSITORY_VALIDATION_ERROR'
      );
    }
  }
}


/**
 * Run all preflight checks in sequence
 * @param {Object} args - Parsed command line arguments
 * @param {string} repoUrl - Repository URL to validate
 * @throws {PreflightError} - If any preflight check fails
 */
export async function runAllPreflightChecks(args, repoUrl) {
  logger.info('🔍 Running preflight checks...\n');

  // 1. Validate package identity
  logger.info('  ✓ Validating package identity...');
  try {
    validatePackageIdentity();
  } catch (error) {
    throw new PreflightError(
      `Package identity validation failed: ${error.message}\n\n` +
      'This indicates a configuration issue with the CLI tool.',
      'PACKAGE_IDENTITY_ERROR'
    );
  }

  // 2. Check git installation
  logger.info('  ✓ Checking git installation...');
  await checkGitInstallation();

  // 3. Validate all arguments
  logger.info('  ✓ Validating arguments...');
  await validateAllArguments(args);

  // 4. Check project directory conflicts
  logger.info('  ✓ Checking project directory...');
  await checkProjectDirectoryConflicts(args.projectDirectory);

  // 5. Validate repository accessibility
  logger.info('  ✓ Validating repository access...');
  await validateRepositoryAccessibility(repoUrl, args.branch);

  logger.success('✅ All preflight checks passed!\n');
}
