#!/usr/bin/env node

import fs from 'fs/promises';

/**
 * Shared file system utilities
 * Provides unified file system operations with consistent error handling
 */

/**
 * Ensure directory exists with proper permissions and error handling
 * @param {string} dirPath - Directory path to create
 * @param {number} mode - Directory permissions (default: 0o755)
 * @param {string} errorPrefix - Error message prefix for context
 * @throws {Error} - If directory creation fails (ignores EEXIST)
 */
export async function ensureDirectory(dirPath, mode = 0o755, errorPrefix = 'directory') {
  try {
    await fs.mkdir(dirPath, { recursive: true, mode });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw new Error(`Failed to create ${errorPrefix}: ${error.message}`);
    }
  }
}

/**
 * Validate that a path exists and is a directory
 * @param {string} dirPath - Path to validate
 * @param {string} pathDescription - Description for error messages
 * @throws {Error} - If path doesn't exist or is not a directory
 */
export async function validateDirectoryExists(dirPath, pathDescription) {
  try {
    const stats = await fs.stat(dirPath);
    if (!stats.isDirectory()) {
      throw new Error(`${pathDescription} exists but is not a directory: ${dirPath}`);
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`${pathDescription} not found: ${dirPath}`);
    }
    throw error;
  }
}

/**
 * Safely remove files or directories, ignoring errors
 * @param {string} targetPath - Path to remove
 * @param {Object} options - Removal options
 * @param {boolean} options.recursive - Remove recursively (default: true)
 * @param {boolean} options.force - Force removal (default: true)
 */
export async function safeCleanup(targetPath, options = {}) {
  const { recursive = true, force = true } = options;
  
  try {
    await fs.rm(targetPath, { recursive, force });
  } catch (error) {
    // Ignore cleanup errors - the goal is to remove if possible
    // If removal fails, it's better to continue than to throw
  }
}

/**
 * Read and parse JSON file with error handling
 * @param {string} filePath - Path to JSON file
 * @param {any} defaultValue - Value to return if file doesn't exist (default: null)
 * @param {string} fileDescription - Description for error messages
 * @returns {any} - Parsed JSON data or defaultValue
 * @throws {Error} - If file exists but cannot be read or parsed
 */
export async function readJsonFile(filePath, defaultValue = null, fileDescription = 'JSON file') {
  try {
    const rawData = await fs.readFile(filePath, 'utf8');
    return JSON.parse(rawData);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return defaultValue;
    }
    throw new Error(`Failed to read ${fileDescription}: ${error.message}`);
  }
}

/**
 * Write JSON data to file with error handling
 * @param {string} filePath - Path to write JSON file
 * @param {any} data - Data to serialize and write
 * @param {string} fileDescription - Description for error messages
 * @throws {Error} - If file cannot be written
 */
export async function writeJsonFile(filePath, data, fileDescription = 'JSON file') {
  try {
    const jsonData = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, jsonData, 'utf8');
  } catch (error) {
    throw new Error(`Failed to write ${fileDescription}: ${error.message}`);
  }
}