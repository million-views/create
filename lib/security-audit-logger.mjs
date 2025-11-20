#!/usr/bin/env node

import { writeFile, appendFile, mkdir } from 'fs/promises';
import { dirname } from 'path';

/**
 * Security audit logger - tracks all security-relevant events
 * Implements async, non-blocking logging with automatic flushing
 *
 * @requires Node.js 22+
 */
export class SecurityAuditLogger {
  #logFile;
  #consoleEnabled;
  #buffer;
  #flushThreshold;
  #flushTimer;

  constructor(options = {}) {
    this.#logFile = options.logFile || null;
    this.#consoleEnabled = options.console || false;
    this.#buffer = [];
    this.#flushThreshold = options.flushThreshold || 10;
    this.#flushTimer = null;
  }

  /**
   * Log input validation event
   */
  logValidation(event) {
    this.#log('VALIDATION', event);
  }

  /**
   * Log boundary violation attempt
   */
  logBoundaryViolation(event) {
    this.#log('BOUNDARY_VIOLATION', event);
  }

  /**
   * Log VM sandbox violation
   */
  logSandboxViolation(event) {
    this.#log('SANDBOX_VIOLATION', event);
  }

  /**
   * Log general security event
   */
  logSecurityEvent(event) {
    this.#log('SECURITY_EVENT', event);
  }

  /**
   * Internal logging implementation
   */
  #log(type, event) {
    const entry = {
      type,
      timestamp: event.timestamp || new Date().toISOString(),
      ...event
    };

    // Add to buffer
    this.#buffer.push(entry);

    // Console output if enabled
    if (this.#consoleEnabled) {
      console.error(`[SECURITY:${type}]`, JSON.stringify(entry, null, 2));
    }

    // Flush if threshold reached
    if (this.#buffer.length >= this.#flushThreshold) {
      this.flush();
    } else {
      // Schedule delayed flush (debounce)
      this.#scheduleFlush();
    }
  }

  /**
   * Schedule automatic flush after idle period
   */
  #scheduleFlush() {
    if (this.#flushTimer) {
      clearTimeout(this.#flushTimer);
    }

    this.#flushTimer = setTimeout(() => {
      this.flush();
    }, 1000); // 1 second idle timeout
  }

  /**
   * Flush buffered events to log file
   * Non-blocking async operation
   */
  async flush() {
    if (!this.#logFile || this.#buffer.length === 0) {
      return;
    }

    // Clear timer
    if (this.#flushTimer) {
      clearTimeout(this.#flushTimer);
      this.#flushTimer = null;
    }

    // Drain buffer
    const entries = this.#buffer.splice(0, this.#buffer.length);

    try {
      // Ensure log directory exists
      await mkdir(dirname(this.#logFile), { recursive: true });

      // Append to log file (JSON lines format)
      const content = entries.map(e => JSON.stringify(e)).join('\n') + '\n';
      await appendFile(this.#logFile, content, 'utf8');
    } catch (error) {
      // Log to console if file write fails
      console.error('[AUDIT LOGGER ERROR] Failed to write audit log:', error.message);

      // Re-buffer entries on write failure
      this.#buffer.unshift(...entries);
    }
  }

  /**
   * Force immediate flush and cleanup
   */
  async close() {
    if (this.#flushTimer) {
      clearTimeout(this.#flushTimer);
      this.#flushTimer = null;
    }
    await this.flush();
  }
}

/**
 * Singleton instance for global audit logging
 */
let globalLogger = null;

/**
 * Get or create global audit logger instance
 */
export function getAuditLogger(options) {
  if (!globalLogger) {
    globalLogger = new SecurityAuditLogger(options);
  }
  return globalLogger;
}

/**
 * Reset global audit logger (for testing)
 */
export function resetAuditLogger() {
  if (globalLogger) {
    globalLogger.close();
    globalLogger = null;
  }
}
