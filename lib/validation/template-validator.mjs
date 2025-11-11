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
   * @param {string} policy - Validation policy ('strict' or 'lenient')
   * @returns {Promise<{valid: boolean, errors: Array, warnings: Array}>}
   */
  async validate(template, policy = 'strict') {
    try {
      const templateData = typeof template === 'string'
        ? JSON.parse(readFileSync(template, 'utf8'))
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
        path: ['schemaVersion'],
        suggestion: `Change schemaVersion to "1.0.0" or use "make-template --migrate" to upgrade from legacy templates`,
        command: `make-template --fix`,
        autoFix: {
          type: 'fix-schema-version'
        }
      });
    }

    // Validate ID format
    if (templateData.id && !/^[a-z0-9-]+\/[a-z0-9-]+$/.test(templateData.id)) {
      errors.push({
        type: 'DOMAIN_ERROR',
        message: `Invalid ID format: ${templateData.id}. Expected: author/template-name`,
        path: ['id'],
        suggestion: `Use format "author-name/template-name" (lowercase, hyphens only)`,
        command: `make-template --fix`,
        autoFix: {
          type: 'fix-id-format',
          currentId: templateData.id
        }
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
    if (templateData.featureSpecs && templateData.dimensions) {
      errors.push(...this.validateFeatureSpecsReference(templateData.featureSpecs, templateData.dimensions));
    }

    // Validate all features have specs
    if (templateData.dimensions?.features?.values &&
        templateData.featureSpecs) {
      errors.push(...this.validateAllFeaturesHaveSpecs(
        templateData.dimensions.features.values,
        templateData.featureSpecs
      ));
    }

    // Validate hints reference valid features
    if (templateData.hints?.features && templateData.dimensions) {
      errors.push(...this.validateHintsReference(templateData.hints.features, templateData.dimensions));
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
   * Validate gates have valid structure and reference existing dimensions
   * @param {object} gates - Gates object
   * @param {object} dimensions - Dimensions object
   * @returns {Array} Validation errors
   */
  validateGatesReference(gates, dimensions) {
    const errors = [];
    const dimensionNames = Object.keys(dimensions);

    for (const [gateName, gateConfig] of Object.entries(gates)) {
      // Validate gate has required fields
      if (!gateConfig.platform) {
        errors.push({
          type: 'DOMAIN_ERROR',
          message: `Gate '${gateName}' missing required field: platform`,
          path: ['gates', gateName, 'platform']
        });
      }

      if (!gateConfig.constraint) {
        errors.push({
          type: 'DOMAIN_ERROR',
          message: `Gate '${gateName}' missing required field: constraint`,
          path: ['gates', gateName, 'constraint']
        });
      }

      // Validate allowed/forbidden reference valid dimensions
      if (gateConfig.allowed) {
        for (const [dimName, allowedValues] of Object.entries(gateConfig.allowed)) {
          if (!dimensionNames.includes(dimName)) {
            errors.push({
              type: 'DOMAIN_ERROR',
              message: `Gate '${gateName}' allowed constraint references unknown dimension: ${dimName}`,
              path: ['gates', gateName, 'allowed', dimName],
              suggestion: `Available dimensions: ${dimensionNames.join(', ')}. Add dimension '${dimName}' first or fix the reference.`,
              command: `make-template --add-dimension ${dimName}`,
              autoFix: {
                type: 'add-missing-dimension',
                dimension: dimName
              }
            });
          } else {
            // Validate allowed values are valid for the dimension
            const validValues = dimensions[dimName].values || [];
            for (const value of allowedValues) {
              if (!validValues.includes(value)) {
                errors.push({
                  type: 'DOMAIN_ERROR',
                  message: `Gate '${gateName}' allows invalid value '${value}' for dimension '${dimName}'`,
                  path: ['gates', gateName, 'allowed', dimName]
                });
              }
            }
          }
        }
      }

      if (gateConfig.forbidden) {
        for (const [dimName, forbiddenValues] of Object.entries(gateConfig.forbidden)) {
          if (!dimensionNames.includes(dimName)) {
            errors.push({
              type: 'DOMAIN_ERROR',
              message: `Gate '${gateName}' forbidden constraint references unknown dimension: ${dimName}`,
              path: ['gates', gateName, 'forbidden', dimName],
              suggestion: `Available dimensions: ${dimensionNames.join(', ')}. Add dimension '${dimName}' first or fix the reference.`,
              command: `make-template --add-dimension ${dimName}`,
              autoFix: {
                type: 'add-missing-dimension',
                dimension: dimName
              }
            });
          } else {
            // Validate forbidden values are valid for the dimension
            const validValues = dimensions[dimName].values || [];
            for (const value of forbiddenValues) {
              if (!validValues.includes(value)) {
                errors.push({
                  type: 'DOMAIN_ERROR',
                  message: `Gate '${gateName}' forbids invalid value '${value}' for dimension '${dimName}'`,
                  path: ['gates', gateName, 'forbidden', dimName]
                });
              }
            }
          }
        }
      }
    }

    return errors;
  }

  /**
   * Validate feature specs reference existing features and have valid needs
   * @param {object} featureSpecs - Feature specs object
   * @param {object} dimensions - Full dimensions object
   * @returns {Array} Validation errors
   */
  validateFeatureSpecsReference(featureSpecs, dimensions) {
    const errors = [];
    const validFeatures = new Set(dimensions.features?.values || []);
    const dimensionNames = Object.keys(dimensions);

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
        for (const [neededDim, requirement] of Object.entries(specConfig.needs)) {
          // Check if dimension exists
          if (!dimensionNames.includes(neededDim)) {
            errors.push({
              type: 'DOMAIN_ERROR',
              message: `Feature spec '${specName}' needs unknown dimension: ${neededDim}`,
              path: ['featureSpecs', specName, 'needs', neededDim]
            });
          }

          // Validate requirement level
          if (!['required', 'optional', 'none'].includes(requirement)) {
            errors.push({
              type: 'DOMAIN_ERROR',
              message: `Feature spec '${specName}' has invalid requirement '${requirement}' for dimension '${neededDim}'. Must be: required, optional, or none`,
              path: ['featureSpecs', specName, 'needs', neededDim]
            });
          }
        }
      }
    }

    return errors;
  }

  /**
   * Validate hints reference existing features and have valid needs
   * @param {object} hints - Hints features object
   * @param {object} dimensions - Full dimensions object
   * @returns {Array} Validation errors
   */
  validateHintsReference(hints, dimensions) {
    const errors = [];
    const validFeatures = new Set(dimensions.features?.values || []);
    const dimensionNames = Object.keys(dimensions);

    for (const [hintName, hintConfig] of Object.entries(hints)) {
      if (!validFeatures.has(hintName)) {
        errors.push({
          type: 'DOMAIN_ERROR',
          message: `Hint '${hintName}' does not correspond to any feature in dimensions`,
          path: ['hints', 'features', hintName]
        });
      }

      // Validate needs in hints if present
      if (hintConfig.needs) {
        for (const [neededDim, requirement] of Object.entries(hintConfig.needs)) {
          // Check if dimension exists
          if (!dimensionNames.includes(neededDim)) {
            errors.push({
              type: 'DOMAIN_ERROR',
              message: `Hint '${hintName}' needs unknown dimension: ${neededDim}`,
              path: ['hints', 'features', hintName, 'needs', neededDim]
            });
          }

          // Validate requirement level
          if (!['required', 'optional', 'none'].includes(requirement)) {
            errors.push({
              type: 'DOMAIN_ERROR',
              message: `Hint '${hintName}' has invalid requirement '${requirement}' for dimension '${neededDim}'. Must be: required, optional, or none`,
              path: ['hints', 'features', hintName, 'needs', neededDim]
            });
          }
        }
      }
    }

    return errors;
  }

  /**
   * Validate that all features in dimensions have corresponding feature specs
   * @param {Array} featureValues - Array of feature names from dimensions
   * @param {object} featureSpecs - Feature specs object
   * @returns {Array} Validation errors
   */
  validateAllFeaturesHaveSpecs(featureValues, featureSpecs) {
    const errors = [];
    const specNames = Object.keys(featureSpecs);

    for (const feature of featureValues) {
      if (!specNames.includes(feature)) {
        errors.push({
          type: 'DOMAIN_ERROR',
          message: `Feature '${feature}' is defined in dimensions but missing from featureSpecs`,
          path: ['featureSpecs'],
          suggestion: `Add feature specification for '${feature}' to define its requirements and behavior`,
          command: `make-template --set-needs ${feature}`,
          autoFix: {
            type: 'add-missing-feature-spec',
            feature
          }
        });
      }
    }

    return errors;
  }

  /**
   * Validate deployment target compatibility with selected dimension values
   * @param {object} templateData - Full template data
   * @param {object} selectedValues - Selected dimension values
   * @param {string} deploymentTarget - Target deployment platform
   * @returns {Array} Validation errors
   */
  validateGatesEnforcement(templateData, selectedValues, deploymentTarget) {
    const errors = [];

    // Check if deployment target has gates defined
    if (!templateData.gates || !templateData.gates[deploymentTarget]) {
      // No gates defined for this target - assume compatible
      return errors;
    }

    const gate = templateData.gates[deploymentTarget];

    // Check allowed constraints
    if (gate.allowed) {
      for (const [dimension, allowedValues] of Object.entries(gate.allowed)) {
        const selectedValue = selectedValues[dimension];

        if (selectedValue !== undefined) {
          // Handle both single values and arrays
          const selectedValuesArray = Array.isArray(selectedValue) ? selectedValue : [selectedValue];

          for (const value of selectedValuesArray) {
            if (!allowedValues.includes(value)) {
              errors.push({
                type: 'GATES_VIOLATION',
                message: `Deployment target '${deploymentTarget}' does not allow '${value}' for dimension '${dimension}'. Allowed values: ${allowedValues.join(', ')}`,
                path: ['gates', deploymentTarget, 'allowed', dimension],
                suggestion: `Change ${dimension} to one of: ${allowedValues.join(', ')} or choose a different deployment target`
              });
            }
          }
        }
      }
    }

    // Check forbidden constraints
    if (gate.forbidden) {
      for (const [dimension, forbiddenValues] of Object.entries(gate.forbidden)) {
        const selectedValue = selectedValues[dimension];

        if (selectedValue !== undefined) {
          // Handle both single values and arrays
          const selectedValuesArray = Array.isArray(selectedValue) ? selectedValue : [selectedValue];

          for (const value of selectedValuesArray) {
            if (forbiddenValues.includes(value)) {
              errors.push({
                type: 'GATES_VIOLATION',
                message: `Deployment target '${deploymentTarget}' forbids '${value}' for dimension '${dimension}'`,
                path: ['gates', deploymentTarget, 'forbidden', dimension],
                suggestion: `Remove ${value} from ${dimension} or choose a different deployment target`
              });
            }
          }
        }
      }
    }

    return errors;
  }

  /**
   * Validate feature needs are satisfied when features are enabled
   * @param {object} templateData - Full template data
   * @param {Array<string>} enabledFeatures - List of enabled features
   * @param {object} selectedValues - Selected dimension values
   * @returns {Array} Validation errors
   */
  validateFeatureNeeds(templateData, enabledFeatures, selectedValues) {
    const errors = [];

    for (const feature of enabledFeatures) {
      const featureSpec = templateData.featureSpecs?.[feature];

      if (!featureSpec) {
        errors.push({
          type: 'FEATURE_NEEDS_VIOLATION',
          message: `Feature '${feature}' is enabled but has no specification defined`,
          path: ['featureSpecs', feature],
          suggestion: `Add a feature specification for '${feature}' in featureSpecs section`
        });
        continue;
      }

      // Check feature needs
      if (featureSpec.needs) {
        for (const [dimension, requirement] of Object.entries(featureSpec.needs)) {
          if (requirement === 'required') {
            const selectedValue = selectedValues[dimension];

            if (!selectedValue || (Array.isArray(selectedValue) && selectedValue.length === 0)) {
              errors.push({
                type: 'FEATURE_NEEDS_VIOLATION',
                message: `Feature '${feature}' requires dimension '${dimension}' but no value is selected`,
                path: ['featureSpecs', feature, 'needs', dimension],
                suggestion: `Select a value for dimension '${dimension}' or change feature '${feature}' requirement to 'optional'`
              });
            } else if (Array.isArray(selectedValue)) {
              // For array values, check if any required values are present
              const requiredValues = templateData.dimensions[dimension]?.values || [];
              const hasRequiredValue = selectedValue.some(val => requiredValues.includes(val));

              if (!hasRequiredValue) {
                errors.push({
                  type: 'FEATURE_NEEDS_VIOLATION',
                  message: `Feature '${feature}' requires a valid value for dimension '${dimension}'`,
                  path: ['featureSpecs', feature, 'needs', dimension],
                  suggestion: `Select valid values for dimension '${dimension}' from: ${requiredValues.join(', ')}`
                });
              }
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

    // Check for incompatible dimension combinations
    // This is a placeholder for more sophisticated cross-dimension validation
    // In a real implementation, this could check for known incompatible combinations

    const deploymentTarget = selectedValues.deployment_target;
    const features = selectedValues.features || [];
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

    // Example: Auth feature requires database
    if (features.includes('auth') && (!database || database === 'none')) {
      errors.push({
        type: 'CROSS_DIMENSION_VIOLATION',
        message: `Authentication feature requires a database to store user data`,
        path: ['dimensions', 'features'],
        suggestion: `Select a database option or remove the 'auth' feature`
      });
    }

    // Example: Payments feature requires auth
    if (features.includes('payments') && !features.includes('auth')) {
      errors.push({
        type: 'CROSS_DIMENSION_VIOLATION',
        message: `Payments feature requires authentication to manage user billing`,
        path: ['dimensions', 'features'],
        suggestion: `Add the 'auth' feature or remove the 'payments' feature`
      });
    }

    return errors;
  }

  /**
   * Validate hints consistency with feature specs
   * @param {object} templateData - Full template data
   * @returns {Array} Validation errors
   */
  validateHintsConsistency(templateData) {
    const errors = [];

    if (!templateData.hints?.features || !templateData.featureSpecs) {
      return errors;
    }

    for (const [featureName, hintConfig] of Object.entries(templateData.hints.features)) {
      const featureSpec = templateData.featureSpecs[featureName];

      if (!featureSpec) {
        errors.push({
          type: 'HINTS_CONSISTENCY_VIOLATION',
          message: `Hint defined for feature '${featureName}' but no feature spec exists`,
          path: ['hints', 'features', featureName],
          suggestion: `Add a feature specification for '${featureName}' or remove the hint`
        });
        continue;
      }

      // Check if hint needs align with feature spec needs
      if (hintConfig.needs && featureSpec.needs) {
        for (const [dimension, hintRequirement] of Object.entries(hintConfig.needs)) {
          const specRequirement = featureSpec.needs[dimension];

          if (specRequirement && specRequirement !== hintRequirement) {
            errors.push({
              type: 'HINTS_CONSISTENCY_VIOLATION',
              message: `Hint for feature '${featureName}' has different requirement for '${dimension}' than feature spec (${hintRequirement} vs ${specRequirement})`,
              path: ['hints', 'features', featureName, 'needs', dimension],
              suggestion: `Make hint and feature spec requirements consistent for dimension '${dimension}'`
            });
          }
        }
      }

      // Check if hint has required fields
      if (!hintConfig.label) {
        errors.push({
          type: 'HINTS_CONSISTENCY_VIOLATION',
          message: `Hint for feature '${featureName}' missing required 'label' field`,
          path: ['hints', 'features', featureName],
          suggestion: `Add a descriptive label for the '${featureName}' hint`
        });
      }

      if (!hintConfig.description) {
        errors.push({
          type: 'HINTS_CONSISTENCY_VIOLATION',
          message: `Hint for feature '${featureName}' missing required 'description' field`,
          path: ['hints', 'features', featureName],
          suggestion: `Add a description explaining what the '${featureName}' feature provides`
        });
      }
    }

    return errors;
  }

  /**
   * Perform comprehensive runtime validation with selected values
   * @param {object} templateData - Full template data
   * @param {object} selectedValues - Selected dimension values
   * @param {string} deploymentTarget - Target deployment platform
   * @param {Array<string>} enabledFeatures - List of enabled features
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

    // Hints consistency
    warnings.push(...this.validateHintsConsistency(templateData));

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}
