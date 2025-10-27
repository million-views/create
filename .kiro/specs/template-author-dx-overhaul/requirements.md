# Template Author DX Overhaul — Requirements

## Context
- `_setup.mjs` currently executes arbitrary Node.js within generated projects.
- Documentation in `docs/creating-templates.md`, `docs/tutorial/first-template.md`, `docs/explanation/ide-integration.md`, and `docs/reference/environment-object.md` encourages heavy scripting: authors recreate file I/O, placeholder substitution, IDE setup logic, and feature toggles manually.
- Test fixtures in `test/fixtures/*` mirror the documentation by reimplementing large helper stacks per template, sometimes with inconsistent Environment_Object properties (`features` vs `options`).
- The CLI reference advertises `--options` as contextual hints, yet examples elsewhere treat options as feature flags that unlock complex orchestration.

## Problem Statement
- Template authors are forced to write and maintain boilerplate Node.js just to perform routine placeholder replacement, file moves, or conditional copy operations.
- Empowering arbitrary scripting makes sandboxing impossible and expands the security surface area for template execution.
- Guidance across docs and fixtures is inconsistent, making it difficult to understand the real contract for setup scripts.
- The current approach bloats examples and fixtures, diluting the value of reference material and making it harder to reason about expected behavior.

## Goals
- Deliver a first-class Environment_Object contract that exposes curated, high-level utilities for common template mutations (placeholder replacement, conditional file inclusion, IDE presets, post-copy transformations).
- Enable future sandboxing by constraining the execution surface: setup logic should operate through provided utilities rather than unrestricted `fs`/`path` imports.
- Provide a crisp story for feature toggles and options: document the canonical vocabulary, how templates discover support, and how authors declare requirements.
- Reduce template author effort to the minimum: templates ship complete file trees, and `_setup.mjs` focuses on lightweight personalization rather than constructing project structure.
- Simplify learning materials and fixtures so that a newcomer can understand the recommended workflow without reading hundreds of lines of sample code.

## Non-Goals
- Rewriting the entire CLI pipeline or cache system (only touch components needed to support the new setup contract).
- Maintaining backward compatibility with the current unrestricted `_setup.mjs`. The steering guidance favors greenfield delivery unless compatibility is explicitly mandated.
- Solving every possible content transformation use case. The initial target is a curated, opinionated utility set that covers the 80% common cases.

## Success Criteria
- Template authors can replace placeholders, gate files on options, and inject IDE presets without importing Node.js modules or duplicating helper code.
- Documentation around `_setup.mjs` shrinks materially (qualitatively obvious reduction in ceremony) and presents a coherent mental model tied to the new API.
- Test fixtures mirror the streamlined approach and highlight utility usage rather than bespoke scripting.
- Security review can demonstrate that sandboxing the provided utility surface would meaningfully constrain template behavior.
- The CLI reference and option vocabulary form a single, unambiguous source of truth.

## Open Questions
- What minimum utility surface should ship in v1 (e.g., file reads, writes, placeholder replacement, JSON patching, IDE presets, templated prompts)?
- Should the Environment_Object wrap ast-grep or other AST tooling, and how do we message limitations (e.g., markdown support gaps)?
- How do templates declare which options they understand so the CLI can warn users about unsupported flags?
- What migration guidance (if any) do we offer for existing templates; is a compatibility shim desirable or do we simply document the new contract?
