/**
 * Shared utilities for Kiro Methodology validation scripts
 *
 * ⚠️  INTERNAL USE ONLY - Not for product development teams
 * These utilities are designed specifically for the validation and automation
 * scripts in this methodology package. They are not intended for use in
 * application or library code.
 */

import fs from 'fs/promises';
import path from 'path';

// Colors for output
export const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

/**
 * Colorize text for console output
 */
export function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

/**
 * Check if a file exists
 */
export async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all markdown files in specified directories
 */
export async function getMarkdownFiles(dirs) {
  const files = [];

  for (const dir of dirs) {
    try {
      await traverse(dir);
    } catch (_error) {
      // Skip directories that don't exist or can't be read
      continue;
    }
  }

  async function traverse(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        // Skip common non-doc directories
        if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(entry.name)) {
          await traverse(fullPath);
        }
      } else if (entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

/**
 * Read package.json and return parsed content
 */
export async function readPackageJson() {
  try {
    const content = await fs.readFile('package.json', 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Format validation results for console output
 */
export function formatResults(title, results) {
  console.log('\n' + '='.repeat(50));
  console.log(colorize(`📊 ${title}`, 'blue'));
  console.log('='.repeat(50));

  // Show summary stats
  const stats = Object.keys(results).filter(key =>
    typeof results[key] === 'number' && key !== 'errors' && key !== 'warnings' && key !== 'fixesApplied'
  );

  for (const stat of stats) {
    if (results[stat] > 0) {
      console.log(`${stat.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: ${results[stat]}`);
    }
  }

  // Show compliance items
  if (results.compliance && results.compliance.length > 0) {
    console.log(colorize(`\n✅ COMPLIANT ITEMS (${results.compliance.length}):`, 'green'));
    results.compliance.forEach(item => console.log(`  ${item}`));
  }

  // Show errors
  if (results.errors && results.errors.length > 0) {
    console.log(colorize(`\n❌ ERRORS (${results.errors.length}):`, 'red'));
    results.errors.forEach(error => console.log(`  ${error}`));
  }

  // Show warnings
  if (results.warnings && results.warnings.length > 0) {
    console.log(colorize(`\n⚠️  WARNINGS (${results.warnings.length}):`, 'yellow'));
    results.warnings.forEach(warning => console.log(`  ${warning}`));
  }

  // Show broken links
  if (results.brokenLinks && results.brokenLinks.length > 0) {
    console.log(colorize(`\n🔗 BROKEN LINKS (${results.brokenLinks.length}):`, 'red'));
    results.brokenLinks.forEach(link => console.log(`  ${link}`));
  }

  // Show missing frontmatter
  if (results.missingFrontmatter && results.missingFrontmatter.length > 0) {
    console.log(colorize(`\n📄 MISSING FRONTMATTER (${results.missingFrontmatter.length}):`, 'yellow'));
    results.missingFrontmatter.forEach(file => console.log(`  ${file}`));
  }

  // Show fixes applied
  if (results.fixesApplied && results.fixesApplied.length > 0) {
    console.log(colorize(`\n🔧 FIXES APPLIED (${results.fixesApplied.length}):`, 'green'));
    results.fixesApplied.forEach(fix => console.log(`  ${fix}`));
  }
}

/**
 * Calculate total issues and return exit code
 */
export function calculateExitCode(results) {
  const errorCount = (results.errors?.length || 0) + (results.brokenLinks?.length || 0);
  const warningCount = results.warnings?.length || 0;

  if (errorCount > 0) {
    console.log(colorize(`\n❌ Found ${errorCount} errors and ${warningCount} warnings that need attention.`, 'red'));
    return 1;
  } else if (warningCount > 0) {
    console.log(colorize(`\n⚠️  Found ${warningCount} warnings that may need attention.`, 'yellow'));
    return 0;
  } else {
    console.log(colorize('\n✅ All validation checks passed!', 'green'));
    return 0;
  }
}

/**
 * Check if target directory is the Kiro Methodology template repository
 *
 * This function distinguishes between:
 * - The methodology template itself (returns true)
 * - Projects using the methodology (returns false)
 *
 * @param {string} targetPath - Directory to check (defaults to cwd)
 * @param {object} options - Detection options
 * @param {boolean} options.checkPath - Check directory path for methodology indicators
 * @param {boolean} options.checkContent - Check documentation content for placeholder markers
 * @returns {Promise<boolean>} True if methodology template, false if project
 */
export async function isMethodologyTemplate(targetPath = process.cwd(), options = {}) {
  const { checkPath = false, checkContent = false } = options;

  // Check for methodology package markers
  const methodologyMarkers = [
    'scripts/detect-repo-type.mjs',
    'scripts/customize-methodology.mjs',
    'docs/spec-driven-development.md',
    'AGENTS.md'
  ];

  // Must have all methodology-specific files
  for (const marker of methodologyMarkers) {
    if (!(await fileExists(path.join(targetPath, marker)))) {
      return false; // Missing methodology files, so this is a project
    }
  }

  // Optional: Check directory path for methodology indicators
  if (checkPath) {
    const hasMethodologyInPath = targetPath.includes('kiro-methodology-package') ||
                                targetPath.includes('methodology-package');
    if (!hasMethodologyInPath) {
      return false;
    }
  }

  // Optional: Check documentation content for placeholder markers
  if (checkContent) {
    try {
      const explanationReadme = await fs.readFile(path.join(targetPath, 'docs/explanation/README.md'), 'utf8');
      const hasPlaceholderMarker = explanationReadme.includes('AI Note: Populate This Directory') ||
                                  explanationReadme.includes('AI-GENERATED PLACEHOLDER') ||
                                  explanationReadme.includes('This document is a placeholder');
      if (!hasPlaceholderMarker) {
        return false;
      }
    } catch {
      return false; // Can't read content or file doesn't exist
    }
  }

  // Default check: specs directory has only .gitkeep (methodology package)
  try {
    const specsDir = path.join(targetPath, '.kiro/specs');
    const entries = await fs.readdir(specsDir);
    const hasOnlyGitkeep = entries.length === 1 && entries[0] === '.gitkeep';
    return hasOnlyGitkeep;
  } catch {
    return false; // Specs directory doesn't exist or can't be read
  }
}

/**
 * Count package.json files in a directory (excluding node_modules)
 */
export async function countPackageJsonFiles(targetPath = process.cwd()) {
  let count = 0;

  async function traverse(dir) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // Skip node_modules
          if (entry.name !== 'node_modules') {
            await traverse(fullPath);
          }
        } else if (entry.name === 'package.json') {
          count++;
        }
      }
    } catch {
      // Skip directories that can't be read
    }
  }

  await traverse(targetPath);
  return count;
}

/**
 * Check if directory has NPM workspace configuration
 */
export async function hasWorkspaceConfig(targetPath = process.cwd()) {
  try {
    const packageJsonPath = path.join(targetPath, 'package.json');
    if (await fileExists(packageJsonPath)) {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
      return !!(packageJson.workspaces && packageJson.workspaces.length > 0);
    }
  } catch {
    // Ignore JSON parse errors
  }
  return false;
}

/**
 * Check if directory has PNPM workspace configuration
 */
export async function hasPnpmWorkspace(targetPath = process.cwd()) {
  return await fileExists(path.join(targetPath, 'pnpm-workspace.yaml'));
}

/**
 * Check if directory has Lerna configuration
 */
export async function hasLernaConfig(targetPath = process.cwd()) {
  return await fileExists(path.join(targetPath, 'lerna.json')) ||
         await fileExists(path.join(targetPath, 'nx.json'));
}

/**
 * Check if directory has Rush configuration
 */
export async function hasRushConfig(targetPath = process.cwd()) {
  return await fileExists(path.join(targetPath, 'rush.json'));
}

/**
 * Check for other monorepo patterns (like multiple package.json files in subdirs)
 */
export async function hasMonorepoPatterns(targetPath = process.cwd()) {
  const packageJsonCount = await countPackageJsonFiles(targetPath);
  return packageJsonCount > 1;
}

/**
 * Detect repository type based on multiple heuristics
 */
export async function detectRepositoryType(targetPath = process.cwd()) {
  try {
    // Check for multiple package.json files (monorepo indicator)
    const packageJsonCount = await countPackageJsonFiles(targetPath);

    // Check for workspace configuration files
    const hasWorkspaces = await hasWorkspaceConfig(targetPath);
    const hasPnpm = await hasPnpmWorkspace(targetPath);
    const hasLerna = await hasLernaConfig(targetPath);
    const hasRush = await hasRushConfig(targetPath);
    const hasPatterns = await hasMonorepoPatterns(targetPath);

    // Determine type based on multiple factors
    if (packageJsonCount > 1 || hasWorkspaces || hasPnpm || hasLerna || hasRush || hasPatterns) {
      return 'monorepo';
    }

    return 'monolith';
  } catch (error) {
    console.warn(`⚠️  Could not auto-detect repository type: ${error.message}`);
    return 'monolith'; // Safe default
  }
}
