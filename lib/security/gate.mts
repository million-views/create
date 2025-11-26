/**
 * Security Gate - Architectural boundary for validation
 *
 * ALL entry points MUST call enforce() before processing inputs.
 * This ensures no code path can bypass security validation.
 *
 * Defense-in-Depth Layer 1: Input Validation Gate
 *
 * @module lib/security/gate
 */

import { ValidationError, GateError } from '../error/index.mts';
import { getAuditLogger } from './audit.mjs';
import { allInputs as validateAllInputs } from '../validation/cli/input.mts';

/**
 * Options for Gate constructor.
 */
export interface GateOptions {
  /**
   * Custom audit logger instance.
   */
  auditLogger?: ReturnType<typeof getAuditLogger>;
}

/**
 * Execution context for validation.
 */
export interface GateContext {
  /**
   * Command or operation being executed.
   */
  command?: string;

  /**
   * User identifier (for abuse tracking).
   */
  user?: string;

  /**
   * Required fields that must be present in inputs.
   */
  requiredFields?: string[];

  /**
   * Credentials (will be sanitized from logs).
   */
  credentials?: unknown;

  /**
   * Token (will be sanitized from logs).
   */
  token?: unknown;

  /**
   * Any additional context properties.
   */
  [key: string]: unknown;
}

/**
 * Result of validation with validated inputs.
 */
export interface GateResult {
  [key: string]: unknown;
}

/**
 * Cache statistics for monitoring.
 */
export interface GateCacheStats {
  size: number;
  abuseTrackers: number;
}

interface AbuseTracker {
  count: number;
  firstFailure: number;
  lastFailure?: number;
  errors: string[];
}

/**
 * Security Gate Enforcer - Architectural boundary for validation.
 *
 * Use this class to enforce validation at entry points to your application.
 * All user inputs must pass through the Gate before being processed.
 *
 * @example
 * ```typescript
 * const gate = new Gate();
 *
 * // At CLI entry point
 * const validated = await gate.enforce(userInputs, {
 *   command: 'create-scaffold new',
 *   requiredFields: ['projectName', 'templatePath']
 * });
 * ```
 */
export class Gate {
  #auditLogger: ReturnType<typeof getAuditLogger>;
  #validationCache: Map<string, GateResult>;
  #abuseTracker: Map<string, AbuseTracker>;

  constructor(options: GateOptions = {}) {
    this.#auditLogger = options.auditLogger ?? getAuditLogger();
    this.#validationCache = new Map();
    this.#abuseTracker = new Map();
  }

  /**
   * Enforce validation at architectural boundary.
   *
   * @param rawInputs - Unvalidated user inputs
   * @param context - Execution context (command, timestamp, etc.)
   * @returns Validated and sanitized inputs
   * @throws GateError if validation fails
   */
  async enforce(
    rawInputs: Record<string, unknown>,
    context: GateContext = {}
  ): Promise<GateResult> {
    const startTime = Date.now();
    const contextKey = this.#getContextKey(context);

    try {
      // Check cache for performance (using native Map)
      const cacheKey = this.#getCacheKey(rawInputs);
      if (this.#validationCache.has(cacheKey)) {
        const cached = this.#validationCache.get(cacheKey)!;

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

      // Pass through fields that were validated as required but not included in validateAllInputs()
      // This maintains security: required fields are validated for presence,
      // and downstream validators (like BoundaryValidator) provide additional validation
      const result: GateResult = { ...validated };
      if (context.requiredFields) {
        for (const field of context.requiredFields) {
          if (rawInputs[field] !== undefined && !(field in validated)) {
            result[field] = rawInputs[field];
          }
        }
      }

      // Cache successful validation (with size limit)
      if (this.#validationCache.size > 1000) {
        // Clear oldest entries
        const firstKey = this.#validationCache.keys().next().value;
        if (firstKey) {
          this.#validationCache.delete(firstKey);
        }
      }
      this.#validationCache.set(cacheKey, result);

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

      return result;

    } catch (error) {
      // Track failure for abuse detection
      this.#trackFailure(contextKey, error as Error);

      // Log validation failure
      this.#auditLogger.logValidation({
        timestamp: new Date().toISOString(),
        context: this.#sanitizeContext(context),
        inputKeys: Object.keys(rawInputs),
        outcome: 'failure',
        error: (error as Error).message,
        duration: Date.now() - startTime
      });

      // Check for repeated failures (potential abuse)
      this.#checkForAbuse(contextKey);

      // Throw security gate error with context
      throw new GateError(
        `Security validation failed: ${(error as Error).message}`,
        {
          context: context.command,
          originalError: error as Error,
          validationErrors: error instanceof ValidationError
            ? [(error as Error).message]
            : [(error as Error).message]
        }
      );
    }
  }

  /**
   * Validate required fields are present.
   */
  #validateRequiredFields(
    inputs: Record<string, unknown>,
    requiredFields: string[]
  ): void {
    const missing: string[] = [];

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
   * Generate cache key for validation results.
   */
  #getCacheKey(inputs: Record<string, unknown>): string {
    // Use JSON serialization for cache key (stable ordering via sorted keys)
    const sorted = Object.keys(inputs).sort().reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = inputs[key];
      return acc;
    }, {});
    return JSON.stringify(sorted);
  }

  /**
   * Get context key for abuse tracking.
   */
  #getContextKey(context: GateContext): string {
    return `${context.command ?? 'unknown'}:${context.user ?? 'anonymous'}`;
  }

  /**
   * Track validation failure for abuse detection.
   */
  #trackFailure(contextKey: string, error: Error): void {
    if (!this.#abuseTracker.has(contextKey)) {
      this.#abuseTracker.set(contextKey, {
        count: 0,
        firstFailure: Date.now(),
        errors: []
      });
    }

    const tracker = this.#abuseTracker.get(contextKey)!;
    tracker.count++;
    tracker.lastFailure = Date.now();
    tracker.errors.push(error.message);

    // Keep only last 10 errors
    if (tracker.errors.length > 10) {
      tracker.errors.shift();
    }
  }

  /**
   * Check for abuse patterns (repeated failures).
   */
  #checkForAbuse(contextKey: string): void {
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
   * Sanitize context for logging (remove sensitive data).
   */
  #sanitizeContext(context: GateContext): Record<string, unknown> {
    const sanitized: Record<string, unknown> = { ...context };

    // Remove potentially sensitive fields
    delete sanitized.credentials;
    delete sanitized.token;
    delete sanitized.password;
    delete sanitized.secret;

    return sanitized;
  }

  /**
   * Clear validation cache (for testing or manual reset).
   */
  clearCache(): void {
    this.#validationCache.clear();
  }

  /**
   * Get cache statistics (for monitoring).
   */
  getCacheStats(): GateCacheStats {
    return {
      size: this.#validationCache.size,
      abuseTrackers: this.#abuseTracker.size
    };
  }
}

// Legacy export name for backward compatibility
export { Gate as SecurityGate };
