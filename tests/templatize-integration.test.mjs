import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { Converter } from '../bin/make-template/commands/convert/converter.js';
import { generateConfigFile } from '../lib/templatize-config.mjs';

describe('Templatization Integration Tests', () => {
  let tempDir;
  let projectDir;

  it('should setup temporary directories', async () => {
    tempDir = path.join(tmpdir(), 'templatize-integration-test-' + Date.now());
    projectDir = path.join(tempDir, 'test-project');
    await fs.mkdir(tempDir, { recursive: true });
    await fs.mkdir(projectDir, { recursive: true });
  });

  it('should complete config-driven templatization workflow', async () => {
    // Create test project
    await fs.writeFile(path.join(projectDir, 'package.json'),
      JSON.stringify({ name: 'test-project', description: 'A test' }, null, 2));
    await fs.writeFile(path.join(projectDir, 'README.md'),
      '# Test Project\n\nThis is a test.');

    // Generate config
    const configOverrides = {
      rules: {
        'package.json': [
          {
            type: 'json-value',
            path: '$.name',
            placeholder: 'PROJECT_NAME'
          }
        ],
        'README.md': [
          {
            type: 'markdown-heading',
            level: 1,
            placeholder: 'TITLE'
          }
        ]
      }
    };
    await generateConfigFile(projectDir, configOverrides);

    // Convert using converter
    const converter = new Converter({ projectPath: projectDir, yes: true });
    await converter.convert();

    // Verify results
    const templateJson = JSON.parse(await fs.readFile(path.join(projectDir, 'template.json'), 'utf8'));
    assert(templateJson.placeholders.PROJECT_NAME, 'Should detect PROJECT_NAME');
    assert(templateJson.placeholders.TITLE, 'Should detect TITLE');
  });

  it('should handle missing config gracefully', async () => {
    const noConfigDir = path.join(tempDir, 'no-config');
    await fs.mkdir(noConfigDir, { recursive: true });
    await fs.writeFile(path.join(noConfigDir, 'package.json'), '{"name": "test"}');

    const converter = new Converter({ projectPath: noConfigDir, yes: true });
    await converter.convert();

    assert(await fileExists(path.join(noConfigDir, 'template.json')), 'Should create template.json');
  });

  it('should cleanup', async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });
});

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
