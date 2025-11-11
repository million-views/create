#!/usr/bin/env node

/**
 * Spec Compliance Validation Script for Kiro Methodology
 * Validates that a project follows Kiro Methodology structure and practices
 *
 * This script checks for:
 * - Proper .kiro/specs/ directory structure
 * - Required steering documents
 * - Spec file format compliance
 * - Task tracking format validation
 */

import fs from 'fs/promises';
import path from 'path';
import { colorize, readPackageJson, formatResults, isMethodologyTemplate, detectRepositoryType } from './utils.mjs';

// Track validation results
const results = {
  specs: 0,
  steeringDocs: 0,
  errors: [],
  warnings: [],
  compliance: []
};

/**
 * Required steering documents for different project types
 */
const REQUIRED_STEERING_DOCS = {
  universal: [
    'greenfield-development.md',
    'nodejs-runtime-focus.md',
    'workspace-safety.md',
    'security-guidelines.md',
    'multi-level-validation.md',
    'diataxis-documentation.md'
  ],
  'package-type': [
    'cli-development-focus.md'
  ]
};

/**
 * Check if a directory contains spec files directly
 */
async function hasSpecFiles(dirPath) {
  try {
    const files = await fs.readdir(dirPath);
    const requiredFiles = ['requirements.md', 'design.md', 'tasks.md'];
    return requiredFiles.every(file => files.includes(file));
  } catch {
    return false;
  }
}

/**
 * Validate a project container that may contain multiple specs
 */
async function validateProjectContainer(projectDir, categoryName) {
  const projectName = path.basename(projectDir);

  try {
    const entries = await fs.readdir(projectDir, { withFileTypes: true });

    if (entries.length === 0) {
      results.warnings.push(`Project container '${categoryName}/${projectName}' is empty`);
      return;
    }

    // Check each subdirectory for specs
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const specPath = path.join(projectDir, entry.name);
        const hasSpecFilesCheck = await hasSpecFiles(specPath);

        if (hasSpecFilesCheck) {
          await validateSpecDirectory(specPath, `${categoryName}/${projectName}`);
        } else {
          results.warnings.push(`Directory '${categoryName}/${projectName}/${entry.name}' does not contain valid spec files`);
        }
      } else if (entry.name !== '.gitkeep') {
        results.warnings.push(`Unexpected file in project '${categoryName}/${projectName}': ${entry.name}`);
      }
    }

  } catch (error) {
    results.errors.push(`Error reading project container '${categoryName}/${projectName}': ${error.message}`);
  }
}

/**
 * Validate .kiro directory structure
 */

/**
 * Validate .kiro directory structure
 */
async function validateKiroStructure() {
  const kiroDir = '.kiro';

  try {
    await fs.access(kiroDir);
  } catch {
    results.errors.push('Missing .kiro directory - required for Kiro Methodology');
    return;
  }

  // Check for specs directory
  try {
    await fs.access(path.join(kiroDir, 'specs'));
  } catch {
    results.errors.push('Missing .kiro/specs directory');
  }

  // Check for steering directory
  try {
    await fs.access(path.join(kiroDir, 'steering'));
  } catch {
    results.errors.push('Missing .kiro/steering directory');
    return;
  }

  // Validate steering documents
  await validateSteeringDocuments();
}

/**
 * Validate steering documents
 */
async function validateSteeringDocuments() {
  const steeringDir = '.kiro/steering';

  try {
    const files = await fs.readdir(steeringDir);
    const mdFiles = files.filter(f => f.endsWith('.md'));

    results.steeringDocs = mdFiles.length;

    // Check for required universal documents
    for (const doc of REQUIRED_STEERING_DOCS.universal) {
      if (!mdFiles.includes(doc)) {
        results.errors.push(`Missing required steering document: ${doc}`);
      } else {
        results.compliance.push(`✅ Universal steering: ${doc}`);
      }
    }

    // Check for package-type documents (optional but recommended for CLI projects)
    const packageJson = await readPackageJson();
    const isCliProject = packageJson?.bin || packageJson?.name?.includes('cli');

    if (isCliProject) {
      for (const doc of REQUIRED_STEERING_DOCS['package-type']) {
        if (!mdFiles.includes(doc)) {
          results.warnings.push(`Recommended steering document for CLI projects: ${doc}`);
        } else {
          results.compliance.push(`✅ CLI steering: ${doc}`);
        }
      }
    }

  } catch (error) {
    results.errors.push(`Error reading steering directory: ${error.message}`);
  }
}

/**
 * Validate specs directory structure
 */
async function validateSpecsStructure() {
  const specsDir = '.kiro/specs';
  const repoType = await detectRepositoryType();

  try {
    const entries = await fs.readdir(specsDir, { withFileTypes: true });

    if (entries.length === 0) {
      results.warnings.push('No specs found in .kiro/specs/ - create specs for features using the 3-phase process');
      return;
    }

    // Check for proper spec structure based on repository type
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (repoType === 'monorepo') {
          // For monorepos, expect hierarchical structure
          await validateMonorepoSpecCategory(path.join(specsDir, entry.name));
        } else {
          // For single-project repos, expect flat structure
          await validateSpecDirectory(path.join(specsDir, entry.name));
        }
      } else if (entry.name !== '.gitkeep') {
        results.warnings.push(`Unexpected file in specs root: ${entry.name}`);
      }
    }

  } catch (error) {
    results.errors.push(`Error reading specs directory: ${error.message}`);
  }
}

/**
 * Validate monorepo spec category (apps/, libs/, services/, tools/)
 */
async function validateMonorepoSpecCategory(categoryDir) {
  const categoryName = path.basename(categoryDir);
  const expectedCategories = ['apps', 'libs', 'services', 'tools'];

  if (!expectedCategories.includes(categoryName)) {
    results.warnings.push(`Unexpected spec category: ${categoryName} (expected: ${expectedCategories.join(', ')})`);
    return;
  }

  try {
    const entries = await fs.readdir(categoryDir, { withFileTypes: true });

    if (entries.length === 0) {
      results.warnings.push(`Spec category '${categoryName}' is empty`);
      return;
    }

    // Validate each entry in this category
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const entryPath = path.join(categoryDir, entry.name);

        // Check if this directory contains spec files directly (traditional spec)
        const hasSpecFilesDirect = await hasSpecFiles(entryPath);

        if (hasSpecFilesDirect) {
          // This is a spec directory
          await validateSpecDirectory(entryPath, categoryName);
        } else {
          // This might be a project container - check its subdirectories
          await validateProjectContainer(entryPath, categoryName);
        }
      } else if (entry.name !== '.gitkeep') {
        results.warnings.push(`Unexpected file in ${categoryName}: ${entry.name}`);
      }
    }

  } catch (error) {
    results.errors.push(`Error reading spec category '${categoryName}': ${error.message}`);
  }
}

/**
 * Validate individual spec directory
 */
async function validateSpecDirectory(specDir, category = null) {
  const specName = path.basename(specDir);
  const displayName = category ? `${category}/${specName}` : specName;
  results.specs++;

  try {
    const files = await fs.readdir(specDir);
    const mdFiles = files.filter(f => f.endsWith('.md'));

    // Check for required spec files
    const requiredFiles = ['requirements.md', 'design.md', 'tasks.md'];
    const hasAllRequired = requiredFiles.every(file => mdFiles.includes(file));

    if (!hasAllRequired) {
      const missing = requiredFiles.filter(file => !mdFiles.includes(file));
      results.errors.push(`Spec '${displayName}' missing required files: ${missing.join(', ')}`);
    } else {
      results.compliance.push(`✅ Complete 3-phase spec: ${displayName}`);

      // Validate task tracking format
      await validateTaskTracking(path.join(specDir, 'tasks.md'), displayName);
    }

    // Check for unexpected files
    const unexpected = mdFiles.filter(f => !requiredFiles.includes(f));
    if (unexpected.length > 0) {
      results.warnings.push(`Spec '${specName}' has unexpected files: ${unexpected.join(', ')}`);
    }

  } catch (error) {
    results.errors.push(`Error validating spec '${specName}': ${error.message}`);
  }
}

/**
 * Validate task tracking format in tasks.md
 */
async function validateTaskTracking(tasksFile, specName) {
  try {
    const content = await fs.readFile(tasksFile, 'utf8');
    const lines = content.split('\n');

    let hasTasks = false;
    let hasProperFormat = false;

    for (const line of lines) {
      // Look for task markers
      if (line.match(/^[\s]*[-*]\s*\[[ x]\]/)) {
        hasTasks = true;

        // Check for proper status markers
        if (line.includes('[ ]') || line.includes('[x]') || line.includes('[*]')) {
          hasProperFormat = true;
        } else {
          results.warnings.push(`Spec '${specName}': Task without proper status marker (use [ ], [x], or [*])`);
        }
      }
    }

    if (!hasTasks) {
      results.warnings.push(`Spec '${specName}': No tasks found in tasks.md`);
    } else if (hasProperFormat) {
      results.compliance.push(`✅ Proper task tracking: ${specName}`);
    }

  } catch (error) {
    results.errors.push(`Error reading tasks.md for spec '${specName}': ${error.message}`);
  }
}

/**
 * Validate EARS pattern usage in requirements
 */
async function validateRequirementsQuality() {
  const specsDir = '.kiro/specs';

  try {
    const specDirs = await fs.readdir(specsDir);

    for (const specDir of specDirs) {
      const reqFile = path.join(specsDir, specDir, 'requirements.md');

      try {
        const content = await fs.readFile(reqFile, 'utf8');

        // Check for EARS patterns (External/Acceptance/Requirements/Scenarios)
        const hasExternal = content.toLowerCase().includes('external');
        const hasAcceptance = content.toLowerCase().includes('acceptance');
        const hasRequirements = content.toLowerCase().includes('requirements');
        const hasScenarios = content.toLowerCase().includes('scenarios');

        if (hasExternal || hasAcceptance || hasRequirements || hasScenarios) {
          results.compliance.push(`✅ EARS patterns used: ${specDir}`);
        } else {
          results.warnings.push(`Spec '${specDir}': Consider using EARS patterns (External/Acceptance/Requirements/Scenarios) in requirements.md`);
        }

      } catch {
        // Skip if requirements.md doesn't exist (already reported)
      }
    }

  } catch {
    // Skip if specs directory issues (already reported)
  }
}

/**
 * Main validation function
 */
async function validateSpecCompliance() {
  console.log(colorize('🔍 Validating Kiro Methodology compliance...', 'blue'));

  const isMethodology = await isMethodologyTemplate();

  await validateKiroStructure();

  if (!isMethodology) {
    // Only validate specs for actual projects, not the methodology package
    await validateSpecsStructure();
    await validateRequirementsQuality();
  } else {
    console.log(colorize('📦 Detected methodology package - skipping spec validation', 'cyan'));
  }

  // Report results
  formatResults('COMPLIANCE RESULTS', results);

  // Summary
  const totalIssues = results.errors.length + results.warnings.length;

  if (isMethodology) {
    if (totalIssues === 0) {
      console.log(colorize('\n✅ Methodology package structure is valid!', 'green'));
      return 0;
    } else {
      console.log(colorize(`\n⚠️  Found ${totalIssues} issues in methodology package.`, 'yellow'));
      return 1;
    }
  } else if (totalIssues === 0 && results.specs > 0) {
    console.log(colorize('\n✅ Project is fully compliant with Kiro Methodology!', 'green'));
    return 0;
  } else if (results.specs === 0) {
    console.log(colorize('\n📝 No specs found. Use the Kiro Methodology to create specs for your features.', 'blue'));
    console.log('   Start with: .kiro/specs/feature-name/requirements.md');
    return 0;
  } else {
    console.log(colorize(`\n⚠️  Found ${totalIssues} compliance issues that need attention.`, 'yellow'));
    return 1;
  }
}

// Run validation
validateSpecCompliance().then(code => {
  process.exit(code);
}).catch(error => {
  console.error(colorize(`Fatal error: ${error.message}`, 'red'));
  process.exit(1);
});
