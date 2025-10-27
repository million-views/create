# Implementation Plan

- [x] 1. Aggregate file counts per directory
  - Update `buildSummary()` to compute `fileBuckets` keyed by relative destination
  - Ensure counts sum to total file operations and include root bucket when needed

- [x] 2. Update dry-run console formatting
  - Adjust `displayPreview()` to render aggregated file buckets (sorted, root first)
  - Retain existing directory creation and setup script sections

- [x] 3. Extend logging payload
  - Include `fileBuckets` in the dry-run log operation details
  - Keep existing counts/tree metadata intact

- [x] 4. Update tests
  - Modify dry-run engine unit tests to assert bucket structures and ordering
  - Adjust CLI integration tests to expect aggregated output
  - Cover scenarios for root-only files, nested directories, and zero files
