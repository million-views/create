# Requirements Document

## Introduction
Template authors currently define custom placeholders in each template to collect author and license metadata. This spec introduces canonical template variables so that templates can opt into a shared set of well-known tokens that the CLI resolves consistently.

## Glossary
- **CLI_Tool**: The `@m5nv/create-scaffold` command line application.
- **Template_Manifest**: The `template.json` file that declares template metadata.
- **Canonical_Variable**: A predefined placeholder token (for example `{{AUTHOR}}`, `{{LICENSE}}`) supplied by the CLI_Tool with standard prompts and defaults.
- **Placeholder_Resolver**: The subsystem that merges placeholder defaults, command-line overrides, environment variables, and interactive prompts.

## Requirements

### Requirement 1
**User Story:** As a template author, I want to declare canonical variables without redefining their metadata, so that my templates stay aligned with the CLI_Tool defaults.

#### Acceptance Criteria
1. WHEN a Template_Manifest includes a Canonical_Variable entry, THE CLI_Tool SHALL expose the corresponding `{{TOKEN}}` placeholder to the Placeholder_Resolver with the CLI_Tool's standard description, type, and sensitivity settings.
2. WHEN a Template_Manifest includes a Canonical_Variable entry for a token already listed under `metadata.placeholders`, THE CLI_Tool SHALL merge the author-provided metadata with the canonical defaults without duplicating the placeholder.

### Requirement 2
**User Story:** As a developer running the CLI_Tool, I want canonical variables to behave like regular placeholders, so that I can provide their values through existing flags, environment variables, or prompts.

#### Acceptance Criteria
1. WHEN the Placeholder_Resolver processes a Canonical_Variable, THE CLI_Tool SHALL accept `--placeholder TOKEN=value` overrides, environment variables, and interactive inputs exactly as it does for author-defined placeholders.
2. WHEN the Placeholder_Resolver prompts for a Canonical_Variable value, THE CLI_Tool SHALL display the canonical prompt message associated with that variable.

### Requirement 3
**User Story:** As a maintainer, I want the schema and types to guard canonical variable usage, so that templates can only reference supported tokens and tooling remains consistent.

#### Acceptance Criteria
1. WHEN a Template_Manifest declares a Canonical_Variable, THE CLI_Tool SHALL validate the entry against the published schema and reject unknown canonical identifiers.
2. WHEN the template schema types are regenerated, THE CLI_Tool SHALL export updated TypeScript definitions that model the canonical variable structure.
