#!/usr/bin/env node

/**
 * CLI Test Utilities
 * Shared utilities for CLI testing across test suites
 */

import test from 'node:test';
import fs from 'node:fs/promises';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execCommand as runCommand } from '../utils/cli.js';

/**
 * Test environment utilities
 */
export class TestEnvironment {
  static async createTempDir(suffix = '') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    const dirName = `test-cli-${timestamp}-${random}${suffix}`;

    // Always create temp directories in project root ./tmp, regardless of cwd
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const projectRoot = path.join(__dirname, '../..'); // tests/shared -> tests -> project root
    const tempPath = path.join(projectRoot, 'tmp', dirName);

    await fs.mkdir(tempPath, { recursive: true });
    return tempPath;
  }

  static async cleanup(paths) {
    if (!Array.isArray(paths)) paths = [paths];

    // Get project root path
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const projectRoot = path.join(__dirname, '../..');
    const tmpDir = path.join(projectRoot, 'tmp');

    for (const p of paths) {
      try {
        // Only remove the specific test directory, not the ./tmp folder itself
        if (p.startsWith(tmpDir + path.sep) && p !== tmpDir) {
          await fs.rm(p, { recursive: true, force: true });
        } else if (!p.includes('tmp')) {
          // For non-tmp paths (legacy), still clean them up
          await fs.rm(p, { recursive: true, force: true });
        }
        // Skip cleanup for ./tmp folder itself
      } catch {
        // Ignore cleanup errors in tests
      }
    }
  }
}

/**
 * Template repository utilities
 */
export class TemplateRepository {
  static async createTestTemplate(repoPath, templates = ['test-template']) {
    // Initialize git repo
    await this.execCommand('git', ['init'], { cwd: repoPath });
    await this.execCommand('git', ['config', 'user.name', 'Test User'], { cwd: repoPath });
    await this.execCommand('git', ['config', 'user.email', 'test@example.com'], { cwd: repoPath });

    // Create template directories
    for (const template of templates) {
      const templatePath = path.join(repoPath, template);
      await fs.mkdir(templatePath, { recursive: true });

      // Create basic template files
      await fs.writeFile(
        path.join(templatePath, 'package.json'),
        JSON.stringify({ name: template, version: '1.0.0' }, null, 2)
      );

      await fs.writeFile(
        path.join(templatePath, 'template.json'),
        JSON.stringify({
          name: template,
          version: '1.0.0',
          description: `Test template: ${template}`
        }, null, 2)
      );

      await fs.writeFile(
        path.join(templatePath, 'README.md'),
        `# ${template} Template\n\nThis is a test template.`
      );
    }

    // Commit the templates
    await this.execCommand('git', ['add', '.'], { cwd: repoPath });
    await this.execCommand('git', ['commit', '-m', 'Initial templates'], { cwd: repoPath });

    return repoPath;
  }

  static async execCommand(command, args, options = {}) {
    try {
      const result = await runCommand(command, args, options);
      return result.stdout;
    } catch (error) {
      const message = error.stderr || error.stdout || error.message || `Command failed with exit code ${error.code}`;
      throw new Error(message);
    }
  }
}

/**
 * CLI output validation utilities
 */
export class OutputValidator {
  static validateSuccessOutput(output) {
    const successPatterns = [
      /✅.*success/i,
      /successfully/i,
      /complete/i,
      /finished/i,
      /created/i
    ];

    return successPatterns.some(pattern => pattern.test(output));
  }

  static validateErrorOutput(output, expectedErrors = []) {
    // Check that output contains some form of error indication
    const hasErrorIndicators = /❌|error|failed|invalid/i.test(output);

    // Check for expected specific errors
    const hasExpectedErrors = expectedErrors.length === 0 ||
      expectedErrors.some(error => output.includes(error));

    return hasErrorIndicators && hasExpectedErrors;
  }

  static validateNoSensitiveInfo(output) {
    // Check that output doesn't contain sensitive system information
    const sensitivePatterns = [
      /\/usr\//,
      /\/bin\//,
      /internal/i,
      /\/home\//,
      /\/Users\//
    ];

    return !sensitivePatterns.some(pattern => pattern.test(output));
  }

  static validateHelpOutput(output) {
    return output.includes('USAGE:') &&
           (output.includes('create-scaffold') || output.includes('@m5nv/create') ||
            output.includes('scaffold') || output.includes('create'));
  }
}

/**
 * Test runner bridge for consistent test semantics
 */
export class TestRunner {
  constructor() {
    this.tempPaths = [];
  }

  addTempPath(tempPath) {
    this.tempPaths.push(tempPath);
    return tempPath;
  }

  createTest(name, fn, options = {}) {
    const timeout = options.timeout || 5000;

    return test(name, { timeout }, async (t) => {
      const currentTempPaths = [];

      // Override addTempPath for this test
      const originalAddTempPath = this.addTempPath;
      this.addTempPath = (tempPath) => {
        currentTempPaths.push(tempPath);
        return tempPath;
      };

      try {
        await fn(t);
      } finally {
        // Clean up temp paths after test
        for (const tempPath of currentTempPaths) {
          t.after(async () => {
            await TestEnvironment.cleanup(tempPath);
          });
        }

        // Restore original addTempPath
        this.addTempPath = originalAddTempPath;
      }
    });
  }
}

/**
 * Resource leak detection utilities
 */
export class ResourceMonitor {
  static async getResourceSnapshot() {
    // This would integrate with the existing resource monitoring
    // For now, return a basic snapshot
    return {
      timestamp: Date.now(),
      tempFiles: [],
      processes: []
    };
  }

  static async detectResourceLeaks(_before, _after) {
    // Basic leak detection - in a real implementation this would
    // check for files, processes, etc. that weren't cleaned up
    const leaks = [];

    // Placeholder for actual leak detection logic
    // This would compare before/after snapshots

    return leaks;
  }
}
