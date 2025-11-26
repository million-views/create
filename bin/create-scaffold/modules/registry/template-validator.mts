#!/usr/bin/env node
// @ts-nocheck

/**
 * Template Validator
 * Validates template metadata and structure
 */

import { EventEmitter } from 'events';
import { validateTemplateManifest } from '@m5nv/create-scaffold/lib/validation/index.mts';

/**
 * Template validation component
 */
export class TemplateValidator extends EventEmitter {
  constructor(templateRegistry) {
    super();
    this.templateRegistry = templateRegistry;

    this.options = {
      strict: true,
      validateSchema: true,
      validateMetadata: true,
      validateStructure: true
    };
  }

  /**
   * Validate a template
   */
  async validateTemplate(template, options = {}) {
    const config = { ...this.options, ...options };
    const errors = [];
    const warnings = [];

    try {
      // Validate basic structure
      if (config.validateStructure) {
        this.validateBasicStructure(template, errors);
      }

      // Validate metadata
      if (config.validateMetadata) {
        this.validateMetadata(template, errors, warnings);
      }

      // Validate against schema
      if (config.validateSchema && template.raw) {
        await this.validateSchema(template.raw, errors, warnings);
      }

      // Check for additional validation rules
      this.validateCustomRules(template, errors, warnings);

      // Emit validation result
      if (errors.length === 0) {
        this.emit('validation:success', template);
      } else {
        this.emit('validation:failed', { template, errors, warnings });
      }

      // Return validated template with validation info
      return {
        ...template,
        validation: {
          valid: errors.length === 0,
          errors,
          warnings,
          validatedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      const validationError = {
        template,
        errors: [{ message: error.message, code: 'VALIDATION_ERROR' }],
        warnings: []
      };
      this.emit('validation:failed', validationError);
      throw error;
    }
  }

  /**
   * Validate basic template structure
   */
  validateBasicStructure(template, errors) {
    // Required fields
    if (!template.name || typeof template.name !== 'string') {
      errors.push({
        field: 'name',
        message: 'Template name is required and must be a string',
        code: 'MISSING_NAME'
      });
    }

    if (!template.description || typeof template.description !== 'string') {
      errors.push({
        field: 'description',
        message: 'Template description is required and must be a string',
        code: 'MISSING_DESCRIPTION'
      });
    }

    // Optional but recommended fields
    if (!template.version) {
      errors.push({
        field: 'version',
        message: 'Template version is recommended',
        code: 'MISSING_VERSION'
      });
    }

    // Type validations
    if (template.tags && !Array.isArray(template.tags)) {
      errors.push({
        field: 'tags',
        message: 'Template tags must be an array',
        code: 'INVALID_TAGS'
      });
    }

    if (template.dimensions && typeof template.dimensions !== 'object') {
      errors.push({
        field: 'dimensions',
        message: 'Template dimensions must be an object',
        code: 'INVALID_DIMENSIONS'
      });
    }
  }

  /**
   * Validate template metadata
   */
  validateMetadata(template, errors, warnings) {
    // Name validation
    if (template.name) {
      if (template.name.length > 120) {
        errors.push({
          field: 'name',
          message: 'Template name must be 120 characters or less',
          code: 'NAME_TOO_LONG'
        });
      }

      if (!/^[a-zA-Z0-9][a-zA-Z0-9 _-]*$/.test(template.name)) {
        errors.push({
          field: 'name',
          message: 'Template name contains invalid characters',
          code: 'INVALID_NAME_FORMAT'
        });
      }
    }

    // Description validation
    if (template.description && template.description.length > 500) {
      warnings.push({
        field: 'description',
        message: 'Template description is quite long (>500 chars)',
        code: 'LONG_DESCRIPTION'
      });
    }

    // Version validation
    if (template.version && !this.isValidSemver(template.version)) {
      warnings.push({
        field: 'version',
        message: 'Template version should follow semantic versioning',
        code: 'INVALID_VERSION_FORMAT'
      });
    }

    // Author validation
    if (template.author && typeof template.author !== 'string') {
      errors.push({
        field: 'author',
        message: 'Template author must be a string',
        code: 'INVALID_AUTHOR'
      });
    }

    // Tags validation
    if (template.tags) {
      template.tags.forEach((tag, index) => {
        if (typeof tag !== 'string') {
          errors.push({
            field: `tags[${index}]`,
            message: 'Template tags must be strings',
            code: 'INVALID_TAG_TYPE'
          });
        } else if (tag.length > 50) {
          warnings.push({
            field: `tags[${index}]`,
            message: 'Tag is quite long (>50 chars)',
            code: 'LONG_TAG'
          });
        }
      });
    }
  }

  /**
   * Validate against JSON schema
   */
  async validateSchema(templateData, errors, warnings) {
    try {
      const result = await validateTemplateManifest(templateData);

      if (!result.valid) {
        result.errors.forEach(schemaError => {
          errors.push({
            field: schemaError.path ? schemaError.path.join('.') : 'template',
            message: schemaError.message,
            code: 'SCHEMA_VALIDATION_ERROR',
            details: schemaError
          });
        });
      }

      if (result.warnings) {
        result.warnings.forEach(warning => {
          warnings.push({
            field: warning.path ? warning.path.join('.') : 'template',
            message: warning.message,
            code: 'SCHEMA_VALIDATION_WARNING',
            details: warning
          });
        });
      }
    } catch (error) {
      errors.push({
        field: 'schema',
        message: `Schema validation failed: ${error.message}`,
        code: 'SCHEMA_VALIDATION_FAILED'
      });
    }
  }

  /**
   * Validate custom business rules
   */
  validateCustomRules(template, errors, warnings) {
    // Check for deprecated fields
    const deprecatedFields = ['deprecated', 'legacy'];
    deprecatedFields.forEach(field => {
      if (template[field]) {
        warnings.push({
          field,
          message: `Field '${field}' is deprecated`,
          code: 'DEPRECATED_FIELD'
        });
      }
    });

    // Check for conflicting configurations
    if (template.dimensions && template.variables) {
      warnings.push({
        field: 'dimensions,variables',
        message: 'Both dimensions and variables are defined - ensure they work together',
        code: 'DIMENSIONS_VARIABLES_CONFLICT'
      });
    }

    // Check for template size indicators
    if (template.files && template.files.length > 100) {
      warnings.push({
        field: 'files',
        message: 'Template has many files (>100) - consider splitting into smaller templates',
        code: 'LARGE_TEMPLATE'
      });
    }
  }

  /**
   * Check if string is valid semantic version
   */
  isValidSemver(version) {
    const semverRegex = new RegExp(
      '^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)' +
      '(?:-((?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?' +
      '(?:\\+([0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*))?$'
    );
    return semverRegex.test(version);
  }

  /**
   * Validate multiple templates
   */
  async validateTemplates(templates, options = {}) {
    const results = [];

    for (const template of templates) {
      try {
        const validated = await this.validateTemplate(template, options);
        results.push(validated);
      } catch (error) {
        results.push({
          ...template,
          validation: {
            valid: false,
            errors: [{ message: error.message, code: 'VALIDATION_ERROR' }],
            warnings: [],
            validatedAt: new Date().toISOString()
          }
        });
      }
    }

    return results;
  }
}
