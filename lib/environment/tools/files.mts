#!/usr/bin/env node
// @ts-nocheck

/**
 * Files API for template setup scripts.
 *
 * @module lib/environment/tools/files
 */

import fs from 'fs/promises';
import {
  SetupSandboxError,
  UTF8,
  resolveProjectPath,
  ensureParentDirectory,
  includeTemplateCopyEntry
} from '../utils.mts';

/**
 * Copy a file or directory within the project.
 * @param {string} root - Project root
 * @param {string} fromRelative - Source path
 * @param {string} toRelative - Destination path
 * @param {Object} [options] - Copy options
 * @param {boolean} [options.overwrite=false] - Overwrite existing
 */
async function copyEntry(root, fromRelative, toRelative, { overwrite = false } = {}) {
  const src = resolveProjectPath(root, fromRelative, 'source path');
  const dest = resolveProjectPath(root, toRelative, 'destination path');

  try {
    await fs.stat(src);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new SetupSandboxError(`Source not found: ${fromRelative}`);
    }
    throw new SetupSandboxError(`Unable to read source: ${error.message}`);
  }

  await ensureParentDirectory(dest);

  try {
    await fs.cp(src, dest, {
      recursive: true,
      force: !!overwrite,
      errorOnExist: !overwrite,
      filter: includeTemplateCopyEntry
    });
  } catch (error) {
    throw new SetupSandboxError(`Copy failed (${fromRelative} → ${toRelative}): ${error.message}`);
  }
}

/**
 * Move a file or directory within the project.
 * @param {string} root - Project root
 * @param {string} fromRelative - Source path
 * @param {string} toRelative - Destination path
 * @param {Object} [options] - Move options
 * @param {boolean} [options.overwrite=false] - Overwrite existing
 */
async function moveEntry(root, fromRelative, toRelative, { overwrite = false } = {}) {
  const src = resolveProjectPath(root, fromRelative, 'source path');
  const dest = resolveProjectPath(root, toRelative, 'destination path');

  if (!overwrite) {
    try {
      await fs.access(dest);
      throw new SetupSandboxError(`Target already exists: ${toRelative}`);
    } catch (error) {
      if (error.code !== 'ENOENT' && !(error instanceof SetupSandboxError)) {
        throw new SetupSandboxError(`Target access check failed: ${error.message}`);
      }
      if (error instanceof SetupSandboxError) {
        throw error;
      }
    }
  }

  await ensureParentDirectory(dest);

  try {
    await fs.rename(src, dest);
  } catch (error) {
    if (error.code === 'EXDEV') {
      // Cross-device move: fallback to copy + remove
      await copyEntry(root, fromRelative, toRelative, { overwrite });
      await fs.rm(src, { recursive: true, force: true });
    } else {
      throw new SetupSandboxError(`Move failed (${fromRelative} → ${toRelative}): ${error.message}`);
    }
  }
}

/**
 * Remove a file or directory.
 * @param {string} root - Project root
 * @param {string} relativePath - Path to remove
 */
async function removeEntry(root, relativePath) {
  const absolute = resolveProjectPath(root, relativePath, 'remove path');
  await fs.rm(absolute, { recursive: true, force: true });
}

/**
 * Create a files API for setup scripts.
 *
 * @param {string} root - Project root directory
 * @returns {Object} Frozen files API
 */
export function buildFilesApi(root) {
  return Object.freeze({
    /**
     * Read file contents as UTF-8 string.
     * @param {string} relativePath - File path
     * @returns {Promise<string>}
     */
    async read(relativePath) {
      const absolute = resolveProjectPath(root, relativePath, 'file path');
      return await fs.readFile(absolute, UTF8);
    },

    /**
     * Check if file or directory exists.
     * @param {string} relativePath - Path to check
     * @returns {Promise<boolean>}
     */
    async exists(relativePath) {
      const absolute = resolveProjectPath(root, relativePath, 'file path');
      try {
        await fs.access(absolute);
        return true;
      } catch {
        return false;
      }
    },

    /**
     * Create directories (recursive).
     * @param {string | string[]} paths - Directory path(s)
     */
    async ensureDirs(paths) {
      const list = Array.isArray(paths) ? paths : [paths];
      for (const dir of list) {
        const target = resolveProjectPath(root, dir, 'directory path');
        await fs.mkdir(target, { recursive: true, mode: 0o755 });
      }
    },

    /**
     * Copy files or directories.
     * @param {string} fromRelative - Source path
     * @param {string} toRelative - Destination path
     * @param {Object} [options] - Copy options
     */
    async copy(fromRelative, toRelative, options = {}) {
      await copyEntry(root, fromRelative, toRelative, options);
    },

    /**
     * Remove file or directory (recursive).
     * @param {string} relativePath - Path to remove
     */
    async remove(relativePath) {
      await removeEntry(root, relativePath);
    },

    /**
     * Move files or directories.
     * @param {string} fromRelative - Source path
     * @param {string} toRelative - Destination path
     * @param {Object} [options] - Move options
     */
    async move(fromRelative, toRelative, options = {}) {
      await moveEntry(root, fromRelative, toRelative, options);
    },

    /**
     * Write text content to file.
     * @param {string} relativePath - File path
     * @param {string | string[] | Buffer} content - Content to write
     * @param {Object} [options] - Write options
     */
    async write(relativePath, content, options = {}) {
      const absolute = resolveProjectPath(root, relativePath, 'file path');
      if (options.overwrite === false) {
        try {
          await fs.access(absolute);
          throw new SetupSandboxError(`File already exists: ${relativePath}`);
        } catch (error) {
          if (error.code !== 'ENOENT') {
            throw new SetupSandboxError(`Failed to access ${relativePath}: ${error.message}`);
          }
        }
      }

      const data = Array.isArray(content)
        ? content.join('\n')
        : typeof content === 'string' || content instanceof Buffer
          ? content
          : (() => { throw new SetupSandboxError('files.write content must be a string, array of strings, or Buffer'); })();

      await ensureParentDirectory(absolute);
      await fs.writeFile(absolute, data, typeof data === 'string' ? UTF8 : undefined);
    }
  });
}
