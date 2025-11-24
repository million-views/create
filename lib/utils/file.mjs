import fs from 'fs/promises';
import { dirname, resolve } from 'path';

export class File {


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
  static async ensureDirectory(dirPath, mode = 0o755, errorPrefix = 'directory') {
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
   * @returns {Promise<string[]>} Array of error messages (empty if valid)
   */
  static async validateDirectoryExists(dirPath, pathDescription) {
    const errors = [];

    if (dirPath === undefined) {
      errors.push('dirPath is undefined in validateDirectoryExists');
      return errors;
    }

    const pathToCheck = dirPath;
    if (pathToCheck === undefined) {
      errors.push('pathToCheck became undefined in validateDirectoryExists');
      return errors;
    }

    try {
      const stats = await fs.stat(pathToCheck);
      if (!stats.isDirectory()) {
        errors.push(`${pathDescription} exists but is not a directory: ${dirPath}`);
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        errors.push(`${pathDescription} not found: ${dirPath}`);
      } else {
        // Propagate unexpected errors
        throw error;
      }
    }

    return errors;
  }

  /**
   * Safely remove files or directories, ignoring errors
   * @param {string} targetPath - Path to remove
   * @param {Object} options - Removal options
   * @param {boolean} options.recursive - Remove recursively (default: true)
   * @param {boolean} options.force - Force removal (default: true)
   */
  static async safeCleanup(targetPath, options = {}) {
    const { recursive = true, force = true } = options;

    try {
      await fs.rm(targetPath, { recursive, force });
    } catch (_error) {
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
  static async readJsonFile(filePath, defaultValue = null, fileDescription = 'JSON file') {
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
  static async writeJsonFile(filePath, data, fileDescription = 'JSON file') {
    try {
      const jsonData = JSON.stringify(data, null, 2);
      await fs.writeFile(filePath, jsonData, 'utf8');
    } catch (error) {
      throw new Error(`Failed to write ${fileDescription}: ${error.message}`);
    }
  }

  /**
   * Write file atomically with proper error handling
   * @param {string} filePath - File path to write
   * @param {string} content - Content to write
   * @throws {Error} With specific error message and file path
   */
  static async writeFileAtomic(filePath, content) {
    const resolvedPath = resolve(filePath);
    const dir = dirname(resolvedPath);

    try {
      await File.ensureDirectory(dir);
    } catch (error) {
      throw new Error(`Cannot write file ${resolvedPath}: ${error.message}`);
    }

    const tempPath = `${resolvedPath}.tmp`;
    try {
      await fs.writeFile(tempPath, content, 'utf8');
      await fs.rename(tempPath, resolvedPath);
    } catch (error) {
      // Clean up temporary file
      try {
        await fs.unlink(tempPath);
      } catch (_cleanupError) {
        // Ignore cleanup errors
      }

      if (error.code === 'EACCES' || error.code === 'EPERM') {
        throw new Error(`Permission denied: Cannot write to ${resolvedPath}`);
      } else if (error.code === 'ENOSPC') {
        throw new Error(`Insufficient disk space to write file ${resolvedPath}`);
      } else if (error.code === 'EMFILE' || error.code === 'ENFILE') {
        throw new Error(`Too many open files. Please close some files and try again. File: ${resolvedPath}`);
      } else {
        throw new Error(`Failed to write file ${resolvedPath}: ${error.message}`);
      }
    }
  }

  /**
   * Check if file or directory exists
   * @param {string} path - Path to check
   * @returns {boolean} True if exists, false otherwise
   */
  static async exists(path) {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read file with proper error handling
   * @param {string} filePath - File path to read
   * @returns {string} File content
   * @throws {Error} With specific error message and file path
   */
  static async readFile(filePath) {
    const resolvedPath = resolve(filePath);
    try {
      return await fs.readFile(resolvedPath, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`File not found: ${resolvedPath}`);
      } else if (error.code === 'EACCES' || error.code === 'EPERM') {
        throw new Error(`Permission denied: Cannot read ${resolvedPath}`);
      } else if (error.code === 'EISDIR') {
        throw new Error(`Invalid operation: ${resolvedPath} is a directory, not a file`);
      } else if (error.code === 'EMFILE' || error.code === 'ENFILE') {
        throw new Error(`Too many open files. Please close some files and try again. File: ${resolvedPath}`);
      } else {
        throw new Error(`Failed to read file ${resolvedPath}: ${error.message}`);
      }
    }
  }

  /**
   * Remove file or directory with proper error handling
   * @param {string} path - Path to remove
   * @param {object} options - Options for removal
   * @throws {Error} With specific error message and file path
   */
  static async remove(path, options = {}) {
    const resolvedPath = resolve(path);
    try {
      await fs.rm(resolvedPath, { recursive: true, force: true, ...options });
    } catch (error) {
      if (error.code === 'ENOENT' && options.force !== false) {
        return; // File doesn't exist, but force is enabled
      } else if (error.code === 'EACCES' || error.code === 'EPERM') {
        throw new Error(`Permission denied: Cannot remove ${resolvedPath}`);
      } else if (error.code === 'EBUSY' || error.code === 'EMFILE') {
        throw new Error(`File is locked or in use: ${resolvedPath}`);
      } else if (error.code === 'ENOTDIR') {
        throw new Error(`Invalid path: ${resolvedPath} - parent is not a directory`);
      } else {
        throw new Error(`Failed to remove ${resolvedPath}: ${error.message}`);
      }
    }
  }

  /**
   * Copy file with proper error handling
   * @param {string} src - Source file path
   * @param {string} dest - Destination file path
   * @throws {Error} With specific error message and file paths
   */
  static async copyFile(src, dest) {
    const resolvedSrc = resolve(src);
    const resolvedDest = resolve(dest);

    try {
      await File.ensureDirectory(dirname(resolvedDest));
      await fs.copyFile(resolvedSrc, resolvedDest);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Source file not found: ${resolvedSrc}`);
      } else if (error.code === 'EACCES' || error.code === 'EPERM') {
        throw new Error(`Permission denied: Cannot copy from ${resolvedSrc} to ${resolvedDest}`);
      } else if (error.code === 'ENOSPC') {
        throw new Error(`Insufficient disk space to copy file to ${resolvedDest}`);
      } else if (error.code === 'EMFILE' || error.code === 'ENFILE') {
        throw new Error(`Too many open files. Please close some files and try again. Source: ${resolvedSrc}, Destination: ${resolvedDest}`);
      } else {
        throw new Error(`Failed to copy file from ${resolvedSrc} to ${resolvedDest}: ${error.message}`);
      }
    }
  }

  /**
   * Get file stats with proper error handling
   * @param {string} path - Path to get stats for
   * @returns {object} File stats
   * @throws {Error} With specific error message and file path
   */
  static async stat(path) {
    const resolvedPath = resolve(path);
    try {
      return await fs.stat(resolvedPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`File or directory not found: ${resolvedPath}`);
      } else if (error.code === 'EACCES' || error.code === 'EPERM') {
        throw new Error(`Permission denied: Cannot access ${resolvedPath}`);
      } else {
        throw new Error(`Failed to get stats for ${resolvedPath}: ${error.message}`);
      }
    }
  }

  /**
   * List directory contents with proper error handling
   * @param {string} dirPath - Directory path to list
   * @returns {string[]} Array of file/directory names
   * @throws {Error} With specific error message and file path
   */
  static async readdir(dirPath) {
    const resolvedPath = resolve(dirPath);
    try {
      return await fs.readdir(resolvedPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Directory not found: ${resolvedPath}`);
      } else if (error.code === 'ENOTDIR') {
        throw new Error(`Not a directory: ${resolvedPath}`);
      } else if (error.code === 'EACCES' || error.code === 'EPERM') {
        throw new Error(`Permission denied: Cannot read directory ${resolvedPath}`);
      } else {
        throw new Error(`Failed to read directory ${resolvedPath}: ${error.message}`);
      }
    }
  }

  /**
   * Validate that required files exist for make-template operations
   * @param {string[]} requiredFiles - Array of required file names
   * @param {string} operation - Operation name for error messages
   * @returns {string[]} Array of error messages for missing files
   */
  static async validateRequiredFiles(requiredFiles, operation = 'operation') {
    const errors = [];

    for (const file of requiredFiles) {
      if (!(await File.exists(file))) {
        errors.push(`${file} not found. Required for ${operation}.`);
      }
    }

    return errors;
  }

  /**
   * Validate that a Node.js project exists (has package.json)
   * @param {string} dirPath - Directory to check (default: current directory)
   * @returns {string[]} Array of error messages
   */
  static async validateNodeJsProject(dirPath = '.') {
    const errors = [];

    if (!(await File.exists(resolve(dirPath, 'package.json')))) {
      // Detect running in system root (dangerous) and provide a clearer message
      if (process.cwd && process.cwd() === '/') {
        errors.push('Running in the system root directory is not recommended and may be dangerous. Please run this command in a project directory.');
      }
      errors.push('package.json not found. Cannot proceed without package.json. This command must be run in a valid Node.js project directory.');
    }

    return errors;
  }

  /**
   * Validate that a template can be restored (has .template-undo.json)
   * @param {string} dirPath - Directory to check (default: current directory)
   * @returns {string[]} Array of error messages
   */
  static async validateTemplateRestorable(dirPath = '.') {
    const errors = [];

    if (!(await File.exists(resolve(dirPath, '.template-undo.json')))) {
      errors.push('.template-undo.json not found. Cannot restore without an undo log.');
    }

    return errors;
  }

  /**
   * Validate that a file does not exist (for creation operations)
   * @param {string} filePath - File path to check
   * @param {string} operation - Operation name for error messages
   * @returns {string[]} Array of error messages
   */
  static async validateFileDoesNotExist(filePath, operation = 'creation') {
    const errors = [];

    if (await File.exists(filePath)) {
      errors.push(`File ${filePath} already exists. Cannot proceed with ${operation}.`);
    }

    return errors;
  }

}
