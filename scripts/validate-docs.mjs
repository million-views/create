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
import { colorize, fileExists, getMarkdownFiles, formatResults, isMethodologyTemplate } from './utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose');

// Track validation results
const results = {
  files: 0,
  links: 0,
  brokenLinks: [],
  missingFrontmatter: [],
  codeExamples: 0,
  errors: [],
  warnings: []
};

/**
 * Check if a file is a placeholder Diátaxis document in the methodology package
 */
function isPlaceholderDiataxisDoc(filePath) {
  const relativePath = path.relative(process.cwd(), filePath);

  // Skip Diátaxis docs that are placeholders (not steering docs)
  const diataxisPlaceholderDirs = [
    'docs/tutorial/',
    'docs/explanation/',
    'docs/guides/',
    'docs/how-to/',
    'docs/reference/'
  ];

  return diataxisPlaceholderDirs.some(dir => relativePath.startsWith(dir));
}

/**
 * Check if this is the methodology package itself (unborn state)
 */
/**
 * Validate frontmatter in markdown files
 */
async function validateFrontmatter(filePath, content) {
  const relativePath = path.relative(process.cwd(), filePath);
  const absolutePath = path.resolve(filePath);

  // Skip frontmatter validation for all files under .kiro/specs/ and .kiro/steering/
  // Frontmatter validation should only apply to docs under docs/**
  if (relativePath.includes('.kiro/specs/') || relativePath.includes('.kiro/steering/')) {
    return;
  }

  const lines = content.split('\n');
  const frontmatterStart = lines.findIndex(line => line.trim() === '---');

  if (frontmatterStart === -1) {
    results.missingFrontmatter.push(filePath);
    return;
  }

  const frontmatterEnd = lines.findIndex((line, index) => index > frontmatterStart && line.trim() === '---');

  if (frontmatterEnd === -1) {
    results.errors.push(`file://${absolutePath}:1:1: Frontmatter not properly closed`);
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
  const recommendedFields = [];
  if (expectedType !== 'unknown') {
    // Regular docs should have standard frontmatter
    recommendedFields.push('title', 'description');
    if (expectedType !== 'unknown') {
      recommendedFields.push('type');
    }
  }

  for (const field of recommendedFields) {
    if (!frontmatter[field]) {
      results.warnings.push(`file://${absolutePath}:1:1: Missing recommended frontmatter field '${field}'`);
    }
  }

  // Validate type field if present
  if (frontmatter.type && expectedType !== 'unknown' && frontmatter.type !== expectedType) {
    results.warnings.push(`file://${absolutePath}:1:1: Frontmatter type '${frontmatter.type}' doesn't match expected type '${expectedType}'`);
  }
}

/**
 * Validate internal links in markdown content
 */
async function validateLinks(filePath, content, allFiles) {
  const relativePath = path.relative(process.cwd(), filePath);
  const absolutePath = path.resolve(filePath);

  // Skip link validation for steering files (they may contain example/template links)
  if (relativePath.includes('.kiro/steering/')) {
    return;
  }

  // More robust regex that avoids matching complex patterns in code blocks or quotes
  // Only match simple markdown links, not complex regex patterns
  const linkRegex = /^\s*\[([^\]]+)\]\(([^)\s]+)\)/gm;
  const fileDir = path.dirname(filePath);
  const _relativePaths = allFiles.map(f => path.relative(fileDir, f));

  let match;
  while ((match = linkRegex.exec(content)) !== null) {
    const [_fullMatch, text, link] = match;
    results.links++;

    // Skip external links and anchors
    if (link.startsWith('http') || link.startsWith('#') || link.startsWith('mailto:')) {
      continue;
    }

    // Skip links that contain regex special characters (likely code examples)
    if (/[[\]{}()*+?.\\^$|]/.test(link)) {
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

      results.brokenLinks.push(`file://${absolutePath}:1:1: Broken link '${link}' (${text})`);
    }
  }
}

/**
 * Validate code examples in markdown
 */
function validateCodeExamples(filePath, content) {
  const absolutePath = path.resolve(filePath);
  const codeBlockRegex = /```(\S+)?\n([\s\S]*?)```/g;

  let match;
  while ((match = codeBlockRegex.exec(content)) !== null) {
    const [_fullMatch, language, code] = match;
    results.codeExamples++;

    // Calculate the line number where this code block starts
    const beforeMatch = content.substring(0, match.index);
    const lineNumber = beforeMatch.split('\n').length;

    // Skip validation for code blocks that appear to be fragments from nested structures
    // This happens when regex incorrectly parses nested code blocks
    const isLikelyFragment = !language && (
      code.includes('### ') || // Markdown headers
      code.includes('Alternatively') || // Continuation of text
      code.includes('**✅') || // Markdown formatting
      code.includes('**❌') || // Markdown formatting
      code.match(/\n\n\w/) || // Paragraph breaks
      code.match(/^\n## /) || // Starts with header
      code.trim().length > 50 || // Longer content that looks like markdown
      code.startsWith('\n**') || // Starts with markdown formatting
      code.match(/^\n- "/) // Starts with markdown list
    );

    if (!isLikelyFragment && !language && code.trim().length > 0) {
      results.warnings.push(`file://${absolutePath}:${lineNumber}:1: Code block without language specification`);
    }

    // Check for incomplete code blocks (though regex should handle this)
    if (code.includes('```')) {
      results.errors.push(`file://${absolutePath}:${lineNumber}:1: Nested or malformed code block`);
    }
  }
}

/**
 * Validate Diátaxis structure
 */
function validateDiataxisStructure(filePath) {
  const absolutePath = path.resolve(filePath);
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
      results.warnings.push(`file://${absolutePath}:1:1: Non-descriptive filename in Diátaxis directory`);
    }
  }
}

/**
 * Validate terminology consistency (package vs tool references)
 */
function validateTerminology(filePath, content) {
  const relativePath = path.relative(process.cwd(), filePath);
  const absolutePath = path.resolve(filePath);

  // Skip terminology validation for steering files (they may contain example/template content)
  if (relativePath.includes('.kiro/steering/')) {
    return;
  }

  // Skip terminology validation for spec files (they may contain historical references)
  if (relativePath.includes('.kiro/specs/')) {
    return;
  }

  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for incorrect references to old package name
    if (line.includes('@m5nv/create') && !line.includes('@m5nv/create-scaffold')) {
      results.errors.push(`file://${absolutePath}:${i + 1}:1: Incorrect reference to old package name '@m5nv/create' (should be '@m5nv/create-scaffold')`);
    }

    // Check for incorrect tool references with package prefix
    if (line.includes('@m5nv/make-template')) {
      results.errors.push(`file://${absolutePath}:${i + 1}:1: Incorrect tool reference '@m5nv/make-template' (should be just 'make-template')`);
    }

    // Check for package references when tool is meant (context-dependent warnings)
    // Only warn for specific problematic patterns, not general "provides tools" statements
    const problematicPackageToolRegex =
      /@m5nv\/create-scaffold\s+(?:is\s+)?(?:a\s+)?(?:CLI tool|command|executable)(?!s)/gi;
    if (problematicPackageToolRegex.test(line)) {
      results.warnings.push(`file://${absolutePath}:${i + 1}:1: Package reference '@m5nv/create-scaffold' used with singular tool terminology - consider if this should refer to the package or individual tool`);
    }
  }
}

/**
 * Main validation function
 * @param {Object} options - Validation options
 * @param {boolean} [options.verbose] - Enable verbose output
 * @returns {Promise<{exitCode: number, results: Object}>} Validation results
 */
export async function validateDocumentation(options = {}) {
  const verbose = options.verbose ?? VERBOSE;
  console.log(colorize('🔍 Validating documentation following Kiro Methodology...', 'blue'));

  const isMethodology = await isMethodologyTemplate(process.cwd(), {
    checkPath: true,      // Check directory path for methodology indicators
    checkContent: true    // Check documentation content for placeholder markers
  });

  // Find documentation directories (common patterns)
  const possibleDocDirs = [
    'docs',
    'documentation',
    'README.md', // Check root README
    '.kiro/specs', // Check spec documentation
    '.kiro/steering' // Check steering documentation
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

    // Skip validation of placeholder Diátaxis docs in methodology package
    if (isMethodology && isPlaceholderDiataxisDoc(file)) {
      if (verbose) {
        console.log(`Skipping placeholder doc: ${file}`);
      }
      continue;
    }

    if (verbose) {
      console.log(`Validating: ${file}`);
    }

    try {
      const content = await fs.readFile(file, 'utf8');

      await validateFrontmatter(file, content);
      await validateLinks(file, content, files);
      validateCodeExamples(file, content);
      validateDiataxisStructure(file);
      validateTerminology(file, content);

    } catch (error) {
      const absolutePath = path.resolve(file);
      results.errors.push(`file://${absolutePath}:1:1: ${error.message}`);
    }
  }

  // Report results
  formatResults('VALIDATION RESULTS', results);

  // Summary
  const totalIssues = results.errors.length +
    results.warnings.length +
    results.brokenLinks.length +
    results.missingFrontmatter.length;

  if (totalIssues === 0) {
    return { exitCode: 0, results };
  } else {
    console.log('Run validation again after fixing issues.');
    return { exitCode: 1, results };
  }
}

// Run validation when executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  validateDocumentation().then(({ exitCode }) => {
    process.exit(exitCode);
  }).catch(error => {
    console.error(colorize(`Fatal error: ${error.message}`, 'red'));
    process.exit(1);
  });
}
