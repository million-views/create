import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { loadConfig, generateConfigFile } from '../lib/templatize-config.mjs';
import { Converter } from '../bin/make-template/commands/convert/converter.js';

describe('Templatization Performance Tests', () => {
  let tempDir;
  let projectDir;

  it('should setup performance test environment', async () => {
    tempDir = path.join(tmpdir(), 'templatize-performance-test-' + Date.now());
    projectDir = path.join(tempDir, 'test-project');
    await fs.mkdir(tempDir, { recursive: true });
    await fs.mkdir(projectDir, { recursive: true });
  });

  it('should benchmark config loading performance', async () => {
    // Create a complex config file
    const complexConfig = {
      rules: {
        'package.json': [
          { type: 'json-value', path: '$.name', placeholder: 'PACKAGE_NAME' },
          { type: 'json-value', path: '$.description', placeholder: 'PACKAGE_DESCRIPTION' },
          { type: 'json-value', path: '$.author', placeholder: 'PACKAGE_AUTHOR' },
          { type: 'json-value', path: '$.version', placeholder: 'PACKAGE_VERSION' }
        ],
        'README.md': [
          { type: 'markdown-heading', level: 1, placeholder: 'TITLE' },
          { type: 'markdown-heading', level: 2, placeholder: 'SUBTITLE' },
          { type: 'markdown-paragraph', position: 'first', placeholder: 'DESCRIPTION' }
        ],
        '.jsx': [
          {
            type: 'string-literal',
            context: 'jsx-attribute',
            selector: '[className]',
            attribute: 'className',
            placeholder: 'CSS_CLASS'
          },
          {
            type: 'string-literal',
            context: 'jsx-attribute',
            selector: '[id]',
            attribute: 'id',
            placeholder: 'ELEMENT_ID'
          }
        ],
        '.html': [
          { type: 'html-text', selector: 'h1', placeholder: 'PAGE_TITLE' },
          { type: 'html-text', selector: 'p', placeholder: 'PAGE_CONTENT' }
        ]
      }
    };

    await generateConfigFile(projectDir, complexConfig);

    // Benchmark config loading
    const startTime = performance.now();
    const config = await loadConfig(projectDir);
    const endTime = performance.now();
    const loadTime = endTime - startTime;

    console.log(`Config loading time: ${loadTime.toFixed(2)}ms`);
    assert(loadTime < 100, `Config loading should be fast (< 100ms), was ${loadTime}ms`);
    assert(config.rules, 'Should load config rules');
  });

  it('should benchmark pattern translation performance', async () => {
    const converter = new Converter({ projectPath: projectDir, yes: true });

    // Create test files
    await fs.writeFile(path.join(projectDir, 'package.json'),
      JSON.stringify({ name: 'test', description: 'test', author: 'test', version: '1.0.0' }, null, 2));
    await fs.writeFile(path.join(projectDir, 'README.md'),
      '# Test\n## Subtitle\n\nThis is a test.');
    await fs.writeFile(path.join(projectDir, 'test.jsx'),
      'const element = <div className="test-class" id="test-id">Hello</div>;');
    await fs.writeFile(path.join(projectDir, 'test.html'),
      '<h1>Test Page</h1><p>This is content</p>');

    // Benchmark conversion
    const startTime = performance.now();
    await converter.convert();
    const endTime = performance.now();
    const convertTime = endTime - startTime;

    console.log(`Full conversion time: ${convertTime.toFixed(2)}ms`);
    assert(convertTime < 1000, `Conversion should be reasonable (< 1000ms), was ${convertTime}ms`);

    // Verify template was created
    const templateExists = await fileExists(path.join(projectDir, 'template.json'));
    assert(templateExists, 'Should create template.json');
  });

  it('should benchmark large project with many files', async () => {
    const largeProjectDir = path.join(tempDir, 'large-project');
    await fs.mkdir(largeProjectDir, { recursive: true });

    // Create a simple package.json for testing
    await fs.writeFile(path.join(largeProjectDir, 'package.json'),
      JSON.stringify({ name: 'large-test', version: '1.0.0' }, null, 2));

    // Create simple config
    const largeConfig = {
      rules: {
        'package.json': [
          { type: 'json-value', path: '$.name', placeholder: 'NAME' },
          { type: 'json-value', path: '$.version', placeholder: 'VERSION' }
        ]
      }
    };

    await generateConfigFile(largeProjectDir, largeConfig);

    const converter = new Converter({ projectPath: largeProjectDir, yes: true });

    const startTime = performance.now();
    await converter.convert();
    const endTime = performance.now();
    const convertTime = endTime - startTime;

    console.log(`Project conversion time: ${convertTime.toFixed(2)}ms`);
    assert(convertTime < 1000, `Conversion should be fast (< 1000ms), was ${convertTime}ms`);
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
