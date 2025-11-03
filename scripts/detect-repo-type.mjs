#!/usr/bin/env node

/**
 * Repository Type Detection Script
 *
 * Deterministically identifies if a project is a monorepo or single-project repository
 * based on common patterns and configurations.
 *
 * Also detects whether the current environment is "unborn" (methodology package)
 * or "reified" (actual project using the methodology).
 *
  * Usage: 
 *   node scripts/detect-repo-type.mjs              # Analyze current directory
 *   node scripts/detect-repo-type.mjs /path/to/repo # Analyze specific path
 *   node scripts/detect-repo-type.mjs /path/to/repository
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { fileExists, readPackageJson } from './utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Get target path from command line argument or default to current directory
const targetPath = process.argv[2] || '.';
const absoluteTargetPath = path.resolve(targetPath);

/**
 * Check if this is an "unborn" methodology package vs "reified" project
 */
async function detectEnvironmentState() {
  // Check for methodology package markers
  const methodologyMarkers = [
    'scripts/detect-repo-type.mjs',
    'scripts/customize-methodology.mjs',
    'docs/spec-driven-development.md',
    'AGENTS.md'
  ];

  // Must have all methodology-specific files
  for (const marker of methodologyMarkers) {
    if (!(await fileExists(path.join(absoluteTargetPath, marker)))) {
      return 'reified'; // Missing methodology files, so this is a project
    }
  }

  // Check if specs directory has only .gitkeep (methodology package)
  try {
    const specsDir = path.join(absoluteTargetPath, '.kiro/specs');
    const entries = await fs.readdir(specsDir, { withFileTypes: true });
    if (entries.length === 1 && entries[0].name === '.gitkeep') {
      return 'unborn'; // This is the methodology package itself
    }
  } catch {
    // Specs directory doesn't exist or can't be read
  }

  return 'reified'; // Has methodology files but actual specs, so it's a project
}

/**
 * Count package.json files excluding node_modules
 */
async function countPackageJsonFiles() {
  try {
    const { execSync } = await import('child_process');
    const command = `cd "${absoluteTargetPath}" && find . -name "package.json" -not -path "./node_modules/*" | wc -l`;
    const result = execSync(command, { encoding: 'utf8' });
    return parseInt(result.trim());
  } catch {
    // Fallback: manual counting
    let count = 0;
    async function traverse(dir) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
          await traverse(fullPath);
        } else if (entry.name === 'package.json') {
          count++;
        }
      }
    }
    await traverse(absoluteTargetPath);
    return count;
  }
}

/**
 * Check for workspace configuration
 */
async function hasWorkspaceConfig() {
  const packageJson = await readPackageJson(path.join(absoluteTargetPath, 'package.json'));
  return !!(packageJson?.workspaces && packageJson.workspaces.length > 0);
}

/**
 * Check for pnpm workspace file
 */
async function hasPnpmWorkspace() {
  return await fileExists(path.join(absoluteTargetPath, 'pnpm-workspace.yaml'));
}

/**
 * Check for lerna configuration
 */
async function hasLernaConfig() {
  return await fileExists(path.join(absoluteTargetPath, 'lerna.json')) || 
         await fileExists(path.join(absoluteTargetPath, 'nx.json'));
}

/**
 * Check for rush configuration
 */
async function hasRushConfig() {
  return await fileExists(path.join(absoluteTargetPath, 'rush.json'));
}

/**
 * Check for common monorepo patterns
 */
async function hasMonorepoPatterns() {
  const patterns = [
    'packages/',
    'apps/',
    'libs/',
    'services/',
    'tools/',
    'components/',
    'modules/'
  ];

  for (const pattern of patterns) {
    if (await fileExists(path.join(absoluteTargetPath, pattern))) {
      // Check if the directory contains package.json files
      try {
        const entries = await fs.readdir(path.join(absoluteTargetPath, pattern), { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const packageJsonPath = path.join(absoluteTargetPath, pattern, entry.name, 'package.json');
            if (await fileExists(packageJsonPath)) {
              return true;
            }
          }
        }
      } catch {
        // Directory doesn't exist or can't be read
      }
    }
  }
  return false;
}

/**
 * Main detection logic
 */
async function detectRepositoryType() {
  console.log(`🔍 Analyzing repository at: ${absoluteTargetPath}\n`);

  const envState = await detectEnvironmentState();

  if (envState === 'unborn') {
    console.log('📦 Package.json files found: 0');
    console.log('📋 NPM workspaces: No');
    console.log('📋 PNPM workspaces: No');
    console.log('📋 Lerna/NX config: No');
    console.log('📋 Rush config: No');
    console.log('📋 Monorepo patterns: No');

    console.log('\n' + '='.repeat(50));
    console.log('📦 ENVIRONMENT STATE: UNBORN METHODOLOGY PACKAGE');
    console.log('='.repeat(50));
    console.log('✅ This is the Kiro Methodology package itself');
    console.log('📋 Contains templates and guidance for adoption');
    console.log('📋 Run customize-methodology.mjs after copying to a project');
    console.log('📋 Use detect-repo-type.mjs on actual projects to determine type');

    console.log('\n🔧 For actual projects, expected repository types:');
    console.log('  • Single-Project: One deployable artifact, flat spec structure');
    console.log('  • Monorepo: Multiple deployable packages, hierarchical specs');

    return 'methodology-package';
  }

  // Reified project - detect repository type
  const packageJsonCount = await countPackageJsonFiles();
  const hasWorkspaces = await hasWorkspaceConfig();
  const hasPnpm = await hasPnpmWorkspace();
  const hasLerna = await hasLernaConfig();
  const hasRush = await hasRushConfig();
  const hasPatterns = await hasMonorepoPatterns();

  console.log(`📦 Package.json files found: ${packageJsonCount}`);
  console.log(`📋 NPM workspaces: ${hasWorkspaces ? 'Yes' : 'No'}`);
  console.log(`📋 PNPM workspaces: ${hasPnpm ? 'Yes' : 'No'}`);
  console.log(`📋 Lerna/NX config: ${hasLerna ? 'Yes' : 'No'}`);
  console.log(`📋 Rush config: ${hasRush ? 'Yes' : 'No'}`);
  console.log(`📋 Monorepo patterns: ${hasPatterns ? 'Yes' : 'No'}`);

  // Determine repository type
  const isMonorepo = packageJsonCount > 1 ||
                    hasWorkspaces ||
                    hasPnpm ||
                    hasLerna ||
                    hasRush ||
                    hasPatterns;

  console.log('\n' + '='.repeat(50));
  if (isMonorepo) {
    console.log('🏗️  REPOSITORY TYPE: MONOREPO');
    console.log('='.repeat(50));
    console.log('✅ This repository manages multiple deployable packages');
    console.log('📋 Use hierarchical spec structure: .kiro/specs/{apps,libs,services,tools}/');
    console.log('📋 Apply monorepo-specific steering documents');
    console.log('📋 Use cross-package coordination and release orchestration');
  } else {
    console.log('📄 REPOSITORY TYPE: SINGLE-PROJECT');
    console.log('='.repeat(50));
    console.log('✅ This repository produces one deployable artifact');
    console.log('📋 Use flat spec structure: .kiro/specs/feature-name/');
    console.log('📋 Apply single-project steering documents');
    console.log('📋 Focus on individual package development');
  }

  console.log('\n🔧 Recommended Kiro Methodology Configuration:');
  if (isMonorepo) {
    console.log('  • steering-hierarchy.md - Navigate tiered steering structure');
    console.log('  • monorepo-coordination.md - Cross-package coordination');
    console.log('  • release-orchestration.md - Multi-package releases');
    console.log('  • shared-library-specs.md - Shared library management');
    console.log('  • sprint-orchestration.md - Multi-project sprint planning');
  } else {
    console.log('  • greenfield-development.md - Development philosophy');
    console.log('  • nodejs-runtime-focus.md - Node.js runtime requirements');
    console.log('  • workspace-safety.md - File operation safety');
    console.log('  • security-guidelines.md - Security requirements');
    console.log('  • multi-level-validation.md - Validation framework');
    console.log('  • diataxis-documentation.md - Documentation framework');
  }

  return isMonorepo ? 'monorepo' : 'single-project';
}

// Run detection if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  detectRepositoryType().catch(console.error);
}

export { detectRepositoryType };