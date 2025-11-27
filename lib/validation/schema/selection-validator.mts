// @ts-nocheck
/**
 * SelectionValidator - Validates selection.json files for user choices
 *
 * Performs schema validation and compatibility validation against
 * template constraints (gates, feature needs, etc.)
 */

import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class SelectionValidator {
  constructor() {
    this.schemaCache = new Map();
  }

  /**
   * Validate a selection.json file against a template
   * @param {string|object} selection - Path to selection.json or parsed selection object
   * @param {string|object} template - Path to template.json or parsed template object
   * @returns {Promise<{valid: boolean, errors: Array, warnings: Array, derived: object}>}
   */
  async validate(selection, template) {
    try {
      const selectionData = typeof selection === 'string'
        ? JSON.parse(await readFile(selection, 'utf8'))
        : selection;

      const templateData = typeof template === 'string'
        ? JSON.parse(await readFile(template, 'utf8'))
        : template;

      const errors = [];
      const warnings = [];

      // Schema validation
      const schemaErrors = await this.validateSchema(selectionData);
      errors.push(...schemaErrors);

      // Compatibility validation
      const compatResult = this.validateCompatibility(selectionData, templateData);
      errors.push(...compatResult.errors);
      warnings.push(...compatResult.warnings);

      // Generate derived flags
      const derived = this.generateDerivedFlags(selectionData);

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        derived
      };
    } catch (error) {
      return {
        valid: false,
        errors: [{
          type: 'VALIDATION_ERROR',
          message: `Failed to validate selection: ${error.message}`,
          path: []
        }],
        warnings: [],
        derived: {}
      };
    }
  }

  /**
   * Validate selection against JSON schema
   * @param {object} selectionData - Parsed selection data
   * @returns {Promise<Array>} Array of validation errors
   */
  async validateSchema(selectionData) {
    try {
      // Load schema if not cached
      if (!this.schemaCache.has('selection.v1.json')) {
        const schemaPath = path.join(__dirname, '../../../schema/selection.v1.json');
        const schemaContent = await readFile(schemaPath, 'utf8');
        this.schemaCache.set('selection.v1.json', JSON.parse(schemaContent));
      }

      const _schema = this.schemaCache.get('selection.v1.json');
      const errors = [];

      // Basic structural validation
      if (!selectionData.templateId) {
        errors.push({
          type: 'SCHEMA_ERROR',
          message: 'Missing required field: templateId',
          path: ['templateId']
        });
      }

      if (!selectionData.schemaVersion) {
        errors.push({
          type: 'SCHEMA_ERROR',
          message: 'Missing required field: schemaVersion',
          path: ['schemaVersion']
        });
      }

      if (!selectionData.choices) {
        errors.push({
          type: 'SCHEMA_ERROR',
          message: 'Missing required field: choices',
          path: ['choices']
        });
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
   * Validate selection compatibility with template constraints
   * @param {object} selectionData - Parsed selection data
   * @param {object} templateData - Parsed template data
   * @returns {object} {errors: Array, warnings: Array}
   */
  validateCompatibility(selectionData, templateData) {
    const errors = [];
    const warnings = [];

    const choices = selectionData.choices;
    const dimensions = templateData.dimensions || {};
    const gates = templateData.gates || {};
    const featureSpecs = templateData.featureSpecs || {};

    // Validate domain compatibility (values exist in dimensions)
    const domainResult = this.validateDomainCompatibility(choices, dimensions);
    errors.push(...domainResult.errors);
    warnings.push(...domainResult.warnings);

    // Validate gates (platform constraints)
    const gatesResult = this.validateGatesCompatibility(choices, gates);
    errors.push(...gatesResult.errors);
    warnings.push(...gatesResult.warnings);

    // Validate feature needs
    const needsResult = this.validateFeatureNeeds(choices, featureSpecs);
    errors.push(...needsResult.errors);
    warnings.push(...needsResult.warnings);

    return { errors, warnings };
  }

  /**
   * Validate selected values exist in template dimensions
   * @param {object} selections - User selections
   * @param {object} dimensions - Template dimensions
   * @returns {object} {errors: Array, warnings: Array}
   */
  validateDomainCompatibility(selections, dimensions) {
    const errors = [];
    const warnings = [];

    for (const [dimName, selectedValue] of Object.entries(selections)) {
      const dimConfig = dimensions[dimName];

      if (!dimConfig) {
        errors.push({
          type: 'DOMAIN_ERROR',
          message: `Unknown dimension selected: ${dimName}`,
          path: ['selections', dimName]
        });
        continue;
      }

      const allowedValues = dimConfig.values || [];

      // Handle array selections (like features, auth)
      if (Array.isArray(selectedValue)) {
        for (const value of selectedValue) {
          if (!allowedValues.includes(value)) {
            errors.push({
              type: 'DOMAIN_ERROR',
              message: `Invalid value '${value}' for dimension '${dimName}'. Allowed: ${allowedValues.join(', ')}`,
              path: ['selections', dimName]
            });
          }
        }
      } else {
        // Handle single value selections
        if (!allowedValues.includes(selectedValue)) {
          errors.push({
            type: 'DOMAIN_ERROR',
            message: `Invalid value '${selectedValue}' for dimension '${dimName}'. Allowed: ${allowedValues.join(', ')}`,
            path: ['selections', dimName]
          });
        }
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate selections against platform gates
   * @param {object} selections - User selections
   * @param {object} gates - Template gates
   * @returns {object} {errors: Array, warnings: Array}
   */
  validateGatesCompatibility(selections, gates) {
    const errors = [];
    const warnings = [];

    for (const [gateName, gateConfig] of Object.entries(gates)) {
      const selectedValue = selections[gateName];

      if (selectedValue === undefined) {
        continue; // Gate doesn't apply to this selection
      }

      // Check forbidden values
      if (gateConfig.forbidden) {
        const forbiddenValues = Array.isArray(gateConfig.forbidden)
          ? gateConfig.forbidden
          : [gateConfig.forbidden];

        // Handle array selections
        if (Array.isArray(selectedValue)) {
          for (const value of selectedValue) {
            if (forbiddenValues.includes(value)) {
              errors.push({
                type: 'COMPAT_ERROR',
                message: `${gateConfig.constraint} (platform: ${gateConfig.platform})`,
                path: ['selections', gateName],
                details: {
                  forbidden: value,
                  platform: gateConfig.platform,
                  constraint: gateConfig.constraint
                }
              });
            }
          }
        } else if (forbiddenValues.includes(selectedValue)) {
          errors.push({
            type: 'COMPAT_ERROR',
            message: `${gateConfig.constraint} (platform: ${gateConfig.platform})`,
            path: ['selections', gateName],
            details: {
              forbidden: selectedValue,
              platform: gateConfig.platform,
              constraint: gateConfig.constraint
            }
          });
        }
      }

      // Check allowed values (if specified)
      if (gateConfig.allowed) {
        const allowedValues = Array.isArray(gateConfig.allowed)
          ? gateConfig.allowed
          : [gateConfig.allowed];

        // Handle array selections
        if (Array.isArray(selectedValue)) {
          for (const value of selectedValue) {
            if (!allowedValues.includes(value)) {
              warnings.push({
                type: 'COMPAT_WARNING',
                message: `Value '${value}' for '${gateName}' may not be compatible with ${gateConfig.platform}`,
                path: ['selections', gateName],
                details: {
                  value,
                  platform: gateConfig.platform,
                  allowed: allowedValues
                }
              });
            }
          }
        } else if (!allowedValues.includes(selectedValue)) {
          warnings.push({
            type: 'COMPAT_WARNING',
            message: `Value '${selectedValue}' for '${gateName}' may not be compatible with ${gateConfig.platform}`,
            path: ['selections', gateName],
            details: {
              value: selectedValue,
              platform: gateConfig.platform,
              allowed: allowedValues
            }
          });
        }
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate feature dependencies (needs)
   * @param {object} selections - User selections
   * @param {object} featureSpecs - Feature specifications
   * @returns {object} {errors: Array, warnings: Array}
   */
  validateFeatureNeeds(selections, featureSpecs) {
    const errors = [];
    const warnings = [];

    const selectedFeatures = new Set(selections.features || []);

    for (const selectedFeature of selectedFeatures) {
      const spec = featureSpecs[selectedFeature];

      if (!spec) {
        warnings.push({
          type: 'FEATURE_WARNING',
          message: `No specification found for selected feature: ${selectedFeature}`,
          path: ['selections', 'features']
        });
        continue;
      }

      // Check if required dependencies are selected
      if (spec.needs) {
        for (const required of spec.needs) {
          if (!selectedFeatures.has(required)) {
            errors.push({
              type: 'NEEDS_ERROR',
              message: `Feature '${selectedFeature}' requires '${required}' to be selected`,
              path: ['selections', 'features'],
              details: {
                feature: selectedFeature,
                required,
                description: spec.description
              }
            });
          }
        }
      }
    }

    return { errors, warnings };
  }

  /**
   * Generate derived flags from selections
   * @param {object} selectionData - Parsed selection data
   * @returns {object} Derived flags
   */
  generateDerivedFlags(selectionData) {
    const choices = selectionData.choices || {};

    return {
      needAuth: this.hasAuthFeatures(choices),
      needDb: this.hasDatabase(choices),
      needPayments: this.hasPayments(choices),
      needStorage: this.hasStorage(choices)
    };
  }

  /**
   * Check if choices include authentication features
   * @param {object} choices - User choices
   * @returns {boolean}
   */
  hasAuthFeatures(choices) {
    const authProviders = choices.auth || [];
    const features = choices.features || [];

    return authProviders.length > 0 ||
           features.some(f => f.includes('auth') || f.includes('login'));
  }

  /**
   * Check if choices include database
   * @param {object} choices - User choices
   * @returns {boolean}
   */
  hasDatabase(choices) {
    const database = choices.database;
    return database && database !== 'none';
  }

  /**
   * Check if choices include payments
   * @param {object} choices - User choices
   * @returns {boolean}
   */
  hasPayments(choices) {
    const payments = choices.payments;
    return Boolean(payments && payments !== 'none');
  }

  /**
   * Check if choices include cloud storage
   * @param {object} choices - User choices
   * @returns {boolean}
   */
  hasStorage(choices) {
    const storage = choices.storage;
    return Boolean(storage && storage !== 'none' && storage !== 'local');
  }
}
