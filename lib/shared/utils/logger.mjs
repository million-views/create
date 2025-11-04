#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { ensureDirectory } from './fs-utils.mjs';

/**
 * Logger module for structured logging with timestamps and operation tracking
 * Provides async file writing operations and data sanitization for security
 */
export class Logger {
  constructor(logFilePath) {
    this.logFilePath = logFilePath;
    this.writeQueue = Promise.resolve();
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
   * Write log entry to file asynchronously
   * @param {Object} logEntry - Log entry object to write
   */
  async writeLogEntry(logEntry) {
    // Queue writes to prevent race conditions
    this.writeQueue = this.writeQueue.then(async () => {
      try {
        // Ensure log file directory exists
        const logDir = path.dirname(this.logFilePath);
        await ensureDirectory(logDir, 0o755, 'log file directory');

        // Write log entry as JSON line
        const logLine = JSON.stringify(logEntry) + '\n';
        await fs.appendFile(this.logFilePath, logLine, 'utf8');
      } catch (error) {
        // Re-throw with more descriptive error message
        throw new Error(`Failed to write log entry: ${error.message}`);
      }
    });

    await this.writeQueue;
  }

  /**
   * Log a generic operation with details
   * @param {string} operation - Operation name
   * @param {Object} details - Operation details
   */
  async logOperation(operation, details) {
    const sanitizedDetails = this.sanitizeLogData(details);
    const logEntry = {
      timestamp: this.formatTimestamp(),
      operation,
      details: sanitizedDetails
    };

    await this.writeLogEntry(logEntry);
  }

  /**
   * Log git clone operations
   * @param {string} repoUrl - Repository URL
   * @param {string} branch - Git branch name
   * @param {string} destination - Destination path
   */
  async logGitClone(repoUrl, branch, destination) {
    await this.logOperation('git_clone', {
      repoUrl,
      branch,
      destination
    });
  }

  /**
   * Log file copy operations
   * @param {string} source - Source file path
   * @param {string} destination - Destination file path
   */
  async logFileCopy(source, destination) {
    await this.logOperation('file_copy', {
      source,
      destination
    });
  }

  /**
   * Log setup script execution
   * @param {string} scriptPath - Path to setup script
   * @param {string} status - Execution status (success/failure)
   * @param {string} output - Script output or error message
   */
  async logSetupScript(scriptPath, status, output) {
    await this.logOperation('setup_script', {
      scriptPath,
      status,
      output
    });
  }

  /**
   * Log errors with context and stack trace
   * @param {Error} error - Error object
   * @param {Object} context - Additional context information
   */
  async logError(error, context = {}) {
    await this.logOperation('error', {
      message: error.message,
      stack: error.stack,
      context: this.sanitizeLogData(context)
    });
  }
}