#!/usr/bin/env node

/**
 * Unit tests for JSX templatization processor
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { processJSXFile } from '../lib/templatize-jsx.mjs';

// Test fixtures
const testFixtures = {
  simpleJSX: `
function App() {
  return (
    <div>
      <h1>Welcome to My App</h1>
      <p>This is a description</p>
    </div>
  );
}
`,

  jsxWithAttributes: `
function Header() {
  return (
    <header>
      <h1 title="Main Title">Welcome</h1>
      <button aria-label="Close button">×</button>
    </header>
  );
}
`,

  jsxWithExpressions: `
function UserProfile({ user }) {
  return (
    <div>
      <h1>Hello {user.name}</h1>
      <p>Welcome back!</p>
    </div>
  );
}
`,

  jsxWithSkipComments: `
function App() {
  return (
    <div>
      {/* @template-skip */}
      <h1>Don't templatize this</h1>
      <h2>This is okay</h2>
    </div>
  );
}
`,

  complexJSX: `
import React from 'react';

function MyComponent() {
  return (
    <div className="container">
      <header>
        <h1>My Awesome App</h1>
        <nav>
          <a href="#home">Home</a>
        </nav>
      </header>
      <main>
        <section className="hero">
          <h2>Build Something Amazing</h2>
          <p className="description">
            Start your journey with our comprehensive toolkit
          </p>
        </section>
      </main>
    </div>
  );
}

export default MyComponent;
`
};

// Test patterns
const testPatterns = [
  {
    type: 'string-literal',
    context: 'jsx-text',
    selector: 'h1:first-child',
    placeholder: 'CONTENT_TITLE',
    allowMultiple: false
  },
  {
    type: 'string-literal',
    context: 'jsx-text',
    selector: 'h2:first-child',
    placeholder: 'CONTENT_SUBTITLE',
    allowMultiple: false
  },
  {
    type: 'string-literal',
    context: 'jsx-text',
    selector: '.description, [data-description]',
    placeholder: 'CONTENT_DESCRIPTION',
    allowMultiple: true
  },
  {
    type: 'string-literal',
    context: 'jsx-attribute',
    selector: '[title]',
    attribute: 'title',
    placeholder: 'CONTENT_TITLE',
    allowMultiple: true
  },
  {
    type: 'string-literal',
    context: 'jsx-attribute',
    selector: '[aria-label]',
    attribute: 'aria-label',
    placeholder: 'CONTENT_LABEL',
    allowMultiple: true
  }
];

test('JSX Processor - Basic functionality', async (t) => {
  await t.test('should process simple JSX with text content', async () => {
    const replacements = await processJSXFile('test.jsx', testFixtures.simpleJSX, testPatterns);

    assert(Array.isArray(replacements), 'Should return array of replacements');
    assert(replacements.length > 0, 'Should find replacements');

    // Should find "Welcome to My App" as CONTENT_TITLE
    const titleReplacement = replacements.find(r => r.placeholder === 'CONTENT_TITLE');
    assert(titleReplacement, 'Should find CONTENT_TITLE replacement');
    assert.strictEqual(titleReplacement.originalText, 'Welcome to My App');
  });

  await t.test('should process JSX with attributes', async () => {
    const replacements = await processJSXFile('test.jsx', testFixtures.jsxWithAttributes, testPatterns);

    // Should find title attribute
    const titleAttr = replacements.find(r => r.attribute === 'title');
    assert(titleAttr, 'Should find title attribute replacement');
    assert.strictEqual(titleAttr.originalText, 'Main Title');

    // Should find aria-label attribute
    const ariaLabel = replacements.find(r => r.attribute === 'aria-label');
    assert(ariaLabel, 'Should find aria-label attribute replacement');
    assert.strictEqual(ariaLabel.originalText, 'Close button');
  });

  await t.test('should ignore JSX expressions', async () => {
    const replacements = await processJSXFile('test.jsx', testFixtures.jsxWithExpressions, testPatterns);

    // Should NOT replace {user.name} expression
    const expressionReplacements = replacements.filter(r => r.originalText.includes('{'));
    assert.strictEqual(expressionReplacements.length, 0, 'Should not replace JSX expressions');
  });

  await t.test('should respect allowMultiple flag', async () => {
    const replacements = await processJSXFile('test.jsx', testFixtures.complexJSX, testPatterns);

    // Should find CONTENT_DESCRIPTION instances (allowMultiple is true, but there's only one matching element)
    const descriptions = replacements.filter(r => r.placeholder === 'CONTENT_DESCRIPTION');
    assert.strictEqual(descriptions.length, 1, 'Should find one description when allowMultiple is true');

    // Should find only one CONTENT_TITLE (first h1)
    const titles = replacements.filter(r => r.placeholder === 'CONTENT_TITLE');
    assert.strictEqual(titles.length, 1, 'Should find only one title when allowMultiple is false');
  });

  await t.test('should handle skip comments', async () => {
    const replacements = await processJSXFile('test.jsx', testFixtures.jsxWithSkipComments, testPatterns);

    // Should not replace content in skip regions
    const skipContent = replacements.find(r => r.originalText === "Don't templatize this");
    assert(!skipContent, 'Should not replace content in skip regions');
  });

  await t.test('should handle malformed JSX gracefully', async () => {
    const malformedJSX = `
function App() {
  return (
    <div>
      <h1>Unclosed tag
      <p>Valid content</p>
    </div>
  );
}
`;

    const replacements = await processJSXFile('test.jsx', malformedJSX, testPatterns);

    // Should still process valid parts
    assert(Array.isArray(replacements), 'Should handle malformed JSX without crashing');
  });

  await t.test('should return empty array for files without matches', async () => {
    const noMatchJSX = `
function App() {
  return (
    <div>
      <span>No matching elements</span>
    </div>
  );
}
`;

    const replacements = await processJSXFile('test.jsx', noMatchJSX, testPatterns);
    assert(Array.isArray(replacements), 'Should return array even with no matches');
    assert.strictEqual(replacements.length, 0, 'Should return empty array when no matches found');
  });
});

test('JSX Processor - Edge cases', async (t) => {
  await t.test('should handle empty JSX', async () => {
    const replacements = await processJSXFile('test.jsx', '', testPatterns);
    assert(Array.isArray(replacements), 'Should handle empty files');
    assert.strictEqual(replacements.length, 0, 'Should return empty array for empty files');
  });

  await t.test('should handle JSX fragments', async () => {
    const fragmentJSX = `
function App() {
  return (
    <>
      <h1>Title in Fragment</h1>
      <p>Description</p>
    </>
  );
}
`;

    const replacements = await processJSXFile('test.jsx', fragmentJSX, testPatterns);
    assert(replacements.length > 0, 'Should process JSX fragments');
  });

  await t.test('should handle nested components', async () => {
    const nestedJSX = `
function App() {
  return (
    <div>
      <Header title="Nested Title" />
      <Content>
        <h2>Nested Content</h2>
      </Content>
    </div>
  );
}
`;

    const replacements = await processJSXFile('test.jsx', nestedJSX, testPatterns);
    // Should find attribute replacements
    const attrReplacements = replacements.filter(r => r.attribute);
    assert(attrReplacements.length > 0, 'Should process nested component attributes');
  });
});

test('JSX Processor - Selector specificity', async (t) => {
  await t.test('should respect :first-child selectors', async () => {
    const multipleHeadersJSX = `
function App() {
  return (
    <div>
      <h1>First Title</h1>
      <h1>Second Title</h1>
      <h2>First Subtitle</h2>
      <h2>Second Subtitle</h2>
    </div>
  );
}
`;

    const replacements = await processJSXFile('test.jsx', multipleHeadersJSX, testPatterns);

    const titleReplacements = replacements.filter(r => r.placeholder === 'CONTENT_TITLE');
    const subtitleReplacements = replacements.filter(r => r.placeholder === 'CONTENT_SUBTITLE');

    assert.strictEqual(titleReplacements.length, 1, 'Should only replace first h1');
    assert.strictEqual(subtitleReplacements.length, 1, 'Should only replace first h2');

    assert.strictEqual(titleReplacements[0].originalText, 'First Title');
    assert.strictEqual(subtitleReplacements[0].originalText, 'First Subtitle');
  });

  await t.test('should handle class and data attribute selectors', async () => {
    const classSelectorJSX = `
function App() {
  return (
    <div>
      <p className="description">This should match</p>
      <p data-description>This should also match</p>
      <p className="other">This should not match</p>
    </div>
  );
}
`;

    const replacements = await processJSXFile('test.jsx', classSelectorJSX, testPatterns);

    const descriptionReplacements = replacements.filter(r => r.placeholder === 'CONTENT_DESCRIPTION');
    assert.strictEqual(descriptionReplacements.length, 2, 'Should match both class and data attribute selectors');
  });
});
