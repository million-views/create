# Design Document

## Overview

The goal is to align cache behaviour with the documented design by cloning and maintaining template repositories directly within `~/.m5nv/cache/<repo-hash>` and eliminating the current reliance on system temporary directories for cache-enabled flows. The implementation will extend the Cache Manager with repository population and refresh helpers, refactor the main CLI workflow to use them, and ensure auxiliary modules operate against the cache directory consistently.

## Current Behaviour Summary

1. `CacheManager.getCachedRepo()` returns a path under `~/.m5nv/cache/<hash>` if metadata exists and the entry is fresh, thus reinforcing the documented cache location.
2. `ensureRepositoryCached()` in `bin/index.mjs` calls `CacheManager.getCachedRepo()`. On miss, it delegates to `directCloneRepo()` which clones into `createSecureTempDir()` (system temp) and returns the temp path.
3. Downstream operations (file copy, dry run, template discovery) use whatever path is returned, which is a temp directory on cache miss.
4. No component writes metadata or cached content on cache misses, so the home-directory cache is never populated during normal use.

## Desired Behaviour

- Cache misses and refreshes clone straight into a dedicated directory within `~/.m5nv/cache/<hash>`, using `git clone` with `--depth=1` (same behaviour as today) and optional branch selection.
- Metadata is written immediately after successful cloning, capturing TTL, repo URL, branch, and other data.
- Temporary directories are only used for explicit `--no-cache` operations.
- Direct consumers (template discovery, dry run, scaffolding) rely on the cache directory path for cached operations.

## Components To Update

1. **CacheManager (`bin/cacheManager.mjs`):**
   - Add a `populateCache(repoUrl, branchName, options)` helper to clone into the cache directory, manage metadata, and handle TTL overrides.
   - Add a `refreshCache(repoUrl, branchName, options)` helper that delegates to `populateCache` after cleaning any existing cached contents.
   - Expose `getRepoDir(repoHash)` or similar to centralise path construction.
   - Ensure cleanup uses `safeCleanup` when failures occur.

2. **Main CLI Workflow (`bin/index.mjs`):**
   - Replace the current temp-based `directCloneRepo` usage with calls to the new cache population helpers.
   - Keep `--no-cache` path using secure temp directories (existing behaviour).
   - Ensure metadata is updated with TTL overrides (from `--cache-ttl`) and other necessary fields.
   - Update logging events (`cache_hit`, `cache_miss`, `cache_refresh`) to reflect the cache directory location.

3. **CacheManager Consumers:**
   - `TemplateDiscovery` already consumes the cache manager; ensure new helper functions are used where appropriate (tests may need minor adjustments).
   - `DryRunEngine` should continue to read from cached paths, but error messages may be updated to reflect the home cache location.
   - Tests that currently expect temporary directories may require updates to assert home cache usage.

4. **Metadata Handling:**
   - After population or refresh, metadata should be written via `updateCacheMetadata` with:
     - `repoUrl`
     - `branchName`
     - `lastUpdated` (ISO string)
     - `ttlHours` (user override or default)
     - `cacheVersion` (reuse existing version if present)
   - Consider preserving previous metadata fields where relevant (e.g. existing TTL).

## Error Handling

- Failures during clone operations should:
  - Clean up the partially created cache directory (`safeCleanup`).
  - Re-throw errors so upstream handlers maintain their current behaviour.
- Integrity checks should run after the clone completes to confirm directory existence before updating metadata.
- In case of metadata write failure, remove the partially cached repository to avoid mismatched state.

## Test Considerations

- Update unit tests for `CacheManager` to cover:
  - Successful cache population with metadata write.
  - Refresh behaviour (clearing and re-cloning).
  - Cleanup on failure.
  - TTL handling with overrides.
- Adjust integration tests (`cli.test.mjs`, `resource-leak-test.mjs`) to expect cached repositories under `~/.m5nv/cache`.
- Ensure acceptance flows (template discovery, dry run) still operate using the cached path.

## Non-Goals

- Adding new CLI flags for cache management (beyond existing `--no-cache` and `--cache-ttl`).
- Implementing cache inspection or clearing commands (future enhancements).
- Changing the security model or introduction of new dependencies.
