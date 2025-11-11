#!/usr/bin/env node

/**
 * Template Testing Service
 * Enables make-template to test templates with create-scaffold
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { execCommand } from '../shared/utils/command-utils.mjs';
import { ensureDirectory, safeCleanup } from '../shared/utils/fs-utils.mjs';
import { ContextualError, ErrorContext } from '../shared/utils/error-handler.mjs';
import { Logger } from '../shared/utils/logger.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class TemplateTestingService {
  constructor(options = {}) {
    this.logger = options.logger || new Logger(path.join(options.tempDir || path.join(process.cwd(), 'tmp', 'template-tests'), 'test.log'));
    this.createScaffoldPath = options.createScaffoldPath || this.findCreateScaffold();
    this.tempDir = options.tempDir || path.join(process.cwd(), 'tmp', 'template-tests');
    this.isolationDir = null;
    this.originalCwd = process.cwd(); // Store original working directory
  }

  /**
   * Find the create-scaffold executable
   */
  findCreateScaffold() {
    // Use the local path in the monorepo
    const localPath = path.join(__dirname, '../../bin/create-scaffold/index.mjs');
    return ['node', localPath];
  }

  /**
   * Test a template by creating a test project
   * @param {string} templatePath - Path to the template to test
   * @param {object} options - Test options
   * @returns {Promise<{success: boolean, output: string, error?: string}>}
   */
  async testTemplate(templatePath, options = {}) {
    const {
      projectName = `test-${Date.now()}`,
      cleanup = true,
      verbose = false,
      timeout = 30000 // 30 seconds
    } = options;

    this.isolationDir = path.join(this.tempDir, `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

    try {
      await this.logger.logOperation('template_test_start', {
        templatePath,
        projectName,
        isolationDir: this.isolationDir
      });

      // Create isolation directory
      await ensureDirectory(this.isolationDir);

      // Change to isolation directory for testing
      const originalCwd = process.cwd();
      process.chdir(this.isolationDir);

      try {
        // Run create-scaffold with the template
        const command = this.buildTestCommand(templatePath, projectName, { verbose });
        const result = await this.executeTestCommand(command, { timeout });

        if (!result.success) {
          throw new ContextualError(
            `create-scaffold exited with code ${result.exitCode}`,
            {
              context: ErrorContext.TEMPLATE,
              severity: 'high',
              suggestions: [
                'Check that the template directory exists and contains valid files',
                'Verify template.json is properly formatted',
                'Run create-scaffold manually to see detailed error messages',
                'Check the test isolation directory for any generated files'
              ],
              technicalDetails: `Command: ${Array.isArray(command) ? command.join(' ') : command}\nStdout: ${result.stdout}\nStderr: ${result.stderr}`
            }
          );
        }

        await this.logger.logOperation('template_test_complete', {
          templatePath,
          projectName,
          success: result.success,
          exitCode: result.exitCode
        });

        return {
          success: result.success,
          output: result.stdout,
          error: result.stderr,
          exitCode: result.exitCode,
          projectPath: path.join(this.isolationDir, projectName)
        };

      } finally {
        // Always restore original working directory
        process.chdir(originalCwd);

        // Cleanup if requested
        if (cleanup) {
          await this.cleanup();
        }
      }

    } catch (error) {
      await this.logger.logError(error, { operation: 'template_test', templatePath });

      // Ensure cleanup on error
      if (cleanup) {
        await this.cleanup().catch(() => {}); // Ignore cleanup errors
      }

      throw new ContextualError(
        `Template test failed: ${error.message}`,
        {
          context: ErrorContext.TEMPLATE,
          severity: 'high',
          suggestions: error.suggestions || [
            'Check that the template directory exists and contains valid files',
            'Verify template.json is properly formatted',
            'Run with --verbose flag for detailed error information',
            'Check the test isolation directory for any leftover files'
          ],
          technicalDetails: error.technicalDetails || error.stack
        }
      );
    }
  }

  /**
   * Build the create-scaffold command for testing
   */
  buildTestCommand(templatePath, projectName, options = {}) {
    const { verbose } = options;

    // Ensure template path is absolute, resolved from original working directory
    const absoluteTemplatePath = path.resolve(this.originalCwd, templatePath);

    let commandParts = [...this.createScaffoldPath, 'new', projectName, '--template', absoluteTemplatePath, '--no-interactive'];

    if (verbose) {
      commandParts.push('--verbose');
    }

    // Add any additional test-specific flags
    commandParts.push('--no-config'); // Don't use user config during testing

    return commandParts;
  }

  /**
   * Execute the test command with timeout
   */
  async executeTestCommand(command, options = {}) {
    const { timeout = 30000 } = options;

    try {
      // command is an array: [executable, ...args]
      const [executable, ...args] = command;
      const stdout = await execCommand(executable, args, {
        timeout,
        cwd: this.isolationDir
      });

      return {
        success: true,
        stdout,
        stderr: '',
        exitCode: 0
      };

    } catch (error) {
      // Handle timeout or execution errors
      return {
        success: false,
        stdout: '',
        stderr: error.message,
        exitCode: error.code || 1
      };
    }
  }

  /**
   * Clean up test artifacts
   */
  async cleanup() {
    if (this.isolationDir) {
      try {
        await safeCleanup(this.isolationDir);
        this.isolationDir = null;
      } catch (error) {
        // Log but don't throw cleanup errors
        await this.logger.logError(error, { operation: 'test_cleanup' });
      }
    }
  }

  /**
   * Get test results summary
   */
  getTestSummary(result) {
    const summary = {
      success: result.success,
      exitCode: result.exitCode,
      hasOutput: result.output && result.output.length > 0,
      hasErrors: result.error && result.error.length > 0,
      projectCreated: false
    };

    // Check if project directory was created
    if (result.projectPath) {
      try {
        const stats = fs.statSync(result.projectPath);
        summary.projectCreated = stats.isDirectory();
      } catch {
        summary.projectCreated = false;
      }
    }

    return summary;
  }
}