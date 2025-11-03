#!/usr/bin/env node

/**
 * Post-Migration Customization Script
 *
 * Automates the customization of Kiro Methodology files after copying
 * the methodology package to a new repository.
 *
 * Usage: node scripts/customize-methodology.mjs [options]
 *
 * Options:
 *   --repo-name <name>     Repository name (defaults to current directory name)
 *   --repo-type <type>     Repository type: 'single-project' or 'monorepo' (auto-detected if not provided)
 *   --author <name>        Author name for documentation
 *   --description <desc>   Repository description
 *   --dry-run              Show what would be changed without making changes
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { readPackageJson } from './utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
      options[key] = value;
    }
  }

  return options;
}

/**
 * Get current directory name as default repo name
 */
function getDefaultRepoName() {
  return path.basename(process.cwd());
}

/**
 * Detect repository type using the detection script
 */
async function detectRepoType() {
  try {
    const { detectRepositoryType } = await import('./detect-repo-type.mjs');
    return await detectRepositoryType();
  } catch {
    // Fallback detection
    try {
      const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
      const hasWorkspaces = packageJson.workspaces && packageJson.workspaces.length > 0;
      return hasWorkspaces ? 'monorepo' : 'single-project';
    } catch {
      return 'single-project';
    }
  }
}

/**
 * Read package.json for repository info
 */
async function readPackageInfo() {
  const packageJson = await readPackageJson();
  if (!packageJson) {
    return {
      name: getDefaultRepoName(),
      description: '',
      author: ''
    };
  }

  return {
    name: packageJson.name || getDefaultRepoName(),
    description: packageJson.description || '',
    author: packageJson.author || ''
  };
}

/**
 * Update README.md with repository-specific information
 */
async function customizeReadme(options, packageInfo, repoType) {
  const readmePath = 'README.md';
  let content = await fs.readFile(readmePath, 'utf8');

  // Update repository name
  content = content.replace(
    /# Kiro Methodology Package/,
    `# ${options.repoName || packageInfo.name}`
  );

  // Update description
  if (options.description || packageInfo.description) {
    const description = options.description || packageInfo.description;
    content = content.replace(
      /> \*\*NOTE\*\*: This is a reference methodology package.*/,
      `> ${description}\n\n> **Development Methodology**: This project follows the [Kiro Methodology](.kiro/steering/) for structured, spec-driven development.`
    );
  }

  // Add repository type information
  const typeSection = repoType === 'monorepo'
    ? '\n## Repository Type\n\nThis is a **monorepo** that manages multiple deployable packages using npm/pnpm workspaces. See [.kiro/steering/monorepo-coordination.md](.kiro/steering/monorepo-coordination.md) for cross-package coordination guidelines.\n'
    : '\n## Repository Type\n\nThis is a **single-project repository** that produces one deployable artifact. See [.kiro/steering/greenfield-development.md](.kiro/steering/greenfield-development.md) for development guidelines.\n';

  // Insert after the description
  const descMatch = content.match(/> \*\*Development Methodology\*\*:.*\n\n/);
  if (descMatch) {
    content = content.replace(descMatch[0], descMatch[0] + typeSection);
  }

  if (!options.dryRun) {
    await fs.writeFile(readmePath, content);
    console.log('✅ Updated README.md');
  } else {
    console.log('📋 Would update README.md');
  }

  return content;
}

/**
 * Update AGENTS.md with repository-specific information
 */
async function customizeAgentsMd(options, packageInfo, repoType) {
  const agentsPath = 'AGENTS.md';
  let content = await fs.readFile(agentsPath, 'utf8');

  // Update repository name references
  content = content.replace(/this repository/g, packageInfo.name);
  content = content.replace(/This repository/g, `${packageInfo.name} repository`);

  // Add repository type specific guidance
  if (repoType === 'monorepo') {
    const monorepoSection = `

## Monorepo-Specific Guidance

Since ${packageInfo.name} is a monorepo, remember these additional considerations:

### Territory Boundaries
- **apps/**: User-facing applications
- **libs/**: Shared libraries used across packages
- **services/**: Backend services with remote interfaces
- **tools/**: CLI tools and utilities

### Cross-Package Coordination
- Always check [.kiro/steering/monorepo-coordination.md](.kiro/steering/monorepo-coordination.md) for cross-package changes
- Use hierarchical specs: \`.kiro/specs/{apps,libs,services,tools}/feature-name/\`
- Coordinate releases through [.kiro/steering/release-orchestration.md](.kiro/steering/release-orchestration.md)

### Shared Library Changes
- Follow [.kiro/steering/shared-library-specs.md](.kiro/steering/shared-library-specs.md) for library modifications
- Test all dependent packages when making breaking changes
`;

    // Insert before the final section
    const finalSectionMatch = content.match(/## 8\. Monorepo Boundaries/);
    if (finalSectionMatch) {
      content = content.replace(finalSectionMatch[0], monorepoSection + finalSectionMatch[0]);
    }
  }

  if (!options.dryRun) {
    await fs.writeFile(agentsPath, content);
    console.log('✅ Updated AGENTS.md');
  } else {
    console.log('📋 Would update AGENTS.md');
  }

  return content;
}

/**
 * Update spec-driven-development.md with repository context
 */
async function customizeSpecDoc(options, packageInfo, repoType) {
  const specPath = 'docs/spec-driven-development.md';
  let content = await fs.readFile(specPath, 'utf8');

  // Update repository name references
  content = content.replace(/your project/g, packageInfo.name);
  content = content.replace(/your repository/g, `${packageInfo.name} repository`);

  // Update spec structure guidance based on repo type
  if (repoType === 'monorepo') {
    const monorepoSpecGuidance = `
### Monorepo Spec Structure

For ${packageInfo.name} (monorepo), organize specs hierarchically:

\`\`\`
.kiro/specs/
├── apps/                    # Application-specific features
│   └── app-name/
│       └── feature-name/
│           ├── requirements.md
│           ├── design.md
│           └── tasks.md
├── libs/                    # Shared library features
│   └── lib-name/
│       └── feature-name/
│           ├── requirements.md
│           ├── design.md
│           └── tasks.md
├── services/                # Service-specific features
├── tools/                   # Tool-specific features
└── shared/                  # Cross-cutting features
\`\`\`
`;

    // Replace the single-project spec structure section
    const specStructureMatch = content.match(/### Spec Structure[\s\S]*?```/);
    if (specStructureMatch) {
      content = content.replace(specStructureMatch[0], monorepoSpecGuidance);
    }
  }

  if (!options.dryRun) {
    await fs.writeFile(specPath, content);
    console.log('✅ Updated docs/spec-driven-development.md');
  } else {
    console.log('📋 Would update docs/spec-driven-development.md');
  }

  return content;
}

/**
 * Create initial .kiro directory structure
 */
async function createKiroStructure(repoType) {
  const dirs = [
    '.kiro',
    '.kiro/specs',
    '.kiro/steering'
  ];

  if (repoType === 'monorepo') {
    dirs.push(
      '.kiro/specs/apps',
      '.kiro/specs/libs',
      '.kiro/specs/services',
      '.kiro/specs/tools'
    );
  }

  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    } catch (error) {
      if (error.code !== 'EEXIST') {
        console.warn(`⚠️  Could not create ${dir}: ${error.message}`);
      }
    }
  }
}

/**
 * Main customization function
 */
async function customizeMethodology() {
  const options = parseArgs();

  console.log('🔧 Kiro Methodology Post-Migration Customization\n');

  // Gather repository information
  const packageInfo = await readPackageInfo();
  const repoType = options.repoType || await detectRepoType();

  console.log(`📦 Repository: ${options.repoName || packageInfo.name}`);
  console.log(`🏗️  Type: ${repoType}`);
  console.log(`👤 Author: ${options.author || packageInfo.author || 'Not specified'}`);
  console.log(`📝 Description: ${options.description || packageInfo.description || 'Not specified'}`);

  if (options.dryRun) {
    console.log('\n🔍 DRY RUN MODE - No files will be modified\n');
  }

  // Perform customizations
  await customizeReadme(options, packageInfo, repoType);
  await customizeAgentsMd(options, packageInfo, repoType);
  await customizeSpecDoc(options, packageInfo, repoType);
  await createKiroStructure(repoType);

  console.log('\n' + '='.repeat(50));
  console.log('✅ Customization Complete!');
  console.log('='.repeat(50));
  console.log('\n📋 Next Steps:');
  console.log('  1. Review the updated files for accuracy');
  console.log('  2. Update any project-specific steering documents');
  console.log('  3. Run validation: node scripts/validate-docs.mjs');
  console.log('  4. Start your first feature with: .kiro/specs/feature-name/requirements.md');

  if (repoType === 'monorepo') {
    console.log('\n🏗️  Monorepo Setup:');
    console.log('  • Create package directories under apps/, libs/, services/, tools/');
    console.log('  • Review monorepo-coordination.md for cross-package workflows');
    console.log('  • Set up release orchestration for multi-package deployments');
  }
}

// Run customization if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  customizeMethodology().catch(console.error);
}

export { customizeMethodology };