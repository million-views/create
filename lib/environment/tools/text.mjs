#!/usr/bin/env node

/**
 * Text API for template setup scripts.
 *
 * @module lib/environment/tools/text
 */

import fs from 'fs/promises';
import {
  SetupSandboxError,
  UTF8,
  resolveProjectPath,
  ensureParentDirectory,
  escapeRegExp,
  normalizeTextInput,
  ensureLeadingNewline,
  ensureTrailingNewline
} from '../utils.mjs';

/**
 * Handle duplicate newlines at boundaries.
 * @param {string} left - Content before insertion
 * @param {string} block - Block to insert
 * @param {string} right - Content after insertion
 * @returns {string}
 */
function stripDuplicateNewlines(left, block, right) {
  let result = block;
  if (!left.endsWith('\n')) {
    result = `\n${result}`;
  }
  if (!right.startsWith('\n')) {
    result = `${result}\n`;
  }
  return result;
}

/**
 * Create a text API for setup scripts.
 *
 * @param {string} root - Project root directory
 * @returns {Object} Frozen text API
 */
export function buildTextApi(root) {
  return Object.freeze({
    /**
     * Insert block after marker line.
     * @param {Object} opts - Options
     * @param {string} opts.file - File path
     * @param {string} opts.marker - Marker to find
     * @param {string | string[]} opts.block - Block to insert
     */
    async insertAfter({ file, marker, block }) {
      if (typeof marker !== 'string' || !marker) {
        throw new SetupSandboxError('text.insertAfter requires a non-empty marker string');
      }
      const absolute = resolveProjectPath(root, file, 'text file');
      let content;
      try {
        content = await fs.readFile(absolute, UTF8);
      } catch (error) {
        if (error.code === 'ENOENT') {
          throw new SetupSandboxError(`Text insert target not found: ${file}`);
        }
        throw new SetupSandboxError(`Failed to read ${file}: ${error.message}`);
      }

      const normalizedBlock = normalizeTextInput(block, 'text.insertAfter block');
      if (content.includes(normalizedBlock.trim())) {
        return;
      }

      const index = content.indexOf(marker);
      if (index === -1) {
        throw new SetupSandboxError(`Marker "${marker}" not found in ${file}`);
      }

      const markerEnd = index + marker.length;
      const before = content.slice(0, markerEnd);
      const after = content.slice(markerEnd);

      const insertion = stripDuplicateNewlines(before, ensureTrailingNewline(normalizedBlock), after);
      const updated = before + insertion + after;
      await fs.writeFile(absolute, updated, UTF8);
    },

    /**
     * Ensure block exists after marker (idempotent).
     * @param {Object} opts - Options
     * @param {string} opts.file - File path
     * @param {string} opts.marker - Marker to find
     * @param {string | string[]} opts.block - Block to ensure
     */
    async ensureBlock({ file, marker, block }) {
      const absolute = resolveProjectPath(root, file, 'text file');
      let content;
      try {
        content = await fs.readFile(absolute, UTF8);
      } catch (error) {
        if (error.code === 'ENOENT') {
          throw new SetupSandboxError(`Text ensure target not found: ${file}`);
        }
        throw new SetupSandboxError(`Failed to read ${file}: ${error.message}`);
      }

      const normalizedBlock = normalizeTextInput(block, 'text.ensureBlock block');
      if (content.includes(normalizedBlock.trim())) {
        return;
      }

      await this.insertAfter({ file, marker, block: normalizedBlock });
    },

    /**
     * Replace content between start and end markers.
     * @param {Object} opts - Options
     * @param {string} opts.file - File path
     * @param {string} opts.start - Start marker
     * @param {string} opts.end - End marker
     * @param {string | string[]} opts.block - Replacement block
     */
    async replaceBetween({ file, start, end, block }) {
      if (typeof start !== 'string' || !start || typeof end !== 'string' || !end) {
        throw new SetupSandboxError('text.replaceBetween requires non-empty start and end markers');
      }
      const absolute = resolveProjectPath(root, file, 'text file');
      let content;
      try {
        content = await fs.readFile(absolute, UTF8);
      } catch (error) {
        if (error.code === 'ENOENT') {
          throw new SetupSandboxError(`Text replace target not found: ${file}`);
        }
        throw new SetupSandboxError(`Failed to read ${file}: ${error.message}`);
      }

      const startIndex = content.indexOf(start);
      if (startIndex === -1) {
        throw new SetupSandboxError(`Start marker "${start}" not found in ${file}`);
      }
      const startEnd = startIndex + start.length;
      const endIndex = content.indexOf(end, startEnd);
      if (endIndex === -1) {
        throw new SetupSandboxError(`End marker "${end}" not found in ${file}`);
      }

      const before = content.slice(0, startEnd);
      const after = content.slice(endIndex);
      let replacement = normalizeTextInput(block, 'text.replaceBetween block');
      if (replacement.length > 0) {
        replacement = ensureTrailingNewline(ensureLeadingNewline(replacement));
      } else {
        replacement = '\n';
      }

      const updated = before + replacement + after;
      await fs.writeFile(absolute, updated, UTF8);
    },

    /**
     * Append lines to file.
     * @param {Object} opts - Options
     * @param {string} opts.file - File path
     * @param {string | string[]} opts.lines - Lines to append
     */
    async appendLines({ file, lines }) {
      const absolute = resolveProjectPath(root, file, 'text file');
      let content = '';
      try {
        content = await fs.readFile(absolute, UTF8);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw new SetupSandboxError(`Failed to read ${file}: ${error.message}`);
        }
      }

      let block = normalizeTextInput(lines, 'text.appendLines lines');
      block = ensureTrailingNewline(block);

      if (content.length > 0 && !content.endsWith('\n')) {
        content += '\n';
      }

      const updated = content + block;
      await ensureParentDirectory(absolute);
      await fs.writeFile(absolute, updated, UTF8);
    },

    /**
     * String or regex replacement.
     * @param {Object} opts - Options
     * @param {string} opts.file - File path
     * @param {string | RegExp} opts.search - Search pattern
     * @param {string} opts.replace - Replacement string
     * @param {boolean} [opts.ensureMatch=false] - Throw if no match
     */
    async replace({ file, search, replace, ensureMatch = false }) {
      if (typeof replace !== 'string') {
        throw new SetupSandboxError('text.replace requires the replacement value to be a string');
      }

      const absolute = resolveProjectPath(root, file, 'text file');
      let content;
      try {
        content = await fs.readFile(absolute, UTF8);
      } catch (error) {
        if (error.code === 'ENOENT') {
          throw new SetupSandboxError(`Text replace target not found: ${file}`);
        }
        throw new SetupSandboxError(`Failed to read ${file}: ${error.message}`);
      }

      let pattern;
      if (typeof search === 'string') {
        pattern = new RegExp(escapeRegExp(search), 'g');
      } else if (search instanceof RegExp) {
        pattern = search;
      } else {
        throw new SetupSandboxError('text.replace requires search to be a string or RegExp');
      }

      let matchCount = 0;
      const updated = content.replace(pattern, (..._args) => {
        matchCount++;
        return replace;
      });

      if (matchCount === 0) {
        if (ensureMatch) {
          throw new SetupSandboxError(`text.replace could not find a match in ${file}`);
        }
        return;
      }

      if (updated !== content) {
        await fs.writeFile(absolute, updated, UTF8);
      }
    }
  });
}
