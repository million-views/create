#!/usr/bin/env node

import { normalizePlaceholders } from './placeholder-schema.mjs';
import { ValidationError } from './security.mjs';

const manifestCache = new WeakMap();

/**
 * Validate template.json manifest against the published schema subset.
 * Returns normalized values used by downstream consumers.
 * @param {unknown} manifest
 * @returns {{
 *   authoringMode: 'wysiwyg' | 'composable',
 *   authorAssetsDir: string,
 *   dimensions: Record<string, any>,
 *   placeholders: ReturnType<typeof normalizePlaceholders>,
 *   handoff: string[],
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

  // Only support V1.0.0 schema - roll forward only
  const schemaVersion = manifest.schemaVersion;
  if (schemaVersion === '1.0.0') {
    return validateV1TemplateManifest(manifest);
  }

  throw new ValidationError('template.json must specify schemaVersion: "1.0.0". Legacy schema support has been removed.', 'schemaVersion');
}

/**
 * Validate V1 template manifest
 */
function validateV1TemplateManifest(manifest) {
  // Basic V1 structure validation
  if (!manifest.schemaVersion || manifest.schemaVersion !== '1.0.0') {
    throw new ValidationError('V1 template must specify schemaVersion: "1.0.0"', 'schemaVersion');
  }

  if (!manifest.id || typeof manifest.id !== 'string') {
    throw new ValidationError('V1 template must have a valid id', 'id');
  }

  // Validate ID format
  if (!/^[a-z0-9-]+\/[a-z0-9-]+$/.test(manifest.id)) {
    throw new ValidationError(`Invalid ID format: ${manifest.id}. Expected: author/template-name`, 'id');
  }

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

  // Process placeholders from V1 format (object) to normalized array format
  const normalizedPlaceholders = [];
  if (manifest.placeholders) {
    if (typeof manifest.placeholders !== 'object' || Array.isArray(manifest.placeholders)) {
      throw new ValidationError('placeholders must be an object with placeholder names as keys', 'placeholders');
    }

    // Convert object format to array format expected by placeholder resolver
    for (const [placeholderName, config] of Object.entries(manifest.placeholders)) {
      if (typeof config !== 'object' || config === null || Array.isArray(config)) {
        throw new ValidationError(`placeholder '${placeholderName}' must be an object`, `placeholders.${placeholderName}`);
      }

      // Validate required properties
      if (typeof config.default !== 'string') {
        throw new ValidationError(`placeholder '${placeholderName}' must have a string default value`, `placeholders.${placeholderName}.default`);
      }

      if (typeof config.description !== 'string') {
        throw new ValidationError(`placeholder '${placeholderName}' must have a string description`, `placeholders.${placeholderName}.description`);
      }

      // Convert to the format expected by normalizePlaceholders
      normalizedPlaceholders.push({
        name: `{{${placeholderName}}}`,
        description: config.description,
        default: config.default,
        required: false, // V1 format doesn't have required field, default to false
        sensitive: false, // V1 format doesn't have sensitive field, default to false
        type: 'string' // V1 format doesn't specify type, default to string
      });
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
    authoringMode: manifest.setup?.authoringMode || 'composable',
    authorAssetsDir: manifest.setup?.authorAssetsDir || 'template-assets',
    placeholders: normalizePlaceholders(normalizedPlaceholders),
    canonicalVariables: [],
    handoff: manifest.handoff || []
  });

  manifestCache.set(manifest, result);
  return result;
}
