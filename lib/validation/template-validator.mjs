/**
 * TemplateValidator - Validates template.json files for authoring
 *
 * Performs both schema validation (JSON Schema Draft 2020-12) and
 * domain validation (business rules) for template authoring.
 */

import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class TemplateValidator {
  constructor() {
    this.schemaCache = new Map();
  }

  /**
   * Validate a template.json file
   * @param {string|object} template - Path to template.json or parsed template object
   * @param {string} policy - Validation policy ('strict' or 'lenient')
   * @returns {Promise<{valid: boolean, errors: Array, warnings: Array}>}
   */
  async validate(template, policy = 'strict') {
    try {
      const templateData = typeof template === 'string'
        ? JSON.parse(await readFile(template, 'utf8'))
        : template;

      const errors = [];
      const warnings = [];

      // Schema validation
      const schemaErrors = await this.validateSchema(templateData);
      if (schemaErrors.length > 0) {
        if (policy === 'strict') {
          errors.push(...schemaErrors);
        } else {
          warnings.push(...schemaErrors);
        }
      }

      // Domain validation
      const domainErrors = this.validateDomain(templateData);
      if (domainErrors.length > 0) {
        if (policy === 'strict') {
          errors.push(...domainErrors);
        } else {
          warnings.push(...domainErrors);
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      return {
        valid: false,
        errors: [{
          type: 'VALIDATION_ERROR',
          message: `Failed to validate template: ${error.message}`,
          path: []
        }],
        warnings: []
      };
    }
  }

  /**
   * Validate template against JSON schema
   * @param {object} templateData - Parsed template data
   * @returns {Promise<Array>} Array of validation errors
   */
  async validateSchema(templateData) {
    try {
      // Load schema if not cached
      if (!this.schemaCache.has('template.v1.json')) {
        const schemaPath = path.join(__dirname, '../../schema/template.v1.json');
        const schemaContent = await readFile(schemaPath, 'utf8');
        this.schemaCache.set('template.v1.json', JSON.parse(schemaContent));
      }

      const schema = this.schemaCache.get('template.v1.json');
      const errors = [];

      // Basic structural validation (simplified - would use ajv in real implementation)
      if (!templateData.schemaVersion) {
        errors.push({
          type: 'SCHEMA_ERROR',
          message: 'Missing required field: schemaVersion',
          path: ['schemaVersion']
        });
      }

      if (!templateData.id) {
        errors.push({
          type: 'SCHEMA_ERROR',
          message: 'Missing required field: id',
          path: ['id']
        });
      }

      if (!templateData.name) {
        errors.push({
          type: 'SCHEMA_ERROR',
          message: 'Missing required field: name',
          path: ['name']
        });
      }

      if (!templateData.description) {
        errors.push({
          type: 'SCHEMA_ERROR',
          message: 'Missing required field: description',
          path: ['description']
        });
      }

      // Validate dimensions structure
      if (templateData.dimensions) {
        errors.push(...this.validateDimensionsSchema(templateData.dimensions));
      }

      // Validate gates structure
      if (templateData.gates) {
        errors.push(...this.validateGatesSchema(templateData.gates));
      }

      // Validate featureSpecs structure
      if (templateData.featureSpecs) {
        errors.push(...this.validateFeatureSpecsSchema(templateData.featureSpecs));
      }

      return errors;
    } catch (error) {
      return [{
        type: 'SCHEMA_ERROR',
        message: `Schema validation failed: ${error.message}`,
        path: []
      }];
    }
  }

  /**
   * Validate dimensions structure
   * @param {object} dimensions - Dimensions object from template
   * @returns {Array} Validation errors
   */
  validateDimensionsSchema(dimensions) {
    const errors = [];
    const validDimensions = ['deployment_target', 'features', 'database', 'storage', 'auth_providers', 'payments', 'analytics'];

    for (const [key, value] of Object.entries(dimensions)) {
      if (!validDimensions.includes(key)) {
        errors.push({
          type: 'SCHEMA_ERROR',
          message: `Unknown dimension: ${key}`,
          path: ['dimensions', key]
        });
      }

      if (typeof value !== 'object' || value === null) {
        errors.push({
          type: 'SCHEMA_ERROR',
          message: `Dimension ${key} must be an object`,
          path: ['dimensions', key]
        });
        continue;
      }

      if (!value.values || !Array.isArray(value.values)) {
        errors.push({
          type: 'SCHEMA_ERROR',
          message: `Dimension ${key} must have a 'values' array`,
          path: ['dimensions', key, 'values']
        });
      }
    }

    return errors;
  }

  /**
   * Validate gates structure
   * @param {object} gates - Gates object from template
   * @returns {Array} Validation errors
   */
  validateGatesSchema(gates) {
    const errors = [];

    for (const [gateName, gateConfig] of Object.entries(gates)) {
      if (!gateConfig.platform) {
        errors.push({
          type: 'SCHEMA_ERROR',
          message: `Gate '${gateName}' missing required field: platform`,
          path: ['gates', gateName, 'platform']
        });
      }

      if (!gateConfig.constraint) {
        errors.push({
          type: 'SCHEMA_ERROR',
          message: `Gate '${gateName}' missing required field: constraint`,
          path: ['gates', gateName, 'constraint']
        });
      }
    }

    return errors;
  }

  /**
   * Validate featureSpecs structure
   * @param {object} featureSpecs - Feature specs object from template
   * @returns {Array} Validation errors
   */
  validateFeatureSpecsSchema(featureSpecs) {
    const errors = [];

    for (const [featureName, featureConfig] of Object.entries(featureSpecs)) {
      if (!featureConfig.label) {
        errors.push({
          type: 'SCHEMA_ERROR',
          message: `Feature spec '${featureName}' missing required field: label`,
          path: ['featureSpecs', featureName, 'label']
        });
      }

      if (!featureConfig.description) {
        errors.push({
          type: 'SCHEMA_ERROR',
          message: `Feature spec '${featureName}' missing required field: description`,
          path: ['featureSpecs', featureName, 'description']
        });
      }
    }

    return errors;
  }

  /**
   * Perform domain validation (business rules)
   * @param {object} templateData - Parsed template data
   * @returns {Array} Validation errors
   */
  validateDomain(templateData) {
    const errors = [];

    // Validate schema version
    if (templateData.schemaVersion !== '1.0.0') {
      errors.push({
        type: 'DOMAIN_ERROR',
        message: `Unsupported schema version: ${templateData.schemaVersion}. Expected: 1.0.0`,
        path: ['schemaVersion']
      });
    }

    // Validate ID format
    if (templateData.id && !/^[a-z0-9-]+\/[a-z0-9-]+$/.test(templateData.id)) {
      errors.push({
        type: 'DOMAIN_ERROR',
        message: `Invalid ID format: ${templateData.id}. Expected: author/template-name`,
        path: ['id']
      });
    }

    // Validate dimensions have valid values
    if (templateData.dimensions) {
      errors.push(...this.validateDimensionValues(templateData.dimensions));
    }

    // Validate gates reference valid dimensions
    if (templateData.gates && templateData.dimensions) {
      errors.push(...this.validateGatesReference(templateData.gates, templateData.dimensions));
    }

    // Validate feature specs reference valid features
    if (templateData.featureSpecs && templateData.dimensions?.features) {
      errors.push(...this.validateFeatureSpecsReference(templateData.featureSpecs, templateData.dimensions.features));
    }

    // Validate hints reference valid features
    if (templateData.hints?.features && templateData.dimensions?.features) {
      errors.push(...this.validateHintsReference(templateData.hints.features, templateData.dimensions.features));
    }

    return errors;
  }

  /**
   * Validate dimension values are properly defined
   * @param {object} dimensions - Dimensions object
   * @returns {Array} Validation errors
   */
  validateDimensionValues(dimensions) {
    const errors = [];

    for (const [dimName, dimConfig] of Object.entries(dimensions)) {
      if (!dimConfig.values || dimConfig.values.length === 0) {
        errors.push({
          type: 'DOMAIN_ERROR',
          message: `Dimension '${dimName}' must have at least one value`,
          path: ['dimensions', dimName, 'values']
        });
      }

      // Check for duplicate values
      const uniqueValues = new Set(dimConfig.values);
      if (uniqueValues.size !== dimConfig.values.length) {
        errors.push({
          type: 'DOMAIN_ERROR',
          message: `Dimension '${dimName}' contains duplicate values`,
          path: ['dimensions', dimName, 'values']
        });
      }

      // Validate feature names follow pattern
      if (dimName === 'features') {
        for (const feature of dimConfig.values) {
          if (!/^[a-z][a-z0-9_-]*$/.test(feature)) {
            errors.push({
              type: 'DOMAIN_ERROR',
              message: `Invalid feature name: ${feature}. Must match pattern: ^[a-z][a-z0-9_-]*$`,
              path: ['dimensions', 'features', 'values']
            });
          }
        }
      }
    }

    return errors;
  }

  /**
   * Validate gates reference existing dimensions
   * @param {object} gates - Gates object
   * @param {object} dimensions - Dimensions object
   * @returns {Array} Validation errors
   */
  validateGatesReference(gates, dimensions) {
    const errors = [];
    const dimensionNames = Object.keys(dimensions);

    for (const [gateName, gateConfig] of Object.entries(gates)) {
      // Gate names should correspond to dimension names
      if (!dimensionNames.includes(gateName)) {
        errors.push({
          type: 'DOMAIN_ERROR',
          message: `Gate '${gateName}' does not correspond to any dimension`,
          path: ['gates', gateName]
        });
      }
    }

    return errors;
  }

  /**
   * Validate feature specs reference existing features
   * @param {object} featureSpecs - Feature specs object
   * @param {object} featuresDim - Features dimension config
   * @returns {Array} Validation errors
   */
  validateFeatureSpecsReference(featureSpecs, featuresDim) {
    const errors = [];
    const validFeatures = new Set(featuresDim.values || []);

    for (const [specName, specConfig] of Object.entries(featureSpecs)) {
      if (!validFeatures.has(specName)) {
        errors.push({
          type: 'DOMAIN_ERROR',
          message: `Feature spec '${specName}' does not correspond to any feature in dimensions`,
          path: ['featureSpecs', specName]
        });
      }

      // Validate needs references
      if (specConfig.needs) {
        for (const needed of specConfig.needs) {
          if (!validFeatures.has(needed)) {
            errors.push({
              type: 'DOMAIN_ERROR',
              message: `Feature spec '${specName}' needs unknown feature: ${needed}`,
              path: ['featureSpecs', specName, 'needs']
            });
          }
        }
      }
    }

    return errors;
  }

  /**
   * Validate hints reference existing features
   * @param {object} hints - Hints features object
   * @param {object} featuresDim - Features dimension config
   * @returns {Array} Validation errors
   */
  validateHintsReference(hints, featuresDim) {
    const errors = [];
    const validFeatures = new Set(featuresDim.values || []);

    for (const hintName of Object.keys(hints)) {
      if (!validFeatures.has(hintName)) {
        errors.push({
          type: 'DOMAIN_ERROR',
          message: `Hint '${hintName}' does not correspond to any feature in dimensions`,
          path: ['hints', 'features', hintName]
        });
      }
    }

    return errors;
  }
}