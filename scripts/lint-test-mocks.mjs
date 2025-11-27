#!/usr/bin/env node

/**
 * Test Mock Detection Script
 *
 * Scans test files for patterns that might indicate mock usage violations.
 * This is a companion to the zero-mock philosophy documented in testing.md.
 *
 * WHAT IT CHECKS:
 * 1. Mock/stub naming patterns that suggest mocking implementations
 * 2. Jest/Sinon/other mocking framework imports
 * 3. Variable names that suggest mock objects
 *
 * WHAT IT ALLOWS:
 * 1. Test doubles used via dependency injection (TestPromptAdapter, etc.)
 * 2. Minimal dependency objects (minimalRegistry, etc.)
 * 3. Test fixtures created with real L0 operations
 *
 * Usage: node scripts/lint-test-mocks.mjs [--fix]
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testsDir = path.join(__dirname, '..', 'tests');

// Patterns that suggest mock/stub usage (case-insensitive)
const SUSPICIOUS_PATTERNS = [
  // Mocking framework imports
  { pattern: /import.*from ['"]jest['"]/, message: 'Jest mocking framework detected' },
  { pattern: /import.*from ['"]sinon['"]/, message: 'Sinon mocking framework detected' },
  { pattern: /import.*from ['"]@jest\/globals['"]/, message: 'Jest globals detected' },
  { pattern: /jest\.(mock|spyOn|fn)\(/, message: 'Jest mock function detected' },
  { pattern: /sinon\.(stub|spy|mock)\(/, message: 'Sinon mock function detected' },

  // Variable naming patterns suggesting mocks (but not test doubles)
  // Note: 'mock' prefix without 'Test' or 'minimal' is suspicious
  { pattern: /\bmock[A-Z][a-zA-Z]*\s*=/, message: 'Variable with mock prefix - consider renaming to Test* or minimal*' },

  // Spying/stubbing patterns
  { pattern: /\.mockReturnValue\(/, message: 'Jest mockReturnValue detected' },
  { pattern: /\.mockResolvedValue\(/, message: 'Jest mockResolvedValue detected' },
  { pattern: /\.mockImplementation\(/, message: 'Jest mockImplementation detected' },
];

// Patterns that are OK (allowed test doubles)
const ALLOWED_PATTERNS = [
  /Test[A-Z][a-zA-Z]*\s*=/,  // TestPromptAdapter, TestRegistry, etc.
  /minimal[A-Z][a-zA-Z]*\s*=/, // minimalRegistry, minimalConfig, etc.
  /testDouble[A-Z]?[a-zA-Z]*\s*=/, // testDouble, testDoubleFs, etc.
  /fixture[A-Z]?[a-zA-Z]*\s*=/, // fixture, fixtureData, etc.
  /\/\/.*mock/i, // Comments explaining mock patterns are OK
  /\*.*mock/i, // JSDoc/block comments about mocks are OK
];

async function findTestFiles(dir) {
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'fixtures') {
        files.push(...await findTestFiles(fullPath));
      }
    } else if (entry.name.endsWith('.test.mjs') || entry.name.endsWith('.test.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

function isAllowed(line) {
  return ALLOWED_PATTERNS.some(pattern => pattern.test(line));
}

async function lintFile(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  const lines = content.split('\n');
  const issues = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Skip if line matches allowed patterns
    if (isAllowed(line)) {
      continue;
    }

    for (const { pattern, message } of SUSPICIOUS_PATTERNS) {
      if (pattern.test(line)) {
        issues.push({
          file: filePath,
          line: lineNum,
          message,
          content: line.trim().slice(0, 80)
        });
      }
    }
  }

  return issues;
}

/**
 * Main linting function
 * @param {Object} options - Linting options
 * @param {string} [options.testsDir] - Directory to scan for test files
 * @returns {Promise<{exitCode: number, issues: Array}>} Lint results
 */
export async function lintTestMocks(options = {}) {
  const targetDir = options.testsDir ?? testsDir;
  console.log('🔍 Scanning test files for mock patterns...\n');

  const files = await findTestFiles(targetDir);
  const allIssues = [];

  for (const file of files) {
    const issues = await lintFile(file);
    allIssues.push(...issues);
  }

  if (allIssues.length === 0) {
    console.log('✅ No suspicious mock patterns found!');
    console.log('   All test files follow zero-mock philosophy.\n');
    return { exitCode: 0, issues: allIssues };
  }

  console.log(`⚠️  Found ${allIssues.length} potential mock pattern(s):\n`);

  // Group by file
  const byFile = {};
  for (const issue of allIssues) {
    if (!byFile[issue.file]) {
      byFile[issue.file] = [];
    }
    byFile[issue.file].push(issue);
  }

  for (const [file, issues] of Object.entries(byFile)) {
    const relPath = path.relative(process.cwd(), file);
    console.log(`📄 ${relPath}`);
    for (const issue of issues) {
      console.log(`   Line ${issue.line}: ${issue.message}`);
      console.log(`   > ${issue.content}`);
    }
    console.log();
  }

  console.log('📖 Review guidance:');
  console.log('   - If using dependency injection, rename to Test* or minimal*');
  console.log('   - If testing wrapping behavior, document why mock is appropriate');
  console.log('   - See docs/guides/testing.md for zero-mock philosophy\n');

  return { exitCode: 1, issues: allIssues };
}

// Run when executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  lintTestMocks().then(({ exitCode }) => {
    process.exit(exitCode);
  }).catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
}
