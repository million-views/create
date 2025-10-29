#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import {
  sanitizeErrorMessage,
  ValidationError,
  validateAuthoringMode,
  validateDimensionsMetadata,
  validateSupportedOptionsMetadata,
  validateAuthorAssetsDir,
} from './security.mjs';

/**
 * Load and normalize template metadata from template.json
 * @param {string} templatePath
 * @returns {Promise<{handoffSteps: string[], authoringMode: string, dimensions: Record<string, any>, raw: any}>}
 */
export async function loadTemplateMetadataFromPath(templatePath) {
  const templateJsonPath = path.join(templatePath, 'template.json');

  try {
    const rawContent = await fs.readFile(templateJsonPath, 'utf8');
    const data = JSON.parse(rawContent);

    const setup = data?.setup ?? {};
    const authoringMode = validateAuthoringMode(setup.authoringMode);
    let dimensions = validateDimensionsMetadata(setup.dimensions);
    const authorAssetsDir = validateAuthorAssetsDir(setup.authorAssetsDir);

    if (Object.keys(dimensions).length === 0 && setup.supportedOptions !== undefined) {
      const legacyOptions = validateSupportedOptionsMetadata(setup.supportedOptions);
      if (legacyOptions.length > 0) {
        dimensions = validateDimensionsMetadata({
          capabilities: {
            type: 'multi',
            values: legacyOptions,
            policy: 'strict',
          }
        });
      }
    }

    const handoffSteps = Array.isArray(data?.handoff)
      ? data.handoff
          .filter(step => typeof step === 'string')
          .map(step => step.trim())
          .filter(Boolean)
      : [];

    const supportedOptions = deriveSupportedOptions(dimensions);

    return {
      raw: data,
      authoringMode,
      authorAssetsDir,
      dimensions,
      handoffSteps,
      supportedOptions,
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {
        raw: null,
        authoringMode: 'wysiwyg',
        authorAssetsDir: validateAuthorAssetsDir(null),
        dimensions: {},
        handoffSteps: [],
        supportedOptions: [],
      };
    }

    if (error instanceof SyntaxError) {
      throw new Error(
        `template.json contains invalid JSON: ${sanitizeErrorMessage(error.message)}`
      );
    }

    if (error instanceof ValidationError) {
      throw error;
    }

    throw new Error(
      `Failed to load template metadata: ${sanitizeErrorMessage(error.message)}`
    );
  }
}

function deriveSupportedOptions(dimensions) {
  const values = new Set();
  for (const [name, definition] of Object.entries(dimensions)) {
    if (definition.type === 'multi' && !definition.builtIn) {
      for (const value of definition.values) {
        values.add(value);
      }
    }
  }
  return Array.from(values).sort();
}
