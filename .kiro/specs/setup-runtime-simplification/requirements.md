# Setup Runtime Simplification — Requirements

## Context
- The current setup runtime exposes an optional `tools.astGrep` adapter that depends on the native `@ast-grep/napi` module. This increases runtime size, complicates sandboxing, and introduces a learning curve that most template authors never need.
- Template authors primarily need opinionated utilities for placeholder replacement, file orchestration, and light-weight text/JSON mutations. For these tasks, the existing helper surface is mostly sufficient but lacks a few ergonomic operations (for example, inserting configuration blocks or appending scripts without touching ASTs).
- Documentation still references ast-grep availability, suggesting that advanced structural rewrites are part of the normal workflow, which contradicts the greenfield directive to keep authoring simple.

## Goals
- Remove every reference and code path related to `@ast-grep/napi` or `tools.astGrep` from the CLI, runtime, tests, and documentation.
- Expand the built-in helper surface so the “next layer” of common author needs (structured text insertion, JSON patching, simple append/replace operations) is achievable without third-party tooling.
- Update all documentation to reflect the new helper set while aligning with the Diátaxis documentation strategy (`.kiro/steering/documentation-standards.md`, `.kiro/steering/diataxis-documentation.md`).
- Maintain the sandboxed execution guarantees—helpers remain declarative/intention-based, and we continue blocking raw access to Node built-ins.

## Non-Goals
- Introducing a DSL in this iteration. If we later design a declarative language, it will follow as a separate sprint.
- Preserving backward compatibility with previous helper APIs that explicitly referenced ast-grep. The project is still greenfield; we optimize for the cleanest author experience.

## Success Criteria
- `bin/setupRuntime.mjs` ships without any ast-grep code paths and provides new, well-documented helper modules (e.g., text editing, JSON patches, structured append/prepend).
- Tests and fixtures demonstrate the new helpers and no longer mention ast-grep. Coverage exists for the new APIs.
- Docs/tutorial/reference/guide pages present the refined helper list, highlight the 80/20 ergonomics, and comply with Diátaxis guidelines (clear separation between tutorials, how-to guides, explanations, and references).
- `npm test` passes with the updated runtime and docs.

## Key Decisions
- Adopt marker-oriented text helpers (`insertAfter`, `replaceBetween`, `ensureBlock`, guarded `replace`, `appendLines`) to cover everyday configuration edits without third-party tooling.
- Extend `tools.json` with dot-path helpers (`set`, `remove`, `addToArray`, `mergeArray`) instead of introducing a patch DSL.
- Publish a dedicated how-to recipe guide showcasing common setup tasks powered by the new helpers, in addition to refreshing existing tutorials/how-to documents.
