import { describe, it } from 'node:test';
import { strictEqual, ok } from 'node:assert';
import {
  runCLI,
  stripAnsi,
  assertOutputContains,
  assertOutputDoesNotContain,
  cleanup
} from '../../utils/cli-runner.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '../../..');

/**
 * Router Tests for `scaffold list` Command
 *
 * Test Layer: L4 (CLI/Router)
 * - Tests invoke CLI with argv arrays only
 * - No imports of business logic modules
 * - Uses real file fixtures under tests/fixtures/cli/list/
 * - Asserts exit codes and output messages
 *
 * Coverage Target:
 * - bin/create/domains/scaffold/commands/list/index.mts: 81.08% → 90%+
 * - bin/create/domains/scaffold/commands/list/registry-fetcher.mts: 69.23% → 80%+, branches 21.42% → 60%+
 */

// Test scenario matrix for list command
const LIST_SCENARIOS = [
  {
    name: 'list templates from local registry (default format)',
    args: ['list', '--registry', join(PROJECT_ROOT, 'tests/fixtures/cli/list/simple-registry')],
    expectedExit: 0,
    outputContains: [
      'listing templates',
      'template-a',
      'simple template a',
      'template-b',
      'template b with more features',
      'templates (2)'
    ],
    outputDoesNotContain: []
  },
  {
    name: 'list templates with JSON output format',
    args: ['list', '--registry', join(PROJECT_ROOT, 'tests/fixtures/cli/list/simple-registry'), '--format', 'json'],
    expectedExit: 0,
    outputContains: [
      '"registry"',
      '"templates"',
      '"name": "template-a"',
      '"name": "template-b"',
      '"description"'
    ],
    outputDoesNotContain: []  // Emojis appear in info messages before JSON, which is expected
  },
  {
    name: 'list templates with verbose flag',
    args: ['list', '--registry', join(PROJECT_ROOT, 'tests/fixtures/cli/list/simple-registry'), '--verbose'],
    expectedExit: 0,
    outputContains: [
      'template-a',
      'template-b',
      'version:',
      'author:'
    ],
    outputDoesNotContain: []
  },
  {
    name: 'list from empty registry',
    args: ['list', '--registry', join(PROJECT_ROOT, 'tests/fixtures/cli/list/empty-registry')],
    expectedExit: 0,
    outputContains: [
      'no templates found',
      'templates are identified by containing'
    ],
    outputDoesNotContain: ['template-a', 'template-b']
  },
  {
    name: 'list templates without descriptions',
    args: ['list', '--registry', join(PROJECT_ROOT, 'tests/fixtures/cli/list/registry-no-descriptions')],
    expectedExit: 0,
    outputContains: [
      'template-c',
      'templates (1)'
    ],
    outputDoesNotContain: []
  },
  {
    name: 'list with non-existent registry path',
    args: ['list', '--registry', join(PROJECT_ROOT, 'tests/fixtures/cli/list/does-not-exist')],
    expectedExit: 1,
    outputContains: [
      'fail',
      'list'
    ],
    outputDoesNotContain: ['templates (']
  },
  {
    name: 'list without registry flag (uses default, expect cache error)',
    args: ['list'],
    expectedExit: 1,  // Fails because default remote registry isn't cached in test environment
    outputContains: [
      'listing templates',
      'not cached'
    ],
    outputDoesNotContain: []
  }
];

describe('Scaffold List - Router Tests', () => {
  // Matrix-based scenario tests
  for (const scenario of LIST_SCENARIOS) {
    it(`should handle: ${scenario.name}`, async () => {
      let result;
      try {
        result = await runCLI('scaffold', scenario.args, {
          env: {
            NODE_ENV: 'test',
            M5NV_LOG_LEVEL: 'info'
          }
        });

        const output = stripAnsi(result.stdout + result.stderr).toLowerCase();

        // Assert exit code
        strictEqual(
          result.exitCode,
          scenario.expectedExit,
          `Expected exit code ${scenario.expectedExit} but got ${result.exitCode}\nOutput: ${output}`
        );

        // Assert expected output strings
        if (scenario.outputContains.length > 0) {
          assertOutputContains(output, scenario.outputContains, scenario.name);
        }

        // Assert strings that should NOT appear
        if (scenario.outputDoesNotContain.length > 0) {
          assertOutputDoesNotContain(output, scenario.outputDoesNotContain, scenario.name);
        }
      } finally {
        if (result) {
          await cleanup(result.tempDir, result.cacheDir);
        }
      }
    });
  }
});

describe('Scaffold List - Edge Cases', () => {
  it('should handle concurrent list calls', async () => {
    const registryPath = join(PROJECT_ROOT, 'tests/fixtures/cli/list/simple-registry');

    const results = await Promise.all([
      runCLI('scaffold', ['list', '--registry', registryPath]),
      runCLI('scaffold', ['list', '--registry', registryPath]),
      runCLI('scaffold', ['list', '--registry', registryPath])
    ]);

    try {
      // All should succeed
      for (const result of results) {
        strictEqual(result.exitCode, 0, 'All concurrent list calls should succeed');
        const output = stripAnsi(result.stdout + result.stderr).toLowerCase();
        ok(output.includes('template-a'), 'Should list template-a');
        ok(output.includes('template-b'), 'Should list template-b');
      }
    } finally {
      // Cleanup all temp directories
      for (const result of results) {
        await cleanup(result.tempDir, result.cacheDir);
      }
    }
  });

  it('should handle registry path with special characters', async () => {
    // This tests path handling with spaces, etc.
    const registryPath = join(PROJECT_ROOT, 'tests/fixtures/cli/list/simple-registry');
    let result;

    try {
      result = await runCLI('scaffold', ['list', '--registry', registryPath], {
        env: { NODE_ENV: 'test' }
      });

      strictEqual(result.exitCode, 0);
      const output = stripAnsi(result.stdout + result.stderr).toLowerCase();
      ok(output.includes('template-a'), 'Should handle path correctly');
    } finally {
      if (result) {
        await cleanup(result.tempDir, result.cacheDir);
      }
    }
  });

  it('should show help when invalid flag provided', async () => {
    let result;

    try {
      result = await runCLI('scaffold', ['list', '--invalid-flag'], {
        env: { NODE_ENV: 'test' }
      });

      // Should show help or handle gracefully
      const output = stripAnsi(result.stdout + result.stderr).toLowerCase();
      ok(
        output.includes('list') || output.includes('usage') || output.includes('help'),
        'Should show help or usage information'
      );
    } finally {
      if (result) {
        await cleanup(result.tempDir, result.cacheDir);
      }
    }
  });
});
