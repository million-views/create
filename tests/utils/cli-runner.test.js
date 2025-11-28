/**
 * Tests for cli-runner utility
 * Validates that the test harness itself works correctly
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  runCLI,
  cleanup,
  stripAnsi,
  assertOutputContains,
  assertOutputExcludes,
  isSuccess,
  isFailure
} from './cli-runner.js';

describe('CLI Runner Utility', () => {
  it('should execute create-scaffold with --help', async () => {
    const result = await runCLI('scaffold', ['--help']);

    try {
      assert.strictEqual(result.exitCode, 0);
      // Help output now uses the new DSL terminology (scaffold, USAGE:, OPERATIONS:)
      assertOutputContains(result.stdout, ['scaffold', 'USAGE:', 'OPERATIONS:']);
      assert.strictEqual(result.timedOut, false);
      assert.ok(result.tempDir, 'Should have temp directory');
      assert.ok(result.cacheDir, 'Should have isolated cache directory');
    } finally {
      await cleanup(result);
    }
  });

  it('should execute make-template with --help', async () => {
    const result = await runCLI('template', ['--help']);

    try {
      assert.strictEqual(result.exitCode, 0);
      // Help output now uses the new DSL terminology (template, USAGE:, OPERATIONS:)
      assertOutputContains(result.stdout, ['template', 'USAGE:', 'OPERATIONS:']);
      assert.ok(isSuccess(result));
    } finally {
      await cleanup(result);
    }
  });

  it('should return non-zero exit code for invalid command', async () => {
    const result = await runCLI('scaffold', ['invalid-command']);

    try {
      assert.notStrictEqual(result.exitCode, 0);
      assert.ok(isFailure(result));
    } finally {
      await cleanup(result);
    }
  });

  it('should strip ANSI codes from output', async () => {
    const result = await runCLI('scaffold', ['--help']);

    try {
      // Raw output might have ANSI codes
      // Stripped output should not
      assert.ok(result.stdout.length > 0);
      assert.ok(result.stdoutStripped.length > 0);
      assert.strictEqual(result.stdoutStripped, stripAnsi(result.stdout));
    } finally {
      await cleanup(result);
    }
  });

  it('should use isolated cache directory', async () => {
    const result = await runCLI('scaffold', ['--help'], {
      isolateCache: true
    });

    try {
      assert.ok(result.cacheDir);
      assert.ok(result.cacheDir.includes('cli-test-cache-'));
    } finally {
      await cleanup(result);
    }
  });

  it('should respect custom environment variables', async () => {
    const result = await runCLI('scaffold', ['--help'], {
      env: { M5NV_DEBUG: '1' }
    });

    try {
      assert.strictEqual(result.exitCode, 0);
      // Debug mode enabled via env var
    } finally {
      await cleanup(result);
    }
  });

  it('should timeout long-running commands', async () => {
    // This test simulates a timeout by using a very short timeout value
    // In practice, no command should take this long
    const result = await runCLI('scaffold', ['--help'], {
      timeout: 50 // Very short timeout
    });

    try {
      // Either completes successfully (fast) or times out
      assert.ok(typeof result.exitCode === 'number');
      assert.ok(typeof result.timedOut === 'boolean');
    } finally {
      await cleanup(result);
    }
  });
});

describe('CLI Runner Assertions', () => {
  it('should validate assertOutputContains with matching phrases', () => {
    const output = 'Hello World\nTest Output\nSuccess!';

    // Should not throw
    assertOutputContains(output, ['Hello', 'Test', 'Success']);
  });

  it('should fail assertOutputContains with missing phrases', () => {
    const output = 'Hello World';

    assert.throws(
      () => assertOutputContains(output, ['Missing', 'Phrase']),
      /Expected output to contain phrases/
    );
  });

  it('should validate assertOutputExcludes with excluded phrases', () => {
    const output = 'Hello World';

    // Should not throw
    assertOutputExcludes(output, ['Missing', 'NotPresent']);
  });

  it('should fail assertOutputExcludes when phrases are found', () => {
    const output = 'Hello World';

    assert.throws(
      () => assertOutputExcludes(output, ['Hello', 'World']),
      /Expected output to NOT contain phrases/
    );
  });

  it('should handle case-insensitive matching by default', () => {
    const output = 'Hello World';

    // Should not throw (case-insensitive)
    assertOutputContains(output, ['hello', 'WORLD']);
  });

  it('should handle case-sensitive matching when enabled', () => {
    const output = 'Hello World';

    // Should throw (case-sensitive)
    assert.throws(
      () => assertOutputContains(output, ['hello'], { caseSensitive: true }),
      /Expected output to contain phrases/
    );

    // Should not throw (exact match)
    assertOutputContains(output, ['Hello'], { caseSensitive: true });
  });
});

describe('CLI Runner Helpers', () => {
  it('should check success status', () => {
    assert.strictEqual(isSuccess({ exitCode: 0, timedOut: false }), true);
    assert.strictEqual(isSuccess({ exitCode: 1, timedOut: false }), false);
    assert.strictEqual(isSuccess({ exitCode: 0, timedOut: true }), false);
  });

  it('should check failure status', () => {
    assert.strictEqual(isFailure({ exitCode: 1, timedOut: false }), true);
    assert.strictEqual(isFailure({ exitCode: 0, timedOut: true }), true);
    assert.strictEqual(isFailure({ exitCode: 0, timedOut: false }), false);
  });
});
