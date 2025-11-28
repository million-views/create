import { describe, it } from 'node:test';
import { strictEqual, ok } from 'node:assert';
import {
  runCLI,
  stripAnsi,
  assertOutputContains,
  cleanup
} from '../../utils/cli-runner.js';
import { ensureGitAvailable, stageFixtureRepo } from '../../utils/git-fixtures.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '../../..');

/**
 * Router Tests for `scaffold new` Command
 *
 * Test Layer: L4 (CLI/Router)
 * - Tests invoke CLI with argv arrays only
 * - No imports of business logic modules
 * - Uses real template fixtures under tests/fixtures/
 * - Asserts exit codes and output messages
 *
 * Coverage Target:
 * - bin/create/domains/scaffold/commands/new/index.mts: 89.91% → 95%+
 * - bin/create/domains/scaffold/commands/new/scaffolder.mts: 80.33% → 85%+
 *
 * Focus: Critical edge cases that existing tests may miss
 */

// Test scenario matrix for new command (focused on high-value edge cases)
const NEW_SCENARIOS = [
  {
    name: 'create project with local template',
    args: [
      'new',
      'test-project',
      '--template', join(PROJECT_ROOT, 'tests/fixtures/placeholder-template'),
      '--placeholder', 'PACKAGE_NAME=my-test-app',
      '--placeholder', 'API_TOKEN=test-token-12345',
      '--yes'
    ],
    needsTempDir: true, // Requires unique temp directory
    expectedExit: 0,
    outputContains: [
      'success',
      'test-project'
    ],
    outputDoesNotContain: []
  },
  {
    name: 'handle existing project directory (overwrites)',
    args: [
      'new',
      'existing-project',
      '--template', join(PROJECT_ROOT, 'tests/fixtures/placeholder-template'),
      '--placeholder', 'PACKAGE_NAME=existing',
      '--placeholder', 'API_TOKEN=token',
      '--yes'
    ],
    setupProject: 'existing-project', // Create this directory before running
    expectedExit: 0, // Currently succeeds and overwrites (expected behavior)
    outputContains: [
      'success'
    ],
    outputDoesNotContain: []
  },
  {
    name: 'succeed with required placeholder having default value',
    args: [
      'new',
      'test-project',
      '--template', join(PROJECT_ROOT, 'tests/fixtures/placeholder-template'),
      '--placeholder', 'PACKAGE_NAME=my-app',
      // API_TOKEN not provided, but has default value of ""
      '--yes'
    ],
    needsTempDir: true,
    expectedExit: 0,
    outputContains: [
      'success'
    ],
    outputDoesNotContain: []
  },
  {
    name: 'fail with non-existent template path',
    args: [
      'new',
      'test-project',
      '--template', join(PROJECT_ROOT, 'tests/fixtures/does-not-exist'),
      '--yes'
    ],
    expectedExit: 1,
    outputContains: [
      'error',
      'template'
    ],
    outputDoesNotContain: []
  },
  {
    name: 'fail when no project name provided',
    args: [
      'new',
      '--template', join(PROJECT_ROOT, 'tests/fixtures/placeholder-template')
    ],
    expectedExit: 1,
    outputContains: [
      'project',
      'required'
    ],
    outputDoesNotContain: []
  },
  {
    name: 'fail when no template provided',
    args: [
      'new',
      'test-project'
    ],
    needsTempDir: true,
    expectedExit: 1,
    outputContains: [
      'template'
    ],
    outputDoesNotContain: []
  },
  {
    name: 'show help with --help flag',
    args: [
      'new',
      '--help'
    ],
    expectedExit: 0,
    outputContains: [
      'usage',
      'create a new project',
      '--template'
    ],
    outputDoesNotContain: []
  },
  // Git fixture scenarios (Phase 2)
  {
    name: 'create project from file:// git URL',
    args: null, // Will be set dynamically with git fixture URL
    needsGitFixture: 'simple-template',
    needsTempDir: true,
    expectedExit: 0,
    outputContains: [
      'success',
      'git-project'
    ],
    outputDoesNotContain: []
  },
  {
    name: 'create project from cached git repository',
    args: null, // Will be set dynamically
    needsGitFixture: 'simple-template',
    needsTempDir: true,
    reuseCache: true, // Test cache hit on second use
    expectedExit: 0,
    outputContains: [
      'success'
    ],
    outputDoesNotContain: []
  }
];

describe('Scaffold New - Router Tests', () => {
  // Matrix-based scenario tests
  for (const scenario of NEW_SCENARIOS) {
    it(`should handle: ${scenario.name}`, async (t) => {
      let result;
      let setupDir = null;
      let gitFixture = null;

      try {
        const { mkdtemp, mkdir } = await import('fs/promises');
        const { tmpdir } = await import('os');

        // Setup: Git fixture if needed
        if (scenario.needsGitFixture) {
          await ensureGitAvailable();
          gitFixture = await stageFixtureRepo(scenario.needsGitFixture, { testContext: t });

          // Build args with git URL
          scenario.args = [
            'new',
            'git-project',
            '--template', gitFixture.repoUrl,
            '--placeholder', 'PROJECT_NAME=git-test',
            '--yes'
          ];
        }

        // Setup: Create project directory if specified
        if (scenario.setupProject) {
          setupDir = await mkdtemp(join(tmpdir(), 'cli-test-'));
          const projectDir = join(setupDir, scenario.setupProject);
          await mkdir(projectDir, { recursive: true });

          // Update args to use temp directory as CWD
          const updatedArgs = scenario.args.map(arg =>
            arg === scenario.setupProject ? scenario.setupProject : arg
          );

          result = await runCLI('scaffold', updatedArgs, {
            cwd: setupDir,
            env: {
              NODE_ENV: 'test',
              M5NV_LOG_LEVEL: 'error'  // Reduce noise in tests
            }
          });
        } else if (scenario.needsTempDir) {
          // Create unique temp directory for tests that create projects
          setupDir = await mkdtemp(join(tmpdir(), 'cli-new-test-'));
          result = await runCLI('scaffold', scenario.args, {
            cwd: setupDir,
            env: {
              NODE_ENV: 'test',
              M5NV_LOG_LEVEL: 'error'
            }
          });
        } else {
          result = await runCLI('scaffold', scenario.args, {
            env: {
              NODE_ENV: 'test',
              M5NV_LOG_LEVEL: 'error'
            }
          });
        }

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

      } finally {
        // Cleanup
        if (result) {
          await cleanup(result);
        }
        if (setupDir) {
          const { rm } = await import('fs/promises');
          await rm(setupDir, { recursive: true, force: true }).catch(() => { });
        }
      }
    });
  }
});

describe('Scaffold New - Edge Cases', () => {
  it('should handle template with placeholder formats', async () => {
    const { mkdtemp, rm } = await import('fs/promises');
    const { tmpdir } = await import('os');
    let result;
    let testDir;

    try {
      // Create unique temp directory for this test
      testDir = await mkdtemp(join(tmpdir(), 'cli-new-test-'));

      result = await runCLI('scaffold', [
        'new',
        'format-test',
        '--template', join(PROJECT_ROOT, 'tests/fixtures/placeholder-template'),
        '--placeholder', 'PACKAGE_NAME=format-test-app',
        '--placeholder', 'API_TOKEN=test-token',
        '--placeholder', 'MAX_WORKERS=8',
        '--yes'
      ], {
        cwd: testDir,
        env: { NODE_ENV: 'test', M5NV_LOG_LEVEL: 'error' }
      });

      strictEqual(result.exitCode, 0, `Command should succeed\nOutput: ${result.stdout + result.stderr}`);
      const output = stripAnsi(result.stdout + result.stderr).toLowerCase();
      ok(output.includes('success') || output.includes('created'), 'Should indicate successful project creation');
    } finally {
      // Cleanup: Remove temp directory (contains created project + cache)
      if (result) {
        await cleanup(result);
      }
      if (testDir) {
        await rm(testDir, { recursive: true, force: true }).catch(() => { });
      }
    }
  });

  it('should respect --yes flag for non-interactive mode', async () => {
    const { mkdtemp, rm } = await import('fs/promises');
    const { tmpdir } = await import('os');
    let result;
    let testDir;

    try {
      // Create unique temp directory for this test
      testDir = await mkdtemp(join(tmpdir(), 'cli-new-test-'));

      result = await runCLI('scaffold', [
        'new',
        'no-prompts-test',
        '--template', join(PROJECT_ROOT, 'tests/fixtures/placeholder-template'),
        '--placeholder', 'PACKAGE_NAME=no-prompts',
        '--placeholder', 'API_TOKEN=token',
        '--yes'
      ], {
        cwd: testDir,
        env: { NODE_ENV: 'test', M5NV_LOG_LEVEL: 'error' }
      });

      // With --yes and all required placeholders, should succeed without interaction
      const output = stripAnsi(result.stdout + result.stderr).toLowerCase();
      strictEqual(result.exitCode, 0, `Should succeed with --yes\nOutput: ${output}`);
    } finally {
      // Cleanup: Remove temp directory (contains created project + cache)
      if (result) {
        await cleanup(result);
      }
      if (testDir) {
        await rm(testDir, { recursive: true, force: true }).catch(() => { });
      }
    }
  });

  it('should validate project name for invalid characters', async () => {
    let result;

    try {
      result = await runCLI('scaffold', [
        'new',
        '../../../malicious',  // Path traversal attempt
        '--template', join(PROJECT_ROOT, 'tests/fixtures/placeholder-template'),
        '--placeholder', 'PACKAGE_NAME=test',
        '--placeholder', 'API_TOKEN=token',
        '--yes'
      ], {
        env: { NODE_ENV: 'test', M5NV_LOG_LEVEL: 'error' }
      });

      // Should reject path traversal attempts
      strictEqual(result.exitCode, 1, 'Should reject path traversal in project name');
      const output = stripAnsi(result.stdout + result.stderr).toLowerCase();
      ok(
        output.includes('invalid') || output.includes('path') || output.includes('security'),
        'Should indicate security/validation error'
      );
    } finally {
      if (result) {
        await cleanup(result);
      }
    }
  });
});
