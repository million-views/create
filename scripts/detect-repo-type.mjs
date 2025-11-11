#!/usr/bin/env node

/**
 * Repository Type Detection Script
 *
 * Deterministically identifies if a project is a monorepo or monolith repository
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

import _fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { _fileExists, _readPackageJson, isMethodologyTemplate, countPackageJsonFiles, hasWorkspaceConfig, hasPnpmWorkspace, hasLernaConfig, hasRushConfig, hasMonorepoPatterns } from './utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Get target path from command line argument or default to current directory
const targetPath = process.argv[2] || '.';
const absoluteTargetPath = path.resolve(targetPath);

/**
 * Check if this is an "unborn" methodology package vs "reified" project
 */
async function detectEnvironmentState() {
  const isMethodology = await isMethodologyTemplate(absoluteTargetPath);
  return isMethodology ? 'unborn' : 'reified';
}

/**
 * Count package.json files excluding node_modules
 */
/**
 * Check for workspace configuration
 */

/**
 * Check for pnpm workspace file
 */

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
    console.log('  • Monolith: One deployable artifact, flat spec structure');
    console.log('  • Monorepo: Multiple deployable packages, hierarchical specs');

    return 'methodology-package';
  }

  // Reified project - detect repository type
  const packageJsonCount = await countPackageJsonFiles(absoluteTargetPath);
  const hasWorkspaces = await hasWorkspaceConfig(absoluteTargetPath);
  const hasPnpm = await hasPnpmWorkspace(absoluteTargetPath);
  const hasLerna = await hasLernaConfig(absoluteTargetPath);
  const hasRush = await hasRushConfig(absoluteTargetPath);
  const hasPatterns = await hasMonorepoPatterns(absoluteTargetPath);

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
    console.log('📄 REPOSITORY TYPE: MONOLITH');
    console.log('='.repeat(50));
    console.log('✅ This repository produces one deployable artifact');
    console.log('📋 Use flat spec structure: .kiro/specs/feature-name/');
    console.log('📋 Apply monolith steering documents');
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

  return isMonorepo ? 'monorepo' : 'monolith';
}

// Run detection if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  detectRepositoryType().catch(console.error);
}

export { detectRepositoryType };
