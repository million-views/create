# Design Document

## Overview
Interactive Mode provides a guided experience for `@m5nv/create-scaffold` when
the CLI is executed without a project directory or template flag, or when the
user explicitly requests an interactive run. The workflow gathers template
selection, project configuration, and optional placeholder inputs, then hands
the normalized result to the existing scaffolding pipeline. Automation remains
stable because interactive behavior is opt-in.

## Goals
- Launch an intuitive, zero-knowledge flow for first-time users.
- Reuse existing validation, caching, discovery, and placeholder logic rather
  than introducing parallel implementations.
- Keep the CLI safe for scripted environments by default while allowing
  explicit opt-in via flags or environment variables.

## Non-Goals
- Persisting configuration beyond reading defaults supplied by the upcoming
  Phase 2 configuration feature.
- Finalizing prompt copy; implementation will follow the Diátaxis tone guide
  in `.kiro/steering/diataxis-documentation.md`.

## User Flow
```text
parseArguments
      │
      ▼
shouldEnterInteractive(args, env, tty)
      │
 ┌────┴────────┐
 │ yes         │ no
 ▼             ▼
InteractiveSession   Existing validation/execution pipeline
      │
collectInputs()
      │
      ▼
Normalized arguments → validateArguments → validateAllInputs → scaffold
```

## Architecture
1. `bin/argumentParser.mjs` adds `--interactive` / `--interactive=false` and
   `--no-interactive` flags while preserving positional parsing.
2. `bin/index.mjs` introduces `shouldEnterInteractive` to decide whether to
   launch the new session before validation.
3. A new module `bin/interactiveSession.mjs` orchestrates catalog discovery,
   prompts, and normalized argument construction.
4. Optional helpers (e.g., `bin/utils/promptUtils.mjs`) encapsulate prompt and
   validation loops, enabling deterministic tests.
5. Environment switches mirror flag behavior for automation control.

## Component Details

### Argument Parser (`bin/argumentParser.mjs`)
- Add options:
  - `interactive` (boolean, accepts `true|false`).
  - `no-interactive` (boolean) that maps to `interactive: false`.
- Return parsed booleans alongside existing fields.
- Parsing remains strict; unknown options still surface errors.

### Entry Point (`bin/index.mjs`)
- Implement `shouldEnterInteractive({ args, env, tty })`:
  - Skip if help, list, or dry-run modes are requested.
  - Honor explicit flags (`--interactive`, `--interactive=false`,
    `--no-interactive`).
  - Honor environment variables `CREATE_SCAFFOLD_FORCE_INTERACTIVE` (truthy to
    force) and `CREATE_SCAFFOLD_NO_INTERACTIVE` (truthy to bypass).
  - Auto-trigger when no project directory and no template flag are present and
    the process is attached to a TTY.
- When interactive mode runs, log `cli_interactive_mode` with status and reason.
- Merge results from the session into the existing `args` object before calling
  `validateArguments` and `validateAllInputs`.

### Interactive Session (`bin/interactiveSession.mjs`)
- Constructor dependencies:
  - `cacheManager`, `logger`, default repository string, `env`, optional
    configuration provider, optional prompt adapter.
- `collectInputs(initialArgs)` flow:
  1. Resolve defaults for repository and branch using initial arguments, a
     configuration provider (Phase 2 `.m5nvrc` reader when available), or
     baked-in defaults.
  2. Load the template catalog via `TemplateDiscovery`. Surface sanitized errors
     and exit if discovery fails or returns zero templates.
  3. Present a numbered menu with names, descriptions, tags, and canonical
     variables. Support cancellation.
  4. Prompt for project directory name; validate with
     `validateProjectDirectory`, collision checks in `fsUtils.mjs`, and retry up
     to a capped number of attempts.
  5. Prompt for optional overrides (repo, branch, IDE, options, logging, cache
     controls) unless they were already provided on the command line.
  6. If placeholders exist and the user opts into experimental prompts, call
     `resolvePlaceholders` with an injected prompt adapter to gather values.
  7. Return a normalized payload mirroring parser output (see Data Model).

### Prompt Utilities (`bin/utils/promptUtils.mjs`)
- Provide wrappers such as `askValidated({ message, validate, maxAttempts })`
  and `askConfirmed({ message, defaultValue })` built on `readline/promises`.
- Accept injected adapters for tests.

### Template Discovery (`bin/templateDiscovery.mjs`)
- Add `formatTemplateOptions(templates)` returning structured entries suitable
  for menus while reusing existing metadata (tags, canonical variables,
  handoff steps).

## Data Model

### Session Result
```json
{
  projectDirectory: string,
  template: string,
  repo: string,
  branch: string | null,
  ide: string | null,
  options: string[],
  placeholders: string[],
  experimentalPlaceholderPrompts: boolean,
  dryRun: false,
  listTemplates: false,
  logFile: string | null,
  noCache: boolean,
  cacheTtl: string | null
}
```
- Shape aligns with parser output so validation and downstream logic remain
  unchanged.

### Template Menu Entry
```json
{
  id: number,
  name: string,
  description: string,
  tags: string[],
  canonicalVariables: string[],
  handoffSteps: string[]
}
```
- Derived from metadata already exposed by `TemplateDiscovery`.

## Environment & Configuration
- `CREATE_SCAFFOLD_FORCE_INTERACTIVE` (truthy) forces the guided flow.
- `CREATE_SCAFFOLD_NO_INTERACTIVE` (truthy) disables automatic triggering.
- Configuration defaults (e.g., `.m5nvrc`) are read via a provider injected into
  the session; when absent, the code falls back to `DEFAULT_REPO` and related
  runtime defaults.

## Error Handling
- Catalog or configuration errors surface sanitized messages and exit with code
  1.
- Validation failures during prompts trigger retry loops; exceeding the retry
  limit exits with code 1 and explains the failure.
- `Ctrl+C` during prompts exits immediately without side effects and is logged
  as a cancellation event.
- Placeholder resolution errors bubble up as `ValidationError` so existing
  messaging covers them.

## Testing Strategy
1. **Unit Tests (`test/interactive-session.test.mjs`)**
   - Mock prompt adapter to cover success, cancellation, retry exhaustion, and
     configuration fallback scenarios.
   - Assert placeholder resolution integrates correctly when prompts are
     enabled.
2. **Argument Parser Tests (`test/argument-parser.test.mjs`)**
   - Verify new flags, boolean coercion, precedence with positional arguments,
     and interaction with env variables.
3. **CLI Integration Tests (`test/cli-integration.test.mjs`)**
   - Pipe scripted answers to exercise end-to-end interactive scaffolding.
   - Confirm traditional arguments bypass interactive mode even when env vars
     attempt to force it off.
4. **Spec Compliance & Regression**
   - Update spec runner expectations for Phase 2 interactive requirements.
5. **Documentation Validation**
   - Refresh CLI reference, roadmap, and how-to guides; run `npm run
     validate:docs` to ensure compliance.

## Future Considerations
- Interactive Mode SHALL honor persisted defaults from the Phase 2 configuration
  feature when available and MUST fall back gracefully when configuration is not
  present or disabled.
- Prompt copy MUST align with `.kiro/steering/diataxis-documentation.md`; final
  wording will be produced during implementation.
