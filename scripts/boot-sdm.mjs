#!/usr/bin/env node

/**
 * Boot Software Development Methodology (SDM)
 *
 * Initializes or upgrades a repository with the Kiro Methodology.
 * Handles both empty projects and existing repositories with intelligent customization.
 *
 * Usage: node scripts/boot-sdm.mjs <target-directory> [options]
 *
 * Options:
 *   --dry-run              Show what would be changed without making changes
 *   --repo-name <name>     Specify repository name for customization
 *   --repo-type <type>      Repository type: 'monolith' or 'monorepo' (auto-detected if not specified)
 *   --author <name>        Author name for documentation customization
 *   --description <text>   Project description for documentation
 *
 * Examples:
 *   node scripts/boot-sdm.mjs /path/to/project          # Boot specific directory
 *   node scripts/boot-sdm.mjs /path/to/project --dry-run # Preview changes
 *   node scripts/boot-sdm.mjs /tmp/new-project --repo-name "My App" --repo-type monolith
 *   node scripts/boot-sdm.mjs /path/to/project --author "John Doe" --description "Web application"
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { fileExists, detectRepositoryType } from './utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const METHODOLOGY_ROOT = path.resolve(__dirname, '..');

/**
 * File manifest defining how each file should be handled
 */
const FILE_MANIFEST = {
  // REPLACE_ALWAYS: Methodology-owned files that should always be overwritten
  REPLACE_ALWAYS: [
    // Core methodology documents
    'AGENTS.md',
    'docs/spec-driven-development.md',

    // Steering documents (methodology-owned)
    '.kiro/steering/greenfield-development.md',
    '.kiro/steering/nodejs-runtime-focus.md',
    '.kiro/steering/workspace-safety.md',
    '.kiro/steering/security-guidelines.md',
    '.kiro/steering/multi-level-validation.md',
    '.kiro/steering/diataxis-documentation.md',
    '.kiro/steering/cli-development-focus.md',
    '.kiro/steering/monorepo-coordination.md',
    '.kiro/steering/release-orchestration.md',
    '.kiro/steering/shared-library-specs.md',
    '.kiro/steering/sprint-orchestration.md',
    '.kiro/steering/steering-hierarchy.md',
    '.kiro/steering/naming-conventions.md',
    '.kiro/steering/readme-guidelines.md',

    // Steering templates
    '.kiro/steering/templates/linking-standards.md',
    '.kiro/steering/templates/explanation-template.md',
    '.kiro/steering/templates/guide-template.md',
    '.kiro/steering/templates/maintenance-checklist.md',
    '.kiro/steering/templates/readme-template.md',
    '.kiro/steering/templates/reference-template.md',
    '.kiro/steering/templates/tutorial-template.md',
    '.kiro/steering/templates/content-guidelines.md',

    // Scripts (methodology-owned)
    'scripts/validate-docs.mjs',
    'scripts/validate-spec-compliance.mjs',
    'scripts/detect-repo-type.mjs',
    'scripts/utils.mjs',
    'scripts/boot-sdm.mjs'
  ],

  // COPY_IF_MISSING: Skeleton files that provide basic content but can be customized
  COPY_IF_MISSING: [
    'docs/how-to/development.md',
    'CONTRIBUTING.md',
    'docs/guides/troubleshooting.md'
  ],

  // SKIP_ALWAYS: User-owned files that should never be touched
  SKIP_ALWAYS: [
    'README.md',  // Always user-owned for existing projects
    'package.json',
    // Any user-created content in docs/, scripts/, etc.
  ]
};

/**
 * Parse command line arguments with enhanced validation
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    targetDir: null,  // Require explicit target directory for safety
    repoName: null,
    repoType: null,
    author: null,
    description: null,
    dryRun: false,
    help: false
  };  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--help':
      case '-h':
        options.help = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--repo-name':
        if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
          options.repoName = args[i + 1];
          i++; // Skip next arg
        } else {
          console.warn(`⚠️  Warning: ${arg} requires a value`);
        }
        break;
      case '--repo-type':
        if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
          options.repoType = args[i + 1];
          i++; // Skip next arg
        } else {
          console.warn(`⚠️  Warning: ${arg} requires a value`);
        }
        break;
      case '--author':
        if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
          options.author = args[i + 1];
          i++; // Skip next arg
        } else {
          console.warn(`⚠️  Warning: ${arg} requires a value`);
        }
        break;
      case '--description':
        if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
          options.description = args[i + 1];
          i++; // Skip next arg
        } else {
          console.warn(`⚠️  Warning: ${arg} requires a value`);
        }
        break;
      default:
        if (!arg.startsWith('--')) {
          // First non-option argument is the target directory
          options.targetDir = arg;
        } else {
          console.warn(`⚠️  Warning: Unknown option ${arg}`);
        }
        break;
    }
  }

  return options;
}

/**
 * Display help information and exit
 */
function showHelp() {
  console.log(`
🚀 Boot Software Development Methodology (Kiro)

Initializes or upgrades a repository with the Kiro Methodology.
Handles both empty projects and existing repositories with intelligent customization.

USAGE:
  node scripts/boot-sdm.mjs <target-directory> [options]

OPTIONS:
  -h, --help              Show this help message
  --dry-run               Show what would be changed without making changes
  --repo-name <name>      Specify repository name for customization
  --repo-type <type>      Repository type: 'monolith' or 'monorepo' (auto-detected if not specified)
  --author <name>         Author name for documentation customization
  --description <text>    Project description for documentation

EXAMPLES:
  node scripts/boot-sdm.mjs /path/to/project                    # Boot specific directory
  node scripts/boot-sdm.mjs /path/to/project --dry-run         # Preview changes
  node scripts/boot-sdm.mjs /tmp/new-project --repo-name "My App" --repo-type monolith
  node scripts/boot-sdm.mjs /path/to/project --author "John Doe" --description "Web application"

For more information, see docs/spec-driven-development.md
`);
  process.exit(0);
}

/**
 * Check if a directory is empty (contains only .git or hidden files)
 */
async function isEmptyProject(dir) {
  try {
    const entries = await fs.readdir(dir);
    const visibleEntries = entries.filter(entry => !entry.startsWith('.'));
    return visibleEntries.length === 0;
  } catch {
    return true; // Directory doesn't exist, treat as empty
  }
}

async function copyFile(source, dest, action, options) {
  const actionEmoji = {
    'REPLACE_ALWAYS': '🔄',
    'COPY_IF_MISSING': '📋',
    'SKIP_ALWAYS': '⏭️',
    'SKIP_UNKNOWN': '❓'
  };

  const actionText = {
    'REPLACE_ALWAYS': 'Replacing',
    'COPY_IF_MISSING': 'Copying (if missing)',
    'SKIP_ALWAYS': 'Skipping (user-owned)',
    'SKIP_UNKNOWN': 'Skipping (unknown file)'
  };

  console.log(`${actionEmoji[action]} ${actionText[action]}: ${path.relative(options.targetDir, dest)}`);

  if (action === 'REPLACE_ALWAYS' || action === 'COPY_IF_MISSING') {
    if (!options.dryRun) {
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.copyFile(source, dest);
    }
  }
  // For SKIP actions, do nothing
}

/**
 * Create minimal README.md for empty projects
 */
async function createMinimalReadme(targetDir, options) {
  const readmePath = path.join(targetDir, 'README.md');

  // Use provided repo name or default to directory name
  const projectName = options.repoName || path.basename(targetDir);
  const projectDescription = options.description || 'This project follows the Kiro Methodology for structured, spec-driven development.';
  const authorCredit = options.author ? `\n**Author:** ${options.author}` : '';

  const content = `# ${projectName}

${projectDescription}

This project follows the [Kiro Methodology](docs/spec-driven-development.md) for structured, spec-driven development.${authorCredit}

## Getting Started

1. Read the [Spec-Driven Development Guide](docs/spec-driven-development.md)
2. Set up your development environment
3. Start your first feature with a spec in \`.kiro/specs/\`

## Project Structure

Some directories contain \`.gitkeep\` files to ensure they're tracked by Git. You can remove these \`.gitkeep\` files once you populate the directories with your content:

- \`.kiro/specs/\` - Root directory for all feature specifications
- \`docs/explanation/\` - For architecture and design explanations
- \`docs/reference/\` - For API references and technical documentation
- \`docs/tutorial/\` - For step-by-step tutorials and guides

## Development

- 📖 [Development Guide](docs/how-to/development.md)
- 🤝 [Contributing Guidelines](CONTRIBUTING.md)
- 🚨 [Troubleshooting](docs/guides/troubleshooting.md)
`;

  if (options.dryRun) {
    console.log('� Would create: README.md (minimal version for empty project)');
  } else {
    await fs.writeFile(readmePath, content);
    console.log('📄 Created: README.md (minimal version for empty project)');
  }
}

/**
 * Process methodology files based on manifest
 */
async function processMethodologyFiles(targetDir, isEmptyProject, options) {
  // Process REPLACE_ALWAYS files
  for (const file of FILE_MANIFEST.REPLACE_ALWAYS) {
    const sourcePath = path.join(METHODOLOGY_ROOT, file);
    const destPath = path.join(targetDir, file);

    if (await fileExists(sourcePath)) {
      await copyFile(sourcePath, destPath, 'REPLACE_ALWAYS', options);
    } else {
      console.log(`⚠️  Source file missing: ${file}`);
    }
  }

  // Process COPY_IF_MISSING files
  for (const file of FILE_MANIFEST.COPY_IF_MISSING) {
    const sourcePath = path.join(METHODOLOGY_ROOT, file);
    const destPath = path.join(targetDir, file);

    // Only copy if destination doesn't exist
    if (!(await fileExists(destPath)) && await fileExists(sourcePath)) {
      await copyFile(sourcePath, destPath, 'COPY_IF_MISSING', options);
    } else if (await fileExists(destPath)) {
      console.log(`⏭️  Skipping (exists): ${file} (user-owned)`);
    }
  }

  // Note: SKIP_ALWAYS files are never processed
  for (const file of FILE_MANIFEST.SKIP_ALWAYS) {
    const destPath = path.join(targetDir, file);
    if (await fileExists(destPath)) {
      console.log(`⏭️  Preserving (user-owned): ${file}`);
    }
  }
}

/**
 * Create .kiro directory structure
 */
async function createKiroStructure(targetDir, options, repoType) {
  const dirs = [
    '.kiro',
    '.kiro/specs',
    '.kiro/steering',
    '.kiro/steering/templates',
    'docs',
    'docs/explanation',
    'docs/guides',
    'docs/how-to',
    'docs/reference',
    'docs/tutorial',
    'scripts'
  ];

  // Add spec subdirectories only for monorepo repositories
  if (repoType === 'monorepo') {
    dirs.push(
      '.kiro/specs/apps',
      '.kiro/specs/libs',
      '.kiro/specs/services',
      '.kiro/specs/tools'
    );
  }

  for (const dir of dirs) {
    const dirPath = path.join(targetDir, dir);
    try {
      if (options.dryRun) {
        console.log(`📋 Would create directory: ${dir}`);
        // Also show .gitkeep creation for spec subdirs in dry-run
        if (repoType === 'monorepo' && dir.startsWith('.kiro/specs/') && dir !== '.kiro/specs') {
          console.log(`📋 Would create file: ${dir}/.gitkeep`);
        }
        // Also show .gitkeep creation for base specs directory and empty diataxis directories
        if (dir === '.kiro/specs' || (dir.startsWith('docs/') && ['docs/explanation', 'docs/reference', 'docs/tutorial'].includes(dir))) {
          console.log(`📋 Would create file: ${dir}/.gitkeep`);
        }
      } else {
        await fs.mkdir(dirPath, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);

        // Create .gitkeep file for spec subdirectories in monorepos
        if (repoType === 'monorepo' && dir.startsWith('.kiro/specs/') && dir !== '.kiro/specs') {
          const gitkeepPath = path.join(dirPath, '.gitkeep');
          await fs.writeFile(gitkeepPath, '');
          console.log(`📄 Created file: ${dir}/.gitkeep`);
        }

        // Create .gitkeep file for base specs directory and empty diataxis directories
        if (dir === '.kiro/specs' || (dir.startsWith('docs/') && ['docs/explanation', 'docs/reference', 'docs/tutorial'].includes(dir))) {
          const gitkeepPath = path.join(dirPath, '.gitkeep');
          await fs.writeFile(gitkeepPath, '');
          console.log(`📄 Created file: ${dir}/.gitkeep`);
        }
      }
    } catch (error) {
      if (error.code !== 'EEXIST') {
        console.warn(`⚠️  Could not create ${dir}: ${error.message}`);
      }
    }
  }
}

/**
 * Validate parsed options and provide user feedback
 */
function validateOptions(options) {
  const errors = [];
  const warnings = [];

  // Require explicit target directory for safety
  if (!options.targetDir) {
    errors.push('Target directory is required. Usage: node boot-sdm.mjs <target-directory> [options]');
  }

  // Validate repository type
  if (options.repoType && !['monolith', 'monorepo'].includes(options.repoType)) {
    errors.push(`Invalid repository type: '${options.repoType}'. Must be 'monolith' or 'monorepo'.`);
  }

  // Check target directory exists or can be created (only if targetDir is provided)
  if (options.targetDir) {
    try {
      const stats = fs.statSync(options.targetDir);
      if (!stats.isDirectory()) {
        errors.push(`Target path exists but is not a directory: ${options.targetDir}`);
      }
    } catch {
      // Directory doesn't exist, that's fine - we'll create it
    }
  }

  // Show warnings for potentially problematic combinations
  // (Currently no warnings needed)

  return { errors, warnings };
}

/**
 * Main boot function
 */
async function bootSDM() {
  const options = parseArgs();

  // Handle help request before validation
  if (options.help) {
    showHelp();
  }

  // Validate options
  const { errors, warnings } = validateOptions(options);
  errors.forEach(error => console.error(`❌ Error: ${error}`));
  warnings.forEach(warning => console.warn(`⚠️  Warning: ${warning}`));

  if (errors.length > 0) {
    console.error('\n❌ Boot failed due to validation errors.');
    process.exit(1);
  }

  console.log('🚀 Booting Software Development Methodology (Kiro)\n');

  const targetDir = path.resolve(options.targetDir);
  const emptyProject = await isEmptyProject(targetDir);

  // Auto-detect repository type if not specified
  const detectedRepoType = options.repoType ? null : await detectRepositoryType(targetDir);
  const repoType = options.repoType || detectedRepoType;
  const repoName = options.repoName || path.basename(targetDir);

  console.log(`📂 Target Directory: ${targetDir}`);
  console.log(`🏗️  Project Type: ${emptyProject ? 'Empty Project' : 'Existing Project'}`);
  console.log(`📊 Repository Type: ${repoType}`);
  console.log(`📦 Repository Name: ${repoName}`);

  if (options.dryRun) {
    console.log('\n🔍 DRY RUN MODE - No files will be modified\n');
  }

  // Create directory structure
  await createKiroStructure(targetDir, options, repoType);

  // Handle README.md based on project type
  if (emptyProject) {
    await createMinimalReadme(targetDir, options);
  } else {
    console.log('⏭️  Preserving existing README.md (user-owned)');
  }

  // Process methodology files according to manifest
  await processMethodologyFiles(targetDir, emptyProject, options);

  console.log('\n' + '='.repeat(60));
  console.log('✅ Software Development Methodology Booted!');
  console.log('='.repeat(60));

  if (emptyProject) {
    console.log('\n🎯 Next Steps for New Project:');
    console.log('  1. Review the generated README.md');
    console.log('  2. Read docs/spec-driven-development.md');
    console.log('  3. Start your first feature: .kiro/specs/feature-name/');
  } else {
    console.log('\n🎯 Next Steps for Existing Project:');
    console.log('  1. Review updated AGENTS.md and docs/spec-driven-development.md');
    console.log('  2. Run validation: node scripts/validate-docs.mjs');
    console.log('  3. Run compliance check: node scripts/validate-spec-compliance.mjs');
  }

  console.log('\n📚 Available Documentation:');
  console.log('  • AGENTS.md - Working in this repository');
  console.log('  • docs/spec-driven-development.md - Development methodology');
  console.log('  • docs/how-to/development.md - Setup and workflow');
  console.log('  • CONTRIBUTING.md - Contribution guidelines');
}

// Run boot if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  bootSDM().catch(console.error);
}

export { bootSDM };