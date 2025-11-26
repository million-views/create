#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

import { validateTemplateManifest } from '@m5nv/create-scaffold/lib/validation/index.mts';
import { sanitize } from '@m5nv/create-scaffold/lib/security/index.mts';

const NAME = 'manifest';

export async function validateManifest({ targetPath }) {
  const issues = [];
  const manifestPath = path.join(targetPath, 'template.json');
  let raw = null;

  try {
    raw = await fs.readFile(manifestPath, 'utf8');
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      issues.push('template.json not found. Ensure the template root includes template.json.');
    } else {
      const message = sanitize.error(error?.message ?? String(error));
      issues.push(`Unable to read template.json: ${message}`);
    }
    return createResult('fail', issues);
  }

  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch (error) {
    const message = sanitize.error(error?.message ?? String(error));
    issues.push(`template.json is not valid JSON: ${message}`);
    return createResult('fail', issues);
  }

  try {
    validateTemplateManifest(manifest);
  } catch (error) {
    const message = sanitize.error(error?.message ?? String(error));
    const scope = error?.field ? `${error.field}: ${message}` : message;
    issues.push(`Manifest validation failed: ${scope}`);
    return createResult('fail', issues);
  }

  return createResult('pass');
}

function createResult(status, issues = []) {
  return {
    name: NAME,
    status,
    issues
  };
}
