# Configuration File Design

## Overview

Implement support for `.m5nvrc` configuration files that provide default CLI
arguments. The design introduces a dedicated configuration loader, integrates it
into the CLI bootstrap sequence, and defines precedence rules so flags and
environment variables continue to override configuration-sourced values.

## Goals Alignment

- Reduce repeated flags by loading default repo/branch/author/placeholders.
- Preserve existing security guarantees by reusing validation utilities.
- Keep implementation lightweight and dependency-free.

## Architecture

### Components

1. **Config Loader (`bin/configLoader.mjs`)**
   - Exposes `loadConfig({ cwd, env, skip })`.
   - Determines candidate paths based on discovery rules:
     1. `CREATE_SCAFFOLD_CONFIG_PATH` if present.
     2. Project-level `.m5nvrc` in `cwd`.
     3. User config directory (`~/.config/m5nv/rc.json` or `%APPDATA%/m5nv/rc.json`).
   - Returns `{ path, defaults }` when a config is loaded, otherwise `null`.
   - sanitizes/validates parsed JSON using existing helpers (argument + security
     modules) before returning values.

2. **CLI Integration (`bin/index.mjs`)**
   - Invoke config loader immediately after parsing CLI arguments.
   - If `--no-config` flag is set, skip invocation entirely.
   - Merge configuration defaults into the mutable `args` object only for fields
     that are currently undefined.
   - Extend verbose/log outputs with metadata referencing the config source.

3. **Argument Parser Updates (`bin/argumentParser.mjs`)**
   - Add `--no-config` boolean flag with `parseArgs` definition.
   - Document flag in generated help text.

4. **Logger Integration (`bin/logger.mjs`)**
   - Add optional `logOperation('config_load', ...)` entry when config is used.
   - Ensure placeholders and other sensitive values are masked prior to logging.

5. **Placeholder Handling**
   - Configuration `placeholders` values merge into `args.placeholders` only
     when CLI/environment inputs are absent.
   - Continue to rely on `resolvePlaceholders` for processing; configuration
     values feed the same pipeline as flag/env-sourced overrides.

### Data Structures

Configuration JSON maps to:

```json
{
  "repo": "owner/templates",
  "branch": "main",
  "author": {
    "name": "Example Dev",
    "email": "dev@example.com",
    "url": "https://example.com"
  },
  "placeholders": {
    "PACKAGE_NAME": "acme-app"
  }
}
```

Loader normalizes to internal shape:

```js
{
  repo: string | null,
  branch: string | null,
  author: {
    name?: string,
    email?: string,
    url?: string
  } | null,
  placeholders: string[] // flattened NAME=value pairs for reuse with CLI logic
}
```

### Control Flow

1. Parse CLI arguments, capturing `--no-config`.
2. If not skipped, call `loadConfig` with `process.cwd()` and `process.env`.
3. On successful load:
   - Validate fields.
   - Merge defaults (only fill undefined CLI values).
   - Record config usage for verbose/logging.
4. Continue with existing validation + scaffolding pipeline.

### Validation Strategy

- Reuse `validateArguments` for repo/branch defaults.
- Add helper to validate author object (informational only, no hard failure on
  missing fields but enforce string type constraints).
- Convert `placeholders` object into array of `NAME=value` strings and let the
  placeholder resolver handle detailed validation later.
- On malformed JSON or schema violations, throw a `ValidationError` with a
  message including the offending path.

### Error Handling

- Differentiate between "file not found" (silent fallback) and parse/validation
  failures (hard exit with actionable message).
- Provide suggestion to run with `--no-config` if configuration is suspected to
  be corrupt.

### Logging

- Verbose output: `ℹ️  Using configuration defaults from <path>`.
- Logger entry includes sanitized metadata: `{ path, keys: ['repo','branch','author','placeholders'] }`.

### Tests

- **Unit Tests** (`test/config-loader.test.mjs`)
  - File discovery precedence scenarios.
  - Successful parsing/merging of repo/branch/author/placeholders.
  - Malformed JSON + invalid values with descriptive errors.
  - `--no-config` skip path.
- **Integration Tests** (`test/cli-integration.test.mjs` additions)
  - Config defaults applied when flags absent.
  - Flags overriding config values.
  - Config usage logged in verbose mode.
- **Argument Parser Tests**
  - Coverage for `--no-config` flag.

### Documentation Updates

- CLI reference: describe `.m5nvrc`, precedence, `--no-config`, environment
  override.
- Development guide: mention configuration loader module.
- Roadmap/status: reference progress on Phase 2 configuration file task.

## Open Questions

1. Do we load both user-level and project-level configs when `CREATE_SCAFFOLD_CONFIG_PATH` is unset, or do we stop at the first match? (Current plan: use first match.)
2. Should author defaults influence scaffold output immediately or remain informational for now?
3. Do we allow nested configuration beyond the specified keys (e.g., future-proofing for IDE/options defaults), or strictly validate known keys only?
