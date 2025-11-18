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

This reference guide documents all available templatization patterns, their configuration options, and usage examples. Use this guide to customize templatization behavior for your templates.

## Configuration Structure

### .templatize.json Format

```json
{
  "version": "1.0.0",
  "patterns": {
    "jsx": [...],
    "json": [...],
    "markdown": [...],
    "html": [...]
  }
}
```

## JSX/TSX Patterns

### Basic Element Text Content

```json
{
  "selector": "h1, h2, h3, h4, h5, h6",
  "attribute": null,
  "placeholder": "CONTENT_TITLE"
}
```

**Matches**: Text content of heading elements
**Example**:
```jsx
<h1>Welcome to My App</h1> → <h1>{CONTENT_TITLE}</h1>
```

### Element Attributes

```json
{
  "selector": "[title], [alt]",
  "attribute": "title",
  "placeholder": "CONTENT_TITLE"
}
```

**Matches**: Specific attributes on elements
**Example**:
```jsx
<div title="My App"> → <div title="{CONTENT_TITLE}">
```

### Component Props

```json
{
  "selector": "MyComponent",
  "attribute": "title",
  "placeholder": "COMPONENT_TITLE"
}
```

**Matches**: Props on custom components

### Advanced Selectors

```json
{
  "selector": ".header > h1:first-child",
  "attribute": null,
  "placeholder": "MAIN_TITLE"
}
```

**Matches**: Complex CSS selector patterns

## JSON Patterns

### Simple Property Paths

```json
{
  "path": "$.name",
  "placeholder": "PACKAGE_NAME"
}
```

**Matches**: Top-level name property
**Example**:
```json
{"name": "my-app"} → {"name": "{PACKAGE_NAME}"}
```

### Nested Properties

```json
{
  "path": "$.config.title",
  "placeholder": "APP_TITLE"
}
```

**Matches**: Nested configuration properties

### Array Elements

```json
{
  "path": "$.dependencies.*",
  "placeholder": "DEPENDENCY_NAME"
}
```

**Matches**: All dependency names (wildcard)

### Specific Array Indices

```json
{
  "path": "$.scripts[0]",
  "placeholder": "MAIN_SCRIPT"
}
```

**Matches**: First script in array

## Markdown Patterns

### Heading Patterns

```json
{
  "pattern": "^#{1,6}\\s+(.+)$",
  "placeholder": "CONTENT_TITLE",
  "flags": "gm"
}
```

**Matches**: All heading levels
**Example**:
```markdown
# My Title → # {CONTENT_TITLE}
## Subtitle → ## {CONTENT_TITLE}
```

### Frontmatter Fields

```json
{
  "pattern": "^title:\\s*(.+)$",
  "placeholder": "DOCUMENT_TITLE",
  "flags": "m"
}
```

**Matches**: YAML frontmatter title field

### Link Patterns

```json
{
  "pattern": "\\[([^\\]]+)\\]\\(([^\\)]+)\\)",
  "placeholder": "LINK_TEXT",
  "captureGroup": 1
}
```

**Matches**: Link text (capture group 1)

### Code Block Languages

```json
{
  "pattern": "```(\\w+)",
  "placeholder": "CODE_LANGUAGE"
}
```

**Matches**: Code block language specifiers

## HTML Patterns

### Element Text Content

```json
{
  "selector": "h1, h2, title",
  "attribute": null,
  "placeholder": "CONTENT_TITLE"
}
```

**Matches**: Text content of elements

### Attribute Values

```json
{
  "selector": "meta[name=\"description\"]",
  "attribute": "content",
  "placeholder": "META_DESCRIPTION"
}
```

**Matches**: Specific attribute values

### Form Attributes

```json
{
  "selector": "input, textarea",
  "attribute": "placeholder",
  "placeholder": "FORM_PLACEHOLDER"
}
```

**Matches**: Form input placeholders

## Advanced Configuration

### Pattern Options

#### allowMultiple (boolean)
Controls whether pattern can match multiple instances:

```json
{
  "selector": "p",
  "attribute": null,
  "placeholder": "PARAGRAPH_CONTENT",
  "allowMultiple": true
}
```

#### caseSensitive (boolean)
Controls case sensitivity for text matching:

```json
{
  "pattern": "error|Error|ERROR",
  "placeholder": "ERROR_MESSAGE",
  "caseSensitive": false
}
```

### Skip Regions

Exclude content from templatization:

```javascript
/* @template-skip */
const hardcodedValue = "This stays as-is";
/* @template-end-skip */
```

```html
<!-- @template-skip -->
<div>This content is preserved</div>
<!-- @template-end-skip -->
```

## Built-in Placeholder Types

### Content Placeholders
- `CONTENT_TITLE` - Page/component titles
- `CONTENT_DESCRIPTION` - Descriptions and summaries
- `CONTENT_SUBTITLE` - Secondary headings
- `CONTENT_BODY` - Main content text

### Package Placeholders
- `PACKAGE_NAME` - Package/project name
- `PACKAGE_DESCRIPTION` - Package description
- `PACKAGE_VERSION` - Version numbers
- `PACKAGE_AUTHOR` - Author information

### Application Placeholders
- `APP_NAME` - Application display name
- `APP_TITLE` - Application title
- `APP_DESCRIPTION` - Application description

### UI/UX Placeholders
- `UI_BUTTON_TEXT` - Button labels
- `UI_PLACEHOLDER_TEXT` - Input placeholders
- `UI_ERROR_MESSAGE` - Error messages
- `UI_SUCCESS_MESSAGE` - Success messages

## Custom Placeholder Naming

### Naming Conventions

1. **UPPER_SNAKE_CASE** - Standard placeholder format
2. **Descriptive names** - Indicate content type and purpose
3. **Consistent prefixes** - Group related placeholders
4. **Avoid conflicts** - Don't override built-in placeholders

### Examples

```json
{
  "patterns": {
    "jsx": [
      {
        "selector": "button",
        "attribute": null,
        "placeholder": "PRIMARY_BUTTON_TEXT"
      }
    ],
    "json": [
      {
        "path": "$.api.endpoint",
        "placeholder": "API_BASE_URL"
      }
    ]
  }
}
```

## Pattern Validation

### Syntax Validation

The system validates patterns at configuration load time:

- **CSS Selectors**: Valid CSS selector syntax
- **JSONPath**: Valid JSONPath expressions
- **Regular Expressions**: Valid regex patterns with flags

### Runtime Validation

During templatization:

- **File parsing**: Validates file syntax before processing
- **Match validation**: Ensures matches are reasonable
- **Position safety**: Validates replacement positions

## Debugging Patterns

### Enable Debug Logging

```bash
DEBUG=templatize:* npx @m5nv/make-template convert .
```

### Test Patterns

Use the `--dry-run` flag to preview pattern matches:

```bash
npx @m5nv/make-template convert --dry-run
```

### Pattern Testing Tools

Test patterns against sample content:

```javascript
// Test JSONPath
const jsonpath = require('jsonpath-plus');
const result = jsonpath({path: '$.name', json: {name: 'test'}});

// Test CSS selectors
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<h1>Test</h1>');
const matches = dom.window.document.querySelectorAll('h1');
```

## Performance Considerations

### Pattern Efficiency

1. **Specific selectors** - Prefer specific selectors over wildcards
2. **Limited matches** - Use `allowMultiple: false` when possible
3. **Simple patterns** - Avoid complex regex when simple string matching works

### File Size Limits

- **Default limit**: 1MB per file
- **Configurable**: Adjust in `.templatize.json`
- **Performance**: Larger files take proportionally longer

## Migration Guide

### From Manual Placeholders

When migrating from manual placeholder systems:

1. **Identify patterns** - Find common placeholder usage
2. **Create patterns** - Convert to automatic detection rules
3. **Test migration** - Ensure no functionality loss
4. **Gradual rollout** - Test with subset of templates first

### Version Compatibility

- **v1.0.0**: Initial templatization system
- **Backwards compatible**: Existing templates continue working
- **Opt-in feature**: Templatization is enabled by default but can be disabled

## Troubleshooting

### Common Issues

**Pattern not matching expected content**
- Verify selector/regex syntax
- Check file encoding and format
- Test pattern against sample content

**Performance issues with large files**
- Reduce pattern complexity
- Use more specific selectors
- Consider file size limits

**Conflicts with manual placeholders**
- Manual placeholders take precedence
- Use skip regions for complex cases
- Review pattern specificity

### Getting Help

1. **Check logs** - Enable debug logging for detailed information
2. **Validate config** - Use `make-template validate` to check configuration
3. **Test patterns** - Use `--dry-run` to preview matches
4. **Review examples** - Compare with working template configurations</content>
<parameter name="filePath">/Users/vijay/workspaces/ws-million-views/create/docs/reference/templatization-patterns.md