#!/usr/bin/env node

/**
 * Layer 2 Tests: template-ignore.mjs - Template artifact filtering logic
 *
 * Tests ignore set creation and filtering in isolation without Node.js imports
 * Focus: createTemplateIgnoreSet, shouldIgnoreTemplateEntry, stripIgnoredFromTree
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createTemplateIgnoreSet,
  shouldIgnoreTemplateEntry,
  stripIgnoredFromTree
} from '../../../lib/template/index.mts';

describe('Template Ignore Logic', () => {
  describe('createTemplateIgnoreSet', () => {
    it('returns default set when no options provided', () => {
      const ignoreSet = createTemplateIgnoreSet();

      // Test BEHAVIOR: the set contains expected entries
      // NOT implementation: instanceof Set (which tests internal data structure choice)
      assert.ok(ignoreSet.has('.git'));
      assert.ok(ignoreSet.has('.template-undo.json'));
      assert.ok(ignoreSet.has('.templatize.json'));
      assert.ok(ignoreSet.has('node_modules'));
      assert.ok(ignoreSet.has('template.json'));
    });

    it('returns default set when empty options object provided', () => {
      const ignoreSet = createTemplateIgnoreSet({});

      assert.ok(ignoreSet.has('.git'));
      assert.ok(ignoreSet.has('node_modules'));
    });

    it('adds authorAssetsDir to ignore set', () => {
      const ignoreSet = createTemplateIgnoreSet({
        authorAssetsDir: '__author__'
      });

      assert.ok(ignoreSet.has('.git'));
      assert.ok(ignoreSet.has('__author__'));
    });

    it('trims whitespace from authorAssetsDir', () => {
      const ignoreSet = createTemplateIgnoreSet({
        authorAssetsDir: '  __author__  '
      });

      assert.ok(ignoreSet.has('__author__'));
      assert.ok(!ignoreSet.has('  __author__  '));
    });

    it('ignores empty authorAssetsDir after trimming', () => {
      const ignoreSet = createTemplateIgnoreSet({
        authorAssetsDir: '   '
      });

      // Should return default set unchanged
      assert.ok(ignoreSet.has('.git'));
      assert.strictEqual(ignoreSet.size, 5); // Only base artifacts
    });

    it('ignores non-string authorAssetsDir', () => {
      const ignoreSet = createTemplateIgnoreSet({
        authorAssetsDir: 123
      });

      assert.strictEqual(ignoreSet.size, 5); // Only base artifacts
    });

    it('adds extra entries to ignore set', () => {
      const ignoreSet = createTemplateIgnoreSet({
        extra: ['.DS_Store', 'Thumbs.db']
      });

      assert.ok(ignoreSet.has('.git'));
      assert.ok(ignoreSet.has('.DS_Store'));
      assert.ok(ignoreSet.has('Thumbs.db'));
    });

    it('trims whitespace from extra entries', () => {
      const ignoreSet = createTemplateIgnoreSet({
        extra: ['  .DS_Store  ', '  Thumbs.db  ']
      });

      assert.ok(ignoreSet.has('.DS_Store'));
      assert.ok(ignoreSet.has('Thumbs.db'));
      assert.ok(!ignoreSet.has('  .DS_Store  '));
    });

    it('ignores empty extra entries after trimming', () => {
      const ignoreSet = createTemplateIgnoreSet({
        extra: ['valid', '   ', '', 'another']
      });

      assert.ok(ignoreSet.has('valid'));
      assert.ok(ignoreSet.has('another'));
      assert.ok(!ignoreSet.has('   '));
      assert.ok(!ignoreSet.has(''));
    });

    it('ignores non-string extra entries', () => {
      const ignoreSet = createTemplateIgnoreSet({
        extra: ['valid', 123, null, undefined, {}, [], 'another']
      });

      assert.ok(ignoreSet.has('valid'));
      assert.ok(ignoreSet.has('another'));
      assert.strictEqual(Array.from(ignoreSet).filter(e => typeof e === 'number').length, 0);
    });

    it('combines authorAssetsDir and extra entries', () => {
      const ignoreSet = createTemplateIgnoreSet({
        authorAssetsDir: '__author__',
        extra: ['.DS_Store', 'coverage']
      });

      assert.ok(ignoreSet.has('.git'));
      assert.ok(ignoreSet.has('__author__'));
      assert.ok(ignoreSet.has('.DS_Store'));
      assert.ok(ignoreSet.has('coverage'));
    });

    it('handles non-array extra option gracefully', () => {
      const ignoreSet = createTemplateIgnoreSet({
        extra: 'not-an-array'
      });

      assert.strictEqual(ignoreSet.size, 5); // Only base artifacts
    });

    it('returns default set when all additions are invalid', () => {
      const ignoreSet = createTemplateIgnoreSet({
        authorAssetsDir: '   ',
        extra: ['', '  ', 123, null]
      });

      assert.strictEqual(ignoreSet.size, 5); // Only base artifacts
    });
  });

  describe('shouldIgnoreTemplateEntry', () => {
    it('returns true for default ignored entries', () => {
      assert.strictEqual(shouldIgnoreTemplateEntry('.git'), true);
      assert.strictEqual(shouldIgnoreTemplateEntry('.template-undo.json'), true);
      assert.strictEqual(shouldIgnoreTemplateEntry('.templatize.json'), true);
      assert.strictEqual(shouldIgnoreTemplateEntry('node_modules'), true);
      assert.strictEqual(shouldIgnoreTemplateEntry('template.json'), true);
    });

    it('returns false for non-ignored entries', () => {
      assert.strictEqual(shouldIgnoreTemplateEntry('src'), false);
      assert.strictEqual(shouldIgnoreTemplateEntry('README.md'), false);
      assert.strictEqual(shouldIgnoreTemplateEntry('package.json'), false);
    });

    it('returns false for non-string input', () => {
      assert.strictEqual(shouldIgnoreTemplateEntry(null), false);
      assert.strictEqual(shouldIgnoreTemplateEntry(undefined), false);
      assert.strictEqual(shouldIgnoreTemplateEntry(123), false);
      assert.strictEqual(shouldIgnoreTemplateEntry({}), false);
      assert.strictEqual(shouldIgnoreTemplateEntry([]), false);
    });

    it('uses custom ignore set when provided', () => {
      const customSet = new Set(['.git', 'custom-ignore']);

      assert.strictEqual(shouldIgnoreTemplateEntry('.git', customSet), true);
      assert.strictEqual(shouldIgnoreTemplateEntry('custom-ignore', customSet), true);
      assert.strictEqual(shouldIgnoreTemplateEntry('node_modules', customSet), false); // Not in custom set
    });

    it('is case-sensitive', () => {
      assert.strictEqual(shouldIgnoreTemplateEntry('.GIT'), false);
      assert.strictEqual(shouldIgnoreTemplateEntry('NODE_MODULES'), false);
    });
  });

  describe('stripIgnoredFromTree', () => {
    it('removes ignored entries from tree text (exact match after trim)', () => {
      const tree = `.git
src/
index.js
node_modules
README.md`;

      const result = stripIgnoredFromTree(tree);

      assert.ok(result.includes('src/'));
      assert.ok(result.includes('README.md'));
      assert.ok(!result.includes('.git'));
      assert.ok(!result.includes('node_modules'));
    });

    it('removes entries ending with space + ignored name', () => {
      const tree = `project
├── .git
├── src/
└── README.md`;

      const result = stripIgnoredFromTree(tree);

      assert.ok(result.includes('project'));
      assert.ok(result.includes('src/'));
      assert.ok(result.includes('README.md'));
      assert.ok(!result.includes('.git'));
    });

    it('removes entries ending with forward slash + ignored name', () => {
      const tree = `project/
project/src/
project/.git
project/README.md`;

      const result = stripIgnoredFromTree(tree);

      assert.ok(result.includes('project/src/'));
      assert.ok(result.includes('project/README.md'));
      assert.ok(!result.includes('project/.git'));
    });

    it('removes entries ending with backslash + ignored name', () => {
      const tree = `project\\
project\\src\\
project\\.git
project\\README.md`;

      const result = stripIgnoredFromTree(tree);

      assert.ok(result.includes('project\\src\\'));
      assert.ok(result.includes('project\\README.md'));
      assert.ok(!result.includes('project\\.git'));
    });

    it('returns empty string for empty input', () => {
      assert.strictEqual(stripIgnoredFromTree(''), '');
    });

    it('returns input unchanged for non-string input', () => {
      assert.strictEqual(stripIgnoredFromTree(null), null);
      assert.strictEqual(stripIgnoredFromTree(undefined), undefined);
      assert.strictEqual(stripIgnoredFromTree(123), 123);
    });

    it('uses custom ignore set when provided', () => {
      const tree = `.git
custom-ignore
src/
README.md`;
      const customSet = new Set(['custom-ignore']);

      const result = stripIgnoredFromTree(tree, customSet);

      assert.ok(result.includes('.git')); // Not in custom set
      assert.ok(result.includes('src/'));
      assert.ok(result.includes('README.md'));
      assert.ok(!result.includes('custom-ignore'));
    });

    it('handles entries with spaces in tree output', () => {
      const tree = `my folder/
├── .git
├── index.js
└── README.md`;

      const result = stripIgnoredFromTree(tree);

      assert.ok(result.includes('my folder/'));
      assert.ok(result.includes('index.js'));
      assert.ok(result.includes('README.md'));
      assert.ok(!result.includes('.git'));
    });

    it('removes template.json from tree', () => {
      const tree = `src/
index.js
template.json
README.md`;

      const result = stripIgnoredFromTree(tree);

      assert.ok(result.includes('src/'));
      assert.ok(result.includes('index.js'));
      assert.ok(result.includes('README.md'));
      assert.ok(!result.includes('template.json'));
    });

    it('preserves lines that partially match ignored entries', () => {
      const tree = `src/
  .github/
  index.js
README.md`;

      const result = stripIgnoredFromTree(tree);

      // .github should be preserved (only .git is ignored)
      assert.ok(result.includes('.github/'));
      assert.ok(result.includes('src/'));
      assert.ok(result.includes('README.md'));
    });

    it('handles tree with mixed indentation', () => {
      const tree = `.git
src/
  index.js
node_modules
README.md`;

      const result = stripIgnoredFromTree(tree);

      assert.ok(result.includes('src/'));
      assert.ok(result.includes('index.js'));
      assert.ok(result.includes('README.md'));
      assert.ok(!result.includes('.git'));
      assert.ok(!result.includes('node_modules'));
    });

    it('trims final result', () => {
      const tree = `
.git
src/
node_modules
`;

      const result = stripIgnoredFromTree(tree);

      // Only src/ remains, .git and node_modules filtered
      assert.strictEqual(result.trim(), 'src/');
    });
  });

  describe('Integration Scenarios', () => {
    it('filters template tree with custom author assets', () => {
      const tree = `project/
├── .git
├── __author__
├── src/
├── node_modules
├── template.json
└── README.md`;

      const ignoreSet = createTemplateIgnoreSet({
        authorAssetsDir: '__author__'
      });

      const result = stripIgnoredFromTree(tree, ignoreSet);

      assert.ok(result.includes('project/'));
      assert.ok(result.includes('src/'));
      assert.ok(result.includes('README.md'));
      assert.ok(!result.includes('.git'));
      assert.ok(!result.includes('__author__'));
      assert.ok(!result.includes('node_modules'));
      assert.ok(!result.includes('template.json'));
    });

    it('filters tree with OS-specific artifacts', () => {
      const tree = `project/
├── .git
├── .DS_Store
├── Thumbs.db
├── src/
└── README.md`;

      const ignoreSet = createTemplateIgnoreSet({
        extra: ['.DS_Store', 'Thumbs.db']
      });

      const result = stripIgnoredFromTree(tree, ignoreSet);

      assert.ok(result.includes('project/'));
      assert.ok(result.includes('src/'));
      assert.ok(result.includes('README.md'));
      assert.ok(!result.includes('.git'));
      assert.ok(!result.includes('.DS_Store'));
      assert.ok(!result.includes('Thumbs.db'));
    });
  });
});
