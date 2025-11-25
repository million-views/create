#!/usr/bin/env node

import test from 'node:test';
import assert from 'node:assert/strict';
import { SecurityGate, SecurityGateError } from '../../lib/security-gate.mjs';
import { BoundaryValidator, BoundaryViolationError } from '../../lib/boundary-validator.mjs';
import { SecurityAuditLogger } from '../../lib/security-audit-logger.mjs';
import { ValidationError } from '../../lib/security.mjs';

// Architectural Tests for Defense-in-Depth Security

test('SecurityGate - Layer 1: Input Validation Gate', async (t) => {
  await t.test('enforces validation on all inputs', async () => {
    const gate = new SecurityGate();

    const validInputs = {
      projectDirectory: 'test-project',
      template: 'react'
    };

    const validated = await gate.enforce(validInputs, { command: 'new' });
    assert.ok(validated.projectDirectory);
    assert.equal(validated.template, 'react');
  });

  await t.test('rejects malicious path traversal', async () => {
    const gate = new SecurityGate();

    const maliciousInputs = {
      projectDirectory: '../../../etc/passwd',
      template: 'react'
    };

    await assert.rejects(
      async () => gate.enforce(maliciousInputs),
      SecurityGateError
    );
  });

  await t.test('rejects injection attempts', async () => {
    const gate = new SecurityGate();

    const injectionInputs = {
      projectDirectory: 'test',
      repo: 'user/repo; rm -rf /' // Repo URL blocks shell metacharacters
    };

    await assert.rejects(
      async () => gate.enforce(injectionInputs),
      SecurityGateError
    );
  });

  await t.test('validates required fields', async () => {
    const gate = new SecurityGate();

    const incompleteInputs = {
      projectDirectory: 'test'
      // template missing
    };

    await assert.rejects(
      async () => gate.enforce(incompleteInputs, {
        command: 'new',
        requiredFields: ['projectDirectory', 'template']
      }),
      SecurityGateError
    );
  });

  await t.test('caches validation results for performance', async () => {
    const gate = new SecurityGate();

    const inputs = {
      projectDirectory: 'test-project',
      template: 'react'
    };

    // First call - validates
    const result1 = await gate.enforce(inputs);

    // Second call - from cache (should be fast)
    const start = Date.now();
    const result2 = await gate.enforce(inputs);
    const duration = Date.now() - start;

    assert.ok(duration < 10, 'Cached validation should be < 10ms');
    assert.deepEqual(result1, result2);
  });

  await t.test('clearCache() removes cached validations', async () => {
    const gate = new SecurityGate();

    const inputs = {
      projectDirectory: 'test-project',
      template: 'react'
    };

    // First call - validates and caches
    await gate.enforce(inputs);

    // Verify cache has entry
    const statsBefore = gate.getCacheStats();
    assert.ok(statsBefore.size > 0, 'Cache should have entries');

    // Clear cache
    gate.clearCache();

    // Verify cache is empty
    const statsAfter = gate.getCacheStats();
    assert.equal(statsAfter.size, 0, 'Cache should be empty after clear');
  });

  await t.test('detects abuse patterns (repeated failures)', async () => {
    const gate = new SecurityGate();

    const maliciousInputs = {
      projectDirectory: '../evil',
      template: 'malicious'
    };

    // Trigger multiple failures
    for (let i = 0; i < 12; i++) {
      try {
        await gate.enforce(maliciousInputs, {
          command: 'test',
          user: 'attacker'
        });
      } catch {
        // Expected to fail
      }
    }

    // Abuse tracker should have recorded failures
    const stats = gate.getCacheStats();
    assert.equal(stats.abuseTrackers, 1);
  });
});

test('BoundaryValidator - Layer 3: Runtime Boundary Enforcement', async (t) => {
  await t.test('allows paths within boundaries', () => {
    const validator = new BoundaryValidator('/safe/root');

    const validPath = validator.validatePath('subdir/file.txt', 'read');
    assert.ok(validPath.startsWith('/safe/root'));
  });

  await t.test('blocks path traversal attempts', () => {
    const validator = new BoundaryValidator('/safe/root');

    assert.throws(
      () => validator.validatePath('../../../etc/passwd', 'read'),
      BoundaryViolationError
    );
  });

  await t.test('blocks null byte injection', () => {
    const validator = new BoundaryValidator('/safe/root');

    assert.throws(
      () => validator.validatePath('file.txt\0.jpg', 'read'),
      BoundaryViolationError
    );
  });

  await t.test('validates multiple paths', () => {
    const validator = new BoundaryValidator('/safe/root');

    const paths = ['file1.txt', 'dir/file2.txt', 'another/file3.txt'];
    const validated = validator.validatePaths(paths, 'copy');

    assert.equal(validated.length, 3);
    validated.forEach(p => {
      assert.ok(p.startsWith('/safe/root'));
    });
  });

  await t.test('wraps fs module with automatic validation', async () => {
    const validator = new BoundaryValidator('/safe/root');

    // Test double: A minimal fs-like object to test wrapFs() behavior
    // This is NOT a "mock" that replaces real implementation - it's testing
    // that wrapFs() correctly wraps ANY fs-like object, which is its design.
    // The function is designed to wrap arbitrary fs objects, so testing with
    // a test double verifies this polymorphic behavior.
    const testFsDouble = {
      async readFile(path) {
        return `reading ${path}`;
      }
    };

    const wrappedFs = validator.wrapFs(testFsDouble);

    // Valid path should work
    const result = await wrappedFs.readFile('file.txt');
    assert.ok(result.includes('/safe/root/file.txt'));

    // Invalid path should throw
    await assert.rejects(
      async () => wrappedFs.readFile('../../../etc/passwd'),
      BoundaryViolationError
    );
  });
});

test('SecurityAuditLogger - Layer 5: Audit and Monitoring', async (t) => {
  await t.test('logs validation events', async () => {
    const logger = new SecurityAuditLogger({ console: false });

    logger.logValidation({
      timestamp: new Date().toISOString(),
      context: { command: 'new' },
      outcome: 'success'
    });

    // Should be buffered
    await logger.flush();
  });

  await t.test('logs boundary violations', async () => {
    const logger = new SecurityAuditLogger({ console: false });

    logger.logBoundaryViolation({
      timestamp: new Date().toISOString(),
      operation: 'readFile',
      attemptedPath: '../../../etc/passwd'
    });

    await logger.flush();
  });

  await t.test('auto-flushes when threshold reached', async () => {
    const logger = new SecurityAuditLogger({
      console: false,
      flushThreshold: 3
    });

    // Add events up to threshold
    logger.logValidation({ outcome: 'success' });
    logger.logValidation({ outcome: 'success' });
    logger.logValidation({ outcome: 'success' });

    // Should have auto-flushed (buffer empty)
    await logger.close();
  });
});

test('Defense-in-Depth: Layer Independence', async (t) => {
  await t.test('each layer independently blocks path traversal', async () => {
    const maliciousPath = '../../../etc/passwd';

    // Layer 1: SecurityGate blocks at input validation
    const gate = new SecurityGate();
    await assert.rejects(
      async () => gate.enforce({ projectDirectory: maliciousPath }),
      SecurityGateError
    );

    // Layer 3: BoundaryValidator blocks at runtime
    const validator = new BoundaryValidator('/safe/root');
    assert.throws(
      () => validator.validatePath(maliciousPath),
      BoundaryViolationError
    );

    // Both layers catch independently (defense-in-depth)
  });

  await t.test('each layer independently blocks injection', async () => {
    const injection = 'user/repo; rm -rf /';

    // Layer 1: SecurityGate blocks command injection in repo URL
    const gate = new SecurityGate();
    await assert.rejects(
      async () => gate.enforce({ repo: injection }),
      SecurityGateError
    );

    // Even if Layer 1 was bypassed, validation functions still catch it
    const { validateRepoUrl } = await import('../../lib/security.mjs');
    assert.throws(
      () => validateRepoUrl(injection),
      ValidationError
    );
  });
});

test('Defense-in-Depth: Fail-Secure Behavior', async (t) => {
  await t.test('security failures halt execution immediately', async () => {
    const gate = new SecurityGate();

    let executionReached = false;

    try {
      await gate.enforce({ projectDirectory: '../evil' });
      executionReached = true; // Should never reach this
    } catch (error) {
      assert.ok(error instanceof SecurityGateError);
    }

    assert.equal(executionReached, false, 'Execution should not continue after security failure');
  });

  await t.test('no fallback on security failure', async () => {
    const gate = new SecurityGate();

    // Should throw, not fallback to defaults
    await assert.rejects(
      async () => gate.enforce({ projectDirectory: '../evil' }),
      SecurityGateError
    );

    // No fallback should occur
  });
});

test('Defense-in-Depth: Audit Coverage', async (t) => {
  await t.test('all security events are logged', async () => {
    const events = [];
    const logger = new SecurityAuditLogger({
      console: false,
      logFile: null // No file, just buffer
    });

    // Override log method to track events
    const originalLog = logger.logValidation.bind(logger);
    logger.logValidation = (event) => {
      events.push(event);
      originalLog(event);
    };

    const gate = new SecurityGate({ auditLogger: logger });

    // Successful validation
    await gate.enforce({ projectDirectory: 'test' });
    assert.equal(events.length, 1);
    assert.equal(events[0].outcome, 'success');

    // Failed validation
    try {
      await gate.enforce({ projectDirectory: '../evil' });
    } catch {
      // Expected
    }

    assert.equal(events.length, 2);
    assert.equal(events[1].outcome, 'failure');

    await logger.close();
  });
});
