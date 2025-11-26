/**
 * Package Identity Functions
 *
 * Functions for package identity validation and generation of
 * installation instructions and error messages.
 *
 * @module lib/security/identity
 */

import { ValidationError } from '../error/index.mts';

/**
 * The current package name.
 */
export const PACKAGE_NAME = '@m5nv/create-scaffold' as const;

/**
 * Get the current package name for use in error messages and validation
 * @returns The current package name
 */
export function getPackageName(): string {
  return PACKAGE_NAME;
}

/**
 * Generate installation instructions with correct package name
 * @returns Installation instructions
 */
export function generateInstallationInstructions(): string {
  const packageName = getPackageName();
  return `Installation options:
  • Use npm create: npm create @m5nv/scaffold <project-name> -- --template <template-name>
  • Use npx: npx ${packageName}@latest <project-name> --template <template-name>
  • Install globally: npm install -g ${packageName}`;
}

/**
 * Generate package validation error message
 * @param invalidName - The invalid package name that was provided
 * @returns Error message with correct package name
 */
export function generatePackageValidationError(invalidName: string): string {
  const correctName = getPackageName();
  return `Invalid package name: "${invalidName}". Expected: "${correctName}"`;
}

/**
 * Validate that the provided package name matches the expected package name
 * @param packageName - Package name to validate
 * @returns True if package name is valid
 * @throws ValidationError if package name is invalid
 */
export function validatePackageName(packageName: unknown): boolean {
  if (!packageName || typeof packageName !== 'string') {
    throw new ValidationError('Package name must be a non-empty string', 'packageName');
  }

  const expectedName = getPackageName();

  if (packageName.trim() !== expectedName) {
    throw new ValidationError(
      generatePackageValidationError(packageName),
      'packageName'
    );
  }

  return true;
}

/**
 * Validate package identity and ensure consistency
 * This function can be used to verify the package is running with the correct identity
 * @returns True if package identity is valid
 * @throws ValidationError if package identity validation fails
 */
export function validatePackageIdentity(): boolean {
  try {
    const expectedName = getPackageName();

    // Validate the expected name format
    if (expectedName !== '@m5nv/create-scaffold') {
      throw new ValidationError(
        'Package identity validation failed: incorrect package name format',
        'packageIdentity'
      );
    }

    // Validate package name follows npm create conventions
    if (!expectedName.startsWith('@m5nv/create-')) {
      throw new ValidationError(
        'Package identity validation failed: package name does not follow npm create conventions',
        'packageIdentity'
      );
    }

    return true;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError(
      'Package identity validation failed: unable to verify package configuration',
      'packageIdentity'
    );
  }
}
