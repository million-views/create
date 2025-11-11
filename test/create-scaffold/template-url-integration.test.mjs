#!/usr/bin/env node

import { test } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

test('Template URL CLI Integration', async (t) => {
  const testDir = path.join(os.tmpdir(), 'create-scaffold-test-' + Date.now());
  let createdProjectDir = null;

  await t.test('accepts --template flag', async () => {
    // Create a mock template directory
    const templateDir = path.join(testDir, 'mock-template');
    await fs.mkdir(templateDir, { recursive: true });

    // Create a basic template.json
    const templateJson = {
      schemaVersion: '1.0.0',
      id: 'test/test-template',
      name: 'Test Template',
      description: 'A test template for integration testing',
      version: '1.0.0',
      dimensions: {
        deployment_target: { type: 'single', values: ['vercel'], default: 'vercel' },
        features: { type: 'multiple', values: ['auth'], default: [] }
      }
    };

    await fs.writeFile(
      path.join(templateDir, 'template.json'),
      JSON.stringify(templateJson, null, 2)
    );

    // Test the CLI with --template flag pointing to local path
    createdProjectDir = 'test-project-' + Date.now();

    return new Promise((resolve, reject) => {
      const child = spawn('node', [
        'bin/create-scaffold/index.mjs',
        createdProjectDir,
        '--template', templateDir,
        '--dry-run'
      ], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => { stdout += data.toString(); });
      child.stderr.on('data', (data) => { stderr += data.toString(); });

      child.on('close', (code) => {
        try {
          assert.equal(code, 0, `CLI exited with code ${code}, stderr: ${stderr}`);
          assert(stdout.includes(createdProjectDir), 'Should show the project directory');
          assert(stdout.includes(templateDir), 'Should show the template path');
          resolve();
        } catch (error) {
          reject(error);
        }
      });

      child.on('error', reject);
    });
  });

  // Cleanup
  t.after(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
      if (createdProjectDir) {
        await fs.rm(createdProjectDir, { recursive: true, force: true });
      }
    } catch (_error) {
      // Ignore cleanup errors
    }
  });
});
