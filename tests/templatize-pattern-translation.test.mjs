import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Converter } from '../bin/make-template/commands/convert/converter.js';

// OBSOLETE: This test file is no longer relevant after removing the translation layer.
// Patterns now use MIME-type context format directly without translation.
// Keeping file for reference but all tests are skipped.

describe.skip('Pattern Translation Tests (OBSOLETE)', () => {
  let converter;

  // Setup converter instance before each test
  it('should create converter instance', () => {
    converter = new Converter({ projectPath: '/tmp/test' });
    assert(converter instanceof Converter);
  });

  describe('JSON Processor Pattern Translation', () => {
    it('should translate json-value pattern correctly', () => {
      const patterns = [{
        type: 'json-value',
        path: '$.name',
        placeholder: 'PROJECT_NAME',
        allowMultiple: false
      }];

      const result = converter.translatePatternsForProcessor(patterns, 'json');

      assert.equal(result.length, 1);
      assert.deepEqual(result[0], {
        selector: '$.name',
        type: 'string-literal',
        context: 'json-value',
        placeholder: 'PROJECT_NAME',
        allowMultiple: false
      });
    });

    it('should handle allowMultiple flag for json-value', () => {
      const patterns = [{
        type: 'json-value',
        path: '$.dependencies.*',
        placeholder: 'DEPENDENCY',
        allowMultiple: true
      }];

      const result = converter.translatePatternsForProcessor(patterns, 'json');

      assert.equal(result[0].allowMultiple, true);
    });

    it('should default allowMultiple to false for json-value', () => {
      const patterns = [{
        type: 'json-value',
        path: '$.version',
        placeholder: 'VERSION'
      }];

      const result = converter.translatePatternsForProcessor(patterns, 'json');

      assert.equal(result[0].allowMultiple, false);
    });
  });

  describe('Markdown Processor Pattern Translation', () => {
    it('should translate markdown-heading pattern correctly', () => {
      const patterns = [{
        type: 'markdown-heading',
        level: 1,
        placeholder: 'TITLE',
        allowMultiple: false
      }];

      const result = converter.translatePatternsForProcessor(patterns, 'markdown');

      assert.equal(result.length, 1);
      assert.deepEqual(result[0], {
        selector: 'h1',
        type: 'string-literal',
        context: 'markdown',
        placeholder: 'TITLE',
        allowMultiple: false
      });
    });

    it('should handle different heading levels', () => {
      const patterns = [
        { type: 'markdown-heading', level: 2, placeholder: 'SUBTITLE' },
        { type: 'markdown-heading', level: 3, placeholder: 'SECTION' }
      ];

      const result = converter.translatePatternsForProcessor(patterns, 'markdown');

      assert.equal(result[0].selector, 'h2');
      assert.equal(result[1].selector, 'h3');
    });

    it('should translate markdown-paragraph first position', () => {
      const patterns = [{
        type: 'markdown-paragraph',
        position: 'first',
        placeholder: 'DESCRIPTION'
      }];

      const result = converter.translatePatternsForProcessor(patterns, 'markdown');

      assert.equal(result[0].selector, 'p:first-of-type');
    });

    it('should translate markdown-paragraph default position', () => {
      const patterns = [{
        type: 'markdown-paragraph',
        placeholder: 'CONTENT'
      }];

      const result = converter.translatePatternsForProcessor(patterns, 'markdown');

      assert.equal(result[0].selector, 'p');
    });
  });

  describe('HTML Processor Pattern Translation', () => {
    it('should translate html-text pattern correctly', () => {
      const patterns = [{
        type: 'html-text',
        selector: 'h1.title',
        placeholder: 'PAGE_TITLE'
      }];

      const result = converter.translatePatternsForProcessor(patterns, 'html');

      assert.deepEqual(result[0], {
        selector: 'h1.title',
        type: 'string-literal',
        context: 'html',
        placeholder: 'PAGE_TITLE',
        allowMultiple: false
      });
    });

    it('should translate html-attribute pattern correctly', () => {
      const patterns = [{
        context: 'text/html#attribute',
        selector: 'meta[name="description"]',
        placeholder: 'META_DESC'
      }];

      const result = converter.translatePatternsForProcessor(patterns, 'html');

      assert.deepEqual(result[0], {
        selector: 'meta[name="description"]',
        context: 'text/html#attribute',
        placeholder: 'META_DESC',
        allowMultiple: false
      });
    });
  });

  describe('JSX Processor Pattern Translation', () => {
    it('should translate string-literal pattern with context', () => {
      const patterns = [{
        context: 'text/jsx',
        selector: '.component-name',
        placeholder: 'COMPONENT_NAME'
      }];

      const result = converter.translatePatternsForProcessor(patterns, 'jsx');

      assert.deepEqual(result[0], {
        selector: '.component-name',
        context: 'text/jsx',
        placeholder: 'COMPONENT_NAME',
        allowMultiple: false
      });
    });

    it('should translate string-literal pattern with attribute', () => {
      const patterns = [{
        context: 'text/jsx#attribute',
        selector: 'Button[variant]',
        placeholder: 'BUTTON_VARIANT'
      }];

      const result = converter.translatePatternsForProcessor(patterns, 'jsx');

      assert.deepEqual(result[0], {
        selector: 'Button[variant]',
        context: 'text/jsx#attribute',
        placeholder: 'BUTTON_VARIANT',
        allowMultiple: false
      });
    });

    it('should handle allowMultiple for JSX patterns', () => {
      const patterns = [{
        context: 'text/jsx',
        selector: '.item',
        placeholder: 'ITEM',
        allowMultiple: true
      }];

      const result = converter.translatePatternsForProcessor(patterns, 'jsx');

      assert.equal(result[0].allowMultiple, true);
    });
  });

  describe('Multiple Pattern Translation', () => {
    it('should translate multiple patterns of different types', () => {
      const patterns = [
        { type: 'json-value', path: '$.name', placeholder: 'NAME' },
        { type: 'markdown-heading', level: 1, placeholder: 'TITLE' },
        { type: 'html-text', selector: 'h1', placeholder: 'HEADER' }
      ];

      const result = converter.translatePatternsForProcessor(patterns, 'json');
      const markdownResult = converter.translatePatternsForProcessor(patterns, 'markdown');
      const htmlResult = converter.translatePatternsForProcessor(patterns, 'html');

      // JSON processor should only translate json-value
      assert.equal(result.length, 3);
      assert.equal(result[0].type, 'string-literal');
      assert.equal(result[0].context, 'json-value');
      // Other patterns should be returned as-is with warnings
      assert.equal(result[1].type, 'markdown-heading');
      assert.equal(result[2].type, 'html-text');

      // Markdown processor should translate markdown-heading
      assert.equal(markdownResult[1].selector, 'h1');
      assert.equal(markdownResult[1].context, 'markdown');

      // HTML processor should translate html-text
      assert.equal(htmlResult[2].selector, 'h1');
      assert.equal(htmlResult[2].context, 'html');
    });
  });

  describe('Unknown Pattern Handling', () => {
    it('should return unknown patterns as-is with warning', () => {
      const patterns = [{
        type: 'unknown-type',
        customField: 'value',
        placeholder: 'UNKNOWN'
      }];

      const result = converter.translatePatternsForProcessor(patterns, 'json');

      assert.equal(result.length, 1);
      assert.equal(result[0].type, 'unknown-type');
      assert.equal(result[0].customField, 'value');
      assert.equal(result[0].placeholder, 'UNKNOWN');
    });

    it('should handle empty patterns array', () => {
      const result = converter.translatePatternsForProcessor([], 'json');
      assert.deepEqual(result, []);
    });

    it('should handle patterns without allowMultiple field', () => {
      const patterns = [{
        type: 'json-value',
        path: '$.name',
        placeholder: 'NAME'
        // allowMultiple not specified
      }];

      const result = converter.translatePatternsForProcessor(patterns, 'json');
      assert.equal(result[0].allowMultiple, false);
    });
  });

  describe('Edge Cases and Validation', () => {
    it('should handle malformed patterns gracefully', () => {
      const patterns = [
        null,
        undefined,
        {},
        { type: 'json-value' }, // missing required fields
        { type: 'markdown-heading', level: 'invalid' } // invalid level type
      ];

      const result = converter.translatePatternsForProcessor(patterns, 'json');

      assert.equal(result.length, 5);
      // Should not crash, return patterns as-is
    });

    it('should preserve additional fields in translated patterns', () => {
      const patterns = [{
        type: 'json-value',
        path: '$.name',
        placeholder: 'NAME',
        customField: 'customValue',
        metadata: { important: true }
      }];

      const result = converter.translatePatternsForProcessor(patterns, 'json');

      assert.equal(result[0].customField, 'customValue');
      assert.deepEqual(result[0].metadata, { important: true });
    });
  });
});
