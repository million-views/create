---
inclusion: always
---

# Naming Conventions

## Core Principle: Keep Names Predictable Across the Stack

Consistent naming keeps templates portable between operating systems, documentation, and tooling. Apply these conventions to every new file, directory, identifier, and API you introduce.

## File System Assets

- Use `kebab-case` for directories and committed files (`placeholder-schema.mjs`, `author-assets-template/`).
- Prefer singular directory names unless the directory truly aggregates peers (`placeholder`, `logger`, `ide`).
- Keep file extensions lowercase (`.md`, `.mjs`, `.json`).
- Avoid uppercase-only paths or case distinctions that collapse on macOS/Windows.

## Internal Configuration and Metadata

- Use `snake_case` for keys that remain internal to template metadata or author assets (`build_target`, `default_variant`).
- Scope keys under clear prefixes when sharing a namespace (`placeholder_required`, `runtime_strategy`).
- Reserve uppercase identifiers for environment variables or constants that surface outside the repository.

## Runtime and Public APIs

- Use `snake_case` for internal function names and private methods (`resolve_inputs`, `apply_defaults`).
- Use `camelCase` for public facing API functions exposed to consumers (`ctx.projectName`, `tools.placeholders.applyInputs`).
- Name functions with active verbs (`resolveInputs`, `applyDefaults`).
- Prefer noun-based names for data structures and objects (`placeholderInputs`, `environmentState`).

## Data Properties and APIs

- Use `snake_case` for property key names in forms, REST APIs, and data structures (`user_name`, `created_at`, `is_active`).
- This allows direct mapping to database entity attributes and maintains consistency across serialization layers.
- Reserve `camelCase` only for client-side JavaScript objects that don't cross API boundaries.

## Database Entities and Tables

- Use singular entity names for tables (`user`, `project`, `template`).
- Name bridge/junction tables after the relationship concept, not concatenated entity names (`user_permissions` for user-permission relationships, `project_templates` for project-template associations).
- Use `snake_case` for all database identifiers (`user_id`, `created_at`, `is_deleted`).

## Tests and Fixtures

- Mirror production filenames in `test/` using `kebab-case` (`placeholder-schema.test.mjs`).
- Name fixtures with explicit scenario descriptors (`missing-required-placeholder`, `unsupported-dimension`).
- Keep directory names singular unless representing multiple variants (`fixture`, `template`, `scenario`).

## Documentation Examples

- Ensure examples obey the same casing rules (`react-vite`, `ctx.placeholderInputs`).
- When referencing environment variables, use uppercase snake case (`CREATE_SCAFFOLD_PLACEHOLDER_PROJECT_NAME`).
- Use descriptive placeholders instead of generic `foo`/`bar` (`projectName`, `authorAssetsDir`).
- Show internal functions in `snake_case` and public APIs in `camelCase`.

## Review Checklist

- [ ] Filenames and directories use `kebab-case`.
- [ ] Internal metadata keys use `snake_case`.
- [ ] Internal functions use `snake_case`, public APIs use `camelCase`.
- [ ] Data properties and API keys use `snake_case`.
- [ ] Database entities are singular, bridge tables named after concepts.
- [ ] Examples and fixtures mirror the casing conventions.
- [ ] No plural directories unless they contain parallel resources.

Apply this checklist before committing changes and during code review to maintain a consistent authoring experience across the project.
