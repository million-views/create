import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { loadConfig, generateConfigFile } from '../lib/templatize-config.mjs';
import { Converter } from '../bin/make-template/commands/convert/converter.js';

describe('Templatization Quality Validation Tests', () => {
  let tempDir;

  it('should setup quality validation environment', async () => {
    tempDir = path.join(tmpdir(), 'templatize-quality-test-' + Date.now());
    await fs.mkdir(tempDir, { recursive: true });
  });

  it('should reject malformed config files', async () => {
    const projectDir = path.join(tempDir, 'malformed-config');
    await fs.mkdir(projectDir, { recursive: true });

    // Create malformed config (missing required fields)
    await fs.writeFile(path.join(projectDir, '.templatize.json'),
      JSON.stringify({ rules: { '*.js': [{ type: 'invalid-type' }] } }, null, 2));

    // Should fail with validation error when loading config directly
    try {
      loadConfig(projectDir);
      assert.fail('Should have thrown validation error for malformed config');
    } catch (error) {
      assert(error.message.includes('Configuration must have a version string'),
        'Should reject config missing required version field');
    }
  });

  it('should handle missing files referenced in config', async () => {
    const projectDir = path.join(tempDir, 'missing-files');
    await fs.mkdir(projectDir, { recursive: true });

    // Create config that references non-existent files
    const config = {
      rules: {
        'nonexistent.json': [
          { context: 'application/json', path: '$.name', placeholder: 'NAME' }
        ],
        'missing.md': [
          { context: 'text/markdown#heading', selector: 'h1', placeholder: 'TITLE' }
        ]
      }
    };

    await generateConfigFile(projectDir, config);

    const converter = new Converter({ projectPath: projectDir, yes: true });
    await converter.convert();

    // Should still succeed
    const templateExists = await fileExists(path.join(projectDir, 'template.json'));
    assert(templateExists, 'Should handle missing files gracefully');
  });

  it('should handle empty and whitespace-only files', async () => {
    const projectDir = path.join(tempDir, 'empty-files');
    await fs.mkdir(projectDir, { recursive: true });

    // Create empty files
    await fs.writeFile(path.join(projectDir, 'empty.json'), '');
    await fs.writeFile(path.join(projectDir, 'whitespace.json'), '   \n\t  ');
    await fs.writeFile(path.join(projectDir, 'empty.md'), '');
    await fs.writeFile(path.join(projectDir, 'whitespace.md'), '\n\n  \t\n');

    const config = {
      rules: {
        '*.json': [
          { context: 'application/json', path: '$.name', placeholder: 'NAME' }
        ],
        '*.md': [
          { context: 'text/markdown#heading', selector: 'h1', placeholder: 'TITLE' }
        ]
      }
    };

    await generateConfigFile(projectDir, config);

    const converter = new Converter({ projectPath: projectDir, yes: true });
    await converter.convert();

    // Should succeed without crashing
    const templateExists = await fileExists(path.join(projectDir, 'template.json'));
    assert(templateExists, 'Should handle empty files gracefully');
  });

  it('should handle deeply nested JSON structures', async () => {
    const projectDir = path.join(tempDir, 'nested-json');
    await fs.mkdir(projectDir, { recursive: true });

    const nestedData = {
      app: {
        config: {
          database: {
            host: 'localhost',
            port: 5432,
            credentials: {
              username: 'admin',
              password: 'secret'
            }
          },
          features: ['auth', 'logging', 'metrics']
        }
      }
    };

    await fs.writeFile(path.join(projectDir, 'config.json'),
      JSON.stringify(nestedData, null, 2));

    const config = {
      rules: {
        'complex.json': [
          { context: 'application/json', path: '$.app.config.database.host', placeholder: 'DB_HOST' },
          { context: 'application/json', path: '$.app.config.database.credentials.username', placeholder: 'DB_USER' }
        ]
      }
    };

    await generateConfigFile(projectDir, config);

    const converter = new Converter({ projectPath: projectDir, yes: true });
    await converter.convert();

    const templateJson = JSON.parse(await fs.readFile(path.join(projectDir, 'template.json'), 'utf8'));
    assert(templateJson.placeholders.DB_HOST, 'Should extract deeply nested values');
    assert(templateJson.placeholders.DB_USER, 'Should extract nested credentials');
  });

  it('should handle files with special characters and encoding', async () => {
    const projectDir = path.join(tempDir, 'special-chars');
    await fs.mkdir(projectDir, { recursive: true });

    // Create files with special characters
    await fs.writeFile(path.join(projectDir, 'unicode.json'),
      JSON.stringify({ name: 'tëst naïve résumé', description: 'café' }, null, 2));

    await fs.writeFile(path.join(projectDir, 'special.md'),
      '# Tëst naïve résumé\n\nCafé & naïve content with <tags> & "quotes".');

    const config = {
      rules: {
        'unicode.json': [
          { context: 'application/json', path: '$.name', placeholder: 'UNICODE_NAME' }
        ],
        'special.md': [
          { context: 'text/markdown#heading', selector: 'h1', placeholder: 'SPECIAL_TITLE' }
        ]
      }
    };

    await generateConfigFile(projectDir, config);

    const converter = new Converter({ projectPath: projectDir, yes: true });
    await converter.convert();

    const templateJson = JSON.parse(await fs.readFile(path.join(projectDir, 'template.json'), 'utf8'));
    assert(templateJson.placeholders.UNICODE_NAME, 'Should handle Unicode characters');
    assert(templateJson.placeholders.SPECIAL_TITLE, 'Should handle special characters in markdown');
  });

  it('should prevent path traversal attacks', async () => {
    const projectDir = path.join(tempDir, 'path-traversal');
    await fs.mkdir(projectDir, { recursive: true });

    // Create config with path traversal attempts
    const maliciousConfig = {
      rules: {
        '../../../etc/passwd': [
          { context: 'application/json', path: '$.name', placeholder: 'MALICIOUS' }
        ],
        '/absolute/path.json': [
          { context: 'application/json', path: '$.name', placeholder: 'ABSOLUTE' }
        ]
      }
    };

    await generateConfigFile(projectDir, maliciousConfig);

    const converter = new Converter({ projectPath: projectDir, yes: true });
    await converter.convert();

    // Should not access files outside project directory
    // The converter should skip these malicious paths
    const templateJson = JSON.parse(await fs.readFile(path.join(projectDir, 'template.json'), 'utf8'));
    assert(!templateJson.placeholders.MALICIOUS, 'Should not process path traversal attempts');
    assert(!templateJson.placeholders.ABSOLUTE, 'Should not process absolute paths');
  });

  it('should handle very large files', async () => {
    const projectDir = path.join(tempDir, 'large-files');
    await fs.mkdir(projectDir, { recursive: true });

    // Create a large JSON file (but not too large for testing)
    const largeData = { data: 'x'.repeat(1000) };
    await fs.writeFile(path.join(projectDir, 'large.json'),
      JSON.stringify(largeData, null, 2));

    const config = {
      rules: {
        'large.json': [
          { context: 'application/json', path: '$.data', placeholder: 'LARGE_DATA' }
        ]
      }
    };

    await generateConfigFile(projectDir, config);

    const converter = new Converter({ projectPath: projectDir, yes: true });

    const startTime = performance.now();
    await converter.convert();
    const endTime = performance.now();
    const convertTime = endTime - startTime;

    console.log(`Large file conversion time: ${convertTime.toFixed(2)}ms`);
    assert(convertTime < 2000, `Large file processing should be reasonable (< 2000ms), was ${convertTime}ms`);

    const templateJson = JSON.parse(await fs.readFile(path.join(projectDir, 'template.json'), 'utf8'));
    assert(templateJson.placeholders.LARGE_DATA, 'Should handle large files');
  });

  it('should handle concurrent conversions safely', async () => {
    const project1Dir = path.join(tempDir, 'concurrent1');
    const project2Dir = path.join(tempDir, 'concurrent2');

    await fs.mkdir(project1Dir, { recursive: true });
    await fs.mkdir(project2Dir, { recursive: true });

    // Create identical projects
    for (const dir of [project1Dir, project2Dir]) {
      await fs.writeFile(path.join(dir, 'package.json'),
        JSON.stringify({ name: 'concurrent-test', version: '1.0.0' }, null, 2));

      const config = {
        rules: {
          'package.json': [
            { context: 'application/json', path: '$.name', placeholder: 'NAME' }
          ]
        }
      };
      await generateConfigFile(dir, config);
    }

    // Run conversions concurrently
    const converter1 = new Converter({ projectPath: project1Dir, yes: true });
    const converter2 = new Converter({ projectPath: project2Dir, yes: true });

    await Promise.all([
      converter1.convert(),
      converter2.convert()
    ]);

    // Both should succeed
    const template1Exists = await fileExists(path.join(project1Dir, 'template.json'));
    const template2Exists = await fileExists(path.join(project2Dir, 'template.json'));

    assert(template1Exists, 'First concurrent conversion should succeed');
    assert(template2Exists, 'Second concurrent conversion should succeed');
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
