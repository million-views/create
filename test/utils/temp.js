import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

function randomSuffix() {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Create a temporary directory and register cleanup on the provided test context.
 */
export async function createTempDir(t, prefix = 'tmp') {
  const dir = path.join(os.tmpdir(), `${prefix}-${Date.now()}-${randomSuffix()}`);
  await fs.mkdir(dir, { recursive: true });
  t.after(async () => {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => { });
  });
  return dir;
}

/**
 * Temporarily change the working directory for the duration of the async callback.
 */
export async function withCwd(cwd, callback) {
  const previousCwd = process.cwd();
  process.chdir(cwd);
  try {
    return await callback();
  } finally {
    process.chdir(previousCwd);
  }
}
