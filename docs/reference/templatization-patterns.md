---
title: "Templatization Patterns Reference"
description: "Complete guide to templatization patterns and configuration"
type: reference
audience: "advanced"
estimated_time: "15 minutes read"
prerequisites:
  - "Understanding of templatization concepts"
  - "../explanation/templatization.md"
related_docs:
  - "../explanation/templatization.md"
  - "../how-to/creating-templates.md"
last_updated: "2025-11-18"
---

# Templatization Patterns Reference

## Overview

This reference guide documents all available templatization pattern types, their configuration options, and usage examples. The templatization system uses a configurable `.templatize.json` file to define patterns for different file types.

## Configuration Structure

### .templatize.json Format

```json
{
  "version": "1.0",
  "autoDetect": true,
  "rules": {
    "package.json": [...],
    "README.md": [...],
    ".jsx": [...],
    ".html": [...]
  }
}
```

### Pattern Structure

All patterns share common properties:

```json
{
  "type": "pattern-type",
  "placeholder": "PLACEHOLDER_NAME",
  "allowMultiple": false
}
```

- **`type`** (required): The pattern type identifier
- **`placeholder`** (required): The placeholder name to use for replacement
- **`allowMultiple`** (optional): Whether this pattern can match multiple occurrences (default: `false`)

## Pattern Types

### JSON Value Patterns (`json-value`)

Extracts values from JSON files using JSONPath expressions.

**Configuration:**
```json
{
  "type": "json-value",
  "path": "$.name",
  "placeholder": "PACKAGE_NAME"
}
```

**Properties:**
- **`path`** (required): JSONPath expression to locate the value

**Examples:**

```json
// package.json
{
  "name": "my-app",
  "description": "My application",
  "author": "John Doe"
}
```

```json
// .templatize.json rules for package.json
{
  "package.json": [
    {
      "type": "json-value",
      "path": "$.name",
      "placeholder": "PACKAGE_NAME"
    },
    {
      "type": "json-value",
      "path": "$.description",
      "placeholder": "PACKAGE_DESCRIPTION"
    },
    {
      "type": "json-value",
      "path": "$.author",
      "placeholder": "PACKAGE_AUTHOR"
    }
  ]
}
```

**Result:**
```json
{
  "name": "{PACKAGE_NAME}",
  "description": "{PACKAGE_DESCRIPTION}",
  "author": "{PACKAGE_AUTHOR}"
}
```

### Markdown Heading Patterns (`markdown-heading`)

Extracts text from markdown headings by level.

**Configuration:**
```json
{
  "type": "markdown-heading",
  "level": 1,
  "placeholder": "CONTENT_TITLE"
}
```

**Properties:**
- **`level`** (required): Heading level (1-6)

**Examples:**

```markdown
# My Project Title
## Subtitle
### Section Header
```

```json
// .templatize.json rules for README.md
{
  "README.md": [
    {
      "type": "markdown-heading",
      "level": 1,
      "placeholder": "CONTENT_TITLE"
    },
    {
      "type": "markdown-heading",
      "level": 2,
      "placeholder": "CONTENT_SUBTITLE"
    }
  ]
}
```

**Result:**
```markdown
# {CONTENT_TITLE}
## {CONTENT_SUBTITLE}
### Section Header
```

### Markdown Paragraph Patterns (`markdown-paragraph`)

Extracts text from markdown paragraphs by position.

**Configuration:**
```json
{
  "type": "markdown-paragraph",
  "position": "first",
  "placeholder": "CONTENT_DESCRIPTION"
}
```

**Properties:**
- **`position`** (required): Position identifier (`"first"`, `"last"`, or numeric index)

**Examples:**

```markdown
# Title

This is the first paragraph with a description.

This is the second paragraph.

## Section

Another paragraph here.
```

```json
// .templatize.json rules for README.md
{
  "README.md": [
    {
      "type": "markdown-paragraph",
      "position": "first",
      "placeholder": "CONTENT_DESCRIPTION"
    }
  ]
}
```

**Result:**
```markdown
# Title

{CONTENT_DESCRIPTION}

This is the second paragraph.

## Section

Another paragraph here.
```

### String Literal Patterns (`string-literal`)

Extracts string literals from source code files with context-specific matching.

**Configuration:**
```json
{
  "type": "string-literal",
  "context": "jsx-text",
  "selector": "h1:first-child",
  "placeholder": "CONTENT_TITLE"
}
```

**Properties:**
- **`context`** (required): Context type (`"jsx-text"`, `"jsx-attribute"`)
- **`selector`** (required): CSS selector to locate elements
- **`attribute`** (required for `jsx-attribute` context): Attribute name to extract

**Examples for JSX/TSX:**

```jsx
function App() {
  return (
    <div>
      <h1>Welcome to My App</h1>
      <p className="description">This is my app description</p>
      <button title="Click me">Button</button>
    </div>
  );
}
```

```json
// .templatize.json rules for .jsx files
{
  ".jsx": [
    {
      "type": "string-literal",
      "context": "jsx-text",
      "selector": "h1:first-child",
      "placeholder": "CONTENT_TITLE"
    },
    {
      "type": "string-literal",
      "context": "jsx-text",
      "selector": ".description",
      "placeholder": "CONTENT_DESCRIPTION"
    },
    {
      "type": "string-literal",
      "context": "jsx-attribute",
      "selector": "[title]",
      "attribute": "title",
      "placeholder": "BUTTON_TITLE"
    }
  ]
}
```

**Result:**
```jsx
function App() {
  return (
    <div>
      <h1>{CONTENT_TITLE}</h1>
      <p className="description">{CONTENT_DESCRIPTION}</p>
      <button title="{BUTTON_TITLE}">Button</button>
    </div>
  );
}
```

### HTML Text Patterns (`html-text`)

Extracts text content from HTML elements.

**Configuration:**
```json
{
  "type": "html-text",
  "selector": "title",
  "placeholder": "PAGE_TITLE"
}
```

**Properties:**
- **`selector`** (required): CSS selector to locate elements

**Examples:**

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Website</title>
</head>
<body>
  <h1>Welcome</h1>
  <p>This is the description</p>
</body>
</html>
```

```json
// .templatize.json rules for .html files
{
  ".html": [
    {
      "type": "html-text",
      "selector": "title",
      "placeholder": "PAGE_TITLE"
    },
    {
      "type": "html-text",
      "selector": "h1:first-child",
      "placeholder": "CONTENT_TITLE"
    },
    {
      "type": "html-text",
      "selector": "p:first-of-type",
      "placeholder": "CONTENT_DESCRIPTION"
    }
  ]
}
```

**Result:**
```html
<!DOCTYPE html>
<html>
<head>
  <title>{PAGE_TITLE}</title>
</head>
<body>
  <h1>{CONTENT_TITLE}</h1>
  <p>{CONTENT_DESCRIPTION}</p>
</body>
</html>
```

### HTML Attribute Patterns (`html-attribute`)

Extracts attribute values from HTML elements.

**Configuration:**
```json
{
  "type": "html-attribute",
  "selector": "meta[name='description']",
  "attribute": "content",
  "placeholder": "META_DESCRIPTION"
}
```

**Properties:**
- **`selector`** (required): CSS selector to locate elements
- **`attribute`** (required): Attribute name to extract

**Examples:**

```html
<!DOCTYPE html>
<html>
<head>
  <meta name="description" content="My website description">
  <link rel="icon" href="favicon.ico">
</head>
<body>
  <img src="logo.png" alt="Company Logo">
</body>
</html>
```

```json
// .templatize.json rules for .html files
{
  ".html": [
    {
      "type": "html-attribute",
      "selector": "meta[name='description']",
      "attribute": "content",
      "placeholder": "META_DESCRIPTION"
    },
    {
      "type": "html-attribute",
      "selector": "link[rel='icon']",
      "attribute": "href",
      "placeholder": "FAVICON_PATH"
    },
    {
      "type": "html-attribute",
      "selector": "img",
      "attribute": "alt",
      "placeholder": "IMAGE_ALT"
    }
  ]
}
```

**Result:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta name="description" content="{META_DESCRIPTION}">
  <link rel="icon" href="{FAVICON_PATH}">
</head>
<body>
  <img src="logo.png" alt="{IMAGE_ALT}">
</body>
</html>
```

## File Pattern Matching

### Specific Files

Use exact filenames to target specific files:

```json
{
  "rules": {
    "package.json": [...],
    "README.md": [...],
    "index.html": [...]
  }
}
```

### File Extensions

Use extension patterns to target all files with that extension:

```json
{
  "rules": {
    ".jsx": [...],
    ".html": [...],
    ".md": [...]
  }
}
```

## Advanced Configuration

### Multiple Patterns per File

You can define multiple patterns for the same file:

```json
{
  "README.md": [
    {
      "type": "markdown-heading",
      "level": 1,
      "placeholder": "TITLE"
    },
    {
      "type": "markdown-heading",
      "level": 2,
      "placeholder": "SUBTITLE"
    },
    {
      "type": "markdown-paragraph",
      "position": "first",
      "placeholder": "DESCRIPTION"
    }
  ]
}
```

### Allow Multiple Matches

Set `allowMultiple: true` to replace all occurrences of a pattern:

```json
{
  "type": "string-literal",
  "context": "jsx-text",
  "selector": ".description",
  "placeholder": "DESCRIPTION",
  "allowMultiple": true
}
```

### Custom Placeholders

Use descriptive placeholder names that match your template's needs:

```json
{
  "type": "json-value",
  "path": "$.name",
  "placeholder": "PROJECT_NAME"
}
```

## Default Configuration

The system provides a comprehensive default configuration that covers common templatization needs. You can generate this configuration using:

```bash
npx make-template init
```

This creates a `.templatize.json` file with patterns for:
- **package.json**: Name, description, author
- **README.md**: Title, description
- **JSX files**: Headings, descriptions, attributes
- **HTML files**: Title, meta description, headings

## Validation and Error Handling

The configuration system validates your `.templatize.json` file and provides helpful error messages:

- **Missing required fields**: Clear messages about what's missing
- **Invalid pattern types**: Lists supported pattern types
- **Malformed JSON**: Points to syntax errors
- **Unknown properties**: Warns about unrecognized properties (forwards compatibility)

## Best Practices

### Pattern Organization
- Group related patterns together
- Use consistent placeholder naming conventions
- Start with the default configuration and customize as needed

### Performance Considerations
- More specific selectors perform better than broad ones
- Limit `allowMultiple: true` to necessary cases
- Test your configuration with representative content

### Maintenance
- Keep your `.templatize.json` version controlled
- Document custom patterns for team members
- Review and update patterns as your templates evolve

## Troubleshooting

### Common Issues

**Pattern not matching:**
- Verify the selector/path syntax
- Check that the file content matches your expectations
- Use more specific selectors if needed

**Invalid configuration:**
- Run `npx make-template config validate` to check your config
- Check the error messages for specific validation failures
- Compare with the examples in this reference

**Unexpected replacements:**
- Review `allowMultiple` settings
- Check for overlapping selectors
- Test with sample content first

### Debug Mode

Enable debug logging to see pattern matching details:

```bash
DEBUG=templatize npx make-template convert
```

This will show:
- Which patterns are loaded
- Files being processed
- Pattern matches and replacements
- Any errors or warnings