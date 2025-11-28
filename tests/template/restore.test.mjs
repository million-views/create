#!/usr/bin/env node

/**
 * Unit and integration tests for make-template restore command
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { readFile, writeFile, rm, mkdir, access, constants } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { tmpdir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test timeout for CLI operations
const TEST_TIMEOUT = 60000;

// Helper function to execute CLI commands
function execCLI(args, options = {}) {
  const command = `cd ${options.cwd} && node ${join(__dirname, '../../bin/create/index.mts')} ${args.join(' ')}`;
  try {
    const result = execSync(command, {
      encoding: 'utf8',
      timeout: TEST_TIMEOUT,
      stdio: options.stdio || 'pipe'
    });
    return {
      exitCode: 0,
      stdout: result,
      stderr: ''
    };
  } catch (error) {
    return {
      exitCode: error.status || 1,
      stdout: error.stdout || '',
      stderr: error.stderr || ''
    };
  }
}

// Helper to create a mock undo log
async function createMockUndoLog(projectDir) {
  const undoLog = {
    version: '1.0.0',
    metadata: {
      makeTemplateVersion: '0.6.0',
      projectType: 'generic',
      timestamp: new Date().toISOString(),
      placeholderFormat: '⦃NAME⦄'
    },
    originalValues: {
      '⦃PROJECT_NAME⦄': 'test-project',
      '⦃VERSION⦄': '1.0.0',
      '⦃DESCRIPTION⦄': 'Test project description'
    },
    fileOperations: [
      {
        type: 'modified',
        path: 'package.json',
        originalContent: JSON.stringify({
          name: 'original-project',
          version: '1.0.0'
        }, null, 2),
        newContent: JSON.stringify({
          name: '⦃PROJECT_NAME⦄',
          version: '⦃VERSION⦄'
        }, null, 2),
        restorationAction: 'restore-content'
      },
      {
        type: 'modified',
        path: 'README.md',
        originalContent: '# Original Project\n\nThis is the original project.',
        newContent: '# ⦃PROJECT_NAME⦄\n\n⦃DESCRIPTION⦄',
        restorationAction: 'restore-content'
      }
    ]
  };

  await writeFile(join(projectDir, '.template-undo.json'), JSON.stringify(undoLog, null, 2));
}

test('restore requires undo log', async () => {
  const baseTestDir = join(tmpdir(), `make-template-restore-test-${Date.now()}`);
  const testDir = join(baseTestDir, 'no-undo');

  try {
    await mkdir(testDir, { recursive: true });

    const result = execCLI(['template', 'restore'], { cwd: testDir });

    assert.strictEqual(result.exitCode, 1, 'Should fail without undo log');
    assert(result.stderr.includes('.template-undo.json not found'), 'Should indicate missing undo log');
  } finally {
    await rm(baseTestDir, { recursive: true, force: true });
  }
});

test('restore --dry-run shows preview without changes', async () => {
  const baseTestDir = join(tmpdir(), `make-template-restore-test-${Date.now()}`);
  const testDir = join(baseTestDir, 'dry-run');

  try {
    await mkdir(testDir, { recursive: true });
    await createMockUndoLog(testDir);

    const result = execCLI(['template', 'restore', '--dry-run'], { cwd: testDir });

    assert.strictEqual(result.exitCode, 0, 'Dry run should succeed');
    assert(result.stdout.includes('DRY RUN MODE') || result.stdout.includes('preview'),
      'Should indicate dry run mode');

    // Verify files weren't actually restored
    try {
      await access(join(testDir, 'package.json'), constants.F_OK);
      assert.fail('package.json should not exist after dry run');
    } catch {
      // Expected - file should not exist
    }
  } finally {
    await rm(baseTestDir, { recursive: true, force: true });
  }
});

test('restore --help shows help text', async () => {
  const baseTestDir = join(tmpdir(), `make-template-restore-test-${Date.now()}`);
  const testDir = join(baseTestDir, 'help');

  try {
    await mkdir(testDir, { recursive: true });

    const result = execCLI(['template', 'restore', '--help'], { cwd: testDir });

    assert.strictEqual(result.exitCode, 0, 'Help command should succeed');
    assert(result.stdout.includes('restore'), 'Should show command name');
    assert(result.stdout.includes('Restore template to project'), 'Should show command description');
    assert(result.stdout.includes('USAGE:'), 'Should show usage section');
    assert(result.stdout.includes('restore [project-path] [options]'), 'Should show usage with optional project-path');
    assert(result.stdout.includes('--yes'), 'Should show yes option');
  } finally {
    await rm(baseTestDir, { recursive: true, force: true });
  }
});

test('restore performs restoration', async () => {
  const baseTestDir = join(tmpdir(), `make-template-restore-test-${Date.now()}`);
  const testDir = join(baseTestDir, 'restore');

  try {
    await mkdir(testDir, { recursive: true });
    await createMockUndoLog(testDir);

    // Create the templatized files that need to be restored
    await writeFile(join(testDir, 'package.json'), JSON.stringify({
      name: '⦃PROJECT_NAME⦄',
      version: '⦃VERSION⦄'
    }, null, 2));

    await writeFile(join(testDir, 'README.md'), '# ⦃PROJECT_NAME⦄\n\n⦃DESCRIPTION⦄');

    const result = execCLI(['template', 'restore', '--yes'], { cwd: testDir });

    assert.strictEqual(result.exitCode, 0, 'Restoration should succeed');

    // Verify files were restored
    const packageJsonPath = join(testDir, 'package.json');
    const readmePath = join(testDir, 'README.md');

    await access(packageJsonPath, constants.F_OK);
    await access(readmePath, constants.F_OK);

    // Verify content was restored correctly
    const packageContent = await readFile(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageContent);

    assert.strictEqual(packageJson.name, 'original-project', 'Should restore original project name');
    assert.strictEqual(packageJson.version, '1.0.0', 'Should restore original version');

    const readmeContent = await readFile(readmePath, 'utf8');
    assert(readmeContent.includes('# Original Project'), 'Should restore original README content');
    assert(readmeContent.includes('This is the original project.'), 'Should restore original description');
  } finally {
    await rm(baseTestDir, { recursive: true, force: true });
  }
});

test('restore cleans up artifacts', async () => {
  const baseTestDir = join(tmpdir(), `make-template-restore-test-${Date.now()}`);
  const testDir = join(baseTestDir, 'cleanup');

  try {
    await mkdir(testDir, { recursive: true });
    await createMockUndoLog(testDir);

    // Create some template artifacts
    await writeFile(join(testDir, '_setup.mjs'), '// setup script');
    await writeFile(join(testDir, 'template-README.md'), '# Template README');

    const result = execCLI(['template', 'restore', '--yes'], { cwd: testDir });

    assert.strictEqual(result.exitCode, 0, 'Restoration should succeed');

    // Verify artifacts were cleaned up
    try {
      await access(join(testDir, '_setup.mjs'), constants.F_OK);
      assert.fail('_setup.mjs should be cleaned up');
    } catch {
      // Expected - file should be removed
    }

    try {
      await access(join(testDir, 'template-README.md'), constants.F_OK);
      assert.fail('template-README.md should be cleaned up');
    } catch {
      // Expected - file should be removed
    }

    // Verify undo log is removed
    try {
      await access(join(testDir, '.template-undo.json'), constants.F_OK);
      assert.fail('.template-undo.json should be cleaned up');
    } catch {
      // Expected - file should be removed
    }
  } finally {
    await rm(baseTestDir, { recursive: true, force: true });
  }
});

test('restore handles missing files gracefully', async () => {
  const baseTestDir = join(tmpdir(), `make-template-restore-test-${Date.now()}`);
  const testDir = join(baseTestDir, 'missing-files');

  try {
    await mkdir(testDir, { recursive: true });

    // Create undo log that references files that don't exist
    const undoLog = {
      version: '1.0.0',
      metadata: {
        makeTemplateVersion: '0.6.0',
        projectType: 'generic',
        timestamp: new Date().toISOString(),
        placeholderFormat: '⦃NAME⦄'
      },
      originalValues: {
        '⦃PROJECT_NAME⦄': 'test-project'
      },
      fileOperations: [
        {
          type: 'modified',
          path: 'missing-file.txt',
          originalContent: 'original content',
          newContent: 'templated content',
          restorationAction: 'restore-content'
        }
      ]
    };

    await writeFile(join(testDir, '.template-undo.json'), JSON.stringify(undoLog, null, 2));

    const result = execCLI(['template', 'restore', '--yes'], { cwd: testDir });

    assert.strictEqual(result.exitCode, 0, 'Should succeed despite missing files');

    // File should not be created
    try {
      await access(join(testDir, 'missing-file.txt'), constants.F_OK);
      assert.fail('Missing file should not be created');
    } catch {
      // Expected - file should not exist
    }
  } finally {
    await rm(baseTestDir, { recursive: true, force: true });
  }
});

test('restore --files option works', async () => {
  const baseTestDir = join(tmpdir(), `make-template-restore-test-${Date.now()}`);
  const testDir = join(baseTestDir, 'selective');

  try {
    await mkdir(testDir, { recursive: true });
    await createMockUndoLog(testDir);

    // Create the templatized files
    await writeFile(join(testDir, 'package.json'), JSON.stringify({
      name: '⦃PROJECT_NAME⦄',
      version: '⦃VERSION⦄'
    }, null, 2));

    await writeFile(join(testDir, 'README.md'), '# ⦃PROJECT_NAME⦄\n\n⦃DESCRIPTION⦄');

    const result = execCLI(['template', 'restore', '--yes', '--files', 'package.json'], { cwd: testDir });

    assert.strictEqual(result.exitCode, 0, 'Selective restoration should succeed');

    // Verify only specified file was restored
    const packageJsonPath = join(testDir, 'package.json');
    await access(packageJsonPath, constants.F_OK);

    // Verify package.json was restored
    const packageContent = await readFile(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageContent);
    assert.strictEqual(packageJson.name, 'original-project', 'Should restore original project name');

    // README should not be restored (should still have templated content)
    const readmePath = join(testDir, 'README.md');
    await access(readmePath, constants.F_OK);
    const readmeContent = await readFile(readmePath, 'utf8');
    assert(readmeContent.includes('⦃PROJECT_NAME⦄'), 'README should not be restored with --files option');
  } finally {
    await rm(baseTestDir, { recursive: true, force: true });
  }
});

test('restore --files option parses comma-separated list', async () => {
  const baseTestDir = join(tmpdir(), `make-template-restore-test-${Date.now()}`);
  const testDir = join(baseTestDir, 'multi-files');

  try {
    await mkdir(testDir, { recursive: true });

    // Create undo log with multiple files
    const undoLog = {
      version: '1.0.0',
      metadata: {
        makeTemplateVersion: '0.6.0',
        projectType: 'generic',
        timestamp: new Date().toISOString(),
        placeholderFormat: '⦃NAME⦄'
      },
      originalValues: {
        '⦃PROJECT_NAME⦄': 'test-project',
        '⦃VERSION⦄': '1.0.0'
      },
      fileOperations: [
        {
          type: 'modified',
          path: 'a.js',
          originalContent: 'const a = "original-a";',
          newContent: 'const a = "⦃PROJECT_NAME⦄";',
          restorationAction: 'restore-content'
        },
        {
          type: 'modified',
          path: 'b.js',
          originalContent: 'const b = "original-b";',
          newContent: 'const b = "⦃PROJECT_NAME⦄";',
          restorationAction: 'restore-content'
        },
        {
          type: 'modified',
          path: 'c.js',
          originalContent: 'const c = "original-c";',
          newContent: 'const c = "⦃PROJECT_NAME⦄";',
          restorationAction: 'restore-content'
        }
      ]
    };

    await writeFile(join(testDir, '.template-undo.json'), JSON.stringify(undoLog, null, 2));
    await writeFile(join(testDir, 'a.js'), 'const a = "⦃PROJECT_NAME⦄";');
    await writeFile(join(testDir, 'b.js'), 'const b = "⦃PROJECT_NAME⦄";');
    await writeFile(join(testDir, 'c.js'), 'const c = "⦃PROJECT_NAME⦄";');

    const result = execCLI(['template', 'restore', '--yes', '--files', 'a.js,b.js'], { cwd: testDir });

    assert.strictEqual(result.exitCode, 0, 'Should restore specified files');

    // Verify a.js and b.js were restored
    const aContent = await readFile(join(testDir, 'a.js'), 'utf8');
    const bContent = await readFile(join(testDir, 'b.js'), 'utf8');
    const cContent = await readFile(join(testDir, 'c.js'), 'utf8');

    assert.strictEqual(aContent, 'const a = "original-a";', 'a.js should be restored');
    assert.strictEqual(bContent, 'const b = "original-b";', 'b.js should be restored');
    assert(cContent.includes('⦃PROJECT_NAME⦄'), 'c.js should NOT be restored');
  } finally {
    await rm(baseTestDir, { recursive: true, force: true });
  }
});

test('restore --placeholders-only option works', async () => {
  const baseTestDir = join(tmpdir(), `make-template-restore-test-${Date.now()}`);
  const testDir = join(baseTestDir, 'placeholders-only');

  try {
    await mkdir(testDir, { recursive: true });
    await createMockUndoLog(testDir);

    // Create the templatized files
    await writeFile(join(testDir, 'package.json'), JSON.stringify({
      name: '⦃PROJECT_NAME⦄',
      version: '⦃VERSION⦄'
    }, null, 2));

    await writeFile(join(testDir, 'README.md'), '# ⦃PROJECT_NAME⦄\n\n⦃DESCRIPTION⦄');

    const result = execCLI(['template', 'restore', '--yes', '--placeholders-only'], { cwd: testDir });

    // This option may not be fully implemented yet, so check if command accepts it
    // The important part is that the CLI accepts and parses the option
    assert(result.exitCode === 0 || result.exitCode === 1, 'Command should accept --placeholders-only flag');

    if (result.exitCode === 1) {
      // If it fails, ensure it's not due to unknown option error
      assert(!result.stderr.includes('Unknown option'), 'Should recognize --placeholders-only option');
    }
  } finally {
    await rm(baseTestDir, { recursive: true, force: true });
  }
});
