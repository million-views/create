#!/usr/bin/env node

import { test } from 'node:test';
import assert from 'node:assert';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  runTemplateValidation,
  formatValidationResults,
  formatValidationResultsAsJson
} from '../../bin/create-scaffold/template-validation.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('Template Validation Functions', async (t) => {
  const tempDir = path.join(__dirname, '../fixtures/temp-validation-test');

  t.before(async () => {
    await mkdir(tempDir, { recursive: true });
  });

  t.after(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  await t.test('runTemplateValidation handles nonexistent directory', async () => {
    const result = await runTemplateValidation({
      targetPath: '/nonexistent/directory'
    });

    assert.equal(result.status, 'fail', 'Should fail for nonexistent directory');
    assert(result.results[0].issues[0].includes('not accessible'), 'Should report accessibility issue');
  });

  await t.test('runTemplateValidation handles non-directory path', async () => {
    const filePath = path.join(tempDir, 'not-a-directory');
    await writeFile(filePath, 'test content');

    const result = await runTemplateValidation({
      targetPath: filePath
    });

    assert.equal(result.status, 'fail', 'Should fail for non-directory');
    assert(result.results[0].issues[0].includes('not a directory'), 'Should report directory issue');
  });

  await t.test('runTemplateValidation executes validators', async () => {
    // Create a minimal valid template directory
    const templateDir = path.join(tempDir, 'valid-template');
    await mkdir(templateDir, { recursive: true });

    await writeFile(
      path.join(templateDir, 'template.json'),
      JSON.stringify({
        name: 'test-template',
        description: 'Test template'
      }, null, 2)
    );

    await writeFile(
      path.join(templateDir, 'package.json'),
      JSON.stringify({
        name: 'test-template',
        version: '1.0.0'
      }, null, 2)
    );

    await writeFile(
      path.join(templateDir, 'README.md'),
      '# Test Template\n\nThis is a test template.'
    );

    const result = await runTemplateValidation({
      targetPath: templateDir
    });

    assert(result.results.length > 0, 'Should have validation results');
    assert(typeof result.status === 'string', 'Should have status');
    assert(typeof result.summary === 'object', 'Should have summary');
  });

  await t.test('formatValidationResults formats output correctly', () => {
    const mockResult = {
      targetPath: '/test/path',
      status: 'fail',
      summary: { passed: 1, warnings: 1, failed: 1 },
      results: [
        {
          name: 'manifest',
          status: 'pass',
          issues: []
        },
        {
          name: 'requiredFiles',
          status: 'warn',
          issues: ['Missing optional file']
        },
        {
          name: 'setupScript',
          status: 'fail',
          issues: ['Invalid setup script', 'Syntax error']
        }
      ]
    };

    const output = formatValidationResults(mockResult);

    assert(output.includes('🔍 Validating template at /test/path'), 'Should include header');
    assert(output.includes('✅ Manifest'), 'Should include passed validator');
    assert(output.includes('⚠️ Required Files'), 'Should include warning validator');
    assert(output.includes('❌ Setup Script'), 'Should include failed validator');
    assert(output.includes('Summary: 1 passed, 1 warnings, 1 failed'), 'Should include summary');
  });

  await t.test('formatValidationResultsAsJson returns valid JSON', () => {
    const mockResult = {
      targetPath: '/test/path',
      status: 'pass',
      summary: { passed: 2, warnings: 0, failed: 0 },
      results: [
        {
          name: 'manifest',
          status: 'pass',
          issues: []
        }
      ]
    };

    const jsonOutput = formatValidationResultsAsJson(mockResult);
    const parsed = JSON.parse(jsonOutput);

    assert.equal(parsed.status, 'pass', 'Should preserve status');
    assert.equal(parsed.targetPath, '/test/path', 'Should preserve target path');
    assert(Array.isArray(parsed.results), 'Should have results array');
  });
});