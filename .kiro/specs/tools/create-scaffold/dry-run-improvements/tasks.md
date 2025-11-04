# Implementation Plan

- [x] 1. Update Dry Run data aggregation
  - Extend `DryRunEngine` to compute counts for files/directories/setup scripts
  - Capture grouped operations for display and logging
  - Ensure summary is returned alongside existing preview data

- [x] 2. Enhance dry-run console output
  - Update `displayPreview()` (or CLI handling) to show summary header and grouped operations
  - Integrate setup script messaging when present
  - Add friendly messaging when no operations exist

- [x] 3. Integrate optional tree output
  - Detect `tree` availability via safe command execution
  - Append `tree -L 2` output when available; otherwise show skip message
  - Ensure command runs against cached template path without mutation

- [x] 4. Update logging behavior
  - When logger exists, record dry-run summary (counts and presence of setup script)
  - Avoid verbose per-file logging to keep logs readable

- [x] 5. Expand tests
  - Add dry-run tests verifying summary text, counts, operation groups
  - Add tests covering tree-present and tree-absent paths (simulate PATH)
  - Confirm no filesystem changes occur during dry-run
