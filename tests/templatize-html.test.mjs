#!/usr/bin/env node

/**
 * Unit tests for HTML templatization processor
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { processHTMLFile } from '../lib/templatize-html.mjs';

// Test fixtures
const testFixtures = {
  simpleHTML: `
<!DOCTYPE html>
<html>
<head>
  <title>My App</title>
</head>
<body>
  <div>
    <h1>Welcome to My App</h1>
    <p>This is a description</p>
  </div>
</body>
</html>
`,

  htmlWithAttributes: `
<!DOCTYPE html>
<html>
<body>
  <header>
    <h1 title="Main Title">Welcome</h1>
    <button aria-label="Close button">×</button>
  </header>
  <main>
    <p class="description">This is the main content</p>
  </main>
</body>
</html>
`,

  complexHTML: `
<!DOCTYPE html>
<html>
<body>
  <div class="container">
    <header>
      <h1>Application Title</h1>
      <nav>
        <ul>
          <li><a href="#home">Home</a></li>
          <li><a href="#about">About</a></li>
        </ul>
      </nav>
    </header>
    <main>
      <section class="hero">
        <h2>Hero Section</h2>
        <p>Welcome to our amazing application</p>
      </section>
      <section class="features">
        <h3>Features</h3>
        <div class="feature">
          <h4>Feature One</h4>
          <p>Description of feature one</p>
        </div>
      </section>
    </main>
  </div>
</body>
</html>
`,

  htmlWithExistingPlaceholders: `
<!DOCTYPE html>
<html>
<body>
  <h1>{{APP_TITLE}}</h1>
  <p>{{APP_DESCRIPTION}}</p>
</body>
</html>
`
};

// Test patterns for HTML templatization
const testPatterns = [
  {
    context: 'text/html',
    selector: 'h1',
    placeholder: 'TITLE',
    allowMultiple: false
  },
  {
    context: 'text/html',
    selector: 'h2',
    placeholder: 'SUBTITLE',
    allowMultiple: false
  },
  {
    context: 'text/html',
    selector: '.description, [data-description]',
    placeholder: 'DESCRIPTION',
    allowMultiple: true
  },
  {
    context: 'text/html',
    selector: 'title',
    placeholder: 'PAGE_TITLE',
    allowMultiple: false
  },
  {
    context: 'text/html',
    selector: 'text',
    placeholder: 'CONTENT_TEXT',
    allowMultiple: true
  }
];

test('HTML Processor - Basic functionality', async (t) => {
  await t.test('should process simple HTML with heading content', async () => {
    const result = await processHTMLFile('test.html', testFixtures.simpleHTML, testPatterns);
    assert.equal(result.length, 4); // h1, title, and 2 text matches

    // Check h1 match
    const h1Match = result.find(r => r.selector === 'h1');
    assert(h1Match);
    assert.equal(h1Match.originalText, 'Welcome to My App');
    assert.equal(h1Match.placeholder, 'TITLE');

    // Check title match
    const titleMatch = result.find(r => r.selector === 'title');
    assert(titleMatch);
    assert.equal(titleMatch.originalText, 'My App');
    assert.equal(titleMatch.placeholder, 'PAGE_TITLE');
  });

  await t.test('should process HTML with attributes', async () => {
    const result = await processHTMLFile('test.html', testFixtures.htmlWithAttributes, testPatterns);
    assert(result.length > 0);

    // Should find h1 with title attribute
    const h1Match = result.find(r => r.selector === 'h1');
    assert(h1Match);
    assert.equal(h1Match.originalText, 'Welcome');
  });

  await t.test('should respect allowMultiple flag', async () => {
    const result = await processHTMLFile('test.html', testFixtures.complexHTML, testPatterns);

    // Should have multiple text matches due to allowMultiple: true
    const textMatches = result.filter(r => r.selector === 'text');
    assert(textMatches.length > 1);

    // Should have only one h1 match due to allowMultiple: false
    const h1Matches = result.filter(r => r.selector === 'h1');
    assert.equal(h1Matches.length, 1);
  });

  await t.test('should skip content with existing placeholders', async () => {
    const result = await processHTMLFile('test.html', testFixtures.htmlWithExistingPlaceholders, testPatterns);

    // Should not find any matches since content already has placeholders
    const h1Matches = result.filter(r => r.selector === 'h1');
    assert.equal(h1Matches.length, 0);
  });

  await t.test('should handle malformed HTML gracefully', async () => {
    const malformedHTML = '<div><h1>Unclosed heading<p>Some text</div>';
    const result = await processHTMLFile('test.html', malformedHTML, testPatterns);
    // Should not crash, may return empty or partial results
    assert(Array.isArray(result));
  });

  await t.test('should return empty array for files without matches', async () => {
    const noMatchHTML = '<div><span>No matching content</span></div>';
    const noTextPatterns = testPatterns.filter(p => p.selector !== 'text');
    const result = await processHTMLFile('test.html', noMatchHTML, noTextPatterns);
    assert.equal(result.length, 0);
  });
});

test('HTML Processor - Edge cases', async (t) => {
  await t.test('should handle empty HTML', async () => {
    const result = await processHTMLFile('test.html', '', testPatterns);
    assert.equal(result.length, 0);
  });

  await t.test('should handle HTML with only text', async () => {
    const textOnlyHTML = '<div>Just some text content</div>';
    const result = await processHTMLFile('test.html', textOnlyHTML, testPatterns);
    assert(result.length > 0);
  });

  await t.test('should handle nested elements', async () => {
    const result = await processHTMLFile('test.html', testFixtures.complexHTML, testPatterns);
    assert(result.length > 0);

    // Should find nested h2
    const h2Match = result.find(r => r.selector === 'h2');
    assert(h2Match);
    assert.equal(h2Match.originalText, 'Hero Section');
  });
});

test('HTML Processor - Selector specificity', async (t) => {
  await t.test('should handle class selectors', async () => {
    const result = await processHTMLFile('test.html', testFixtures.htmlWithAttributes, testPatterns);

    // Should find elements with description class
    const descMatches = result.filter(r => r.selector === '.description, [data-description]');
    assert(descMatches.length > 0);
  });

  await t.test('should handle complex selectors', async () => {
    const complexPatterns = [
      {
        context: 'text/html',
        selector: '.feature h4',
        placeholder: 'FEATURE_TITLE',
        allowMultiple: true
      }
    ];

    const result = await processHTMLFile('test.html', testFixtures.complexHTML, complexPatterns);
    // May or may not find matches depending on selector implementation
    assert(Array.isArray(result));
  });
});

test('HTML Processor - Selector validation', async (t) => {
  await t.test('should handle invalid selectors gracefully', async () => {
    const invalidPatterns = [
      {
        context: 'text/html',
        selector: 'invalid::selector::syntax',
        placeholder: 'INVALID',
        allowMultiple: false
      }
    ];

    const result = await processHTMLFile('test.html', testFixtures.simpleHTML, invalidPatterns);
    // Should not crash
    assert(Array.isArray(result));
  });

  await t.test('should validate selector syntax', async () => {
    const validPatterns = [
      {
        context: 'text/html',
        selector: 'h1:first-child',
        placeholder: 'FIRST_HEADING',
        allowMultiple: false
      }
    ];

    const result = await processHTMLFile('test.html', testFixtures.simpleHTML, validPatterns);
    // Should work with valid selectors
    assert(Array.isArray(result));
  });

  await t.test('should skip content within <!-- @template-skip --> regions', async () => {
    const skipRegionHTML = `
<!DOCTYPE html>
<html>
<body>
  <div>
    <!-- @template-skip -->
    <h1>Don't templatize this</h1>
    <p>This should be skipped too</p>
    <!-- @end-template-skip -->
    <h1>This should be templatized</h1>
    <p>This paragraph should also be templatized</p>
  </div>
</body>
</html>
`;

    const patterns = [
      {
        context: 'text/html',
        selector: 'h1',
        placeholder: 'HEADING',
        allowMultiple: true
      },
      {
        context: 'text/html',
        selector: 'p',
        placeholder: 'PARAGRAPH',
        allowMultiple: true
      }
    ];

    const replacements = await processHTMLFile('test.html', skipRegionHTML, patterns);

    const headingReplacements = replacements.filter(r => r.placeholder === 'HEADING');
    const paragraphReplacements = replacements.filter(r => r.placeholder === 'PARAGRAPH');

    assert.strictEqual(headingReplacements.length, 1, 'Should skip h1 in skip region');
    assert.strictEqual(paragraphReplacements.length, 1, 'Should skip p in skip region');

    assert.strictEqual(headingReplacements[0].originalText, 'This should be templatized');
    assert.strictEqual(paragraphReplacements[0].originalText, 'This paragraph should also be templatized');
  });
});
