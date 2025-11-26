/**
 * File System Utilities
 *
 * Provides unified file system operations with consistent error handling.
 *
 * @module lib/util/fs
 */

import fs from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

/**
 * Options for directory removal
 */
export interface RemoveOptions {
  /** Remove recursively */
  recursive?: boolean;
  /** Force removal even if not exists */
  force?: boolean;
}

/**
 * Ensure directory exists with proper permissions and error handling
 * @param dirPath - Directory path to create
 * @param mode - Directory permissions (default: 0o755)
 * @param errorPrefix - Error message prefix for context
 * @throws If directory creation fails (ignores EEXIST)
 */
export async function ensureDirectory(
  dirPath: string,
  mode: number = 0o755,
  errorPrefix: string = 'directory'
): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true, mode });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw new Error(`Failed to create ${errorPrefix}: ${(error as Error).message}`);
    }
  }
}

/**
 * Validate that a path exists and is a directory
 * @param dirPath - Path to validate
 * @param pathDescription - Description for error messages
 * @throws If path doesn't exist or is not a directory
 */
export async function validateDirectoryExists(
  dirPath: string,
  pathDescription: string
): Promise<void> {
  if (dirPath === undefined) {
    throw new Error('dirPath is undefined in validateDirectoryExists');
  }
  try {
    const stats = await fs.stat(dirPath);
    if (!stats.isDirectory()) {
      throw new Error(`${pathDescription} exists but is not a directory: ${dirPath}`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`${pathDescription} not found: ${dirPath}`);
    }
    throw error;
  }
}

/**
 * Safely remove files or directories, ignoring errors
 * @param targetPath - Path to remove
 * @param options - Removal options
 */
export async function safeCleanup(
  targetPath: string,
  options: RemoveOptions = {}
): Promise<void> {
  const { recursive = true, force = true } = options;

  try {
    await fs.rm(targetPath, { recursive, force });
  } catch {
    // Ignore cleanup errors - the goal is to remove if possible
  }
}

/**
 * Read and parse JSON file with error handling
 * @param filePath - Path to JSON file
 * @param defaultValue - Value to return if file doesn't exist
 * @param fileDescription - Description for error messages
 * @returns Parsed JSON data or defaultValue
 * @throws If file exists but cannot be read or parsed
 */
export async function readJsonFile<T = unknown>(
  filePath: string,
  defaultValue: T | null = null,
  fileDescription: string = 'JSON file'
): Promise<T | null> {
  try {
    const rawData = await fs.readFile(filePath, 'utf8');
    return JSON.parse(rawData) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return defaultValue;
    }
    throw new Error(`Failed to read ${fileDescription}: ${(error as Error).message}`);
  }
}

/**
 * Write JSON data to file with error handling
 * @param filePath - Path to write JSON file
 * @param data - Data to serialize and write
 * @param fileDescription - Description for error messages
 * @throws If file cannot be written
 */
export async function writeJsonFile(
  filePath: string,
  data: unknown,
  fileDescription: string = 'JSON file'
): Promise<void> {
  try {
    const jsonData = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, jsonData, 'utf8');
  } catch (error) {
    throw new Error(`Failed to write ${fileDescription}: ${(error as Error).message}`);
  }
}

/**
 * Write file atomically with proper error handling
 * @param filePath - File path to write
 * @param content - Content to write
 * @throws With specific error message and file path
 */
export async function writeFileAtomic(
  filePath: string,
  content: string
): Promise<void> {
  const resolvedPath = resolve(filePath);
  const dir = dirname(resolvedPath);

  try {
    await ensureDirectory(dir);
  } catch (error) {
    throw new Error(`Cannot write file ${resolvedPath}: ${(error as Error).message}`);
  }

  const tempPath = `${resolvedPath}.tmp`;
  try {
    await fs.writeFile(tempPath, content, 'utf8');
    await fs.rename(tempPath, resolvedPath);
  } catch (error) {
    // Clean up temporary file
    try {
      await fs.unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }

    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'EACCES' || code === 'EPERM') {
      throw new Error(`Permission denied: Cannot write to ${resolvedPath}`);
    } else if (code === 'ENOSPC') {
      throw new Error(`Insufficient disk space to write file ${resolvedPath}`);
    } else if (code === 'EMFILE' || code === 'ENFILE') {
      throw new Error(`Too many open files. Please close some files and try again. File: ${resolvedPath}`);
    } else {
      throw new Error(`Failed to write file ${resolvedPath}: ${(error as Error).message}`);
    }
  }
}

/**
 * Check if file or directory exists
 * @param path - Path to check
 * @returns True if exists, false otherwise
 */
export async function exists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read file with proper error handling
 * @param filePath - File path to read
 * @returns File content
 * @throws With specific error message and file path
 */
export async function readFile(filePath: string): Promise<string> {
  const resolvedPath = resolve(filePath);
  try {
    return await fs.readFile(resolvedPath, 'utf8');
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      throw new Error(`File not found: ${resolvedPath}`);
    } else if (code === 'EACCES' || code === 'EPERM') {
      throw new Error(`Permission denied: Cannot read ${resolvedPath}`);
    } else if (code === 'EISDIR') {
      throw new Error(`Invalid operation: ${resolvedPath} is a directory, not a file`);
    } else if (code === 'EMFILE' || code === 'ENFILE') {
      throw new Error(`Too many open files. Please close some files and try again. File: ${resolvedPath}`);
    } else {
      throw new Error(`Failed to read file ${resolvedPath}: ${(error as Error).message}`);
    }
  }
}

/**
 * Remove file or directory with proper error handling
 * @param path - Path to remove
 * @param options - Options for removal
 * @throws With specific error message and file path
 */
export async function remove(
  path: string,
  options: RemoveOptions = {}
): Promise<void> {
  const resolvedPath = resolve(path);
  try {
    await fs.rm(resolvedPath, { recursive: true, force: true, ...options });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT' && options.force !== false) {
      return; // File doesn't exist, but force is enabled
    } else if (code === 'EACCES' || code === 'EPERM') {
      throw new Error(`Permission denied: Cannot remove ${resolvedPath}`);
    } else if (code === 'EBUSY' || code === 'EMFILE') {
      throw new Error(`File is locked or in use: ${resolvedPath}`);
    } else if (code === 'ENOTDIR') {
      throw new Error(`Invalid path: ${resolvedPath} - parent is not a directory`);
    } else {
      throw new Error(`Failed to remove ${resolvedPath}: ${(error as Error).message}`);
    }
  }
}

/**
 * Copy file with proper error handling
 * @param src - Source file path
 * @param dest - Destination file path
 * @throws With specific error message and file paths
 */
export async function copyFile(src: string, dest: string): Promise<void> {
  const resolvedSrc = resolve(src);
  const resolvedDest = resolve(dest);

  try {
    await ensureDirectory(dirname(resolvedDest));
    await fs.copyFile(resolvedSrc, resolvedDest);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      throw new Error(`Source file not found: ${resolvedSrc}`);
    } else if (code === 'EACCES' || code === 'EPERM') {
      throw new Error(`Permission denied: Cannot copy from ${resolvedSrc} to ${resolvedDest}`);
    } else if (code === 'ENOSPC') {
      throw new Error(`Insufficient disk space to copy file to ${resolvedDest}`);
    } else if (code === 'EMFILE' || code === 'ENFILE') {
      throw new Error(`Too many open files. Source: ${resolvedSrc}, Destination: ${resolvedDest}`);
    } else {
      throw new Error(`Failed to copy file from ${resolvedSrc} to ${resolvedDest}: ${(error as Error).message}`);
    }
  }
}

/**
 * Get file stats with proper error handling
 * @param path - Path to get stats for
 * @returns File stats
 * @throws With specific error message and file path
 */
export async function stat(path: string): Promise<import('node:fs').Stats> {
  const resolvedPath = resolve(path);
  try {
    return await fs.stat(resolvedPath);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      throw new Error(`File or directory not found: ${resolvedPath}`);
    } else if (code === 'EACCES' || code === 'EPERM') {
      throw new Error(`Permission denied: Cannot access ${resolvedPath}`);
    } else {
      throw new Error(`Failed to get stats for ${resolvedPath}: ${(error as Error).message}`);
    }
  }
}

/**
 * List directory contents with proper error handling
 * @param dirPath - Directory path to list
 * @returns Array of file/directory names
 * @throws With specific error message and file path
 */
export async function readdir(dirPath: string): Promise<string[]> {
  const resolvedPath = resolve(dirPath);
  try {
    return await fs.readdir(resolvedPath);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      throw new Error(`Directory not found: ${resolvedPath}`);
    } else if (code === 'ENOTDIR') {
      throw new Error(`Not a directory: ${resolvedPath}`);
    } else if (code === 'EACCES' || code === 'EPERM') {
      throw new Error(`Permission denied: Cannot read directory ${resolvedPath}`);
    } else {
      throw new Error(`Failed to read directory ${resolvedPath}: ${(error as Error).message}`);
    }
  }
}

/**
 * Validate that required files exist
 * @param requiredFiles - Array of required file names
 * @param operation - Operation name for error messages
 * @returns Array of error messages for missing files
 */
export async function validateRequiredFiles(
  requiredFiles: string[],
  operation: string = 'operation'
): Promise<string[]> {
  const errors: string[] = [];

  for (const file of requiredFiles) {
    if (!(await exists(file))) {
      errors.push(`${file} not found. Required for ${operation}.`);
    }
  }

  return errors;
}

/**
 * Validate that a Node.js project exists (has package.json)
 * @param dirPath - Directory to check (default: current directory)
 * @returns Array of error messages
 */
export async function validateNodeJsProject(dirPath: string = '.'): Promise<string[]> {
  const errors: string[] = [];

  if (!(await exists(resolve(dirPath, 'package.json')))) {
    if (process.cwd() === '/') {
      errors.push('Running in the system root directory is not recommended. Please run this command in a project directory.');
    }
    errors.push('package.json not found. This command must be run in a valid Node.js project directory.');
  }

  return errors;
}

/**
 * Validate that a template can be restored (has .template-undo.json)
 * @param dirPath - Directory to check (default: current directory)
 * @returns Array of error messages
 */
export async function validateTemplateRestorable(dirPath: string = '.'): Promise<string[]> {
  const errors: string[] = [];

  if (!(await exists(resolve(dirPath, '.template-undo.json')))) {
    errors.push('.template-undo.json not found. Cannot restore without an undo log.');
  }

  return errors;
}

/**
 * Validate that a file does not exist (for creation operations)
 * @param filePath - File path to check
 * @param operation - Operation name for error messages
 * @returns Array of error messages
 */
export async function validateFileDoesNotExist(
  filePath: string,
  operation: string = 'creation'
): Promise<string[]> {
  const errors: string[] = [];

  if (await exists(filePath)) {
    errors.push(`File ${filePath} already exists. Cannot proceed with ${operation}.`);
  }

  return errors;
}
