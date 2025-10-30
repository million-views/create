import fs from 'fs/promises';

/**
 * Capture filesystem snapshot information for leak detection.
 */
export async function getResourceSnapshot(cwd = process.cwd()) {
  const entries = await fs.readdir(cwd);

  return {
    tempDirs: entries.filter((name) => name.startsWith('.tmp-template-')),
    testDirs: entries.filter((name) => name.startsWith('test-') && !name.includes('cli-')),
    allEntries: entries.length
  };
}

/**
 * Compare snapshots and throw if artifacts remain.
 */
export function detectResourceLeaks(before, after, context = '', options = {}) {
  const { checkProjectDirs = false } = options;
  const leaks = [];

  const newTempDirs = after.tempDirs.filter((dir) => !before.tempDirs.includes(dir));
  if (newTempDirs.length > 0) {
    leaks.push(`Temporary directories not cleaned up: ${newTempDirs.join(', ')}`);
  }

  if (checkProjectDirs) {
    const newTestDirs = after.testDirs.filter((dir) => !before.testDirs.includes(dir));
    if (newTestDirs.length > 0) {
      leaks.push(`Unexpected project directories: ${newTestDirs.join(', ')}`);
    }
  }

  if (leaks.length > 0) {
    const location = context ? ` in ${context}` : '';
    throw new Error(`Resource leaks detected${location}:\n  ${leaks.join('\n  ')}`);
  }
}

/**
 * Remove files/directories, ignoring failures.
 */
export async function cleanupPaths(paths) {
  const targets = Array.isArray(paths) ? paths : [paths];

  for (const target of targets) {
    try {
      await fs.rm(target, { recursive: true, force: true });
    } catch {
      // best effort cleanup
    }
  }
}
