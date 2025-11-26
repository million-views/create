/**
 * Text Primitives
 *
 * Pure text manipulation utilities with no policy dependencies.
 * These can be safely reused by any layer of the application.
 *
 * @module lib/primitives/text
 */

/**
 * Normalize text input (string or array) to a single string.
 * @param input - Input to normalize
 * @returns Normalized string
 * @throws If input is neither string nor string array
 */
export function normalizeTextInput(input: string | string[]): string {
  if (Array.isArray(input)) {
    for (const line of input) {
      if (typeof line !== 'string') {
        throw new Error('Array entries must be strings');
      }
    }
    return input.join('\n');
  }
  if (typeof input !== 'string') {
    throw new Error('Input must be a string or array of strings');
  }
  return input;
}

/**
 * Ensure text has a leading newline.
 * @param text - Text to process
 * @returns Text with leading newline
 */
export function ensureLeadingNewline(text: string): string {
  return text.startsWith('\n') ? text : `\n${text}`;
}

/**
 * Ensure text has a trailing newline.
 * @param text - Text to process
 * @returns Text with trailing newline
 */
export function ensureTrailingNewline(text: string): string {
  return text.endsWith('\n') ? text : `${text}\n`;
}

/**
 * Replace content between start and end markers.
 * @param content - Original content
 * @param start - Start marker
 * @param end - End marker
 * @param block - Replacement content
 * @returns Updated content
 * @throws If markers not found
 */
export function replaceBetween(
  content: string,
  start: string,
  end: string,
  block: string | string[]
): string {
  const startIndex = content.indexOf(start);
  if (startIndex === -1) {
    throw new Error(`Start marker "${start}" not found`);
  }
  
  const startEnd = startIndex + start.length;
  const endIndex = content.indexOf(end, startEnd);
  if (endIndex === -1) {
    throw new Error(`End marker "${end}" not found`);
  }

  const before = content.slice(0, startEnd);
  const after = content.slice(endIndex);

  let replacement = normalizeTextInput(block);
  if (replacement.length > 0) {
    replacement = ensureTrailingNewline(ensureLeadingNewline(replacement));
  } else {
    replacement = '\n';
  }

  return before + replacement + after;
}
