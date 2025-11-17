#!/usr/bin/env node

import _fs from 'fs/promises';
import { mkdirSync, appendFileSync } from 'fs';
import path from 'path';

/**
 * Unified Logger supporting both file and console output modes
 * Provides structured logging with timestamps, operation tracking, and data sanitization
 */
export class Logger {
  /**
   * Singleton instance
   * @private
   * @static
   */
  static instance = null;

  /**
   * Get the singleton logger instance appropriate for the current environment
   * @static
   * @returns {Logger} The logger instance
   */
  static getInstance() {
    if (!Logger.instance) {
      // Determine appropriate logger based on environment
      const isTest = process.env.NODE_ENV === 'test';
      const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
      const isDevelopment = process.env.NODE_ENV === 'development';

      if (isTest) {
        // In test environment, use console mode with debug level for detailed output
        Logger.instance = new Logger('console', 'debug');
      } else if (isCI) {
        // In CI environment, use console mode with info level
        Logger.instance = new Logger('console', 'info');
      } else if (isDevelopment) {
        // In development, use console mode with debug level
        Logger.instance = new Logger('console', 'debug');
      } else {
        // In production, use console mode with info level
        Logger.instance = new Logger('console', 'info');
      }
    }

    return Logger.instance;
  }

  /**
   * Create a new logger instance
   * @param {string} mode - Output mode: 'file' or 'console'
   * @param {string} level - Log level for console mode (error, warn, info, debug)
   * @param {string} logFilePath - Log file path for file mode
   */
  constructor(mode = 'file', level = 'info', logFilePath = null) {
    this.mode = mode;
    this.level = level;
    this.logFilePath = logFilePath;
    this.writeQueue = Promise.resolve();
    this.writeQueue = Promise.resolve();

    // Console mode levels
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };

    // Ensure log file directory exists for file mode
    if (this.mode === 'file' && this.logFilePath) {
      try {
        this.ensureLogDirectory();
      } catch (error) {
        // Store the error to be thrown later when logging operations are attempted
        this.constructionError = error;
      }
    }
  }

  /**
   * Ensure log directory exists
   * @private
   */
  ensureLogDirectory() {
    if (this.logFilePath) {
      const logDir = path.dirname(this.logFilePath);
      mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * Format current timestamp in ISO 8601 format
   * @returns {string} - ISO 8601 formatted timestamp
   */
  formatTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Sanitize log data to prevent information disclosure
   * @param {any} data - Data to sanitize
   * @returns {any} - Sanitized data with sensitive fields redacted
   */
  sanitizeLogData(data) {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeLogData(item));
    }

    const sensitiveFields = [
      'password', 'token', 'apikey', 'api_key', 'authorization',
      'secret', 'auth', 'credential', 'pass'
    ];

    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      // Check for exact matches or specific patterns, but not substring matches for 'key'
      const isSensitive = sensitiveFields.some(field => {
        if (field === 'key') {
          // Only match 'key' if it's exactly 'key' or ends with 'key' (like apiKey)
          return lowerKey === 'key' || lowerKey.endsWith('key');
        }
        return lowerKey.includes(field);
      });

      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeLogData(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Serialize arguments for console logging
   * @param {*} args - Arguments to serialize
   * @returns {string} Serialized arguments
   * @private
   */
  _serializeArgs(...args) {
    return args.map(a => {
      try {
        if (typeof a === 'string') return a;
        return JSON.stringify(a, null, 2);
      } catch (_e) {
        try {
          return String(a);
        } catch (_e2) {
          return '[unserializable]';
        }
      }
    });
  }

  /**
   * Write log entry to file synchronously for testing
   * @param {Object} logEntry - Log entry object to write
   */
  writeLogEntrySync(logEntry) {
    if (this.mode !== 'file' || !this.logFilePath) return;

    // If there was a construction error, throw it now
    if (this.constructionError) {
      throw new Error(`Failed to write log entry: ${this.constructionError.message}`);
    }

    try {
      // Ensure log file directory exists
      const logDir = path.dirname(this.logFilePath);
      mkdirSync(logDir, { recursive: true });

      // Write log entry as JSON line
      const logLine = JSON.stringify(logEntry) + '\n';
      appendFileSync(this.logFilePath, logLine, 'utf8');
    } catch (error) {
      // Re-throw with more descriptive error message
      throw new Error(`Failed to write log entry: ${error.message}`);
    }
  }

  /**
   * Write log entry to file asynchronously
   * @param {Object} logEntry - Log entry object to write
   */
  async writeLogEntry(logEntry) {
    if (this.mode !== 'file' || !this.logFilePath) return;

    // For testing and CLI operations, use synchronous writes to ensure they complete
    // before the process exits
    this.writeLogEntrySync(logEntry);
  }

  /**
   * Log error message
   * @param {string} message - Error message
   * @param {*} data - Additional data
   */
  error(message, data = null) {
    const logEntry = {
      timestamp: this.formatTimestamp(),
      level: 'error',
      message: this.sanitizeLogData(message),
      ...(data && { data: this.sanitizeLogData(data) })
    };

    if (this.mode === 'file') {
      this.writeLogEntrySync(logEntry);
    }
    // Always output to console for CLI operations when log file is specified
    if (this.levels[this.level] >= this.levels.error) {
      if (data !== null) {
        console.error('❌', message, ...this._serializeArgs(data));
      } else {
        console.error('❌', message);
      }
    }
  }

  /**
   * Log warning message
   * @param {string} message - Warning message
   * @param {*} data - Additional data
   */
  warn(message, data = null) {
    const logEntry = {
      timestamp: this.formatTimestamp(),
      level: 'warn',
      message: this.sanitizeLogData(message),
      ...(data && { data: this.sanitizeLogData(data) })
    };

    if (this.mode === 'file') {
      this.writeLogEntrySync(logEntry);
    }
    // Always output to console for CLI operations when log file is specified
    if (this.levels[this.level] >= this.levels.warn) {
      if (data !== null) {
        console.warn('⚠️', message, ...this._serializeArgs(data));
      } else {
        console.warn('⚠️', message);
      }
    }
  }

  /**
   * Log info message
   * @param {string} message - Info message
   * @param {*} data - Additional data
   */
  info(message, data = null) {
    const logEntry = {
      timestamp: this.formatTimestamp(),
      level: 'info',
      message: this.sanitizeLogData(message),
      ...(data && { data: this.sanitizeLogData(data) })
    };

    if (this.mode === 'file') {
      this.writeLogEntrySync(logEntry);
    }
    // Always output to console for CLI operations when log file is specified
    if (this.levels[this.level] >= this.levels.info) {
      if (data !== null) {
        console.log('ℹ️', message, ...this._serializeArgs(data));
      } else {
        console.log('ℹ️', message);
      }
    }
  }

  /**
   * Log debug message
   * @param {string} message - Debug message
   * @param {*} data - Additional data
   */
  debug(message, data = null) {
    const logEntry = {
      timestamp: this.formatTimestamp(),
      level: 'debug',
      message: this.sanitizeLogData(message),
      ...(data && { data: this.sanitizeLogData(data) })
    };

    if (this.mode === 'file') {
      this.writeLogEntrySync(logEntry);
    }
    // Always output to console for CLI operations when log file is specified
    if (this.levels[this.level] >= this.levels.debug) {
      if (data !== null) {
        console.log('🔍', message, ...this._serializeArgs(data));
      } else {
        console.log('🔍', message);
      }
    }
  }

  /**
   * Log success message (console mode only)
   * @param {string} message - Success message
   */
  success(message) {
    if (this.mode === 'console' && this.levels[this.level] >= this.levels.info) {
      console.log('✅', message);
    }
  }

  /**
   * Log a generic operation with details
   * @param {string} operation - Operation name
   * @param {Object} details - Operation details
   */
  async logOperation(operation, details) {
    if (this.mode === 'file') {
      const sanitizedDetails = this.sanitizeLogData(details);
      const logEntry = {
        timestamp: this.formatTimestamp(),
        operation,
        details: sanitizedDetails
      };
      await this.writeLogEntry(logEntry);
    } else {
      this.info(`Starting operation: ${operation}`);
    }
  }

  /**
   * Log git clone operations
   * @param {string} repoUrl - Repository URL
   * @param {string} branch - Git branch name
   * @param {string} destination - Destination path
   */
  async logGitClone(repoUrl, branch, destination) {
    if (this.mode === 'file') {
      await this.logOperation('git_clone', {
        repoUrl,
        branch,
        destination
      });
    } else {
      this.info(`Cloning repository: ${repoUrl} (branch: ${branch}) to ${destination}`);
    }
  }

  /**
   * Log file copy operations
   * @param {string} source - Source file path
   * @param {string} destination - Destination file path
   */
  async logFileCopy(source, destination) {
    if (this.mode === 'file') {
      await this.logOperation('file_copy', {
        source,
        destination
      });
    } else {
      this.info(`Copying file: ${source} → ${destination}`);
    }
  }

  /**
   * Log setup script execution
   * @param {string} scriptPath - Path to setup script
   * @param {string} status - Execution status (success/failure)
   * @param {string} output - Script output or error message
   */
  async logSetupScript(scriptPath, status, output) {
    if (this.mode === 'file') {
      await this.logOperation('setup_script', {
        scriptPath,
        status,
        output
      });
    } else {
      this.info(`Executing setup script: ${scriptPath} (${status})`);
    }
  }

  /**
   * Log errors with context and stack trace
   * @param {Error} error - Error object
   * @param {Object} context - Additional context information
   */
  async logError(error, context = {}) {
    if (this.mode === 'file') {
      await this.logOperation('error', {
        message: error.message,
        stack: error.stack,
        context: this.sanitizeLogData(context)
      });
    } else {
      this.error(`Error: ${error.message}`, context);
      if (error.stack && this.level === 'debug') {
        console.log('Stack trace:', error.stack);
      }
    }
  }

  /**
   * Log validation error with suggestions (console mode only)
   * @param {string} message - Error message
   * @param {string[]} suggestions - Array of suggestions
   */
  validationError(message, suggestions = []) {
    if (this.mode === 'console') {
      this.error(message);
      if (suggestions && suggestions.length > 0) {
        this.info('Suggestions:');
        suggestions.forEach(suggestion => {
          console.log(`  • ${suggestion}`);
        });
      }
    }
  }

  /**
   * Log filesystem error (console mode only)
   * @param {string} operation - Operation that failed
   * @param {string} path - File/directory path
   * @param {Error} error - Error object
   */
  filesystemError(operation, path, error) {
    if (this.mode === 'console') {
      this.error(`${operation} failed for: ${path}`);
      if (error && error.message) {
        this.error(`Error: ${error.message}`);
      }
    }
  }

  /**
   * Log missing dependency error with installation instructions (console mode only)
   * @param {string[]} missingDeps - Array of missing dependency names
   * @param {string} packageManager - Package manager to use (npm, yarn, pnpm)
   */
  missingDependencies(missingDeps, packageManager = 'npm') {
    if (this.mode === 'console' && missingDeps && missingDeps.length > 0) {
      this.error(`Missing required dependencies: ${missingDeps.join(', ')}`);
      this.info('Installation instructions:');

      const depsString = missingDeps.join(' ');
      switch (packageManager) {
        case 'yarn':
          this.info(`  yarn add ${depsString}`);
          break;
        case 'pnpm':
          this.info(`  pnpm add ${depsString}`);
          break;
        case 'npm':
        default:
          this.info(`  npm install ${depsString}`);
          break;
      }

      this.info('Then run the command again.');
    }
  }

  /**
   * Log operation progress with step information (console mode only)
   * @param {string} operation - Operation name
   * @param {number} current - Current step number
   * @param {number} total - Total number of steps
   * @param {string} description - Step description
   */
  progress(operation, current, total, description) {
    if (this.mode === 'console' && this.levels[this.level] >= this.levels.info) {
      const percentage = Math.round((current / total) * 100);
      console.log(`🔄 ${operation} [${current}/${total}] (${percentage}%) ${description}`);
    }
  }

  /**
   * Log completion message with exit code 0 (console mode only)
   * @param {string} message - Completion message
   */
  complete(message) {
    if (this.mode === 'console') {
      this.success(message);
      // Note: Don't call process.exit(0) here as it might be called in non-terminal contexts
    }
  }

  /**
   * Log dry-run information (console mode only)
   * @param {string} message - Dry-run message
   */
  dryRun(message) {
    if (this.mode === 'console' && this.levels[this.level] >= this.levels.info) {
      console.log('🔍', message);
    }
  }

  /**
   * Log confirmation prompt (console mode only)
   * @param {string} message - Confirmation message
   */
  confirm(message) {
    if (this.mode === 'console' && this.levels[this.level] >= this.levels.info) {
      console.log('❓', message);
    }
  }

  /**
   * Create a child logger with a prefix (console mode only)
   * @param {string} prefix - Prefix for all log messages
   * @returns {Logger} New logger instance with prefix
   */
  child(prefix) {
    if (this.mode === 'console') {
      const childLogger = new Logger('console', this.level);

      // Override all methods to add prefix
      const originalMethods = ['error', 'warn', 'info', 'debug', 'success', 'dryRun', 'confirm'];
      originalMethods.forEach(method => {
        const originalMethod = childLogger[method];
        childLogger[method] = (message, ...args) => {
          originalMethod.call(childLogger, `[${prefix}] ${message}`, ...args);
        };
      });

      return childLogger;
    }
    return this; // File mode doesn't support child loggers
  }

  /**
   * Set log level (console mode only)
   * @param {string} level - Log level (error, warn, info, debug)
   */
  setLevel(level) {
    if (this.mode === 'console' && this.levels.hasOwnProperty(level)) {
      this.level = level;
    } else if (this.mode === 'console') {
      this.warn(`Invalid log level: ${level}. Using current level: ${this.level}`);
    }
  }
}

export default Logger;
