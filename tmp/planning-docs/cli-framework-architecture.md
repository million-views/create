---
title: "CLI Framework Architecture"
description: "Clean separation between reusable CLI framework components and tool-specific definitions"
type: reference
audience: "developers"
estimated_time: "15 minutes"
prerequisites: []
related_docs:
  - "../reference/cli-reference.md"
  - "../how-to/creating-cli-tools.md"
last_updated: "2025-11-12"
---

# CLI Framework Architecture

## Overview

This project demonstrates a clean separation between **reusable CLI framework components** and **tool-specific definitions**, enabling the CLI functionality to be packaged and reused in unrelated projects.

## Architecture

### 🏗️ Reusable CLI Framework (`lib/cli/framework.mjs`)

**What it contains:**
- Argument parsing logic
- Help generation with progressive disclosure
- Command routing
- Validation schemas
- Common help patterns (DRY_RUN, VERBOSE_MODE, etc.)

**What it does NOT contain:**
- Tool-specific command definitions
- Tool-specific help text
- Tool-specific business logic

**Packaging:** This can be published as `@m5nv/cli-framework` and used in any Node.js CLI project.

### 🛠️ Tool-Specific Definitions

**Location:** `bin/{tool-name}/help-definitions.mjs`

**What it contains:**
- Command definitions with help text
- Tool-specific option configurations
- Command handlers

**Example structure:**
```javascript
// bin/my-tool/help-definitions.mjs
import { HELP_PATTERNS } from '../../lib/cli/framework.mjs';

export const MY_TOOL_HELP = {
  build: {
    description: 'Build the project',
    options: {
      ...HELP_PATTERNS.DRY_RUN, // Reuse common patterns
      output: { /* tool-specific options */ }
    }
  }
};
```

## Benefits

### ✅ Clean Separation of Concerns
- Framework is generic and reusable
- Tool definitions stay with their respective tools
- Easy to maintain and extend

### ✅ Packageable CLI Framework
- Framework can be published as standalone npm package
- Other projects can import and use the CLI components
- No tool-specific code in the framework

### ✅ Maintained Validation Benefits
- Schema validation still works
- Help completeness checking still automated
- Common patterns still reusable

### ✅ Easy Tool Extension
- New tools can define their own help without touching framework
- Framework updates don't break existing tools
- Tool-specific validation per tool

## Usage in New Projects

```javascript
// In a new project
import {
  createCommandRouter,
  HELP_PATTERNS,
  validateToolHelpDefinitions
} from '@m5nv/cli-framework';

// Define your tool's help
const MY_TOOL_HELP = { /* your commands */ };

// Validate and use
validateToolHelpDefinitions(MY_TOOL_HELP, 'my-tool');
const router = createCommandRouter({ commands: MY_TOOL_HELP, /* ... */ });
```

## Migration from Monolithic Design

**Before:** All help definitions in `lib/cli/help-definitions.mjs`
- ❌ Tightly coupled framework and tool definitions
- ❌ Hard to package framework separately
- ❌ Tool definitions mixed with generic code

**After:** Help definitions in `bin/{tool}/help-definitions.mjs`
- ✅ Framework is pure and reusable
- ✅ Tool definitions stay with tools
- ✅ Easy to package `@m5nv/cli-framework`
- ✅ Clean separation enables reuse

## Validation

Run help validation for all tools:
```bash
npm run validate:help
```

This validates that each tool's help definitions are complete and follow the schema.