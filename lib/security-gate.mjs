#!/usr/bin/env node

import { validateAllInputs, ValidationError } from './security.mjs';
import { getAuditLogger } from './security-audit-logger.mjs';

/**
 * Security gate error - thrown when validation fails at architectural boundary
 */
export class SecurityGateError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'SecurityGateError';
    this.context = options.context;
    this.originalError = options.originalError;
    this.validationErrors = options.validationErrors;
  }
}

/**
 * Security Gate Enforcer - Architectural boundary for validation
 *
 * ALL entry points MUST call enforce() before processing inputs.
 * This ensures no code path can bypass security validation.
 *
 * Defense-in-Depth Layer 1: Input Validation Gate
 *
 * @requires Node.js 22+
 */
export class SecurityGate {
  #auditLogger;
  #validationCache;
  #abuseTracker;

  constructor(options = {}) {
    this.#auditLogger = options.auditLogger || getAuditLogger();
    this.#validationCache = new Map();
    this.#abuseTracker = new Map();
  }

  /**
   * Enforce validation at architectural boundary
   *
   * @param {Object} rawInputs - Unvalidated user inputs
   * @param {Object} context - Execution context (command, timestamp, etc.)
   * @returns {Object} Validated and sanitized inputs
   * @throws {SecurityGateError} If validation fails
   */
  async enforce(rawInputs, context = {}) {
    const startTime = Date.now();
    const contextKey = this.#getContextKey(context);

    try {
      // Check cache for performance (using native Map)
      const cacheKey = this.#getCacheKey(rawInputs);
      if (this.#validationCache.has(cacheKey)) {
        const cached = this.#validationCache.get(cacheKey);

        this.#auditLogger.logValidation({
          timestamp: new Date().toISOString(),
          context: this.#sanitizeContext(context),
          outcome: 'success_cached',
          duration: Date.now() - startTime
        });

        return structuredClone(cached); // Native deep clone
      }

      // Validate required fields if specified
      if (context.requiredFields) {
        this.#validateRequiredFields(rawInputs, context.requiredFields);
      }

      // Layer 1: Comprehensive validation using existing validators
      const validated = validateAllInputs(rawInputs);

      // Cache successful validation (with size limit)
      if (this.#validationCache.size > 1000) {
        // Clear oldest entries
        const firstKey = this.#validationCache.keys().next().value;
        this.#validationCache.delete(firstKey);
      }
      this.#validationCache.set(cacheKey, validated);

      // Log successful validation
      this.#auditLogger.logValidation({
        timestamp: new Date().toISOString(),
        context: this.#sanitizeContext(context),
        inputKeys: Object.keys(rawInputs),
        outcome: 'success',
        duration: Date.now() - startTime
      });

      // Reset abuse counter on success
      this.#abuseTracker.delete(contextKey);

      return validated;

    } catch (error) {
      // Track failure for abuse detection
      this.#trackFailure(contextKey, error);

      // Log validation failure
      this.#auditLogger.logValidation({
        timestamp: new Date().toISOString(),
        context: this.#sanitizeContext(context),
        inputKeys: Object.keys(rawInputs),
        outcome: 'failure',
        error: error.message,
        duration: Date.now() - startTime
      });

      // Check for repeated failures (potential abuse)
      this.#checkForAbuse(contextKey);

      // Throw security gate error with context
      throw new SecurityGateError(
        `Security validation failed: ${error.message}`,
        {
          context,
          originalError: error,
          validationErrors: error instanceof ValidationError
            ? [error.message]
            : [error.message]
        }
      );
    }
  }

  /**
   * Validate required fields are present
   */
  #validateRequiredFields(inputs, requiredFields) {
    const missing = [];

    for (const field of requiredFields) {
      if (inputs[field] === undefined || inputs[field] === null || inputs[field] === '') {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      throw new ValidationError(
        `Missing required fields: ${missing.join(', ')}`,
        'required_fields'
      );
    }
  }

  /**
   * Generate cache key for validation results
   */
  #getCacheKey(inputs) {
    // Use JSON serialization for cache key (stable ordering via sorted keys)
    const sorted = Object.keys(inputs).sort().reduce((acc, key) => {
      acc[key] = inputs[key];
      return acc;
    }, {});
    return JSON.stringify(sorted);
  }

  /**
   * Get context key for abuse tracking
   */
  #getContextKey(context) {
    return `${context.command || 'unknown'}:${context.user || 'anonymous'}`;
  }

  /**
   * Track validation failure for abuse detection
   */
  #trackFailure(contextKey, error) {
    if (!this.#abuseTracker.has(contextKey)) {
      this.#abuseTracker.set(contextKey, {
        count: 0,
        firstFailure: Date.now(),
        errors: []
      });
    }

    const tracker = this.#abuseTracker.get(contextKey);
    tracker.count++;
    tracker.lastFailure = Date.now();
    tracker.errors.push(error.message);

    // Keep only last 10 errors
    if (tracker.errors.length > 10) {
      tracker.errors.shift();
    }
  }

  /**
   * Check for abuse patterns (repeated failures)
   */
  #checkForAbuse(contextKey) {
    const tracker = this.#abuseTracker.get(contextKey);
    if (!tracker) return;

    const timeWindow = 60000; // 1 minute
    const timeSinceFirst = Date.now() - tracker.firstFailure;

    // If more than 10 failures in 1 minute, log security event
    if (tracker.count >= 10 && timeSinceFirst < timeWindow) {
      this.#auditLogger.logSecurityEvent({
        timestamp: new Date().toISOString(),
        type: 'POTENTIAL_ABUSE',
        context: contextKey,
        failureCount: tracker.count,
        timeWindow: timeSinceFirst,
        recentErrors: tracker.errors
      });

      // Rate limit warning (could add more aggressive measures)
      console.warn(
        `⚠️  Security Warning: ${tracker.count} validation failures detected for ${contextKey}`
      );
    }
  }

  /**
   * Sanitize context for logging (remove sensitive data)
   */
  #sanitizeContext(context) {
    const sanitized = { ...context };

    // Remove potentially sensitive fields
    delete sanitized.credentials;
    delete sanitized.token;
    delete sanitized.password;
    delete sanitized.secret;

    return sanitized;
  }

  /**
   * Clear validation cache (for testing or manual reset)
   */
  clearCache() {
    this.#validationCache.clear();
  }

  /**
   * Get cache statistics (for monitoring)
   */
  getCacheStats() {
    return {
      size: this.#validationCache.size,
      abuseTrackers: this.#abuseTracker.size
    };
  }
}
