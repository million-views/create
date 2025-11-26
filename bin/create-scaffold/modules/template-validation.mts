#!/usr/bin/env node
// @ts-nocheck

import fs from 'node:fs/promises';
import path from 'node:path';

import { sanitize } from '@m5nv/create-scaffold/lib/security/index.mts';
import { validateManifest } from './validators/manifest-validator.mts';
import { validateSetupScript } from './validators/setup-lint.mts';
import { validateRequiredFiles } from './validators/required-files.mts';

export async function runTemplateValidation({ targetPath }) {
  const resolvedPath = path.resolve(targetPath);

  let stats;
  try {
    stats = await fs.stat(resolvedPath);
  } catch (error) {
    const message = sanitize.error(error?.message ?? String(error));
    const result = {
      name: 'location',
      status: 'fail',
      issues: [`Template directory not accessible: ${message}`]
    };
    const summary = summarizeResults([result]);
    return {
      targetPath: resolvedPath,
      status: summary.status,
      summary,
      results: [result]
    };
  }

  if (!stats.isDirectory()) {
    const result = {
      name: 'location',
      status: 'fail',
      issues: ['Provided template path is not a directory.']
    };
    const summary = summarizeResults([result]);
    return {
      targetPath: resolvedPath,
      status: summary.status,
      summary,
      results: [result]
    };
  }

  const validators = [
    validateManifest,
    validateRequiredFiles,
    validateSetupScript
  ];

  const results = [];
  for (const validator of validators) {
    try {
      const result = await validator({ targetPath: resolvedPath });
      results.push(result);
    } catch (error) {
      const message = sanitize.error(error?.message ?? String(error));
      results.push({
        name: validator.name || 'validator',
        status: 'fail',
        issues: [`Validator threw unexpected error: ${message}`]
      });
    }
  }

  const summary = summarizeResults(results);

  return {
    targetPath: resolvedPath,
    status: summary.status,
    summary,
    results
  };
}

export function formatValidationResults({ targetPath, _status, summary, results }) {
  const lines = [];
  lines.push(`🔍 Validating template at ${targetPath}`);
  lines.push('');

  for (const result of results) {
    const icon = statusIcon(result.status);
    const label = humanizeName(result.name);
    lines.push(`${icon} ${label}`);
    if (Array.isArray(result.issues) && result.issues.length > 0) {
      for (const issue of result.issues) {
        lines.push(`  - ${issue}`);
      }
    }
    lines.push('');
  }

  lines.push(`Summary: ${summary.passed} passed, ${summary.warnings} warnings, ${summary.failed} failed`);
  return lines.join('\n');
}

export function formatValidationResultsAsJson({ targetPath, status, summary, results }) {
  return JSON.stringify({
    status,
    summary,
    targetPath,
    results: results.map((result) => ({
      name: result.name,
      status: result.status,
      issues: Array.isArray(result.issues) ? [...result.issues] : []
    }))
  }, null, 2);
}

function summarizeResults(results) {
  let passed = 0;
  let warnings = 0;
  let failed = 0;

  for (const result of results) {
    if (result.status === 'fail') {
      failed += 1;
    } else if (result.status === 'warn') {
      warnings += 1;
    } else {
      passed += 1;
    }
  }

  const summary = {
    passed,
    warnings,
    failed
  };

  summary.status = failed > 0 ? 'fail' : warnings > 0 ? 'warn' : 'pass';
  return summary;
}

function statusIcon(status) {
  switch (status) {
    case 'fail':
      return '❌';
    case 'warn':
      return '⚠️';
    default:
      return '✅';
  }
}

function humanizeName(name) {
  if (!name) {
    return 'Validator';
  }
  return name.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase());
}
