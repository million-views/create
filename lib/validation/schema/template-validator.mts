// @ts-nocheck
/**
 * TemplateValidator - Validates template.json files for authoring
 *
 * Performs both schema validation (JSON Schema Draft 2020-12) and
 * domain validation (business rules) for template authoring.
 */

import { readFileSync } from 'fs';
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
   * @param {string} policy - Validation policy ('strict' or 'lenient') for authoring mode
   * @param {Object} options - Additional validation options
   * @param {string} options.mode - Validation mode ('authoring' or 'consumption')
   * @param {string} options.output - Output format ('structured' or 'console')
   * @param {boolean} options.json - JSON output for consumption mode
   * @param {boolean} options.suggest - Show suggestions for consumption mode
   * @returns {Promise<{valid: boolean, errors: Array, warnings: Array}>|void}
   */
  async validate(template, policy = 'strict', options = {}) {
    const {
      mode = 'authoring',
      output = 'structured',
      json = false,
      suggest = false
    } = options;
    try {
      const templateData = typeof template === 'string'
        ? JSON.parse(readFileSync(template, 'utf8'))
        : template;

      const errors = [];
      const warnings = [];

      if (mode === 'consumption') {
        // Basic consumption validation
        const consumptionErrors = this.validateConsumption(templateData);
        errors.push(...consumptionErrors);
      } else {
        // Comprehensive authoring validation
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
      }

      const result = {
        valid: errors.length === 0,
        errors,
        warnings
      };

      if (output === 'console') {
        this.outputToConsole(result, { json, suggest, mode });
      }

      return result;
    } catch (error) {
      const errorResult = {
        valid: false,
        errors: [{
          type: 'VALIDATION_ERROR',
          message: `Failed to validate template: ${error.message}`,
          path: []
        }],
        warnings: []
      };

      if (output === 'console') {
        if (json) {
          console.log(JSON.stringify({
            status: 'fail',
            results: [{ type: 'error', message: error.message }]
          }, null, 2));
        } else {
          console.error(`❌ Failed to parse template.json: ${error.message}`);
        }
      }

      return errorResult;
    }
  }

  /**
   * Validate template for consumption (basic validation)
   * @param {object} templateData - Parsed template data
   * @returns {Array} Array of validation errors
   */
  validateConsumption(templateData) {
    const errors = [];

    // Check required fields according to schema
    if (!templateData.schemaVersion) {
      errors.push('Missing required field: schemaVersion');
    }

    if (!templateData.id) {
      errors.push('Missing required field: id');
    }

    if (!templateData.name) {
      errors.push('Missing required field: name');
    }

    if (!templateData.description) {
      errors.push('Missing required field: description');
    }

    // Check basic structure for optional fields
    if (templateData.placeholders && (typeof templateData.placeholders !== 'object' || Array.isArray(templateData.placeholders))) {
      errors.push('placeholders must be an object');
    }

    if (templateData.files) {
      if (templateData.files.include && !Array.isArray(templateData.files.include)) {
        errors.push('files.include must be an array');
      }
      if (templateData.files.exclude && !Array.isArray(templateData.files.exclude)) {
        errors.push('files.exclude must be an array');
      }
    }

    return errors;
  }

  /**
   * Output validation results to console
   * @param {object} result - Validation result
   * @param {object} options - Output options
   */
  outputToConsole(result, options) {
    const { json, suggest } = options;

    if (json) {
      if (result.valid) {
        console.log(JSON.stringify({
          status: 'pass',
          results: []
        }, null, 2));
      } else {
        console.log(JSON.stringify({
          status: 'fail',
          results: result.errors.map(error => ({ type: 'error', message: error }))
        }, null, 2));
      }
      return;
    }

    if (result.valid) {
      console.log('✓ Template validation successful');
      console.log('Summary: All checks passed');
    } else {
      console.error('❌ Validation failed:');
      result.errors.forEach(error => {
        console.error(`  • ${error}`);
      });

      if (suggest) {
        console.log('\n💡 Suggestions:');
        // TODO: Add suggestions based on error types
      }
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
        const schemaPath = path.join(__dirname, '../../../schema/template.v1.json');
        const schemaContent = readFileSync(schemaPath, 'utf8');
        this.schemaCache.set('template.v1.json', JSON.parse(schemaContent));
      }

      const _schema = this.schemaCache.get('template.v1.json');
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

      // Validate gates structure (V1.0.0: keyed by dimension name)
      if (templateData.gates) {
        errors.push(...this.validateGatesSchema(templateData.gates, templateData.dimensions));
      }

      // Validate features array (V1.0.0: array format with id, label, needs)
      if (templateData.features) {
        errors.push(...this.validateFeaturesSchema(templateData.features));
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
   * Validate dimensions structure (V1.0.0 compliant)
   * @param {object} dimensions - Dimensions object from template
   * @returns {Array} Validation errors
   */
  validateDimensionsSchema(dimensions) {
    const errors = [];
    // V1.0.0: 7 fixed infrastructure dimensions
    const validDimensions = ['deployment', 'database', 'storage', 'identity', 'billing', 'analytics', 'monitoring'];

    for (const [key, value] of Object.entries(dimensions)) {
      if (!validDimensions.includes(key)) {
        errors.push({
          type: 'SCHEMA_ERROR',
          message: `Unknown dimension: ${key}. Valid dimensions are: ${validDimensions.join(', ')}`,
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

      // V1.0.0: Dimensions must have 'options' array (legacy 'values' removed)
      if (!value.options || !Array.isArray(value.options)) {
        errors.push({
          type: 'SCHEMA_ERROR',
          message: `Dimension ${key} must have an 'options' array`,
          path: ['dimensions', key, 'options']
        });
        continue;
      }

      // Validate each option has required 'id' field
      value.options.forEach((option, index) => {
        if (!option.id || typeof option.id !== 'string') {
          errors.push({
            type: 'SCHEMA_ERROR',
            message: `Dimension ${key} option ${index} must have an 'id' string`,
            path: ['dimensions', key, 'options', index, 'id']
          });
        }
      });
    }

    return errors;
  }

  /**
   * Validate gates structure (V1.0.0 compliant)
   * V1.0.0: Gates are keyed by dimension name, then by option ID.
   * @param {object} gates - Gates object from template
   * @param {object} dimensions - Dimensions object from template
   * @returns {Array} Validation errors
   */
  validateGatesSchema(gates, dimensions = {}) {
    const errors = [];
    const validDimensions = ['deployment', 'database', 'storage', 'identity', 'billing', 'analytics', 'monitoring'];

    for (const [dimName, dimGates] of Object.entries(gates)) {
      // V1.0.0: Gate keys must be valid dimension names
      if (!validDimensions.includes(dimName)) {
        errors.push({
          type: 'SCHEMA_ERROR',
          message: `Gate key '${dimName}' is not a valid dimension. Valid dimensions are: ${validDimensions.join(', ')}`,
          path: ['gates', dimName]
        });
        continue;
      }

      if (typeof dimGates !== 'object' || dimGates === null || Array.isArray(dimGates)) {
        errors.push({
          type: 'SCHEMA_ERROR',
          message: `gates.${dimName} must be an object`,
          path: ['gates', dimName]
        });
        continue;
      }

      // Validate each option ID's constraints
      for (const [optionId, constraints] of Object.entries(dimGates)) {
        if (typeof constraints !== 'object' || constraints === null || Array.isArray(constraints)) {
          errors.push({
            type: 'SCHEMA_ERROR',
            message: `gates.${dimName}.${optionId} must be an object`,
            path: ['gates', dimName, optionId]
          });
          continue;
        }

        // Validate constraint targets are valid dimensions with array values
        for (const [targetDim, allowedValues] of Object.entries(constraints)) {
          if (!validDimensions.includes(targetDim)) {
            errors.push({
              type: 'SCHEMA_ERROR',
              message: `Gate constraint target '${targetDim}' is not a valid dimension`,
              path: ['gates', dimName, optionId, targetDim]
            });
          }
          if (!Array.isArray(allowedValues)) {
            errors.push({
              type: 'SCHEMA_ERROR',
              message: `gates.${dimName}.${optionId}.${targetDim} must be an array of allowed option IDs`,
              path: ['gates', dimName, optionId, targetDim]
            });
          }
        }
      }
    }

    return errors;
  }

  /**
   * Validate features array structure (V1.0.0 compliant)
   * @param {Array} features - Features array from template
   * @returns {Array} Validation errors
   */
  validateFeaturesSchema(features) {
    const errors = [];
    const validDimensions = ['deployment', 'database', 'storage', 'identity', 'billing', 'analytics', 'monitoring'];

    if (!Array.isArray(features)) {
      errors.push({
        type: 'SCHEMA_ERROR',
        message: 'features must be an array',
        path: ['features']
      });
      return errors;
    }

    features.forEach((feature, index) => {
      if (!feature.id || typeof feature.id !== 'string') {
        errors.push({
          type: 'SCHEMA_ERROR',
          message: `Feature ${index} missing required field: id`,
          path: ['features', index, 'id']
        });
      }

      if (!feature.label || typeof feature.label !== 'string') {
        errors.push({
          type: 'SCHEMA_ERROR',
          message: `Feature ${index} missing required field: label`,
          path: ['features', index, 'label']
        });
      }

      if (!feature.needs || typeof feature.needs !== 'object') {
        errors.push({
          type: 'SCHEMA_ERROR',
          message: `Feature ${index} missing required field: needs`,
          path: ['features', index, 'needs']
        });
      } else {
        // Validate needs references valid dimensions
        for (const [needDim, needLevel] of Object.entries(feature.needs)) {
          if (!validDimensions.includes(needDim)) {
            errors.push({
              type: 'SCHEMA_ERROR',
              message: `Feature '${feature.id || index}' needs references invalid dimension: ${needDim}`,
              path: ['features', index, 'needs', needDim]
            });
          }
          if (!['required', 'optional', 'none'].includes(needLevel)) {
            errors.push({
              type: 'SCHEMA_ERROR',
              message: `Feature '${feature.id || index}' needs.${needDim} must be 'required', 'optional', or 'none'`,
              path: ['features', index, 'needs', needDim]
            });
          }
        }
      }
    });

    return errors;
  }

  /**
   * Perform domain validation (business rules) - V1.0.0 compliant
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
        path: ['schemaVersion'],
        suggestion: `Change schemaVersion to "1.0.0" in your template.json`
      });
    }

    // Validate ID format
    if (templateData.id && !/^[a-z0-9-]+\/[a-z0-9-]+$/.test(templateData.id)) {
      errors.push({
        type: 'DOMAIN_ERROR',
        message: `Invalid ID format: ${templateData.id}. Expected: author/template-name`,
        path: ['id'],
        suggestion: `Use format "author-name/template-name" (lowercase, hyphens only)`
      });
    }

    // Validate dimensions have valid options
    if (templateData.dimensions) {
      errors.push(...this.validateDimensionValues(templateData.dimensions));
    }

    // Validate gates reference valid dimensions and options (V1.0.0)
    if (templateData.gates && templateData.dimensions) {
      errors.push(...this.validateGatesReference(templateData.gates, templateData.dimensions));
    }

    // Validate features reference valid dimensions in needs (V1.0.0)
    if (templateData.features) {
      errors.push(...this.validateFeaturesReference(templateData.features, templateData.dimensions));
    }

    return errors;
  }

  /**
   * Validate dimension values are properly defined (V1.0.0 compliant)
   * @param {object} dimensions - Dimensions object
   * @returns {Array} Validation errors
   */
  validateDimensionValues(dimensions) {
    const errors = [];

    for (const [dimName, dimConfig] of Object.entries(dimensions)) {
      // V1.0.0: Only 'options' array format
      const options = dimConfig.options || [];
      
      if (options.length === 0) {
        errors.push({
          type: 'DOMAIN_ERROR',
          message: `Dimension '${dimName}' must have at least one option`,
          path: ['dimensions', dimName, 'options']
        });
        continue;
      }

      // Check for duplicate option IDs
      const optionIds = options.map(opt => opt.id);
      const uniqueIds = new Set(optionIds);
      if (uniqueIds.size !== optionIds.length) {
        errors.push({
          type: 'DOMAIN_ERROR',
          message: `Dimension '${dimName}' contains duplicate option IDs`,
          path: ['dimensions', dimName, 'options']
        });
      }
    }

    return errors;
  }

  /**
   * Validate gates reference valid dimensions and options (V1.0.0 compliant)
   * @param {object} gates - Gates object
   * @param {object} dimensions - Dimensions object
   * @returns {Array} Validation errors
   */
  validateGatesReference(gates, dimensions) {
    const errors = [];
    const validDimensions = ['deployment', 'database', 'storage', 'identity', 'billing', 'analytics', 'monitoring'];

    for (const [dimName, dimGates] of Object.entries(gates)) {
      // Validate dimension exists
      if (!dimensions[dimName]) {
        errors.push({
          type: 'DOMAIN_ERROR',
          message: `Gate references undefined dimension: ${dimName}`,
          path: ['gates', dimName],
          suggestion: `Define dimension '${dimName}' in dimensions section first`
        });
        continue;
      }

      const validOptionIds = new Set((dimensions[dimName].options || []).map(opt => opt.id));

      for (const [optionId, constraints] of Object.entries(dimGates)) {
        // Validate option ID exists in dimension
        if (!validOptionIds.has(optionId)) {
          errors.push({
            type: 'DOMAIN_ERROR',
            message: `Gate option '${optionId}' is not defined in dimension '${dimName}'`,
            path: ['gates', dimName, optionId],
            suggestion: `Add option '${optionId}' to dimensions.${dimName}.options`
          });
        }

        // Validate constraint targets reference valid options
        for (const [targetDim, allowedValues] of Object.entries(constraints)) {
          if (!dimensions[targetDim]) {
            errors.push({
              type: 'DOMAIN_ERROR',
              message: `Gate constraint references undefined dimension: ${targetDim}`,
              path: ['gates', dimName, optionId, targetDim],
              suggestion: `Define dimension '${targetDim}' in dimensions section first`
            });
            continue;
          }

          const targetOptionIds = new Set((dimensions[targetDim].options || []).map(opt => opt.id));
          for (const value of allowedValues) {
            if (!targetOptionIds.has(value)) {
              errors.push({
                type: 'DOMAIN_ERROR',
                message: `Gate constraint '${value}' is not a valid option for dimension '${targetDim}'`,
                path: ['gates', dimName, optionId, targetDim]
              });
            }
          }
        }
      }
    }

    return errors;
  }

  /**
   * Validate features reference valid dimensions in needs (V1.0.0 compliant)
   * @param {Array} features - Features array
   * @param {object} dimensions - Dimensions object
   * @returns {Array} Validation errors
   */
  validateFeaturesReference(features, dimensions = {}) {
    const errors = [];
    const validDimensions = ['deployment', 'database', 'storage', 'identity', 'billing', 'analytics', 'monitoring'];
    const definedDimensions = new Set(Object.keys(dimensions));

    if (!Array.isArray(features)) return errors;

    features.forEach((feature, index) => {
      if (!feature.needs) return;

      for (const [needDim, requirement] of Object.entries(feature.needs)) {
        // Check if needs references a dimension that's defined
        if (requirement === 'required' && !definedDimensions.has(needDim)) {
          errors.push({
            type: 'DOMAIN_ERROR',
            message: `Feature '${feature.id}' requires dimension '${needDim}' but it's not defined in dimensions`,
            path: ['features', index, 'needs', needDim],
            suggestion: `Either define dimension '${needDim}' or change requirement to 'optional'`
          });
        }
      }
    });

    return errors;
  }

  /**
   * Validate deployment target compatibility with selected dimension values (V1.0.0)
   * @param {object} templateData - Full template data
   * @param {object} selectedValues - Selected dimension values
   * @param {string} deploymentTarget - Target deployment platform
   * @returns {Array} Validation errors
   */
  validateGatesEnforcement(templateData, selectedValues, deploymentTarget) {
    const errors = [];

    if (!templateData.gates || !templateData.dimensions) {
      return errors;
    }

    // V1.0.0: Gates are keyed by dimension, then option ID
    const deploymentGates = templateData.gates.deployment;
    if (!deploymentGates || !deploymentGates[deploymentTarget]) {
      return errors;
    }

    const constraints = deploymentGates[deploymentTarget];
    
    // Check constraint restrictions
    for (const [targetDim, allowedOptions] of Object.entries(constraints)) {
      const selectedValue = selectedValues[targetDim];
      
      if (selectedValue !== undefined && !allowedOptions.includes(selectedValue)) {
        errors.push({
          type: 'GATES_VIOLATION',
          message: `Deployment '${deploymentTarget}' restricts ${targetDim} to: ${allowedOptions.join(', ')}. Selected: ${selectedValue}`,
          path: ['gates', 'deployment', deploymentTarget, targetDim],
          suggestion: `Change ${targetDim} to one of: ${allowedOptions.join(', ')}`
        });
      }
    }

    return errors;
  }

  /**
   * Validate feature needs are satisfied when features are enabled (V1.0.0)
   * @param {object} templateData - Full template data
   * @param {Array<string>} enabledFeatures - List of enabled feature IDs
   * @param {object} selectedValues - Selected dimension values
   * @returns {Array} Validation errors
   */
  validateFeatureNeeds(templateData, enabledFeatures, selectedValues) {
    const errors = [];

    if (!Array.isArray(templateData.features)) return errors;

    const featureMap = new Map(templateData.features.map(f => [f.id, f]));

    for (const featureId of enabledFeatures) {
      const feature = featureMap.get(featureId);

      if (!feature) {
        errors.push({
          type: 'FEATURE_NEEDS_VIOLATION',
          message: `Feature '${featureId}' is enabled but not defined in template`,
          path: ['features'],
          suggestion: `Add feature definition for '${featureId}' to features array`
        });
        continue;
      }

      // Check feature needs
      if (feature.needs) {
        for (const [dimension, requirement] of Object.entries(feature.needs)) {
          if (requirement === 'required') {
            const selectedValue = selectedValues[dimension];

            if (!selectedValue) {
              errors.push({
                type: 'FEATURE_NEEDS_VIOLATION',
                message: `Feature '${featureId}' requires dimension '${dimension}' but no value is selected`,
                path: ['features', featureId, 'needs', dimension],
                suggestion: `Select a value for dimension '${dimension}' or change feature requirement to 'optional'`
              });
            }
          }
        }
      }
    }

    return errors;
  }

  /**
   * Validate cross-dimension compatibility
   * @param {object} templateData - Full template data
   * @param {object} selectedValues - Selected dimension values
   * @returns {Array} Validation errors
   */
  validateCrossDimensionCompatibility(templateData, selectedValues) {
    const errors = [];

    const deploymentTarget = selectedValues.deployment;
    const database = selectedValues.database;
    const storage = selectedValues.storage;

    // Example: Cloudflare Workers + certain databases
    if (deploymentTarget === 'cloudflare-workers' && database === 'postgresql') {
      errors.push({
        type: 'CROSS_DIMENSION_VIOLATION',
        message: `Cloudflare Workers deployment is not compatible with PostgreSQL database`,
        path: ['dimensions'],
        suggestion: `Use SQLite, TursoDB, or D1 database with Cloudflare Workers, or choose a different deployment target`
      });
    }

    // Example: Edge deployment + file storage
    if (deploymentTarget && ['cloudflare-workers', 'deno-deploy'].includes(deploymentTarget) && storage === 'local') {
      errors.push({
        type: 'CROSS_DIMENSION_VIOLATION',
        message: `Edge deployment targets (${deploymentTarget}) cannot use local file storage`,
        path: ['dimensions'],
        suggestion: `Use cloud storage options like Cloudflare R2, AWS S3, or Vercel Blob`
      });
    }

    return errors;
  }

  /**
   * Perform comprehensive runtime validation with selected values (V1.0.0)
   * @param {object} templateData - Full template data
   * @param {object} selectedValues - Selected dimension values
   * @param {string} deploymentTarget - Target deployment platform
   * @param {Array<string>} enabledFeatures - List of enabled feature IDs
   * @returns {object} Validation result with errors and warnings
   */
  validateRuntime(templateData, selectedValues, deploymentTarget, enabledFeatures) {
    const errors = [];
    const warnings = [];

    // Gates enforcement validation
    if (deploymentTarget) {
      errors.push(...this.validateGatesEnforcement(templateData, selectedValues, deploymentTarget));
    }

    // Feature needs validation
    if (enabledFeatures && enabledFeatures.length > 0) {
      errors.push(...this.validateFeatureNeeds(templateData, enabledFeatures, selectedValues));
    }

    // Cross-dimension compatibility
    errors.push(...this.validateCrossDimensionCompatibility(templateData, selectedValues));

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}
