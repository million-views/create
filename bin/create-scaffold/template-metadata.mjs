#!/usr/bin/env node

import fs from 'fs/promises';
import { readFileSync } from 'fs';
import path from 'path';
import {
  sanitizeErrorMessage,
  ValidationError,
  validateDimensionsMetadata,
  validateAuthorAssetsDir
} from '../../lib/shared/security.mjs';
import { validateTemplateManifest } from '../../lib/shared/utils/template-validator.mjs';

/**
 * Load and normalize template metadata from template.json
 * @param {string} templatePath
 * @returns {Promise<{handoffSteps: string[], authoringMode: string, dimensions: Record<string, any>, raw: any}>}
 */
export async function loadTemplateMetadataFromPath(templatePath) {
  console.error('DEBUG: loadTemplateMetadataFromPath called with templatePath:', templatePath);
  const templateJsonPath = path.join(templatePath, 'template.json');
  console.error('DEBUG: templateJsonPath:', templateJsonPath);

  try {
    console.error('DEBUG: About to call fs.readFile with:', templateJsonPath);
    console.error('DEBUG: typeof templateJsonPath:', typeof templateJsonPath);
    console.error('DEBUG: templateJsonPath value:', JSON.stringify(templateJsonPath));
    console.error('DEBUG: fs.readFile is:', typeof fs.readFile, fs.readFile);
    const rawContent = readFileSync((() => { console.error('DEBUG: Inside fs.readFile call, path:', templateJsonPath); return templateJsonPath; })(), 'utf8');
    console.error('DEBUG: fs.readFile succeeded');
    const data = JSON.parse(rawContent);

    // Check if this is a new schema format (v1.0.0)
    if (data.schemaVersion === '1.0.0') {
      // New schema format - validate with TemplateValidator
      const { TemplateValidator } = await import('../../lib/validation/template-validator.mjs');
      const validator = new TemplateValidator();
      const result = await validator.validate(data, 'strict');

      if (!result.valid) {
        // Throw an error with the first validation error
        const firstError = result.errors[0];
        throw new ValidationError(
          firstError.message,
          firstError.path ? firstError.path.join('.') : 'template'
        );
      }

      // Process dimensions
      const dimensionsWithTypes = {};
      for (const [name, definition] of Object.entries(data.dimensions || {})) {
        const type = Array.isArray(definition.default) ? 'multi' : 'single';
        dimensionsWithTypes[name] = {
          ...definition,
          type,
          policy: definition.policy || 'strict'
        };
      }
      const dimensions = validateDimensionsMetadata(dimensionsWithTypes);
      const supportedOptions = deriveSupportedOptions(dimensions);

      return {
        raw: data,
        authoringMode: 'wysiwyg', // Default for new schema
        authorAssetsDir: validateAuthorAssetsDir(null),
        dimensions,
        handoffSteps: data.handoff || [],
        supportedOptions,
        placeholders: [],
        canonicalVariables: [],
        constants: data.constants || {},
        schemaVersion: data.schemaVersion,
        gates: data.gates || {},
        featureSpecs: data.featureSpecs || {},
        hints: data.hints || {}
      };
    } else {
      // Old schema format
      const validated = validateTemplateManifest(data);

      let dimensions = validated.dimensions;
      if (Object.keys(dimensions).length === 0 && validated.supportedOptions.length > 0) {
        dimensions = validateDimensionsMetadata({
          capabilities: {
            type: 'multi',
            values: validated.supportedOptions,
            policy: 'strict'
          }
        });
      }

      const supportedOptions = deriveSupportedOptions(dimensions);

      return {
        raw: data,
        authoringMode: validated.authoringMode,
        authorAssetsDir: validated.authorAssetsDir,
        dimensions,
        handoffSteps: validated.handoffSteps,
        supportedOptions,
        placeholders: validated.placeholders,
        canonicalVariables: validated.canonicalVariables,
        constants: validated.constants || {}
      };
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {
        raw: null,
        authoringMode: 'wysiwyg',
        authorAssetsDir: validateAuthorAssetsDir(null),
        dimensions: {},
        handoffSteps: [],
        supportedOptions: [],
        placeholders: [],
        canonicalVariables: [],
        constants: {}
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
  for (const [, definition] of Object.entries(dimensions)) {
    if (definition.type === 'multi' && !definition.builtIn) {
      for (const value of definition.values) {
        values.add(value);
      }
    }
  }
  return Array.from(values).sort();
}
