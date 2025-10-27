# Design Document

## Overview

We will adjust the dry-run summary logic to aggregate file copy operations by destination directory rather than listing each file. The design extends the existing summary data structure with per-directory counts, updates console/log formatting, and keeps directory creation output intact.

## Current Behavior

- `DryRunEngine.buildSummary()` records each file operation individually.
- `displayPreview()` prints every file copy in sequence.
- Logs mirror the raw operations list.

## Proposed Changes

### Data Aggregation

Enhance `buildSummary()` to compute an object keyed by destination directory (relative to the project root), e.g.:

```json
{
  "./": 3,
  "src/": 6,
  "src/components/": 2
}
```

- Use the `relative` field already recorded on operations to determine the directory bucket (`path.dirname` for relative destination; treat empty string as root `./`).
- Store aggregated counts in `summary.fileBuckets` alongside existing per-file entries for future use.

### Console Output

Modify `displayPreview()` so the file section renders aggregated buckets:

```
📋 File Copy (12 total):
   • ./ (5 files)
   • public/ (1 file)
   • src/ (6 files)
```

- Keep total file count from `summary.counts.files`.
- Sort bucket names alphabetically, placing `./` first for readability.

### Directory Creation Output

- Keep existing per-directory listing; it provides clarity about new folders.
- No change required other than ensuring the section still prints after aggregation.

### Logging

- When logging dry-run results, include the `fileBuckets` structure so logs stay consistent with console output:

```json
"summary": {
  "counts": {...},
  "fileBuckets": {
    "./": 5,
    "src/": 6
  }
}
```

### Tests

Update unit tests in `test/dryRunEngine.test.mjs` to cover bucket aggregation and ordering. Adjust CLI integration tests to look for aggregated lines rather than individual file rows.

## Considerations

- Templates with zero files should yield either no file section or a zero-entry line; ensure output stays clear.
- Templates with files only in nested directories still generate root bucket if any files land at project root.
- Maintains compatibility with tree preview (tree output remains unchanged).

