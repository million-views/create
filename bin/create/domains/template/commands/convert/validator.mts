// @ts-nocheck
import fs from 'fs';
import path from 'path';

export function validateProjectPath(projectPath) {
  if (!projectPath) {
    return { valid: false, error: 'Project path is required' };
  }

  if (typeof projectPath !== 'string') {
    return { valid: false, error: 'Project path must be a string' };
  }

  // Resolve to absolute path
  const absolutePath = path.resolve(projectPath);

  // Check if path exists
  if (!fs.existsSync(absolutePath)) {
    return { valid: false, error: `Project path does not exist: ${absolutePath}` };
  }

  // Check if it's a directory
  const stats = fs.statSync(absolutePath);
  if (!stats.isDirectory()) {
    return { valid: false, error: `Project path must be a directory: ${absolutePath}` };
  }

  // Check if it's a valid project (has package.json)
  const packageJsonPath = path.join(absolutePath, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return { valid: false, error: `Project must have package.json: ${absolutePath}` };
  }

  return { valid: true };
}
