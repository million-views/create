import fs from 'fs/promises';

export class Text {


  /**
   * Text manipulation utilities
   * Provides text processing operations similar to those available in setup scripts
   */

  /**
   * Replace content between start and end markers in a file
   * @param {string} filePath - Path to the file to modify
   * @param {string} start - Start marker
   * @param {string} end - End marker
   * @param {string|string[]} block - Content to place between markers
   * @throws {Error} - If markers are not found or file operations fail
   */
  static async replaceBetween(filePath, start, end, block) {
    if (typeof start !== 'string' || !start || typeof end !== 'string' || !end) {
      throw new Error('replaceBetween requires non-empty start and end markers');
    }

    let content;
    try {
      content = await fs.readFile(filePath, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`File not found: ${filePath}`);
      }
      throw new Error(`Failed to read ${filePath}: ${error.message}`);
    }

    const startIndex = content.indexOf(start);
    if (startIndex === -1) {
      throw new Error(`Start marker "${start}" not found in ${filePath}`);
    }
    const startEnd = startIndex + start.length;
    const endIndex = content.indexOf(end, startEnd);
    if (endIndex === -1) {
      throw new Error(`End marker "${end}" not found in ${filePath}`);
    }

    const before = content.slice(0, startEnd);
    const after = content.slice(endIndex);

    let replacement = Text.normalizeTextInput(block);
    if (replacement.length > 0) {
      replacement = Text.ensureTrailingNewline(Text.ensureLeadingNewline(replacement));
    } else {
      replacement = '\n';
    }

    const updated = before + replacement + after;
    await fs.writeFile(filePath, updated, 'utf8');
  }

  /**
   * Normalize text input to string with proper line endings
   * @param {string|string[]} input - Input to normalize
   * @returns {string} - Normalized string
   */
  static normalizeTextInput(input) {
    if (typeof input === 'string') {
      return input;
    }
    if (Array.isArray(input)) {
      return input.join('\n');
    }
    throw new Error('Input must be string or array of strings');
  }

  /**
   * Ensure text has a leading newline
   * @param {string} text - Input text
   * @returns {string} - Text with leading newline
   */
  static ensureLeadingNewline(text) {
    return text.startsWith('\n') ? text : '\n' + text;
  }

  /**
   * Ensure text has a trailing newline
   * @param {string} text - Input text
   * @returns {string} - Text with trailing newline
   */
  static ensureTrailingNewline(text) {
    return text.endsWith('\n') ? text : text + '\n';
  }

}
