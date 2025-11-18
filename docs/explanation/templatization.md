---
title: "Intelligent Templatization"
description: "Automatic content detection and placeholder replacement system"
type: explanation
audience: "intermediate"
estimated_time: "8 minutes read"
prerequisites:
  - "Understanding of template systems"
  - "Basic knowledge of JSX, JSON, Markdown, or HTML"
related_docs:
  - "../tutorial/make-template.md"
  - "../how-to/creating-templates.md"
  - "../reference/template-schema.md"
last_updated: "2025-11-18"
---

# Intelligent Templatization

## Overview

The intelligent templatization system automatically detects project-specific content in source files and replaces it with reusable placeholders. This eliminates manual placeholder insertion while maintaining full control over what gets templatized.

## How It Works

### Content Detection Pipeline

1. **File Type Analysis**: Identifies supported file types (JSX, JSON, Markdown, HTML)
2. **AST/Content Parsing**: Uses appropriate parsers to analyze file structure
3. **Pattern Matching**: Applies configurable patterns to detect templatable content
4. **Placeholder Generation**: Creates standardized placeholder names
5. **Position Calculation**: Tracks exact replacement positions for safe modifications

### Supported File Types

#### JSX/TSX Files
**Parser**: Tree-sitter with JSX grammar
**Targets**: String literals in text content and attributes

```javascript
// Input
<h1>Welcome to My App</h1>
<div title="My Application">Content</div>

// Output
<h1>{CONTENT_TITLE}</h1>
<div title="{CONTENT_TITLE}">Content</div>
```

#### JSON Files
**Parser**: JSONPath-based traversal
**Targets**: String values in object properties

```json
{
  "name": "my-awesome-app",
  "description": "An awesome application",
  "version": "1.0.0"
}
```

Becomes:
```json
{
  "name": "{PACKAGE_NAME}",
  "description": "{PACKAGE_DESCRIPTION}",
  "version": "1.0.0"
}
```

#### Markdown Files
**Parser**: Hybrid regex/tree-sitter
**Targets**: Headings, frontmatter, and content

```markdown
# My Awesome Project

This is my awesome project description.

---
title: My Awesome Project
description: An awesome project
---
```

Becomes:
```markdown
# {CONTENT_TITLE}

This is {CONTENT_DESCRIPTION}.

---
title: {CONTENT_TITLE}
description: {CONTENT_DESCRIPTION}
---
```

#### HTML Files
**Parser**: JSDOM-based DOM parsing
**Targets**: Text content and attribute values

```html
<title>My App</title>
<meta name="description" content="My awesome app">
<h1>Welcome</h1>
```

Becomes:
```html
<title>{CONTENT_TITLE}</title>
<meta name="description" content="{CONTENT_DESCRIPTION}">
<h1>{CONTENT_TITLE}</h1>
```

## Configuration System

### .templatize.json Structure

Templates include a `.templatize.json` configuration file that defines detection patterns:

```json
{
  "version": "1.0.0",
  "patterns": {
    "jsx": [
      {
        "selector": "h1,h2,h3,h4,h5,h6",
        "attribute": null,
        "placeholder": "CONTENT_TITLE"
      }
    ],
    "json": [
      {
        "path": "$.name",
        "placeholder": "PACKAGE_NAME"
      }
    ],
    "markdown": [
      {
        "pattern": "^#\\s+(.+)$",
        "placeholder": "CONTENT_TITLE"
      }
    ],
    "html": [
      {
        "selector": "title",
        "attribute": null,
        "placeholder": "CONTENT_TITLE"
      }
    ]
  }
}
```

### Pattern Configuration

Each file type supports different configuration approaches:

- **JSX/HTML**: CSS selectors with optional attribute targeting
- **JSON**: JSONPath expressions
- **Markdown**: Regular expressions with capture groups

## Control Mechanisms

### Skip Regions

Exclude content from templatization using skip markers:

```javascript
/* @template-skip */
const hardcodedValue = "This won't be templatized";
/* @template-end-skip */
```

### Manual Placeholder Precedence

Existing placeholders take precedence over auto-detection:

```javascript
// This manual placeholder is preserved
<h1>{MANUAL_TITLE}</h1>

// This gets auto-templatized
<h2>Auto Title</h2>
```

## Command Line Options

### Convert Command Options

```bash
# Enable templatization (default)
npx @m5nv/make-template convert .

# Preview changes without applying
npx @m5nv/make-template convert --dry-run

# Skip automatic templatization
npx @m5nv/make-template convert --no-auto-detect
```

### Initialization

```bash
# Create template with default templatization config
npx @m5nv/make-template init
```

## Security Considerations

### Input Validation
- All file paths and selectors are validated
- JSONPath expressions are syntax-checked
- Regular expressions are safe from ReDoS attacks

### Safe Processing
- Files are processed read-only until validation passes
- Position-based replacements prevent content corruption
- Malformed files are skipped with warnings

## Performance Characteristics

### Processing Speed
- **Target**: < 100ms per file for files < 1MB
- **Optimization**: Lazy parser loading and AST caching
- **Limits**: Reasonable file size restrictions

### Memory Usage
- **Bounded**: Memory usage scales with file size, not complexity
- **Cleanup**: Automatic cleanup of parser instances
- **Monitoring**: Built-in performance tracking

## Troubleshooting

### Common Issues

**Templatization not working on JSX files**
- Ensure Tree-sitter parsers are installed
- Check file syntax is valid JSX
- Verify selectors match element structure

**JSONPath not matching expected values**
- Test JSONPath expressions with online validators
- Check JSON syntax is valid
- Verify path matches actual data structure

**Markdown patterns not matching**
- Test regex patterns with sample content
- Ensure capture groups are properly defined
- Check for multiline content handling

### Debug Mode

Enable verbose logging for troubleshooting:

```bash
DEBUG=templatize:* npx @m5nv/make-template convert .
```

## Best Practices

### Template Authoring
1. **Test templatization** on sample projects before publishing
2. **Use skip regions** for content that should remain hardcoded
3. **Customize patterns** for project-specific needs
4. **Validate templates** after conversion

### Pattern Design
1. **Use descriptive placeholders** that indicate content type
2. **Group related content** under consistent placeholder names
3. **Test patterns** on diverse content structures
4. **Document custom patterns** for template users

## Future Enhancements

### Planned Features
- **Custom placeholder formats** beyond `{PLACEHOLDER}` syntax
- **Template inheritance** for pattern reuse
- **Interactive pattern editing** during conversion
- **Pattern validation** against sample content

### Extension Points
- **Plugin system** for additional file types
- **Custom parsers** for domain-specific formats
- **Pattern libraries** for common use cases</content>
<parameter name="filePath">/Users/vijay/workspaces/ws-million-views/create/docs/explanation/templatization.md