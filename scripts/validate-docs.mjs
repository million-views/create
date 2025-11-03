#!/usr/bin/env node

/**
 * Documentation Validation Script for Kiro Methodology
 * Validates documentation following Diátaxis framework principles
 *
 * This script can be used in any project following the Kiro Methodology
 * to validate documentation structure, links, and content quality.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { colorize, fileExists, getMarkdownFiles, formatResults, calculateExitCode } from './utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const FIX_MODE = args.includes('--fix');
const VERBOSE = args.includes('--verbose');

// Track validation results
const results = {
  files: 0,
  links: 0,
  brokenLinks: [],
  missingFrontmatter: [],
  codeExamples: 0,
  errors: [],
  warnings: [],
  fixesApplied: []
};

/**
 * Validate frontmatter in a markdown file
 */
async function validateFrontmatter(filePath, content) {
  // Skip frontmatter validation for spec files (requirements.md, design.md, tasks.md)
  const specFileName = path.basename(filePath, '.md');
  const relativePath = path.relative(process.cwd(), filePath);

  if (relativePath.includes('.kiro/specs/') &&
      (specFileName === 'requirements' || specFileName === 'design' || specFileName === 'tasks')) {
    return; // Skip frontmatter validation for spec files
  }

  const lines = content.split('\n');
  const frontmatterStart = lines.findIndex(line => line.trim() === '---');

  if (frontmatterStart === -1) {
    results.missingFrontmatter.push(filePath);
    return;
  }

  const frontmatterEnd = lines.findIndex((line, index) => index > frontmatterStart && line.trim() === '---');

  if (frontmatterEnd === -1) {
    results.errors.push(`${filePath}: Frontmatter not properly closed`);
    return;
  }

  const frontmatterLines = lines.slice(frontmatterStart + 1, frontmatterEnd);

  // Check for required fields based on Diátaxis type
  const fileName = path.basename(filePath, '.md');
  const dirName = path.basename(path.dirname(filePath));

  // Determine Diátaxis type from directory structure
  let expectedType = 'unknown';
  if (dirName === 'tutorial' || fileName.includes('tutorial')) expectedType = 'tutorial';
  else if (dirName === 'guides' || fileName.includes('guide')) expectedType = 'how-to';
  else if (dirName === 'reference' || fileName.includes('reference')) expectedType = 'reference';
  else if (dirName === 'explanation' || fileName.includes('explanation')) expectedType = 'explanation';

  const frontmatter = {};
  for (const line of frontmatterLines) {
    const match = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (match) {
      frontmatter[match[1]] = match[2];
    }
  }

  // Check for recommended frontmatter fields
  const recommendedFields = ['title', 'description'];
  if (expectedType !== 'unknown') {
    recommendedFields.push('type');
  }

  for (const field of recommendedFields) {
    if (!frontmatter[field]) {
      results.warnings.push(`${filePath}: Missing recommended frontmatter field '${field}'`);
    }
  }

  // Validate type field if present
  if (frontmatter.type && expectedType !== 'unknown' && frontmatter.type !== expectedType) {
    results.warnings.push(`${filePath}: Frontmatter type '${frontmatter.type}' doesn't match expected type '${expectedType}'`);
  }
}

/**
 * Validate internal links in markdown content
 */
async function validateLinks(filePath, content, allFiles) {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const fileDir = path.dirname(filePath);
  const relativePaths = allFiles.map(f => path.relative(fileDir, f));

  let match;
  while ((match = linkRegex.exec(content)) !== null) {
    const [fullMatch, text, link] = match;
    results.links++;

    // Skip external links and anchors
    if (link.startsWith('http') || link.startsWith('#') || link.startsWith('mailto:')) {
      continue;
    }

    // Check relative links
    const resolvedPath = path.resolve(fileDir, link);
    const exists = await fileExists(resolvedPath);

    if (!exists) {
      // Try with .md extension if not present
      if (!link.endsWith('.md')) {
        const withMd = resolvedPath + '.md';
        if (await fileExists(withMd)) {
          continue;
        }
      }

      results.brokenLinks.push(`${filePath}: Broken link '${link}' (${text})`);
    }
  }
}

/**
 * Validate code examples in markdown
 */
function validateCodeExamples(filePath, content) {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;

  let match;
  while ((match = codeBlockRegex.exec(content)) !== null) {
    const [fullMatch, language, code] = match;
    results.codeExamples++;

    // Basic validation - check for common issues
    if (!language && code.trim().length > 0) {
      results.warnings.push(`${filePath}: Code block without language specification`);
    }

    // Check for incomplete code blocks (though regex should handle this)
    if (code.includes('```')) {
      results.errors.push(`${filePath}: Nested or malformed code block`);
    }
  }
}

/**
 * Validate Diátaxis structure
 */
function validateDiataxisStructure(filePath) {
  const dirName = path.basename(path.dirname(filePath));
  const fileName = path.basename(filePath, '.md');

  // Check if file follows Diátaxis naming conventions
  const diataxisDirs = ['tutorial', 'guides', 'reference', 'explanation'];

  if (diataxisDirs.includes(dirName)) {
    // File is in a Diátaxis directory - validate naming
    if (fileName === 'README') {
      // README files are allowed in Diátaxis directories
      return;
    }

    // Check for descriptive names
    if (fileName.length < 3 || /^\d+$/.test(fileName)) {
      results.warnings.push(`${filePath}: Non-descriptive filename in Diátaxis directory`);
    }
  }
}

/**
 * Main validation function
 */
async function validateDocumentation() {
  console.log(colorize('🔍 Validating documentation following Kiro Methodology...', 'blue'));

  // Find documentation directories (common patterns)
  const possibleDocDirs = [
    'docs',
    'documentation',
    'README.md', // Check root README
    '.kiro/specs' // Check spec documentation
  ];

  const docDirs = [];
  for (const dir of possibleDocDirs) {
    try {
      await fs.access(dir);
      docDirs.push(dir);
    } catch {
      // Directory doesn't exist, skip
    }
  }

  if (docDirs.length === 0) {
    console.log(colorize('No documentation directories found. Looking for individual .md files...', 'yellow'));
    // Look for .md files in current directory
    docDirs.push('.');
  }

  console.log(`Found documentation directories: ${docDirs.join(', ')}`);

  const files = await getMarkdownFiles(docDirs);
  console.log(`Found ${files.length} markdown files to validate`);

  // Validate each file
  for (const file of files) {
    results.files++;
    if (VERBOSE) {
      console.log(`Validating: ${file}`);
    }

    try {
      const content = await fs.readFile(file, 'utf8');

      await validateFrontmatter(file, content);
      await validateLinks(file, content, files);
      validateCodeExamples(file, content);
      validateDiataxisStructure(file);

    } catch (error) {
      results.errors.push(`${file}: ${error.message}`);
    }
  }

  // Report results
  formatResults('VALIDATION RESULTS', results);

  // Summary
  const totalIssues = results.errors.length + results.warnings.length + results.brokenLinks.length + results.missingFrontmatter.length;

  if (totalIssues === 0) {
    return 0;
  } else {
    if (FIX_MODE) {
      console.log('Run without --fix to see current status.');
    } else {
      console.log('Run with --fix to automatically fix some issues.');
    }
    return 1;
  }
}

// Run validation
validateDocumentation().then(code => {
  process.exit(code);
}).catch(error => {
  console.error(colorize(`Fatal error: ${error.message}`, 'red'));
  process.exit(1);
});