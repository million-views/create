# Implementation Plan

- [x] 1. Extend Cache Manager with population and refresh helpers
  - Implement `getRepoDirectory(repoUrl, branchName)` to centralise cache path construction
  - Implement `populateCache(repoUrl, branchName, options)` to clone into cache, write metadata, and return path
  - Implement `refreshCache(repoUrl, branchName, options)` to clear existing cache entry and repopulate
  - Ensure failure scenarios clean up partial cache directories

- [x] 2. Update Cache Manager metadata handling
  - Persist `lastUpdated`, `ttlHours`, `repoUrl`, `branchName`, and `cacheVersion`
  - Preserve TTL overrides when provided by caller
  - Ensure metadata writes are atomic (reuse existing `writeJsonFile`)

- [x] 3. Refactor CLI cache workflow
  - Update `ensureRepositoryCached` / `cloneTemplateRepo` to use new cache helpers
  - Remove temp-directory clones for cache-enabled paths
  - Keep `--no-cache` flow using secure temp directories
  - Update logging to reflect cache operations in home directory

- [x] 4. Update downstream modules and error messaging
  - Ensure Template Discovery and Dry Run rely on cache paths (no change in API, but adjust messages if needed)
  - Update error messages to reference cache directory when appropriate

- [x] 5. Update and extend tests
  - Add unit tests for new Cache Manager helpers (populate/refresh)
  - Adjust existing tests expecting temp directories to look for home cache paths
  - Run full suite (`npm test`) to confirm no regressions
