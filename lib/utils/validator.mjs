import { ValidationError } from './security.mjs';

export class Validator {


  /**
   * Shared validation utilities
   * Provides unified validation error handling patterns
   */

  /**
   * Handle validation function with consistent error collection
   * @param {Function} validationFn - Validation function to execute
   * @param {any} value - Value to validate
   * @param {string[]} errorArray - Array to collect error messages
   * @param {string} fallbackMessage - Fallback error message if validation fails unexpectedly
   */
  static handleValidationError(validationFn, value, errorArray, fallbackMessage) {
    try {
      return validationFn(value);
    } catch (error) {
      if (error instanceof ValidationError) {
        errorArray.push(error.message);
      } else {
        errorArray.push(fallbackMessage);
      }
      return null;
    }
  }

  /**
   * Validate multiple fields with consistent error handling
   * @param {Array} validations - Array of validation objects
   * @param {Array} validations[].fn - Validation function
   * @param {any} validations[].value - Value to validate
   * @param {string} validations[].fallback - Fallback error message
   * @returns {Object} - Object with validated values and errors array
   */
  static validateMultipleFields(validations) {
    const errors = [];
    const validated = {};

    for (const { key, fn, value, fallback } of validations) {
      const result = Validator.handleValidationError(fn, value, errors, fallback);
      if (result !== null) {
        validated[key] = result;
      }
    }

    return { validated, errors };
  }

}
