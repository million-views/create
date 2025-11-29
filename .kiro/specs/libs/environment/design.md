# Design: Environment Module

## Overview

Extract the Environment object definition from `setup-runtime.mjs` into a dedicated `lib/environment/` module that serves as the single source of truth for the template author contract.

## Module Structure

```
lib/environment/
├── index.mjs           # Main exports
├── context.mjs         # ctx object definition and factory
├── tools/
│   ├── index.mjs       # tools object composition
│   ├── files.mjs       # tools.files API
│   ├── json.mjs        # tools.json API  
│   ├── text.mjs        # tools.text API
│   ├── placeholders.mjs # tools.placeholders API
│   ├── templates.mjs   # tools.templates API
│   ├── inputs.mjs      # tools.inputs API
│   ├── options.mjs     # tools.options API
│   └── logger.mjs      # tools.logger API
├── testing.mjs         # Test utilities
└── types.d.ts          # TypeScript definitions
```

## Type Definitions

### Environment Interface

```typescript
// lib/environment/types.d.ts

/**
 * The Environment object passed to template setup scripts.
 * This is the primary contract between the CLI and template authors.
 */
export interface Environment {
  /** Immutable context describing the project being generated */
  readonly ctx: Context;
  /** Curated helper library for manipulating the scaffold */
  readonly tools: Tools;
}

/**
 * Immutable context about the project being scaffolded.
 * All properties are frozen and read-only.
 */
export interface Context {
  /** Sanitized project name (letters, numbers, hyphen, underscore) */
  readonly projectName: string;
  /** Absolute path to the project directory */
  readonly projectDir: string;
  /** Directory where the CLI command was executed */
  readonly cwd: string;
  /** Directory name for template assets (default: '__scaffold__') */
  readonly authorAssetsDir: string;
  /** Placeholder values collected during instantiation */
  readonly inputs: Readonly<Record<string, string | number | boolean>>;
  /** Template-defined constants from template.json */
  readonly constants: Readonly<Record<string, unknown>>;
  /** Normalized user selections with defaults applied */
  readonly options: ContextOptions;
}

export interface ContextOptions {
  /** Raw option strings as provided by user */
  readonly raw: readonly string[];
  /** Options organized by dimension name */
  readonly byDimension: Readonly<Record<string, string | readonly string[]>>;
}

/**
 * Curated helper APIs for setup scripts.
 * All operations are scoped to the project directory.
 */
export interface Tools {
  readonly placeholders: PlaceholdersApi;
  readonly inputs: InputsApi;
  readonly files: FilesApi;
  readonly json: JsonApi;
  readonly templates: TemplatesApi;
  readonly text: TextApi;
  readonly logger: LoggerApi;
  readonly options: OptionsApi;
}

// ... individual API interfaces ...
```

## Factory Functions

### createContext

```javascript
// lib/environment/context.mjs

/**
 * @typedef {Object} CreateContextOptions
 * @property {string} projectName - Sanitized project name
 * @property {string} projectDirectory - Path to project directory
 * @property {string} [cwd] - Current working directory (default: process.cwd())
 * @property {string} [authorAssetsDir] - Assets directory name (default: '__scaffold__')
 * @property {Record<string, any>} [inputs] - Placeholder values
 * @property {Record<string, any>} [constants] - Template constants
 * @property {Object} [options] - User selections
 */

export const DEFAULT_AUTHOR_ASSETS_DIR = '__scaffold__';

/**
 * Create an immutable Context object.
 * @param {CreateContextOptions} options
 * @returns {Context}
 */
export function createContext(options) {
  const {
    projectName,
    projectDirectory,
    cwd = process.cwd(),
    authorAssetsDir = DEFAULT_AUTHOR_ASSETS_DIR,
    inputs = {},
    constants = {},
    options: userOptions = { raw: [], byDimension: {} }
  } = options;

  // Validation
  if (!projectName || typeof projectName !== 'string') {
    throw new Error('createContext: projectName is required and must be a string');
  }
  if (!projectDirectory || typeof projectDirectory !== 'string') {
    throw new Error('createContext: projectDirectory is required and must be a string');
  }

  const resolvedDir = path.resolve(projectDirectory);

  return Object.freeze({
    projectName,
    projectDir: resolvedDir,
    cwd,
    authorAssetsDir,
    inputs: Object.freeze({ ...inputs }),
    constants: Object.freeze({ ...constants }),
    options: Object.freeze({
      raw: Object.freeze([...(userOptions.raw || [])]),
      byDimension: Object.freeze(
        Object.fromEntries(
          Object.entries(userOptions.byDimension || {}).map(([k, v]) => [
            k,
            Array.isArray(v) ? Object.freeze([...v]) : v
          ])
        )
      )
    })
  });
}
```

### createTools

```javascript
// lib/environment/tools/index.mjs

import { buildFilesApi } from './files.mjs';
import { buildJsonApi } from './json.mjs';
import { buildTextApi } from './text.mjs';
import { buildPlaceholdersApi } from './placeholders.mjs';
import { buildTemplatesApi } from './templates.mjs';
import { buildInputsApi } from './inputs.mjs';
import { buildOptionsApi } from './options.mjs';
import { buildLoggerApi } from './logger.mjs';

/**
 * @typedef {Object} CreateToolsOptions
 * @property {string} projectDirectory - Absolute path to project directory
 * @property {string} [authorAssetsDir] - Assets directory name
 * @property {string} [placeholderFormat] - Placeholder format (default: 'unicode')
 * @property {Record<string, any>} [inputs] - Placeholder values for replacement
 * @property {string} [projectName] - Project name for placeholder replacement
 * @property {Object} [dimensions] - Dimension definitions from template.json
 * @property {Object} [options] - User selections
 * @property {Object} [logger] - Logger instance
 */

/**
 * Create an immutable Tools object.
 * @param {CreateToolsOptions} options
 * @returns {Tools}
 */
export function createTools(options) {
  const {
    projectDirectory,
    authorAssetsDir = '__scaffold__',
    placeholderFormat = 'unicode',
    inputs = {},
    projectName = '',
    dimensions = {},
    options: userOptions = { raw: [], byDimension: {} },
    logger = null
  } = options;

  const root = path.resolve(projectDirectory);

  return Object.freeze({
    placeholders: buildPlaceholdersApi(root, { projectName, inputs, placeholderFormat }),
    inputs: buildInputsApi(inputs),
    files: buildFilesApi(root),
    json: buildJsonApi(root),
    templates: buildTemplatesApi(root, authorAssetsDir, placeholderFormat),
    text: buildTextApi(root),
    logger: buildLoggerApi(logger),
    options: buildOptionsApi({ options: userOptions, dimensions })
  });
}
```

### createEnvironment

```javascript
// lib/environment/index.mjs

import { createContext, DEFAULT_AUTHOR_ASSETS_DIR, DEFAULT_AUTHORING_MODE } from './context.mjs';
import { createTools } from './tools/index.mjs';

export { createContext, createTools };
export { DEFAULT_AUTHOR_ASSETS_DIR, DEFAULT_AUTHORING_MODE };

/**
 * @typedef {Object} CreateEnvironmentOptions
 * @property {string} projectName
 * @property {string} projectDirectory
 * @property {Object} [templateContext] - Template metadata
 * @property {Object} [dimensions] - Dimension definitions
 * @property {Object} [options] - User selections
 * @property {Object} [logger] - Logger instance
 */

/**
 * Create a complete Environment object with ctx and tools.
 * @param {CreateEnvironmentOptions} options
 * @returns {Environment}
 */
export function createEnvironment(options) {
  const {
    projectName,
    projectDirectory,
    templateContext = {},
    dimensions = {},
    options: userOptions = { raw: [], byDimension: {} },
    logger = null
  } = options;

  const ctx = createContext({
    projectName,
    projectDirectory,
    authoring: templateContext.authoring,
    authorAssetsDir: templateContext.authorAssetsDir,
    inputs: templateContext.inputs,
    constants: templateContext.constants,
    options: userOptions
  });

  const tools = createTools({
    projectDirectory,
    authorAssetsDir: templateContext.authorAssetsDir,
    placeholderFormat: templateContext.placeholderFormat,
    inputs: templateContext.inputs,
    projectName,
    dimensions,
    options: userOptions,
    logger
  });

  return Object.freeze({ ctx, tools });
}
```

## Test Utilities

```javascript
// lib/environment/testing.mjs

import { createContext, createTools, createEnvironment } from './index.mjs';
import path from 'path';
import os from 'os';

/**
 * Default values for test environments
 */
export const TEST_DEFAULTS = Object.freeze({
  projectName: 'test-project',
  projectDirectory: path.join(os.tmpdir(), 'test-project'),
  authorAssetsDir: '__scaffold__',
  placeholderFormat: 'unicode'
});

/**
 * Create a minimal valid Context for testing.
 * @param {Partial<CreateContextOptions>} overrides
 * @returns {Context}
 */
export function createTestContext(overrides = {}) {
  return createContext({
    projectName: TEST_DEFAULTS.projectName,
    projectDirectory: TEST_DEFAULTS.projectDirectory,
    ...overrides
  });
}

/**
 * Create minimal valid Tools for testing.
 * Requires projectDirectory to exist for file operations to work.
 * @param {Partial<CreateToolsOptions>} overrides
 * @returns {Tools}
 */
export function createTestTools(overrides = {}) {
  return createTools({
    projectDirectory: TEST_DEFAULTS.projectDirectory,
    ...overrides
  });
}

/**
 * Create a complete test Environment with sensible defaults.
 * @param {Object} overrides
 * @param {Partial<Context>} [overrides.ctx] - Context property overrides
 * @param {Object} [overrides.tools] - Tools options overrides
 * @returns {Environment}
 */
export function createTestEnvironment(overrides = {}) {
  const { ctx: ctxOverrides = {}, ...toolsOverrides } = overrides;
  
  return createEnvironment({
    projectName: ctxOverrides.projectName ?? TEST_DEFAULTS.projectName,
    projectDirectory: ctxOverrides.projectDir ?? TEST_DEFAULTS.projectDirectory,
    templateContext: {
      inputs: ctxOverrides.inputs,
      constants: ctxOverrides.constants,
      authoring: ctxOverrides.authoring,
      authorAssetsDir: ctxOverrides.authorAssetsDir,
      placeholderFormat: toolsOverrides.placeholderFormat
    },
    dimensions: toolsOverrides.dimensions,
    options: ctxOverrides.options,
    logger: toolsOverrides.logger
  });
}
```

## Migration Plan

### Phase 1: Create New Module (Non-Breaking)
1. Create `lib/environment/` directory structure
2. Extract type definitions and factory functions
3. Add comprehensive tests for the new module
4. Export everything from `lib/environment/index.mjs`

### Phase 2: Migrate Consumers (Low Risk)
1. Update `setup-runtime.mjs` to import from `lib/environment/`
2. Update `guided-setup-workflow.mjs` to use `createEnvironment()`
3. Update tests to use `createTestEnvironment()`

### Phase 3: Cleanup
1. Remove duplicate code from `setup-runtime.mjs`
2. `setup-runtime.mjs` retains only sandbox execution logic
3. Update documentation to reference the new module

## Files to Create

1. `lib/environment/index.mjs` - Main exports
2. `lib/environment/context.mjs` - Context factory
3. `lib/environment/tools/index.mjs` - Tools composition
4. `lib/environment/tools/files.mjs` - Files API
5. `lib/environment/tools/json.mjs` - JSON API
6. `lib/environment/tools/text.mjs` - Text API
7. `lib/environment/tools/placeholders.mjs` - Placeholders API
8. `lib/environment/tools/templates.mjs` - Templates API
9. `lib/environment/tools/inputs.mjs` - Inputs API
10. `lib/environment/tools/options.mjs` - Options API
11. `lib/environment/tools/logger.mjs` - Logger API
12. `lib/environment/testing.mjs` - Test utilities
13. `lib/environment/types.d.ts` - TypeScript definitions
14. `tests/environment/` - Test files for new module

## Files to Modify

1. `bin/create-scaffold/modules/setup-runtime.mjs` - Import from environment module
2. `bin/create-scaffold/modules/guided-setup-workflow.mjs` - Use createEnvironment()
3. `tests/create-scaffold/setup-runtime.test.mjs` - Use createTestEnvironment()
4. `docs/reference/environment.md` - Reference the authoritative module

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing setup scripts | High | No API changes to ctx/tools shape |
| Test failures from import changes | Medium | Run full test suite after each phase |
| Documentation drift | Low | JSDoc is authoritative, generate docs |
| Performance regression | Low | Profile before/after, same operations |
