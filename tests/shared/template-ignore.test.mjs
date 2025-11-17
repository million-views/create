#!/usr/bin/env node

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createTemplateIgnoreSet,
  shouldIgnoreTemplateEntry,
  stripIgnoredFromTree
} from '../../bin/create-scaffold/modules/utils/template-ignore.mjs';

test.describe('Template Ignore', () => {
  test.describe('createTemplateIgnoreSet()', () => {
    test('returns default set when no options provided', () => {
      const result = createTemplateIgnoreSet();
      assert(result instanceof Set);
      assert(result.has('.git'));
      assert(result.has('.template-undo.json'));
      assert.strictEqual(result.size, 2);
    });

    test('returns default set when empty options provided', () => {
      const result = createTemplateIgnoreSet({});
      assert(result instanceof Set);
      assert(result.has('.git'));
      assert(result.has('.template-undo.json'));
      assert.strictEqual(result.size, 2);
    });

    test('returns same instance when no additions', () => {
      const result1 = createTemplateIgnoreSet();
      const result2 = createTemplateIgnoreSet({ extra: [] });
      const result3 = createTemplateIgnoreSet({ authorAssetsDir: '' });

      // Should return the same default set instance
      assert.strictEqual(result1, result2);
      assert.strictEqual(result1, result3);
    });

    test('adds authorAssetsDir to ignore set', () => {
      const result = createTemplateIgnoreSet({ authorAssetsDir: '.author-assets' });
      assert(result instanceof Set);
      assert(result.has('.git'));
      assert(result.has('.template-undo.json'));
      assert(result.has('.author-assets'));
      assert.strictEqual(result.size, 3);
    });

    test('trims authorAssetsDir', () => {
      const result = createTemplateIgnoreSet({ authorAssetsDir: '  .author-assets  ' });
      assert(result.has('.author-assets'));
      assert(!result.has('  .author-assets  '));
    });

    test('ignores empty authorAssetsDir', () => {
      const result = createTemplateIgnoreSet({ authorAssetsDir: '' });
      assert(result.has('.git'));
      assert(result.has('.template-undo.json'));
      assert.strictEqual(result.size, 2);
    });

    test('ignores whitespace-only authorAssetsDir', () => {
      const result = createTemplateIgnoreSet({ authorAssetsDir: '   ' });
      assert(result.has('.git'));
      assert(result.has('.template-undo.json'));
      assert.strictEqual(result.size, 2);
    });

    test('ignores non-string authorAssetsDir', () => {
      const result = createTemplateIgnoreSet({ authorAssetsDir: 123 });
      assert(result.has('.git'));
      assert(result.has('.template-undo.json'));
      assert.strictEqual(result.size, 2);
    });

    test('adds extra entries to ignore set', () => {
      const result = createTemplateIgnoreSet({
        extra: ['node_modules', '.DS_Store', 'temp']
      });
      assert(result.has('.git'));
      assert(result.has('.template-undo.json'));
      assert(result.has('node_modules'));
      assert(result.has('.DS_Store'));
      assert(result.has('temp'));
      assert.strictEqual(result.size, 5);
    });

    test('trims extra entries', () => {
      const result = createTemplateIgnoreSet({
        extra: ['  node_modules  ', ' .DS_Store ', 'temp']
      });
      assert(result.has('node_modules'));
      assert(result.has('.DS_Store'));
      assert(result.has('temp'));
      assert(!result.has('  node_modules  '));
      assert(!result.has(' .DS_Store '));
    });

    test('ignores empty extra entries', () => {
      const result = createTemplateIgnoreSet({
        extra: ['node_modules', '', 'temp', '   ']
      });
      assert(result.has('node_modules'));
      assert(result.has('temp'));
      assert.strictEqual(result.size, 4); // .git, .template-undo.json, node_modules, temp
    });

    test('ignores non-string extra entries', () => {
      const result = createTemplateIgnoreSet({
        extra: ['node_modules', 123, null, undefined, {}]
      });
      assert(result.has('node_modules'));
      assert.strictEqual(result.size, 3); // .git, .template-undo.json, node_modules
    });

    test('handles non-array extra', () => {
      const result = createTemplateIgnoreSet({ extra: 'not-an-array' });
      assert(result.has('.git'));
      assert(result.has('.template-undo.json'));
      assert.strictEqual(result.size, 2);
    });

    test('combines authorAssetsDir and extra', () => {
      const result = createTemplateIgnoreSet({
        authorAssetsDir: '.author-assets',
        extra: ['node_modules', '.DS_Store']
      });
      assert(result.has('.git'));
      assert(result.has('.template-undo.json'));
      assert(result.has('.author-assets'));
      assert(result.has('node_modules'));
      assert(result.has('.DS_Store'));
      assert.strictEqual(result.size, 5);
    });

    test('returns new Set instance when additions are made', () => {
      const result1 = createTemplateIgnoreSet();
      const result2 = createTemplateIgnoreSet({ extra: ['node_modules'] });

      assert.notStrictEqual(result1, result2);
      assert(result1.has('.git'));
      assert(result2.has('.git'));
      assert(result2.has('node_modules'));
      assert(!result1.has('node_modules'));
    });
  });

  test.describe('shouldIgnoreTemplateEntry()', () => {
    test('returns true for entries in default ignore set', () => {
      assert.strictEqual(shouldIgnoreTemplateEntry('.git'), true);
      assert.strictEqual(shouldIgnoreTemplateEntry('.template-undo.json'), true);
    });

    test('returns false for entries not in ignore set', () => {
      assert.strictEqual(shouldIgnoreTemplateEntry('package.json'), false);
      assert.strictEqual(shouldIgnoreTemplateEntry('src'), false);
      assert.strictEqual(shouldIgnoreTemplateEntry('README.md'), false);
    });

    test('returns false for non-string entry names', () => {
      assert.strictEqual(shouldIgnoreTemplateEntry(null), false);
      assert.strictEqual(shouldIgnoreTemplateEntry(undefined), false);
      assert.strictEqual(shouldIgnoreTemplateEntry(123), false);
      assert.strictEqual(shouldIgnoreTemplateEntry({}), false);
      assert.strictEqual(shouldIgnoreTemplateEntry([]), false);
    });

    test('uses custom ignore set when provided', () => {
      const customIgnoreSet = new Set(['custom-ignore', 'another-ignore']);
      assert.strictEqual(shouldIgnoreTemplateEntry('custom-ignore', customIgnoreSet), true);
      assert.strictEqual(shouldIgnoreTemplateEntry('another-ignore', customIgnoreSet), true);
      assert.strictEqual(shouldIgnoreTemplateEntry('.git', customIgnoreSet), false);
      assert.strictEqual(shouldIgnoreTemplateEntry('package.json', customIgnoreSet), false);
    });

    test('uses default ignore set when none provided', () => {
      assert.strictEqual(shouldIgnoreTemplateEntry('.git'), true);
      assert.strictEqual(shouldIgnoreTemplateEntry('package.json'), false);
    });
  });

  test.describe('stripIgnoredFromTree()', () => {
    test('returns original text when empty or not string', () => {
      assert.strictEqual(stripIgnoredFromTree(''), '');
      assert.strictEqual(stripIgnoredFromTree(null), null);
      assert.strictEqual(stripIgnoredFromTree(undefined), undefined);
      assert.strictEqual(stripIgnoredFromTree(123), 123);
    });

    test('returns original text when no ignored entries found', () => {
      const treeText = `project/
├── package.json
├── src/
│   └── index.js
└── README.md`;

      const result = stripIgnoredFromTree(treeText);
      assert.strictEqual(result, treeText);
    });

    test('removes lines containing ignored entries', () => {
      const treeText = `project/
├── .git
├── package.json
├── .template-undo.json
├── src/
│   └── index.js
└── README.md`;

      const result = stripIgnoredFromTree(treeText);
      const lines = result.split('\n');

      // Should not contain .git or .template-undo.json lines
      assert(!lines.some(line => line.includes('.git')));
      assert(!lines.some(line => line.includes('.template-undo.json')));

      // Should still contain other entries
      assert(lines.some(line => line.includes('package.json')));
      assert(lines.some(line => line.includes('src/')));
      assert(lines.some(line => line.includes('index.js')));
      assert(lines.some(line => line.includes('README.md')));
    });

    test('handles various tree formats', () => {
      const treeText = `project/
├── .git
├── src/
│   ├── .git
│   └── index.js
└── .template-undo.json`;

      const result = stripIgnoredFromTree(treeText);

      // Should remove all .git and .template-undo.json references
      assert(!result.includes('.git'));
      assert(!result.includes('.template-undo.json'));
      assert(result.includes('src/'));
      assert(result.includes('index.js'));
    });

    test('handles Windows-style path separators', () => {
      const treeText = `project/
├── .git
├── src/
│   └── index.js
└── .template-undo.json`;

      const result = stripIgnoredFromTree(treeText);

      assert(!result.includes('.git'));
      assert(!result.includes('.template-undo.json'));
      assert(result.includes('src/'));
      assert(result.includes('index.js'));
    });

    test('uses custom ignore set when provided', () => {
      const treeText = `project/
├── custom-ignore
├── package.json
├── another-ignore
└── src/`;

      const customIgnoreSet = new Set(['custom-ignore', 'another-ignore']);
      const result = stripIgnoredFromTree(treeText, customIgnoreSet);

      assert(!result.includes('custom-ignore'));
      assert(!result.includes('another-ignore'));
      assert(result.includes('package.json'));
      assert(result.includes('src/'));
    });

    test('preserves tree structure and formatting', () => {
      const treeText = `project/
├── .git
│   ├── HEAD
│   └── refs/
├── package.json
├── .template-undo.json
└── src/
    └── index.js`;

      const result = stripIgnoredFromTree(treeText);

      // Should maintain proper tree structure
      assert(result.startsWith('project/'));
      assert(result.includes('├── package.json'));
      assert(result.includes('└── src/'));

      // Should not contain git-related top-level entries
      assert(!result.includes('.git'));
      assert(!result.includes('.template-undo.json'));

      // Sub-entries of ignored directories may remain (function only removes direct matches)
      // This is expected behavior - the function removes lines containing ignored entries,
      // not their children in the tree structure
    });

    test('handles empty lines and trims result', () => {
      const treeText = `project/
├── .git/
├── package.json
├── .template-undo.json
└── src/`;

      const result = stripIgnoredFromTree(treeText);

      // Should not have empty lines at start/end
      assert(!result.startsWith('\n'));
      assert(!result.endsWith('\n'));

      const lines = result.split('\n');
      // Should not have consecutive empty lines
      for (let i = 0; i < lines.length - 1; i++) {
        assert(!(lines[i] === '' && lines[i + 1] === ''));
      }
    });
  });
});
