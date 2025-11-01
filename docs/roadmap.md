---
title: "Project Roadmap"
type: "explanation"
audience: "all"
estimated_time: "5 minutes read"
prerequisites: []
related_docs:
  - "phase-1-features.md"
  - "how-to/development.md"
  - "../CONTRIBUTING.md"
last_updated: "2025-11-01"
---

# Roadmap

Strategic plan for @m5nv/create-scaffold, organized for product oversight and
release tracking.

## Roadmap Snapshot

| Phase   | Version | Focus                | Status         | Target Window | Notes                                            |
| ------- | ------- | -------------------- | -------------- | ------------- | ------------------------------------------------ |
| Phase 1 | v0.3    | Core user experience | ✅ Delivered   | 2025 Q2       | Caching, logging, discovery, dry run complete    |
| Phase 2 | v0.4    | Developer experience | ✅ Delivered   | 2025 Q4       | Validation tooling, config defaults, interactive |
| Phase 3 | v0.5    | Advanced workflows   | 🟡 In planning | 2026 Q1       | Multi-template orchestration, power-user support |
| Phase 4 | v0.6    | Ecosystem health     | 🟡 In planning | 2026 Q2       | Automated quality and governance                 |

Status key: ✅ Delivered · 🟢 In progress · 🟡 In planning · 🔴 At risk · ⚪ On
hold.

## Delivered Features (Phase 1)

### Placeholder Prompts (Experimental)

- **Problem:** Templates needed a consistent way to resolve `{{TOKEN}}`
  placeholders without rebuilding ad-hoc prompts in every setup script.
- **Solution:** Added an opt-in placeholder resolver
  (`--experimental-placeholder-prompts`) that merges metadata defaults, repeated
  `--placeholder NAME=value` flags, environment variables
  (`CREATE_SCAFFOLD_PLACEHOLDER_<TOKEN>`), and interactive prompts. Setup
  scripts receive resolved values via `ctx.inputs`, `tools.inputs`, and
  `tools.placeholders.applyInputs()`.
- **Impact:** Medium – unlocks richer customization while the feature hardens
  behind an experimental flag.

### Template Schema Standardization

- **Problem:** Template authors and downstream tooling relied on ad-hoc manifest
  conventions, making validation brittle and integrations error-prone.
- **Solution:** Published a versioned JSON Schema (`schema/template.v1.json`)
  with a synced latest alias, generated type declarations/runtime stubs
  (`npm run schema:build` / `npm run schema:check`), and exported them via
  package entrypoints for reuse.
- **Impact:** High – establishes a single source of truth for manifest
  structure, enables automated validation, and unblocks ecosystem tooling.

### Template Variables (Canonical Defaults)

- **Problem:** Templates needed reusable values such as `{{AUTHOR}}` and
  `{{LICENSE}}` without duplicating metadata between manifests and setup
  scripts.
- **Solution:** Introduced a canonical variables registry, extended the schema
  and generated types to declare overrides, and merged defaults during template
  validation so runtime tools expose a normalized placeholder view.
- **Impact:** High – improves metadata quality, keeps downstream integrations
  consistent, and simplifies author workflows.

### Template Caching

- **Problem:** Repeated clones are slow; other features need fast repository
  access.
- **Solution:** Cache repositories in `~/.m5nv/cache` with TTL, plus a
  `--no-cache` flag to bypass when necessary.
- **Impact:** High – foundation for all other features and a significant
  performance improvement.

### Detailed Logging

- **Problem:** Users could not debug failures or audit what the tool executed.
- **Solution:** `--log-file path/to/log` writes timestamped operations (git
  clone, file copy, setup execution, errors) to user-approved locations.
- **Impact:** High – essential for production use and troubleshooting.

### Template Discovery

- **Problem:** Users did not know what templates were available.
- **Solution:** `--list-templates` leverages the cached repository to instantly
  show templates with descriptions sourced from `template.json` or README
  frontmatter.
- **Impact:** High – removes the biggest user friction point and remains fast
  because of caching.

### Dry Run Mode

- **Problem:** Users wanted to preview operations before executing them.
- **Solution:** `--dry-run` displays planned operations without executing them
  while still using the cache for fast previews.
- **Impact:** Medium – builds confidence, especially for CI/CD.

## Phase 2 · Developer Experience (Delivered v0.4)

**Objective:** Reduce template author friction and provide guardrails that keep
manifests healthy.

- **Template Validation:** `--validate-template` command reuses the published
  schema/types for manifest checks, layers setup-script linting and
  required-file verification, and supports JSON output for CI.
  **Impact:** Medium – prevents frustration, improves template quality.
- **Configuration File:** `.m5nvrc` discovery with environment overrides enables
  defaults for repository, branch, author metadata, and placeholder values.
  **Impact:** Medium – enables team standards and reduces setup time.
- **Interactive Mode:** Invoking without arguments or supplying `--interactive`
  launches guided discovery to collect inputs before scaffolding.
  **Impact:** Medium – lowers the barrier for new users and onboarding sessions.

**Dependencies:** Canonical schema/types (delivered); caching (delivered).

**Key Metrics:** Validation command adoption in template CI pipelines;
reduction in template onboarding support tickets.

## Phase 3 · Advanced Workflows (Target v0.5)

**Objective:** Enable complex project compositions and advanced automation use
cases.

- **Multi-Template Projects:** Add `--from-templates frontend,backend` to stage
  multiple templates in one run with orchestrated setup sequencing. **Impact:**
  Low – niche but high-value for larger teams; high complexity.
- **Workflow Automation Enhancements:** Expand canonical variables with richer
  manifest hooks (e.g., templated README sections) and explore scripted
  post-processing once validation lands. **Impact:** Medium – powers internal
  enablement tooling.

**Dependencies:** Phase 2 validation workflows; canonical variables (delivered).

**Key Metrics:** Multi-template usage in customer engagements; positive feedback
from design partners.

## Phase 4 · Ecosystem Health (Target v0.6)

**Objective:** Guarantee high-quality community templates and transparent health
reporting.

- **Template Health Checks:** Automate template testing (dependency install,
  smoke commands) built on top of schema exports to standardize reporting and
  enforcement. **Impact:** Low – community feature requiring infrastructure but
  critical for trust.
- **Community Governance Toolkit:** Document contribution SLAs, lint rules, and
  template quality scorecards surfaced via CLI metadata. **Impact:** Medium –
  supports ecosystem stewardship.

**Dependencies:** Stable validation tooling; hosted telemetry pipeline.

**Key Metrics:** Percentage of public templates passing health checks; community
contribution velocity.

## Implementation Strategy

### Phase 1 (Complete) Rationale

- **Caching** is foundational infrastructure that accelerates all other
  features.
- **Logging** solves immediate production needs.
- **Discovery** removes biggest user barrier and is fast thanks to caching.
- **Dry run** builds user confidence and benefits from cached repository access.
- All are high-value, with caching being the strategic enabler.

### Success Metrics

- **Phase 1:** Reduced support requests, increased template repository usage.
- **Phase 2:** Higher user retention, more template repositories created.
- **Phase 3:** Power user adoption, enterprise usage.
- **Phase 4:** Community ecosystem growth.

### Technical Considerations

- Maintain zero external dependencies.
- All features must pass comprehensive security review.
- Clean, modern implementation required.
- Each feature needs comprehensive test coverage.

## Non-Goals

- **GUI Interface** - CLI-first tool.
- **Template Hosting** - Use existing git infrastructure.
- **Package Management** - Not competing with npm/yarn.
- **Build System Integration** - Templates handle their own build setup.

## What's Next

Interested in the roadmap? Here's how to get involved:

- 📦 **Try Phase 1 features**: [Phase 1 Core UX Features](phase-1-features.md) -
  Current feature set
- 🛠️ **Contribute to development**: [Development Guide](how-to/development.md) -
  Help build future features
- 🤝 **Join the community**: [Contributing Guidelines](../CONTRIBUTING.md) -
  Shape the project's direction
