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
  "context": "mime-type-format",
  "placeholder": "PLACEHOLDER_NAME",
  "allowMultiple": false
}
```

- **`context`** (required): MIME-type format specifying how to extract content (e.g., `"application/json"`, `"text/jsx"`, `"text/html#attribute"`)
- **`placeholder`** (required): The placeholder name to use for replacement
- **`allowMultiple`** (optional): Whether this pattern can match multiple occurrences (default: `false`)

## File Processing Order

**Critical Insight**: Placeholders in `template.json` appear in the same order as files are declared in `.templatize.json`.

The converter processes files sequentially in declaration order:
1. First file pattern → all its placeholders added to `template.json`
2. Second file pattern → all its placeholders added next
3. Third file pattern → all its placeholders added next
4. And so on...

Within each file, placeholders follow document order (top-to-bottom as they appear in source code).

**Example:**

```json
// .templatize.json
{
  "rules": {
    "package.json": [...],              // Processed first
    "src/components/Hero.jsx": [...],   // Processed second
    "src/components/Contact.jsx": [...],// Processed third
    "src/components/Footer.jsx": [...]  // Processed fourth
  }
}
```

**Resulting `template.json` order:**
```json
{
  "placeholders": {
    "PACKAGE_NAME": { ... },           // ← From package.json
    "PROJECT_DESCRIPTION": { ... },    // ← From package.json
    "HERO_TITLE": { ... },             // ← From Hero.jsx
    "HERO_SUBTITLE": { ... },          // ← From Hero.jsx
    "CONTACT_EMAIL": { ... },          // ← From Contact.jsx
    "CONTACT_PHONE": { ... },          // ← From Contact.jsx
    "FOOTER_COPYRIGHT": { ... }        // ← From Footer.jsx
  }
}
```

**Why This Matters:**

- **Predictable Organization**: Technical writers can document expected placeholder order knowing it will match file order
- **Logical Grouping**: Related placeholders (from same component/file) stay together
- **No Configuration Needed**: Order emerges naturally from `.templatize.json` structure
- **Documentation Accuracy**: "This template organizes placeholders by website section: hero, contact, footer" statements remain accurate

**Best Practice**: Organize files in `.templatize.json` in the same logical order you want placeholders to appear in `template.json`.

## Pattern Types

### JSON Value Patterns

Extracts values from JSON files using JSONPath expressions.

**Configuration:**
```json
{
  "context": "application/json",
  "path": "$.name",
  "placeholder": "PACKAGE_NAME"
}
```

**Properties:**
- **`context`**: `"application/json"`
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
      "context": "application/json",
      "path": "$.name",
      "placeholder": "PACKAGE_NAME"
    },
    {
      "context": "application/json",
      "path": "$.description",
      "placeholder": "PACKAGE_DESCRIPTION"
    },
    {
      "context": "application/json",
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

### Markdown Heading Patterns

Extracts text from markdown headings.

**Configuration:**
```json
{
  "context": "text/markdown#heading",
  "selector": "h1",
  "placeholder": "CONTENT_TITLE"
}
```

**Properties:**
- **`context`**: `"text/markdown#heading"`
- **`selector`** (required): Heading selector (h1, h2, h3, h4, h5, or h6)

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
      "context": "text/markdown#heading",
      "selector": "h1",
      "placeholder": "CONTENT_TITLE"
    },
    {
      "context": "text/markdown#heading",
      "selector": "h2",
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

### Markdown Paragraph Patterns

Extracts text from markdown paragraphs.

**Configuration:**
```json
{
  "context": "text/markdown#paragraph",
  "selector": "p",
  "placeholder": "CONTENT_DESCRIPTION"
}
```

**Properties:**
- **`context`**: `"text/markdown#paragraph"`
- **`selector`** (required): Selector for paragraph matching (e.g., `"p"`)

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
      "context": "text/markdown#paragraph",
      "selector": "p",
      "placeholder": "CONTENT_DESCRIPTION",
      "allowMultiple": false
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

### JSX/TSX Patterns

Extracts string literals from JSX/TSX files using CSS selectors.

**Configuration (text content):**
```json
{
  "context": "text/jsx",
  "selector": "h1:first-child",
  "placeholder": "CONTENT_TITLE"
}
```

**Configuration (attributes):**
```json
{
  "context": "text/jsx#attribute",
  "selector": "img[src]",
  "placeholder": "IMAGE_SRC"
}
```

**Properties:**
- **`context`** (required): `"text/jsx"` for text content, `"text/jsx#attribute"` for attributes
- **`selector`** (required): CSS selector to locate elements (attribute name extracted from selector for attribute contexts)

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
      "context": "text/jsx",
      "selector": "h1:first-child",
      "placeholder": "CONTENT_TITLE"
    },
    {
      "context": "text/jsx",
      "selector": ".description",
      "placeholder": "CONTENT_DESCRIPTION"
    },
    {
      "context": "text/jsx#attribute",
      "selector": "[title]",
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
      <h1>⦃CONTENT_TITLE⦄</h1>
      <p className="description">⦃CONTENT_DESCRIPTION⦄</p>
      <button title="⦃BUTTON_TITLE⦄">Button</button>
    </div>
  );
}
```

#### Handling Mixed Content in JSX

**Problem:** When elements contain both text and nested elements, the JSX parser extracts ALL text nodes within the matched element, which may not be what you want.

**Example of the issue:**
```jsx
<div>
  <p>Phone: (555) 123-4567</p>
  <p>Email: <a href="mailto:hello@example.com">hello@example.com</a></p>
  <p>Address: 123 Main St</p>
</div>
```

If you use selector `"p"` with `allowMultiple: true`, it will extract:
- "Phone: (555) 123-4567" from first `<p>`
- "Email: " from second `<p>` (text before `<a>`)
- "hello@example.com" from second `<p>` (text inside `<a>`)
- "Address: 123 Main St" from third `<p>`

This creates 4 placeholders instead of the expected 3.

**Solution 1: Use `:not(:has())` selector to exclude mixed content**
```json
{
  ".jsx": [
    {
      "context": "text/jsx",
      "selector": "div > p:not(:has(a))",
      "placeholder": "CONTACT_INFO",
      "allowMultiple": true
    },
    {
      "context": "text/jsx#attribute",
      "selector": "a[href^='mailto']",
      "placeholder": "CONTACT_EMAIL_HREF"
    },
    {
      "context": "text/jsx",
      "selector": "a[href^='mailto']",
      "placeholder": "CONTACT_EMAIL_TEXT"
    }
  ]
}
```

This creates clean placeholders:
- `CONTACT_INFO_0`: "Phone: (555) 123-4567"
- `CONTACT_INFO_1`: "Address: 123 Main St"
- `CONTACT_EMAIL_HREF`: "mailto:hello@example.com"
- `CONTACT_EMAIL_TEXT`: "hello@example.com"

**Solution 2: Use specific selectors for each element type**

Instead of broad selectors, target specific elements:
```json
{
  ".jsx": [
    {
      "context": "text/jsx",
      "selector": "p.phone",
      "placeholder": "CONTACT_PHONE"
    },
    {
      "context": "text/jsx",
      "selector": "a.email",
      "placeholder": "CONTACT_EMAIL"
    }
  ]
}
```

**Key Principle:** Selector specificity is crucial when elements contain nested content. Match at the appropriate level to avoid extracting unwanted text nodes.

### HTML Patterns

Extracts text content and attributes from HTML elements.

**Configuration (text content):**
```json
{
  "context": "text/html",
  "selector": "title",
  "placeholder": "PAGE_TITLE"
}
```

**Configuration (attributes):**
```json
{
  "context": "text/html#attribute",
  "selector": "meta[name='description'][content]",
  "placeholder": "META_DESCRIPTION"
}
```

**Properties:**
- **`context`** (required): `"text/html"` for text content, `"text/html#attribute"` for attributes
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
      "context": "text/html",
      "selector": "title",
      "placeholder": "PAGE_TITLE"
    },
    {
      "context": "text/html",
      "selector": "h1:first-child",
      "placeholder": "CONTENT_TITLE"
    },
    {
      "context": "text/html",
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

**Attribute Examples:**

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
      "context": "text/html#attribute",
      "selector": "meta[name='description'][content]",
      "placeholder": "META_DESCRIPTION"
    },
    {
      "context": "text/html#attribute",
      "selector": "link[rel='icon'][href]",
      "placeholder": "FAVICON_PATH"
    },
    {
      "context": "text/html#attribute",
      "selector": "img[alt]",
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
      "context": "text/markdown#heading",
      "selector": "h1",
      "placeholder": "TITLE"
    },
    {
      "context": "text/markdown#heading",
      "selector": "h2",
      "placeholder": "SUBTITLE"
    },
    {
      "context": "text/markdown#paragraph",
      "selector": "p",
      "placeholder": "DESCRIPTION",
      "allowMultiple": false
    }
  ]
}
```

### Allow Multiple Matches

Set `allowMultiple: true` to replace all occurrences of a pattern:

```json
{
  "context": "text/jsx",
  "selector": ".description",
  "placeholder": "DESCRIPTION",
  "allowMultiple": true
}
```

### Custom Placeholders

Use descriptive placeholder names that match your template's needs:

```json
{
  "context": "application/json",
  "path": "$.name",
  "placeholder": "PROJECT_NAME"
}
```

## Default Configuration

The system provides a comprehensive default configuration that covers common templatization needs. You can generate this configuration using:

```bash
create template init
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
- Run `create template config validate` to check your config
- Check the error messages for specific validation failures
- Compare with the examples in this reference

**Unexpected replacements:**
- Review `allowMultiple` settings
- Check for overlapping selectors
- Test with sample content first

### Verbose Output

The convert command provides detailed output during processing, showing:
- Which patterns are loaded
- Files being processed  
- Pattern matches and replacements
- Any errors or warnings

For additional debugging, examine the generated files:
- `template.json` - Contains all detected placeholders and their metadata
- `.template-undo.json` - Records file operations for restoration via `create template restore`