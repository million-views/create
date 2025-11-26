# Templatize Domain

The templatize domain provides file-type specific templatization strategies for converting content into templates with placeholders.

## Overview

This domain exports:

- **strategy** - File-type specific templatization strategies
- Direct exports for each file type: `json`, `markdown`, `html`, `jsx`, `config`

## Usage

```typescript
import { templatize } from '../index.mts';

// Process JSON file
const jsonChanges = templatize.json(jsonContent, {
  selectors: ['$.name', '$.author.name'],
  placeholder: 'PROJECT_NAME'
});

// Process Markdown file
const mdChanges = templatize.markdown(markdownContent, {
  selectors: ['# *', 'author: *'],
  placeholder: 'PROJECT_NAME'
});

// Process HTML file
const htmlChanges = templatize.html(htmlContent, {
  selectors: ['title', 'h1'],
  placeholder: 'PROJECT_NAME'
});

// Process JSX/TSX file
const jsxChanges = templatize.jsx(jsxContent, {
  selectors: ['h1', '.title'],
  placeholder: 'PROJECT_NAME'
});

// Access via strategy namespace
const result = templatize.strategy.json(content, config);
```

## Module Structure

```
templatize/
├── index.mts          # Domain facade
└── strategy/          # File-type strategies
    ├── index.mts      # Strategy facade
    ├── json.mjs       # JSON file templatization
    ├── markdown.mjs   # Markdown file templatization
    ├── html.mjs       # HTML file templatization
    ├── jsx.mjs        # JSX/TSX file templatization
    └── config.mjs     # Config file processing
```

## Supported File Types

| Type | Extensions | Strategy |
|------|------------|----------|
| JSON | `.json` | JSONPath selectors |
| Markdown | `.md`, `.mdx` | Regex patterns, frontmatter |
| HTML | `.html`, `.htm` | CSS selectors |
| JSX/TSX | `.jsx`, `.tsx` | CSS selectors, AST parsing |
| Config | `.templatize.json` | Configuration loading |

## API Reference

### json

JSON file templatization with JSONPath selectors.

```typescript
function json(content: string, config: JsonConfig): Change[];

interface JsonConfig {
  selectors: string[];       // JSONPath selectors
  placeholder: string;       // Placeholder name
  allowMultiple?: boolean;   // Allow multiple replacements
}
```

### markdown

Markdown file templatization with regex patterns.

```typescript
function markdown(content: string, config: MarkdownConfig): Change[];

interface MarkdownConfig {
  selectors: string[];       // Heading patterns, frontmatter paths
  placeholder: string;       // Placeholder name
  allowMultiple?: boolean;   // Allow multiple replacements
}
```

### html

HTML file templatization with CSS selectors.

```typescript
function html(content: string, config: HtmlConfig): Change[];

interface HtmlConfig {
  selectors: string[];       // CSS selectors
  placeholder: string;       // Placeholder name
  attribute?: string;        // Optional attribute to target
  allowMultiple?: boolean;   // Allow multiple replacements
}
```

### jsx

JSX/TSX file templatization with CSS selectors and AST parsing.

```typescript
function jsx(content: string, config: JsxConfig): Change[];

interface JsxConfig {
  selectors: string[];       // CSS selectors for JSX elements
  placeholder: string;       // Placeholder name
  allowMultiple?: boolean;   // Allow multiple replacements
}
```

## Change Object

All strategies return an array of Change objects:

```typescript
interface Change {
  path: string;              // Selector path or location
  original: string;          // Original value
  replacement: string;       // Replacement with placeholder
  line?: number;             // Line number (if available)
  column?: number;           // Column number (if available)
}
```

## Skip Directives

Use skip comments to exclude content from templatization:

```html
<!-- @template-skip -->
<div>This content will not be templatized</div>
<!-- @template-skip-end -->
```

```javascript
// @template-skip
const FIXED_VALUE = 'do-not-templatize';
// @template-skip-end
```
