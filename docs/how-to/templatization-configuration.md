---
title: "Templatization Configuration Guide"
description: "How to create and customize .templatize.json configuration files"
type: how-to
audience: "intermediate"
estimated_time: "20 minutes read"
prerequisites:
  - "Understanding of templatization concepts"
  - "../explanation/templatization.md"
related_docs:
  - "../reference/templatization-patterns.md"
  - "../explanation/templatization.md"
last_updated: "2025-11-18"
---

# Templatization Configuration Guide

## Overview

This guide shows you how to create and customize `.templatize.json` configuration files to control how the templatization system processes your template files. The configuration system allows you to define exactly which parts of your files should be replaced with placeholders during template conversion.

## Quick Start

### Generate Default Configuration

The easiest way to get started is to generate the default configuration:

```bash
# Navigate to your template project
cd my-template-project

# Initialize configuration files
make-template init
```

The `init` command creates both configuration files:
- `template.json` - Template metadata and placeholder definitions
- `.templatize.json` - Templatization rules and patterns

### Basic Conversion

Once configured, convert your template:

```bash
# Convert with default settings
make-template convert .

# Preview changes without making them
make-template convert . --dry-run

# Convert without confirmation prompts (for automation)
make-template convert . --yes
```

## Configuration Structure

### Basic File Structure

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

### Configuration Properties

- **`version`** (required): Configuration format version (currently "1.0")
- **`autoDetect`** (required): Whether to automatically detect and process files (recommended: `true`)
- **`rules`** (required): Object mapping file patterns to pattern arrays

## File Pattern Matching

### Specific Files

Target exact filenames:

```json
{
  "rules": {
    "package.json": [
      {
        "context": "application/json",
        "path": "$.name",
        "placeholder": "PACKAGE_NAME"
      }
    ],
    "index.html": [
      {
        "context": "text/html",
        "selector": "title",
        "placeholder": "PAGE_TITLE"
      }
    ]
  }
}
```

### File Extensions

Target all files with specific extensions:

```json
{
  "rules": {
    ".jsx": [
      {
        "context": "text/jsx",
        "selector": "h1",
        "placeholder": "COMPONENT_TITLE"
      }
    ],
    ".md": [
      {
        "context": "text/markdown#heading",
        "selector": "h1",
        "placeholder": "DOCUMENT_TITLE"
      }
    ]
  }
}
```

## Pattern Configuration Examples

### JSON Files (package.json, config.json, etc.)

```json
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

### Markdown Files (README.md, docs, etc.)

```json
{
  "README.md": [
    {
      "context": "text/markdown#heading",
      "selector": "h1",
      "placeholder": "PROJECT_TITLE"
    }
  ]
}
```

### JSX/TSX Files (React components)

```json
{
  ".jsx": [
    {
      "context": "text/jsx",
      "selector": "h1:first-child",
      "placeholder": "PAGE_TITLE"
    },
    {
      "context": "text/jsx",
      "selector": ".description, [data-description]",
      "placeholder": "CONTENT_DESCRIPTION",
      "allowMultiple": true
    },
    {
      "context": "text/jsx#attribute",
      "selector": "[title]",
      "placeholder": "ELEMENT_TITLE",
      "allowMultiple": true
    },
    {
      "context": "text/jsx#attribute",
      "selector": "[aria-label]",
      "placeholder": "ACCESSIBILITY_LABEL",
      "allowMultiple": true
    }
  ]
}
```

### HTML Files

```json
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
      "placeholder": "MAIN_HEADING"
    },
    {
      "context": "text/html#attribute",
      "selector": "meta[name='description'][content]",
      "placeholder": "META_DESCRIPTION"
    },
    {
      "context": "text/html#attribute",
      "selector": "link[rel='icon'][href]",
      "placeholder": "FAVICON_PATH"
    }
  ]
}
```

## Advanced Configuration Techniques

### Conditional Patterns

Use multiple patterns for the same file type with different conditions:

```json
{
  ".jsx": [
    {
      "context": "text/jsx",
      "selector": "h1:first-child",
      "placeholder": "MAIN_TITLE"
    },
    {
      "context": "text/jsx",
      "selector": "h2:first-child",
      "placeholder": "SUB_TITLE"
    },
    {
      "context": "text/jsx",
      "selector": ".hero-title",
      "placeholder": "HERO_TITLE"
    }
  ]
}
```

### Multiple Matches

Allow patterns to match multiple occurrences:

```json
{
  ".md": [
    {
      "context": "text/markdown#heading",
      "selector": "h2",
      "placeholder": "SECTION_TITLE",
      "allowMultiple": true
    }
  ]
}
```

### Complex Selectors

Use CSS selector syntax for precise targeting:

```json
{
  ".jsx": [
    {
      "context": "text/jsx",
      "selector": ".header > h1:first-child",
      "placeholder": "HEADER_TITLE"
    },
    {
      "context": "text/jsx",
      "selector": ".sidebar h3, aside h3",
      "placeholder": "SIDEBAR_HEADING",
      "allowMultiple": true
    }
  ]
}
```

## Customizing for Your Project

### Step 1: Analyze Your Template Files

First, identify which files and content you want to templatize:

```bash
# List files in your template
find . -type f -name "*.json" -o -name "*.md" -o -name "*.jsx" -o -name "*.html" | head -20
```

### Step 2: Identify Content to Replace

Look at your template files and identify:
- Project names and titles
- Descriptions and content
- Configuration values
- File paths and URLs
- User-specific information

### Step 3: Create Patterns

For each piece of content, create appropriate patterns:

```json
{
  "version": "1.0",
  "autoDetect": true,
  "rules": {
    "package.json": [
      {
        "context": "application/json",
        "path": "$.name",
        "placeholder": "MY_PROJECT_NAME"
      }
    ],
    "src/App.jsx": [
      {
        "context": "text/jsx",
        "selector": ".welcome-message",
        "placeholder": "WELCOME_MESSAGE"
      }
    ]
  }
}
```

### Step 4: Test Your Configuration

Test your configuration with sample data:

```bash
# Create a test conversion
make-template convert . --dry-run

# Check the output
cat converted-files/
```

## Common Configuration Patterns

### React Application Template

```json
{
  "version": "1.0",
  "autoDetect": true,
  "rules": {
    "package.json": [
      {
        "context": "application/json",
        "path": "$.name",
        "placeholder": "APP_NAME"
      },
      {
        "context": "application/json",
        "path": "$.description",
        "placeholder": "APP_DESCRIPTION"
      }
    ],
    "public/index.html": [
      {
        "context": "text/html",
        "selector": "title",
        "placeholder": "APP_TITLE"
      }
    ],
    "src/App.jsx": [
      {
        "context": "text/jsx",
        "selector": "h1",
        "placeholder": "MAIN_HEADING"
      }
    ],
    "README.md": [
      {
        "context": "text/markdown#heading",
        "selector": "h1",
        "placeholder": "PROJECT_TITLE"
      }
    ],
  }
}
```

### Node.js Library Template

```json
{
  "version": "1.0",
  "autoDetect": true,
  "rules": {
    "package.json": [
      {
        "context": "application/json",
        "path": "$.name",
        "placeholder": "LIBRARY_NAME"
      },
      {
        "context": "application/json",
        "path": "$.description",
        "placeholder": "LIBRARY_DESCRIPTION"
      },
      {
        "context": "application/json",
        "path": "$.main",
        "placeholder": "MAIN_ENTRY_POINT"
      }
    ],
    "README.md": [
      {
        "context": "text/markdown#heading",
        "selector": "h1",
        "placeholder": "LIBRARY_TITLE"
      }
    ],
  }
}
```

### Documentation Site Template

```json
{
  "version": "1.0",
  "autoDetect": true,
  "rules": {
    "package.json": [
      {
        "context": "application/json",
        "path": "$.name",
        "placeholder": "SITE_NAME"
      }
    ],
    ".html": [
      {
        "context": "text/html",
        "selector": "title",
        "placeholder": "PAGE_TITLE"
      },
      {
        "context": "text/html",
        "selector": "h1:first-child",
        "placeholder": "MAIN_HEADING"
      }
    ],
    ".md": [
      {
        "context": "text/markdown#heading",
        "selector": "h1",
        "placeholder": "DOCUMENT_TITLE"
      }
    ]
  }
}
```

## Validation and Debugging

### Validate Configuration

Check your configuration for errors:

```bash
# Validate the .templatize.json configuration file
make-template config validate

# Validate a specific configuration file
make-template config validate custom-config.json
```

### Debug Pattern Matching

Enable verbose output to see what's happening:

```bash
# Enable verbose output during conversion
make-template convert . --verbose
```

This shows detailed information about:
- Configuration loading
- File discovery and processing
- Pattern matching attempts
- Successful replacements
- Errors and warnings
- File discovery
- Pattern matching attempts
- Successful replacements
- Errors and warnings

### Common Issues

**Pattern not matching:**
- Check selector syntax
- Verify file content structure
- Use more specific selectors

**Invalid configuration:**
- Validate JSON syntax
- Check required properties
- Review pattern type requirements

**Unexpected replacements:**
- Review `allowMultiple` settings
- Check for overlapping patterns
- Test with minimal configuration

## Best Practices

### Configuration Organization
- Group related patterns together
- Use consistent placeholder naming
- Comment complex selectors
- Keep configurations version controlled

### Performance Optimization
- Use specific selectors over broad ones
- Limit `allowMultiple` when possible
- Test with representative file sizes
- Monitor conversion times

### Maintenance
- Update patterns as templates evolve
- Document custom patterns for team members
- Regularly test configurations
- Keep backup configurations

## Migration from Previous Versions

Since this is a pre-release system, there are no migration concerns. The configuration system is designed to be:
- **Forwards compatible**: New pattern types can be added without breaking existing configs
- **Backwards compatible**: Unknown properties are ignored with warnings
- **Extensible**: Easy to add new file types and pattern types

Start with the default configuration and customize as needed for your specific use case.