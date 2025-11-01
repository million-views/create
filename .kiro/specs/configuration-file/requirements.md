# Configuration File Requirements

## Summary

Introduce a `.m5nvrc` configuration file that lets teams capture default CLI
inputs (repository, branch, author metadata, and placeholders) without repeating
flags. The CLI must merge configuration defaults with flags/env vars while
honoring existing validation rules.

## Goals

- Reduce repeated CLI flags for common team defaults.
- Support both local project configuration and global user overrides.
- Maintain backward compatibility with existing CLI workflows.
- Preserve zero-dependency, security-first design principles.

## Non-Goals

- No new network I/O or remote configuration sources.
- No dynamic scripting/language support inside the configuration file.
- No template-specific configuration logic (applies broadly to CLI defaults).

## Stakeholders

- Template authors and onboarding engineers seeking consistent defaults.
- CLI users who frequently scaffold projects from fixed repositories.
- Documentation maintainers tracking configuration behavior.

## Requirements (EARS)

1. **Configuration discovery**
   - *When* the CLI starts without `--no-config`, *the system shall* discover
     configuration files in the following order:
       1. Project directory (`.m5nvrc` in current working directory).
       2. User config directory (macOS/Linux: `~/.config/m5nv/rc.json`,
          Windows: `%APPDATA%/m5nv/rc.json`).
       3. Environment variable override (`CREATE_SCAFFOLD_CONFIG_PATH`).
     - *And* the system shall stop at the first file found unless
       `CREATE_SCAFFOLD_CONFIG_PATH` is set.

2. **File format and validation**
   - *For all* discovered configuration files, *the system shall* expect UTF-8
     encoded JSON with a top-level object containing:
       - `repo` (string) — default repository (`owner/name` or URL).
       - `branch` (string, optional).
       - `author` (object, optional) with `name`, `email`, `url` strings.
       - `placeholders` (object, optional) mapping tokens to default values.
     - *And* the system shall validate these values using existing security and
       argument validation helpers, rejecting invalid inputs with a descriptive
       error referencing the configuration path.

3. **Merging precedence**
   - *When* configuration defaults are loaded, *the system shall* merge values
     using the precedence: CLI flags > environment variables > configuration
     file > built-in defaults.
   - *And* the system shall ensure unspecified fields fall back to current CLI
     behavior (no regressions).

4. **User control and opt-out**
   - *When* the user supplies `--no-config`, *the system shall* skip discovery
     and defaults from configuration files entirely.
   - *When* configuration parsing fails, *the system shall* surface an actionable
     error and exit with code 1 without proceeding to scaffolding.

5. **Security and logging**
   - *For all* configuration-sourced values, *the system shall* sanitize inputs
     before use, storing sensitive values (e.g., placeholder tokens) without
     logging their content.
   - *When* verbose logging or `--log-file` is active, *the system shall* record
     which configuration file was used without exposing sensitive values.

6. **Testing and documentation**
   - *The system shall* include unit tests covering configuration parsing,
     validation failures, precedence ordering, and opt-out modes.
   - *The system shall* update CLI reference and development guides to document
     configuration behavior, precedence, and opt-out flag.

## Risks & Mitigations

- **Risk:** Misconfigured JSON halts scaffolding unexpectedly.
  - *Mitigation:* Provide precise error messaging with path context and pointer
    to documentation.
- **Risk:** Confusion about precedence order.
  - *Mitigation:* Document precedence and include info banner in verbose mode.
- **Risk:** Sensitive defaults exposed in logs.
  - *Mitigation:* Reuse existing sanitization utilities and mask placeholder
    values when logging.

## Success Metrics

- Reduction in repeated CLI flag usage observed in user telemetry (qualitative
  feedback or internal dogfooding).
- Support ticket decrease related to missing repository/branch arguments.
- Positive developer feedback during onboarding sessions.
