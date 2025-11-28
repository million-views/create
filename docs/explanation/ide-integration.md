---
title: "IDE Integration"
description: "How templates can include IDE-specific configurations and settings"
type: explanation
audience: "template-authors"
estimated_time: "3 minutes read"
prerequisites:
  - "Understanding of project scaffolding concepts"
related_docs:
  - "../how-to/creating-templates.md"
  - "../reference/environment.md"
  - "../how-to/setup-recipes.md"
last_updated: "2025-11-12"
---

# IDE Integration

## Overview

@m5nv/create allows template authors to include IDE-specific configurations using the `__scaffold__` directory mechanism. Templates can ship curated IDE settings that get copied to the project during setup.

## How It Works

Templates can include IDE configuration files in their `__scaffold__` directory. During project creation, these files are copied to the project root using `tools.templates.copy()`.

```javascript
// In template _setup.mjs
export default async function setup({ ctx, tools }) {
  // Copy VSCode configuration
  await tools.templates.copy('.vscode', '.vscode');
  
  // Copy Cursor configuration  
  await tools.templates.copy('.cursor', '.cursor');
  
  tools.logger.info('IDE configurations applied');
}
```

## Template Structure

```console
template/
├── __scaffold__/
│   ├── .vscode/
│   │   ├── settings.json
│   │   ├── extensions.json
│   │   └── launch.json
│   ├── .cursor/
│   │   └── config.json
│   └── .windsurf/
│       └── settings.json
├── src/
└── _setup.mjs
```

## Supported IDEs

Templates can include configurations for any IDE. Common examples include:

- **VS Code**: `.vscode/settings.json`, `.vscode/extensions.json`, `.vscode/launch.json`
- **Cursor**: `.cursor/config.json` 
- **Windsurf**: `.windsurf/settings.json`
- **Kiro**: `.kiro/settings.json`

## Conditional IDE Configuration

The CLI supports an `--ide` flag that allows users to specify their preferred IDE. This value is available in the setup context as `ctx.ide`.

```javascript
// Conditional IDE setup
export default async function setup({ ctx, tools }) {
  if (ctx.ide === 'vscode') {
    await tools.templates.copy('.vscode', '.vscode');
  } else if (ctx.ide === 'cursor') {
    await tools.templates.copy('.cursor', '.cursor');
  } else if (ctx.ide === 'windsurf') {
    await tools.templates.copy('.windsurf', '.windsurf');
  }
  
  tools.logger.info(`IDE configuration applied for ${ctx.ide || 'default'}`);
}
```

## Best Practices

### Include What Matters

Focus on configurations that improve the development experience:

- **Code formatting settings** (indentation, line endings)
- **Extension recommendations** for language support
- **Debug configurations** for common scenarios
- **Workspace settings** that work well with the template

### Keep It Optional

IDE configurations should enhance but not require specific tooling. Templates work universally regardless of IDE choice.

### Test Across Environments

Verify that your template works well with and without IDE-specific configurations.
