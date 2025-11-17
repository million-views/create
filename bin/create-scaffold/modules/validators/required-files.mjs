#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const NAME = 'requiredFiles';
const README_CANDIDATES = new Set(['readme', 'readme.md', 'readme.markdown']);

export async function validateRequiredFiles({ targetPath }) {
  const issues = [];

  const templateExists = await fileExists(path.join(targetPath, 'template.json'));
  if (!templateExists) {
    issues.push('Required file missing: template.json');
  }

  const undoExists = await fileExists(path.join(targetPath, '.template-undo.json'));
  if (!undoExists) {
    issues.push('Required file missing: .template-undo.json');
  }

  const readmeExists = await hasReadme(targetPath);
  if (!readmeExists) {
    issues.push('Required documentation missing: README.md (or README)');
  }

  if (issues.length > 0) {
    return createResult('fail', issues);
  }

  return createResult('pass');
}

async function fileExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function hasReadme(targetPath) {
  try {
    const entries = await fs.readdir(targetPath);
    for (const entry of entries) {
      const normalized = entry.toLowerCase();
      if (README_CANDIDATES.has(normalized)) {
        const entryPath = path.join(targetPath, entry);
        try {
          const stats = await fs.stat(entryPath);
          if (stats.isFile()) {
            return true;
          }
        } catch {
          // Ignore and continue checking.
        }
      }
    }
  } catch {
    return false;
  }
  return false;
}

function createResult(status, issues = []) {
  return {
    name: NAME,
    status,
    issues
  };
}
