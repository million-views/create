#!/usr/bin/env node

import { appendFile, mkdir } from 'fs/promises';
import { dirname } from 'path';

/**
 * Options for SecurityAuditLogger
 */
export interface AuditLoggerOptions {
  logFile?: string | null;
  console?: boolean;
  flushThreshold?: number;
}

/**
 * Audit log entry
 */
interface AuditEntry {
  type: string;
  timestamp: string;
  [key: string]: unknown;
}

/**
 * Security audit logger - tracks all security-relevant events
 * Implements async, non-blocking logging with automatic flushing
 *
 * @requires Node.js 22+
 */
export class SecurityAuditLogger {
  #logFile: string | null;
  #consoleEnabled: boolean;
  #buffer: AuditEntry[];
  #flushThreshold: number;
  #flushTimer: ReturnType<typeof setTimeout> | null;

  constructor(options: AuditLoggerOptions = {}) {
    this.#logFile = options.logFile || null;
    this.#consoleEnabled = options.console || false;
    this.#buffer = [];
    this.#flushThreshold = options.flushThreshold || 10;
    this.#flushTimer = null;
  }

  /**
   * Log input validation event
   */
  logValidation(event: Record<string, unknown>): void {
    this.#log('VALIDATION', event);
  }

  /**
   * Log boundary violation attempt
   */
  logBoundaryViolation(event: Record<string, unknown>): void {
    this.#log('BOUNDARY_VIOLATION', event);
  }

  /**
   * Log VM sandbox violation
   */
  logSandboxViolation(event: Record<string, unknown>): void {
    this.#log('SANDBOX_VIOLATION', event);
  }

  /**
   * Log general security event
   */
  logSecurityEvent(event: Record<string, unknown>): void {
    this.#log('SECURITY_EVENT', event);
  }

  /**
   * Internal logging implementation
   */
  #log(type: string, event: Record<string, unknown>): void {
    const timestamp = typeof event.timestamp === 'string' 
      ? event.timestamp 
      : new Date().toISOString();
    
    const entry: AuditEntry = {
      type,
      timestamp,
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
      console.error('[AUDIT LOGGER ERROR] Failed to write audit log:', (error as Error).message);

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
let globalLogger: SecurityAuditLogger | null = null;

/**
 * Get or create global audit logger instance
 */
export function getAuditLogger(options: AuditLoggerOptions = {}): SecurityAuditLogger {
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
