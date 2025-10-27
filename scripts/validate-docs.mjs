#!/usr/bin/env node

/**
 * Documentation Validation Script
 * Validates all internal links, code examples, and frontmatter metadata
 * 
 * Follows principles from .kiro/steering/documentation-standards.md
 * to avoid maintenance liabilities in documentation.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const docsDir = path.join(rootDir, 'docs');

// Track validation results
const results = {
  files: 0,
  links: 0,
  brokenLinks: [],
  missingFrontmatter: [],
  codeExamples: 0,
  errors: []
};

/**
 * Get all markdown files in docs directory
 */
async function getMarkdownFiles(dir) {
  const files = [];
  
  async function traverse(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        await traverse(fullPath);
      } else if (entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }
  
  await traverse(dir);
  return files;
}

/**
 * Validate frontmatter metadata
 */
function validateFrontmatter(content, filePath) {
  // Skip template files as they contain placeholders
  if (filePath.includes('_templates/')) {
    return true;
  }
  
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  
  if (!frontmatterMatch) {
    
    results.missingFrontmatter.push(filePath);
    return false;
  }
  
  const frontmatter = frontmatterMatch[1];
  const requiredFields = ['title', 'type', 'last_updated'];
  
  for (const field of requiredFields) {
    if (!frontmatter.includes(`${field}:`)) {
      results.errors.push(`${filePath}: Missing required frontmatter field: ${field}`);
      return false;
    }
  }
  
  return true;
}

/**
 * Extract and validate internal links
 */
async function validateLinks(content, filePath) {
  // Skip template files as they contain placeholder links
  if (filePath.includes('_templates/')) {
    return;
  }
  
  // Match markdown links: [text](path)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  
  while ((match = linkRegex.exec(content)) !== null) {
    const linkText = match[1];
    const linkPath = match[2];
    
    // Skip external links
    if (linkPath.startsWith('http://') || linkPath.startsWith('https://')) {
      continue;
    }
    
    // Skip anchors and special links
    if (linkPath.startsWith('#') || linkPath.startsWith('mailto:')) {
      continue;
    }
    
    results.links++;
    
    // Resolve relative path
    const fileDir = path.dirname(filePath);
    let targetPath = path.resolve(fileDir, linkPath);
    
    // Remove anchor if present
    const anchorIndex = targetPath.indexOf('#');
    if (anchorIndex !== -1) {
      targetPath = targetPath.substring(0, anchorIndex);
    }
    
    // Check if target file exists
    try {
      await fs.access(targetPath);
    } catch (error) {
      results.brokenLinks.push({
        file: filePath,
        link: linkPath,
        text: linkText,
        resolvedPath: targetPath
      });
    }
  }
}

/**
 * Validate code examples (basic syntax check)
 */
function validateCodeExamples(content, filePath) {
  // Skip template files as they contain placeholder code
  if (filePath.includes('_templates/')) {
    return;
  }
  
  // Match code blocks: ```language\ncode\n```
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)\n```/g;
  let match;
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
    const language = match[1];
    const code = match[2];
    
    results.codeExamples++;
    
    // Basic validation for bash commands
    if (language === 'bash') {
      // Check for common issues - look for dangerous root deletion
      if (code.match(/rm\s+-rf\s+\/\s*[^a-zA-Z]/)) {
        results.errors.push(`${filePath}: Dangerous command in code example: rm -rf /`);
      }
      
      // Check for proper npm create syntax
      if (code.includes('npm create @m5nv/scaffold') && !code.includes('--')) {
        results.errors.push(`${filePath}: Missing -- separator in npm create command`);
      }
    }
    
    // Basic validation for JavaScript/JSON
    if (language === 'javascript' || language === 'json') {
      // Check for basic syntax issues (very basic)
      const openBraces = (code.match(/\{/g) || []).length;
      const closeBraces = (code.match(/\}/g) || []).length;
      
      if (openBraces !== closeBraces) {
        results.errors.push(`${filePath}: Mismatched braces in ${language} code example`);
      }
    }
  }
}

/**
 * Validate terminology consistency
 */
function validateTerminology(content, filePath) {
  // Skip template files as they contain examples
  if (filePath.includes('_templates/')) {
    return;
  }
  
  const issues = [];
  
  // Check for consistent package name usage
  if (content.includes('create-scaffold') && !content.includes('@m5nv/create-scaffold')) {
    issues.push('Use full package name @m5nv/create-scaffold');
  }
  
  // Check for consistent CLI vs cli usage
  if (content.includes(' cli ') || content.includes(' Cli ')) {
    issues.push('Use "CLI" (uppercase) for Command Line Interface');
  }
  
  // Check for consistent Node.js vs NodeJS
  if (content.includes('NodeJS') || content.match(/\bnode\.js\b/)) {
    issues.push('Use "Node.js" (with capital N and period)');
  }
  
  if (issues.length > 0) {
    results.errors.push(`${filePath}: Terminology issues: ${issues.join(', ')}`);
  }
}

/**
 * Check for maintenance liabilities (specific numbers that will change)
 * Based on .kiro/steering/documentation-standards.md
 */
function validateMaintenanceLiabilities(content, filePath) {
  // Skip template files as they contain examples
  if (filePath.includes('_templates/')) {
    return;
  }
  
  const liabilities = [];
  
  // Remove code blocks and example output to avoid false positives
  const contentWithoutCodeBlocks = content
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/│[^│]*│/g, '') // Remove table/box content (example output)
    .replace(/^\s*\$.*$/gm, '') // Remove command line examples
    .replace(/^.*version\s+\d+\.\d+\.\d+.*$/gm, ''); // Remove version output examples
  
  // Patterns that indicate maintenance liabilities
  const patterns = [
    // Test count patterns in documentation text (not examples)
    { regex: /\*\*\d+\+?\s+[^*]*tests?\*\*/gi, desc: 'specific test counts in bold' },
    { regex: /(?:must\s+maintain|All\s+contributions\s+must\s+maintain)[\s\S]*?\d+\+?\s+(?:functional|unit|integration|spec\s+compliance|smoke|resource\s+leak)\s+tests?/gi, desc: 'specific test count requirements' },
    
    // File/component count patterns in requirements (not examples)
    { regex: /\*\*\d+\+?\s+files?\*\*/gi, desc: 'specific file counts in bold' },
    { regex: /(?:project\s+has|contains|includes)\s+\d+\+?\s+(?:components?|modules?|endpoints?)/gi, desc: 'specific component counts' },
    
    // Version requirements (not example output)
    { regex: /(?:requires?|needs?)\s+Node\.js\s+\d+\+?/gi, desc: 'specific Node.js version requirements' },
    { regex: /Node\.js\s+\d+\+?\s+(?:required|needed|or\s+(?:later|higher))/gi, desc: 'specific Node.js version requirements' }
  ];
  
  for (const pattern of patterns) {
    const matches = contentWithoutCodeBlocks.match(pattern.regex);
    if (matches) {
      for (const match of matches) {
        liabilities.push(`${pattern.desc}: "${match.trim()}"`);
      }
    }
  }
  
  if (liabilities.length > 0) {
    results.errors.push(`${filePath}: Maintenance liabilities found: ${liabilities.join(', ')}`);
  }
}

/**
 * Main validation function
 */
async function validateDocumentation() {
  console.log('🔍 Validating documentation...\n');
  
  try {
    // Get all markdown files
    const markdownFiles = await getMarkdownFiles(docsDir);
    
    // Also check README.md in root
    markdownFiles.push(path.join(rootDir, 'README.md'));
    markdownFiles.push(path.join(rootDir, 'CONTRIBUTING.md'));
    
    results.files = markdownFiles.length;
    
    // Validate each file
    for (const filePath of markdownFiles) {
      const content = await fs.readFile(filePath, 'utf8');
      const relativePath = path.relative(rootDir, filePath);
      
      console.log(`📄 Validating ${relativePath}`);
      
      // Validate frontmatter
      validateFrontmatter(content, relativePath);
      
      // Validate links
      await validateLinks(content, filePath);
      
      // Validate code examples
      validateCodeExamples(content, relativePath);
      
      // Validate terminology
      validateTerminology(content, relativePath);
      
      // Check for maintenance liabilities
      validateMaintenanceLiabilities(content, relativePath);
    }
    
    // Print results
    console.log('\n📊 Validation Results:');
    console.log(`Files checked: ${results.files}`);
    console.log(`Links validated: ${results.links}`);
    console.log(`Code examples: ${results.codeExamples}`);
    
    if (results.missingFrontmatter.length > 0) {
      console.log('\n❌ Files missing frontmatter:');
      results.missingFrontmatter.forEach(file => {
        console.log(`  - ${file}`);
      });
    }
    
    if (results.brokenLinks.length > 0) {
      console.log('\n❌ Broken internal links:');
      results.brokenLinks.forEach(link => {
        console.log(`  - ${link.file}: [${link.text}](${link.link})`);
        console.log(`    Resolved to: ${link.resolvedPath}`);
      });
    }
    
    if (results.errors.length > 0) {
      console.log('\n❌ Validation errors:');
      results.errors.forEach(error => {
        console.log(`  - ${error}`);
      });
    }
    
    const hasErrors = results.missingFrontmatter.length > 0 || 
                     results.brokenLinks.length > 0 || 
                     results.errors.length > 0;
    
    if (hasErrors) {
      console.log('\n❌ Documentation validation failed');
      process.exit(1);
    } else {
      console.log('\n✅ Documentation validation passed');
    }
    
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
  }
}

// Run validation
validateDocumentation();