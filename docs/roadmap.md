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
last_updated: "2025-10-30"
---

# Roadmap

Strategic feature development for @m5nv/create-scaffold, prioritized by user
impact and implementation complexity.

## Completed Features

### Placeholder Prompts (Experimental)

**Problem:** Templates needed a consistent way to collect values for `{{TOKEN}}` placeholders without rebuilding ad-hoc prompts in every setup script.
**Solution:** Added an opt-in placeholder resolver (`--experimental-placeholder-prompts`) that merges metadata defaults, repeated `--placeholder NAME=value` flags, environment variables (`CREATE_SCAFFOLD_PLACEHOLDER_<TOKEN>`), and interactive prompts. Setup scripts receive the resolved values via `ctx.inputs`, `tools.inputs`, and the new `tools.placeholders.applyInputs()` helper.
**Impact:** Medium – unlocks richer customization while the feature hardens behind an experimental flag.

### Template Schema Standardization

**Problem:** Template authors and downstream tooling relied on ad-hoc manifest conventions, making validation brittle and integrations error-prone.
**Solution:** Published a versioned JSON Schema (`schema/template.v1.json`) with a synced latest alias, generated type declarations/runtime stubs (`npm run schema:build` / `npm run schema:check`), and exported them via package entrypoints for reuse.
**Impact:** High – establishes a single source of truth for manifest structure, enables automated validation, and unblocks ecosystem tooling.

### Template Caching

**Problem:** Repeated clones are slow; other features need fast repository access
**Solution:** Cache repos in `~/.m5nv/cache` with TTL, `--no-cache` to bypass
**Impact:** High - **Foundation for all other features**, significant performance improvement

### Detailed Logging

**Problem:** Users can't debug failures or audit what the tool did
**Solution:** `--log-file path/to/log` writes timestamped operations (git clone, file copy, setup execution, errors)
**Impact:** High - Essential for production use and troubleshooting

### Template Discovery

**Problem:** Users don't know what templates are available
**Solution:** `--list-templates` uses cached repo to instantly show templates with descriptions from `template.json` or README frontmatter
**Impact:** High - Removes biggest user friction point, **fast thanks to caching**

### Dry Run Mode

**Problem:** Users want to preview operations before execution
**Solution:** `--dry-run` shows planned operations without executing them, **uses cache for fast preview**
**Impact:** Medium - Builds confidence, especially for CI/CD

## Phase 2: Developer Experience (v0.4)

### 1. Template Validation

**Problem:** Broken templates waste user time
**Solution:** Ship a `--validate-template` command that reuses the published schema/types for manifest checks, then layers setup-script linting and required-file verification for CI and local guardrails.
**Impact:** Medium - Prevents frustration, improves template quality

### 2. Configuration File

**Problem:** Teams repeat same repository/branch arguments
**Solution:** `.m5nvrc` JSON file for default repo, branch, author info
**Impact:** Medium - Reduces typing, enables team standards

### 3. Interactive Mode

**Problem:** New users don't know command syntax
**Solution:** `npm create @m5nv/scaffold` (no args) prompts for template selection from available options
**Impact:** Medium - Lowers barrier to entry

## Phase 3: Advanced Features (v0.5)

### 4. Template Variables

**Problem:** Templates need more customization than just project name
**Solution:** Support `{{AUTHOR}}`, `{{LICENSE}}`, etc. with prompts or config file values, extending the shared schema/types so downstream tools stay aligned.
**Impact:** Low - Advanced templating for sophisticated use cases

### 5. Multi-Template Projects

**Problem:** Complex projects need multiple templates (frontend + backend)
**Solution:** `--from-templates frontend,backend` creates multiple directories with orchestrated setup
**Impact:** Low - Niche use case, high complexity

## Phase 4: Ecosystem (v0.6)

### 6. Template Health Checks

**Problem:** Template quality varies, no validation
**Solution:** Automated testing of templates (dependencies install, basic commands work) built on top of the canonical schema exports to standardize reporting and enforcement.
**Impact:** Low - Community feature, requires infrastructure

## Implementation Strategy

### Phase 1 (Complete) Rationale

- **Caching** is foundational infrastructure that accelerates all other features
- **Logging** solves immediate production needs
- **Discovery** removes biggest user barrier and is fast thanks to caching
- **Dry run** builds user confidence and benefits from cached repository access
- All are high-value, with caching being the strategic enabler

### Success Metrics

- **Phase 1:** Reduced support requests, increased template repository usage
- **Phase 2:** Higher user retention, more template repositories created
- **Phase 3:** Power user adoption, enterprise usage
- **Phase 4:** Community ecosystem growth

### Technical Considerations

- Maintain zero external dependencies
- All features must pass comprehensive security review
- Clean, modern implementation required
- Each feature needs comprehensive test coverage

## Non-Goals

- **GUI Interface** - CLI-first tool
- **Template Hosting** - Use existing git infrastructure
- **Package Management** - Not competing with npm/yarn
- **Build System Integration** - Templates handle their own build setup

## What's Next

Interested in the roadmap? Here's how to get involved:

- 📦 **Try Phase 1 features**: [Phase 1 Core UX Features](phase-1-features.md) - Current feature set
- 🛠️ **Contribute to development**: [Development Guide](how-to/development.md) - Help build future features
- 🤝 **Join the community**: [Contributing Guidelines](../CONTRIBUTING.md) - Shape the project's direction
