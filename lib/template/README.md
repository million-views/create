# Template Domain

The template domain provides template discovery and ignore utilities for working with template repositories.

## Overview

This domain exports:

- **TemplateDiscovery** - Discovers and lists templates from repositories
- **createTemplateIgnoreSet** - Creates ignore sets for template artifacts
- **shouldIgnoreTemplateEntry** - Checks if an entry should be ignored
- **stripIgnoredFromTree** - Removes ignored entries from tree output

## Usage

```typescript
import { template } from '../index.mts';

// Create a template discovery instance
const discovery = new template.TemplateDiscovery(cacheManager);

// List templates from a repository
const templates = await discovery.listTemplates('user/repo', 'main');

// Create an ignore set
const ignoreSet = template.createTemplateIgnoreSet({
  authorAssetsDir: 'template-assets',
  extra: ['.DS_Store']
});

// Check if entry should be ignored
if (template.shouldIgnoreTemplateEntry('node_modules', ignoreSet)) {
  // Skip this entry
}

// Clean tree output
const cleanTree = template.stripIgnoredFromTree(treeOutput, ignoreSet);
```

## Module Structure

```text
template/
├── index.mts      # Domain facade
├── discover.mjs   # Template discovery
└── ignore.mjs     # Template ignore utilities
```

## API Reference

### TemplateDiscovery

Discovers and lists templates from repositories or local directories.

```typescript
class TemplateDiscovery {
  constructor(cacheManager: CacheManager);
  
  listTemplates(repoUrl: string, branchName?: string): Promise<Template[]>;
  listTemplatesFromPath(dirPath: string): Promise<Template[]>;
}

interface Template {
  id: string;
  name: string;
  description: string;
  path: string;
  placeholders: Placeholder[];
  dimensions?: Dimension[];
}
```

### createTemplateIgnoreSet

Creates a Set of entries that should be ignored during copy or preview operations.

```typescript
function createTemplateIgnoreSet(options?: IgnoreOptions): Set<string>;

interface IgnoreOptions {
  authorAssetsDir?: string;  // Author assets directory to ignore
  extra?: string[];          // Additional entries to ignore
}
```

### shouldIgnoreTemplateEntry

Checks if a filesystem entry should be ignored.

```typescript
function shouldIgnoreTemplateEntry(
  entryName: string, 
  ignoreSet?: Set<string>
): boolean;
```

### stripIgnoredFromTree

Removes ignored entries from a tree text output.

```typescript
function stripIgnoredFromTree(
  treeText: string, 
  ignoreSet?: Set<string>
): string;
```

## Default Ignored Entries

The following entries are always ignored:

| Entry | Reason |
|-------|--------|
| `.git` | Git repository data |
| `.template-undo.json` | Make-template undo log |
| `.templatize.json` | Templatization config |
| `node_modules` | Dependencies |
| `template.json` | Template metadata |

## Template Metadata

Templates are discovered by looking for `template.json` files:

```json
{
  "schemaVersion": "1.0.0",
  "id": "my-template",
  "name": "My Template",
  "description": "A starter template",
  "placeholderFormat": "mustache",
  "placeholders": {
    "PROJECT_NAME": {
      "description": "The project name",
      "type": "text"
    }
  }
}
```
