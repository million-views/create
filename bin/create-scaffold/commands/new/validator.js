export function validateProjectName(name) {
  if (!name) {
    return { valid: false, error: 'Project name is required' };
  }

  if (typeof name !== 'string') {
    return { valid: false, error: 'Project name must be a string' };
  }

  if (name.trim().length === 0) {
    return { valid: false, error: 'Project name cannot be empty' };
  }

  // Check for path traversal attempts first (more specific)
  if (name.includes('../') || name.includes('..\\') || name.startsWith('/') || name.startsWith('\\') || name.includes('/')) {
    return { valid: false, error: 'Project directory name contains path separators or traversal attempts' };
  }

  // Check for valid directory name characters
  const invalidChars = /[<>:"\\|?*\x00-\x1f]/;
  if (invalidChars.test(name)) {
    return { valid: false, error: 'Project name contains invalid characters' };
  }

  // Check for Windows reserved names
  const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
  if (reservedNames.test(name)) {
    return { valid: false, error: 'Project name is a reserved system name' };
  }

  // Check length
  if (name.length > 255) {
    return { valid: false, error: 'Project name is too long' };
  }

  return { valid: true };
}
