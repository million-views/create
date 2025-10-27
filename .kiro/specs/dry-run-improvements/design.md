# Design Document

## Overview

We will extend the dry-run experience so developers see a meaningful preview of operations, file/directory counts, and a tree view when available. The implementation touches the Dry Run Engine, CLI output formatting, and tests.

## Existing Architecture Review

- `bin/dryRunEngine.mjs` currently collects operations (`file_copy`, etc.) but does not aggregate counts or format output.
- `DryRunEngine.displayPreview()` handles console formatting; we need to enhance this routine.
- Tree command invocation should respect security guidelines (no shell injection, safe subprocess handling).
- Tests around dry-run live primarily in `test/cli-integration.test.mjs` and `test/dryRunEngine.test.mjs`.

## Proposed Changes

### 1. Data Aggregation (DryRunEngine)

Add helper methods within `DryRunEngine` to:
- Count files and directories from the operations array.
- Determine if `_setup.mjs` exists (already inspected during preview).
- Build a structure summarizing operations (e.g., `{ directories: [], files: [], setupScripts: [] }`).

### 2. Output Formatting

Update `DryRunEngine.displayPreview()` to:
- Print header with template name, repository, target directory.
- Show counts: number of directories, files, setup scripts.
- Show grouped operations with formatted relative paths.
- Append tree output:
  - Use `which tree` or `command -v tree` via `execCommand` wrapper.
  - If present, run `tree -L 2 <templatePath>`.
  - Otherwise, display a skip message.
- Maintain dry-run notice and success message at end.

### 3. Logging Integration

When a `Logger` instance exists, log structured dry-run summary (counts, operations list) without overflowing logs:
- Possibly limit to top-level info (counts + presence of setup script) to avoid noise.

### 4. Tests

Add/modify tests to cover:
- New counts and grouped operations.
- Tree output when `tree` is available; to avoid hard dependency, stub or inject a fake command (or detect & skip with message). Provide fixtures to simulate presence/absence by manipulating PATH within tests.
- Ensure dry-run still creates no files/directories.

### 5. Tree Command Detection Implementation Details

Use a helper in `dryRunEngine`:
- `await commandExists('tree')` implemented via `execCommand('command', ['-v', 'tree'], { stdio: ['ignore','pipe','ignore'] })`.
- When running `tree`, use read-only options and suppress color (`--noreport` to suppress summary).
- Limit depth `-L 2`.
- Capture stdout and append to output.

## Risks & Mitigations

- **Tree command not installed**: provide friendly message; tests should cover both branches.
- **Large templates**: limiting depth to 2 and using existing operations list keeps output manageable.
- **Performance**: operations are already collected; summarizing them is O(n), acceptable.

## Out of Scope

- Adding CLI flags to toggle tree display (future enhancement if needed).
- Displaying diffs of setup script behavior (only mention execution).
- Deep integration with logger beyond summary entries.
