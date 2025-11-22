#!/usr/bin/env node

/**
 * Unit tests for JSON templatization processor
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { processJSONFile } from '../lib/templatize-json.mjs';

// Test fixtures
const testFixtures = {
  simpleJSON: `{
  "name": "My App",
  "version": "1.0.0",
  "description": "A sample application",
  "author": "John Doe"
}`,

  nestedJSON: `{
  "project": {
    "name": "Sample Project",
    "metadata": {
      "title": "Welcome to My Project",
      "description": "This is a comprehensive example"
    }
  },
  "config": {
    "api": {
      "baseUrl": "https://api.example.com",
      "timeout": 5000
    }
  }
}`,

  arrayJSON: `{
  "items": [
    {
      "name": "Item 1",
      "description": "First item description"
    },
    {
      "name": "Item 2",
      "description": "Second item description"
    }
  ],
  "categories": [
    "electronics",
    "books",
    "clothing"
  ]
}`,

  complexJSON: `{
  "app": {
    "title": "My Application",
    "subtitle": "Built with modern tools",
    "features": [
      {
        "name": "Feature One",
        "description": "This feature does something amazing"
      },
      {
        "name": "Feature Two",
        "description": "Another great feature"
      }
    ]
  },
  "settings": {
    "theme": {
      "primaryColor": "#007bff",
      "secondaryColor": "#6c757d"
    }
  }
}`
};

// Test patterns for JSON templatization
const testPatterns = [
  {
    context: 'application/json',
    path: '$.name',
    placeholder: 'PROJECT_NAME',
    allowMultiple: false
  },
  {
    context: 'application/json',
    path: '$.description',
    placeholder: 'PROJECT_DESCRIPTION',
    allowMultiple: false
  },
  {
    context: 'application/json',
    path: '$.project.metadata.title',
    placeholder: 'CONTENT_TITLE',
    allowMultiple: false
  },
  {
    context: 'application/json',
    path: '$.project.metadata.description',
    placeholder: 'CONTENT_DESCRIPTION',
    allowMultiple: false
  },
  {
    context: 'application/json',
    path: '$.config.api.baseUrl',
    placeholder: 'API_BASE_URL',
    allowMultiple: false
  },
  {
    context: 'application/json',
    path: '$.items[*].name',
    placeholder: 'ITEM_NAME',
    allowMultiple: true
  },
  {
    context: 'application/json',
    path: '$.items[*].description',
    placeholder: 'ITEM_DESCRIPTION',
    allowMultiple: true
  },
  {
    context: 'application/json',
    path: '$.categories[*]',
    placeholder: 'CATEGORY_NAME',
    allowMultiple: true
  },
  {
    context: 'application/json',
    path: '$.app.title',
    placeholder: 'APP_TITLE',
    allowMultiple: false
  },
  {
    context: 'application/json',
    path: '$.app.subtitle',
    placeholder: 'APP_SUBTITLE',
    allowMultiple: false
  },
  {
    context: 'application/json',
    path: '$.app.features[*].name',
    placeholder: 'FEATURE_NAME',
    allowMultiple: true
  },
  {
    context: 'application/json',
    path: '$.app.features[*].description',
    placeholder: 'FEATURE_DESCRIPTION',
    allowMultiple: true
  },
  {
    context: 'application/json',
    path: '$.settings.theme.primaryColor',
    placeholder: 'THEME_PRIMARY_COLOR',
    allowMultiple: false
  }
];

test('JSON Processor - Basic functionality', async (t) => {
  await t.test('should process simple JSON with string values', async () => {
    const replacements = await processJSONFile('test.json', testFixtures.simpleJSON, testPatterns);

    const nameReplacements = replacements.filter(r => r.placeholder === 'PROJECT_NAME');
    const descReplacements = replacements.filter(r => r.placeholder === 'PROJECT_DESCRIPTION');

    assert.strictEqual(nameReplacements.length, 1, 'Should find project name');
    assert.strictEqual(descReplacements.length, 1, 'Should find project description');

    assert.strictEqual(nameReplacements[0].originalText, 'My App');
    assert.strictEqual(descReplacements[0].originalText, 'A sample application');
  });

  await t.test('should process nested JSON structures', async () => {
    const replacements = await processJSONFile('test.json', testFixtures.nestedJSON, testPatterns);

    const titleReplacements = replacements.filter(r => r.placeholder === 'CONTENT_TITLE');
    const descReplacements = replacements.filter(r => r.placeholder === 'CONTENT_DESCRIPTION');
    const urlReplacements = replacements.filter(r => r.placeholder === 'API_BASE_URL');

    assert.strictEqual(titleReplacements.length, 1, 'Should find nested title');
    assert.strictEqual(descReplacements.length, 1, 'Should find nested description');
    assert.strictEqual(urlReplacements.length, 1, 'Should find API base URL');

    assert.strictEqual(titleReplacements[0].originalText, 'Welcome to My Project');
    assert.strictEqual(descReplacements[0].originalText, 'This is a comprehensive example');
    assert.strictEqual(urlReplacements[0].originalText, 'https://api.example.com');
  });

  await t.test('should handle array elements with wildcards', async () => {
    const replacements = await processJSONFile('test.json', testFixtures.arrayJSON, testPatterns);

    const itemNames = replacements.filter(r => r.placeholder === 'ITEM_NAME');
    const itemDescriptions = replacements.filter(r => r.placeholder === 'ITEM_DESCRIPTION');
    const categories = replacements.filter(r => r.placeholder === 'CATEGORY_NAME');

    assert.strictEqual(itemNames.length, 2, 'Should find all item names');
    assert.strictEqual(itemDescriptions.length, 2, 'Should find all item descriptions');
    assert.strictEqual(categories.length, 3, 'Should find all categories');

    assert.strictEqual(itemNames[0].originalText, 'Item 1');
    assert.strictEqual(itemNames[1].originalText, 'Item 2');
    assert.strictEqual(categories[0].originalText, 'electronics');
    assert.strictEqual(categories[1].originalText, 'books');
    assert.strictEqual(categories[2].originalText, 'clothing');
  });

  await t.test('should respect allowMultiple flag', async () => {
    const replacements = await processJSONFile('test.json', testFixtures.complexJSON, testPatterns);

    // allowMultiple: false patterns
    const titleReplacements = replacements.filter(r => r.placeholder === 'APP_TITLE');
    const primaryColorReplacements = replacements.filter(r => r.placeholder === 'THEME_PRIMARY_COLOR');

    assert.strictEqual(titleReplacements.length, 1, 'Should find only one app title');
    assert.strictEqual(primaryColorReplacements.length, 1, 'Should find only one primary color');

    // allowMultiple: true patterns
    const featureNames = replacements.filter(r => r.placeholder === 'FEATURE_NAME');
    const featureDescriptions = replacements.filter(r => r.placeholder === 'FEATURE_DESCRIPTION');

    assert.strictEqual(featureNames.length, 2, 'Should find all feature names');
    assert.strictEqual(featureDescriptions.length, 2, 'Should find all feature descriptions');
  });

  await t.test('should handle malformed JSON gracefully', async () => {
    const malformedJSON = `{
  "name": "Test",
  "incomplete":
}`;

    const replacements = await processJSONFile('test.json', malformedJSON, testPatterns);
    assert.strictEqual(replacements.length, 0, 'Should return empty array for malformed JSON');
  });

  await t.test('should return empty array for files without matches', async () => {
    const noMatchJSON = `{
  "unrelated": "data",
  "other": 123
}`;

    const replacements = await processJSONFile('test.json', noMatchJSON, testPatterns);
    assert.strictEqual(replacements.length, 0, 'Should return empty array for no matches');
  });

  await t.test('should handle empty JSON objects', async () => {
    const replacements = await processJSONFile('test.json', '{}', testPatterns);
    assert.strictEqual(replacements.length, 0, 'Should handle empty JSON');
  });
});

test('JSON Processor - Edge cases', async (t) => {
  await t.test('should handle complex nested structures', async () => {
    const replacements = await processJSONFile('test.json', testFixtures.complexJSON, testPatterns);

    const appTitle = replacements.filter(r => r.placeholder === 'APP_TITLE');
    const appSubtitle = replacements.filter(r => r.placeholder === 'APP_SUBTITLE');

    assert.strictEqual(appTitle.length, 1, 'Should find app title in complex structure');
    assert.strictEqual(appSubtitle.length, 1, 'Should find app subtitle in complex structure');

    assert.strictEqual(appTitle[0].originalText, 'My Application');
    assert.strictEqual(appSubtitle[0].originalText, 'Built with modern tools');
  });

  await t.test('should handle mixed data types', async () => {
    const mixedJSON = `{
  "string": "text",
  "number": 42,
  "boolean": true,
  "null": null,
  "array": ["a", "b", "c"],
  "object": {"nested": "value"}
}`;

    const mixedPatterns = [
      {
        context: 'application/json',
        path: '$.string',
        placeholder: 'STRING_VALUE',
        allowMultiple: false
      },
      {
        context: 'application/json',
        path: '$.array[*]',
        placeholder: 'ARRAY_ITEM',
        allowMultiple: true
      },
      {
        context: 'application/json',
        path: '$.object.nested',
        placeholder: 'NESTED_VALUE',
        allowMultiple: false
      }
    ];

    const replacements = await processJSONFile('test.json', mixedJSON, mixedPatterns);

    const stringReplacements = replacements.filter(r => r.placeholder === 'STRING_VALUE');
    const arrayReplacements = replacements.filter(r => r.placeholder === 'ARRAY_ITEM');
    const nestedReplacements = replacements.filter(r => r.placeholder === 'NESTED_VALUE');

    assert.strictEqual(stringReplacements.length, 1, 'Should find string value');
    assert.strictEqual(arrayReplacements.length, 3, 'Should find all array items');
    assert.strictEqual(nestedReplacements.length, 1, 'Should find nested object value');

    assert.strictEqual(stringReplacements[0].originalText, 'text');
    assert.strictEqual(nestedReplacements[0].originalText, 'value');
  });

  await t.test('should handle deeply nested paths', async () => {
    const deepJSON = `{
  "level1": {
    "level2": {
      "level3": {
        "level4": {
          "target": "deep value"
        }
      }
    }
  }
}`;

    const patterns = [
      {
        context: 'application/json',
        path: '$.level1.level2.level3.level4.target',
        placeholder: 'DEEPLY_NESTED',
        allowMultiple: false
      }
    ];

    const replacements = await processJSONFile('test.json', deepJSON, patterns);

    assert.strictEqual(replacements.length, 1, 'Should find deeply nested value');
    assert.strictEqual(replacements[0].originalText, 'deep value');
  });
});

test('JSON Processor - JSONPath validation', async (t) => {
  await t.test('should handle invalid JSONPath gracefully', async () => {
    const invalidPathPattern = [
      {
        context: 'application/json',
        path: '$.invalid..path',
        placeholder: 'TEST',
        allowMultiple: false
      }
    ];

    const replacements = await processJSONFile('test.json', testFixtures.simpleJSON, invalidPathPattern);
    assert.strictEqual(replacements.length, 0, 'Should handle invalid JSONPath gracefully');
  });

  await t.test('should handle non-existent paths', async () => {
    const missingPathPatterns = [
      {
        context: 'application/json',
        path: '$.nonexistent.path',
        placeholder: 'MISSING',
        allowMultiple: false
      }
    ];

    const replacements = await processJSONFile('test.json', testFixtures.simpleJSON, missingPathPatterns);
    assert.strictEqual(replacements.length, 0, 'Should handle non-existent paths gracefully');
  });

  await t.test('should validate JSONPath syntax', async () => {
    // Test various JSONPath expressions that match string values
    const pathPatterns = [
      { selector: '$.name', expected: true }, // Matches string
      { selector: '$.items[0].name', expected: true }, // Matches string
      { selector: '$..name', expected: true }, // Matches strings
      { selector: '$.nonexistent', expected: false }, // No match
      { selector: 'invalid', expected: false }, // Invalid syntax
      { selector: '$.name..invalid', expected: false } // Invalid syntax
    ];

    for (const { selector, expected } of pathPatterns) {
      const testJSON = `{"name": "test", "items": [{"name": "item"}]}`;
      const patterns = [{
        context: 'application/json',
        path: selector,
        placeholder: 'TEST',
        allowMultiple: true
      }];

      try {
        const replacements = await processJSONFile('test.json', testJSON, patterns);
        const hasResults = replacements.length > 0;

        if (expected) {
          assert(hasResults, `JSONPath "${selector}" should find string matches`);
        } else {
          // For paths that don't match strings or have invalid syntax, expect no results
          assert(!hasResults, `JSONPath "${selector}" should not find matches or be invalid`);
        }
      } catch (error) {
        // If it throws an error, it should be for invalid syntax
        if (!expected) {
          assert(true, `Invalid JSONPath "${selector}" threw error as expected`);
        } else {
          assert.fail(`Valid JSONPath "${selector}" should not throw error: ${error.message}`);
        }
      }
    }
  });

  await t.test('should skip content within // @template-skip regions', async () => {
    // JSONC (JSON with comments) is now supported via comment stripping
    // This test verifies skip regions work correctly in JSONC files
    const skipRegionJSON = `{
  // @template-skip
  "name": "Don't templatize this",
  "description": "This should be skipped too",
  // @end-template-skip
  "title": "This should be templatized",
  "subtitle": "This should also be templatized"
}`;

    const patterns = [
      {
        context: 'application/json',
        path: '$.name',
        placeholder: 'NAME',
        allowMultiple: false
      },
      {
        context: 'application/json',
        path: '$.title',
        placeholder: 'APP_TITLE',
        allowMultiple: false
      }
    ];

    const replacements = await processJSONFile('test.json', skipRegionJSON, patterns);

    // Should find 1 replacement: "title" (name is in skip region)
    assert.strictEqual(replacements.length, 1, 'Should respect skip regions in JSONC');
    assert.strictEqual(replacements[0].placeholder, 'APP_TITLE', 'Should find title outside skip region');
  });
});
