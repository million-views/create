#!/usr/bin/env node

import {
  ValidationError,
  validateAuthoringMode,
  validateAuthorAssetsDir,
  validateDimensionsMetadata,
  validateSupportedOptionsMetadata,
} from '../security.mjs';
import { normalizePlaceholders } from './placeholder-schema.mjs';
import {
  normalizeCanonicalVariables,
  mergeCanonicalPlaceholders
} from './canonical-variables.mjs';

const manifestCache = new WeakMap();

/**
 * Validate template.json manifest against the published schema subset.
 * Returns normalized values used by downstream consumers.
 * @param {unknown} manifest
 * @returns {{
 *   authoringMode: 'wysiwyg' | 'composable',
 *   authorAssetsDir: string,
 *   dimensions: Record<string, any>,
 *   supportedOptions: string[],
 *   placeholders: ReturnType<typeof normalizePlaceholders>,
 *   handoffSteps: string[],
 *   schemaVersion?: string,
 *   gates?: Record<string, any>,
 *   featureSpecs?: Record<string, any>,
 *   hints?: Record<string, any>
 * }}
 */
export function validateTemplateManifest(manifest) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new ValidationError('template.json must be an object', 'template');
  }

  const cached = manifestCache.get(manifest);
  if (cached) {
    return cached;
  }

  // Check for V1 schema
  const schemaVersion = manifest.schemaVersion;
  if (schemaVersion === '1.0.0') {
    return validateV1TemplateManifest(manifest);
  }

  // Fall back to legacy validation
  return validateLegacyTemplateManifest(manifest);
}

/**
 * Validate legacy template manifest (original format)
 */
function validateLegacyTemplateManifest(manifest) {
  const name = manifest.name;
  if (typeof name !== 'string' || !name.trim()) {
    throw new ValidationError('template.json name must be a non-empty string', 'name');
  }
  if (name.length > 120) {
    throw new ValidationError('template.json name must be 120 characters or fewer', 'name');
  }

  const description = manifest.description;
  if (typeof description !== 'string' || !description.trim()) {
    throw new ValidationError('template.json description must be a non-empty string', 'description');
  }

  const handoffSteps = normalizeHandoff(manifest.handoff);

  const metadata = manifest.metadata;
  if (metadata !== undefined) {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      throw new ValidationError('metadata must be an object', 'metadata');
    }
    if (metadata.placeholders !== undefined && !Array.isArray(metadata.placeholders)) {
      throw new ValidationError('metadata.placeholders must be an array', 'metadata.placeholders');
    }
    if (metadata.variables !== undefined && !Array.isArray(metadata.variables)) {
      throw new ValidationError('metadata.variables must be an array', 'metadata.variables');
    }
  }

  const canonicalVariables = normalizeCanonicalVariables(metadata?.variables);
  const authorPlaceholders = normalizePlaceholders(metadata?.placeholders ?? []);
  const mergedPlaceholders = mergeCanonicalPlaceholders({
    canonical: canonicalVariables,
    placeholders: authorPlaceholders
  });

  const canonicalVariableSummaries = Object.freeze(
    canonicalVariables.map((entry) =>
      Object.freeze({
        id: entry.id,
        token: entry.placeholder.token,
        required: entry.placeholder.required,
        type: entry.placeholder.type,
        defaultValue: entry.placeholder.defaultValue,
        description: entry.placeholder.description ?? null,
        sensitive: entry.placeholder.sensitive
      })
    )
  );

  const placeholders = Object.freeze(
    mergedPlaceholders.map((placeholder) =>
      Object.freeze({ ...placeholder })
    )
  );

  const setup = manifest.setup;
  if (setup !== undefined) {
    if (!setup || typeof setup !== 'object' || Array.isArray(setup)) {
      throw new ValidationError('setup must be an object', 'setup');
    }
  }

  const authoringMode = validateAuthoringMode(setup?.authoringMode);
  const authorAssetsDir = validateAuthorAssetsDir(setup?.authorAssetsDir);

  if (setup?.dimensions !== undefined) {
    if (typeof setup.dimensions !== 'object' || setup.dimensions === null || Array.isArray(setup.dimensions)) {
      throw new ValidationError('setup.dimensions must be an object', 'dimensions');
    }
    if (Object.keys(setup.dimensions).length === 0) {
      throw new ValidationError('setup.dimensions must declare at least one dimension', 'dimensions');
    }
  }

  const dimensions = validateDimensionsMetadata(setup?.dimensions);
  const supportedOptions = Object.freeze(
    validateSupportedOptionsMetadata(setup?.supportedOptions)
  );
  const result = Object.freeze({
    authoringMode,
    authorAssetsDir,
    dimensions,
    supportedOptions,
    placeholders,
    canonicalVariables: canonicalVariableSummaries,
    handoffSteps: Object.freeze([...handoffSteps]),
  });

  manifestCache.set(manifest, result);
  return result;
}

/**
 * Validate V1 template manifest
 */
function validateV1TemplateManifest(manifest) {
  // Basic V1 structure validation
  if (!manifest.name || typeof manifest.name !== 'string') {
    throw new ValidationError('V1 template must have a valid name', 'name');
  }

  if (!manifest.description || typeof manifest.description !== 'string') {
    throw new ValidationError('V1 template must have a valid description', 'description');
  }

  // Validate dimensions if present
  if (manifest.dimensions) {
    if (typeof manifest.dimensions !== 'object' || Array.isArray(manifest.dimensions)) {
      throw new ValidationError('dimensions must be an object', 'dimensions');
    }
    // Validate each dimension has required properties
    for (const [dimName, dimConfig] of Object.entries(manifest.dimensions)) {
      // Handle different dimension formats
      if (dimConfig.values) {
        // Simple format: { values: [...] }
        if (!Array.isArray(dimConfig.values)) {
          throw new ValidationError(`dimension '${dimName}' values must be an array`, `dimensions.${dimName}.values`);
        }
        if (dimConfig.values.length === 0) {
          throw new ValidationError(`dimension '${dimName}' must have at least one value`, `dimensions.${dimName}.values`);
        }
      } else if (dimConfig.options) {
        // Structured format: { name, description, options: [{id, name}, ...] }
        if (!dimConfig.name || typeof dimConfig.name !== 'string') {
          throw new ValidationError(`dimension '${dimName}' must have a name`, `dimensions.${dimName}.name`);
        }
        if (!dimConfig.description || typeof dimConfig.description !== 'string') {
          throw new ValidationError(`dimension '${dimName}' must have a description`, `dimensions.${dimName}.description`);
        }
        if (!Array.isArray(dimConfig.options)) {
          throw new ValidationError(`dimension '${dimName}' must have options array`, `dimensions.${dimName}.options`);
        }
        // Validate each option
        dimConfig.options.forEach((option, index) => {
          if (!option.id || typeof option.id !== 'string') {
            throw new ValidationError(`dimension '${dimName}' option ${index} must have an id`, `dimensions.${dimName}.options[${index}].id`);
          }
          if (!option.name || typeof option.name !== 'string') {
            throw new ValidationError(`dimension '${dimName}' option ${index} must have a name`, `dimensions.${dimName}.options[${index}].name`);
          }
        });
      } else {
        throw new ValidationError(`dimension '${dimName}' must have either 'values' or 'options' property`, `dimensions.${dimName}`);
      }
    }
  }

  // Validate gates if present
  if (manifest.gates) {
    if (typeof manifest.gates !== 'object' || Array.isArray(manifest.gates)) {
      throw new ValidationError('gates must be an object', 'gates');
    }
    // Validate each gate - the structure can vary, so be flexible
    for (const [gateName, gateConfig] of Object.entries(manifest.gates)) {
      if (typeof gateConfig !== 'object' || gateConfig === null || Array.isArray(gateConfig)) {
        throw new ValidationError(`gate '${gateName}' must be an object`, `gates.${gateName}`);
      }
      // At minimum, gates should have some configuration
      if (Object.keys(gateConfig).length === 0) {
        throw new ValidationError(`gate '${gateName}' must have configuration properties`, `gates.${gateName}`);
      }
    }
  }

  // Validate featureSpecs if present
  if (manifest.featureSpecs) {
    if (typeof manifest.featureSpecs !== 'object' || Array.isArray(manifest.featureSpecs)) {
      throw new ValidationError('featureSpecs must be an object', 'featureSpecs');
    }
    // Validate each feature spec - be flexible with the structure
    for (const [featureName, featureConfig] of Object.entries(manifest.featureSpecs)) {
      if (typeof featureConfig !== 'object' || featureConfig === null || Array.isArray(featureConfig)) {
        throw new ValidationError(`feature '${featureName}' must be an object`, `featureSpecs.${featureName}`);
      }
      // At minimum, features should have some identifying information
      if (Object.keys(featureConfig).length === 0) {
        throw new ValidationError(`feature '${featureName}' must have configuration properties`, `featureSpecs.${featureName}`);
      }
    }
  }

  // Validate hints if present
  if (manifest.hints) {
    if (typeof manifest.hints !== 'object' || Array.isArray(manifest.hints)) {
      throw new ValidationError('hints must be an object', 'hints');
    }
    // Validate each hint - be flexible with the structure
    for (const [hintName, hintConfig] of Object.entries(manifest.hints)) {
      if (typeof hintConfig !== 'object' || hintConfig === null || Array.isArray(hintConfig)) {
        throw new ValidationError(`hint '${hintName}' must be an object`, `hints.${hintName}`);
      }
      // At minimum, hints should have some content
      if (Object.keys(hintConfig).length === 0) {
        throw new ValidationError(`hint '${hintName}' must have configuration properties`, `hints.${hintName}`);
      }
    }
  }

  // For now, return a basic structure - this will be enhanced as we implement V1 features
  const result = Object.freeze({
    schemaVersion: manifest.schemaVersion,
    name: manifest.name,
    description: manifest.description,
    dimensions: manifest.dimensions || {},
    gates: manifest.gates || {},
    featureSpecs: manifest.featureSpecs || {},
    hints: manifest.hints || {},
    // Legacy compatibility fields
    authoringMode: 'copy',
    authorAssetsDir: 'template-assets',
    placeholders: [],
    canonicalVariables: [],
    handoffSteps: [],
    supportedOptions: {}
  });

  manifestCache.set(manifest, result);
  return result;
}

function normalizeHandoff(raw) {
  if (raw === undefined) {
    return [];
  }

  if (!Array.isArray(raw)) {
    throw new ValidationError('handoff must be an array of strings', 'handoff');
  }

  const steps = [];
  for (const entry of raw) {
    if (typeof entry !== 'string') {
      throw new ValidationError('handoff entries must be strings', 'handoff');
    }
    const trimmed = entry.trim();
    if (!trimmed) {
      throw new ValidationError('handoff entries cannot be empty strings', 'handoff');
    }
    if (trimmed.length > 240) {
      throw new ValidationError('handoff entries must be 240 characters or fewer', 'handoff');
    }
    steps.push(trimmed);
  }

  return steps;
}
