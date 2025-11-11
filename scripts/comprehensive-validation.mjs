#!/usr/bin/env node

/**
 * Comprehensive Validation Script
 * Combines markdown documentation validation with ast-grep code analysis
 *
 * This script provides a unified validation approach for the entire project:
 * - Markdown documentation validation (custom script)
 * - JavaScript/TypeScript code analysis (ast-grep)
 * - YAML configuration validation (ast-grep)
 */

import { spawn } from 'child_process';

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

const AST_GREP_CANDIDATES = ['ast-grep', 'sg'];
let resolvedAstGrepCommand = null;
let attemptedAstGrepResolution = false;

async function resolveAstGrepCommand() {
  if (attemptedAstGrepResolution) {
    return resolvedAstGrepCommand;
  }

  attemptedAstGrepResolution = true;

  for (const candidate of AST_GREP_CANDIDATES) {
    try {
      const result = await runCommand(candidate, ['--version']);
      if (result.code === 0) {
        const versionOutput = `${result.stdout} ${result.stderr}`.toLowerCase();
        if (!versionOutput.includes('ast-grep')) {
          continue;
        }
        resolvedAstGrepCommand = candidate;
        return resolvedAstGrepCommand;
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.log(colorize(`⚠️  Unable to execute ${candidate} --version: ${error.message}`, 'yellow'));
      }
    }
  }

  return null;
}

/**
 * Run a command and return a promise
 */
function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'pipe',
      ...options
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({
        code,
        stdout,
        stderr
      });
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Run documentation validation
 */
async function runDocumentationValidation() {
  console.log(colorize('📚 Running Documentation Validation...', 'blue'));
  console.log('─'.repeat(50));

  try {
    const result = await runCommand('node', ['scripts/validate-docs.mjs']);

    // Show the output regardless of success/failure
    if (result.stdout) {
      console.log(result.stdout);
    }

    if (result.code === 0) {
      console.log(colorize('✅ Documentation validation passed', 'green'));
      return true;
    } else {
      console.log(colorize('❌ Documentation validation failed', 'red'));
      if (result.stderr) {
        console.log(colorize('Error details:', 'red'));
        console.log(result.stderr);
      }
      return false;
    }
  } catch (error) {
    console.log(colorize(`❌ Failed to run documentation validation: ${error.message}`, 'red'));
    return false;
  }
}

/**
 * Run ast-grep code analysis
 */
async function runCodeAnalysis() {
  console.log(colorize('\n🔍 Running Code Analysis (ast-grep)...', 'blue'));
  console.log('─'.repeat(50));

  try {
    const astGrepCommand = await resolveAstGrepCommand();
    if (!astGrepCommand) {
      console.log(colorize('❌ ast-grep CLI not found. Install ast-grep (https://ast-grep.github.io/book/quick-start/install.html) or add it to your PATH, then re-run validation.', 'red'));
      console.log(colorize('   Tip: npm users can install the prebuilt binary via "npm install --save-dev @ast-grep/napi" and use the provided "sg" executable.', 'yellow'));
      return false;
    }

    // Run ast-grep on JavaScript/TypeScript files
    const result = await runCommand(astGrepCommand, [
      'scan',
      'bin/',
      '--json=compact'
    ]);

    if (result.code !== 0) {
      console.log(colorize(`❌ ast-grep exited with code ${result.code}`, 'red'));
      if (result.stderr.trim()) {
        console.log(colorize(result.stderr.trim(), 'red'));
      }
      return false;
    }

    if (result.stdout.trim()) {
      // Parse JSON output to count issues
      const stdout = result.stdout.trim();

      // Handle both single JSON array (no issues) and newline-separated objects (with issues)
      let issues = [];
      try {
        const parsed = JSON.parse(stdout);
        if (Array.isArray(parsed)) {
          issues = parsed;
        } else {
          // Single object case
          issues = [parsed];
        }
      } catch {
        // Fallback: try parsing as newline-separated JSON objects
        const lines = stdout.split('\n');
        issues = lines.map(line => {
          try {
            return JSON.parse(line.trim());
          } catch {
            return null;
          }
        }).filter(Boolean);
      }

      console.log(colorize(`Found ${issues.length} code analysis issues:`, 'yellow'));

      // Group issues by severity
      const grouped = issues.reduce((acc, issue) => {
        const severity = issue.severity || 'info';
        if (!acc[severity]) acc[severity] = [];
        acc[severity].push(issue);
        return acc;
      }, {});

      // Display summary
      Object.entries(grouped).forEach(([severity, items]) => {
        const color = severity === 'error' ? 'red' : severity === 'warning' ? 'yellow' : 'cyan';
        console.log(colorize(`  ${severity}: ${items.length} issues`, color));
      });

      // For detailed output, run without JSON
      console.log(colorize('\n📋 Detailed Analysis:', 'cyan'));
      const detailedResult = await runCommand(astGrepCommand, [
        'scan',
        'bin/'
      ]);
      if (detailedResult.stderr.trim()) {
        console.log(detailedResult.stderr.trim());
      }
      console.log(detailedResult.stdout);

      // Consider warnings as non-blocking for now
      const hasErrors = grouped.error && grouped.error.length > 0;
      return !hasErrors;
    } else {
      console.log(colorize('✅ No code analysis issues found', 'green'));
      return true;
    }
  } catch (error) {
    console.log(colorize(`❌ Failed to run code analysis: ${error.message}`, 'red'));
    return false;
  }
}

/**
 * Main validation function
 */
async function runComprehensiveValidation() {
  console.log(colorize('🚀 Starting Comprehensive Project Validation', 'magenta'));
  console.log('='.repeat(60));

  const results = {
    documentation: false,
    codeAnalysis: false
  };

  // Run documentation validation
  results.documentation = await runDocumentationValidation();

  // Run code analysis
  results.codeAnalysis = await runCodeAnalysis();

  // Summary
  console.log(colorize('\n📊 Validation Summary', 'magenta'));
  console.log('='.repeat(30));

  const docStatus = results.documentation ?
    colorize('✅ PASSED', 'green') :
    colorize('❌ FAILED', 'red');
  const codeStatus = results.codeAnalysis ?
    colorize('✅ PASSED', 'green') :
    colorize('❌ FAILED', 'red');

  console.log(`Documentation: ${docStatus}`);
  console.log(`Code Analysis: ${codeStatus}`);

  const allPassed = results.documentation && results.codeAnalysis;

  if (allPassed) {
    console.log(colorize('\n🎉 All validations passed!', 'green'));
    process.exit(0);
  } else {
    console.log(colorize('\n💥 Some validations failed', 'red'));
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
${colorize('Comprehensive Validation Script', 'cyan')}

This script runs both documentation validation and code analysis.

Usage:
  node scripts/comprehensive-validation.mjs [options]

Options:
  --help, -h     Show this help message
  --docs-only    Run only documentation validation
  --code-only    Run only code analysis

Examples:
  node scripts/comprehensive-validation.mjs
  node scripts/comprehensive-validation.mjs --docs-only
  node scripts/comprehensive-validation.mjs --code-only
`);
  process.exit(0);
}

// Run specific validations based on arguments
if (args.includes('--docs-only')) {
  runDocumentationValidation().then(success => {
    process.exit(success ? 0 : 1);
  });
} else if (args.includes('--code-only')) {
  runCodeAnalysis().then(success => {
    process.exit(success ? 0 : 1);
  });
} else {
  // Run comprehensive validation
  runComprehensiveValidation();
}
