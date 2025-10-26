# Requirements Document

## Introduction

This specification addresses the complete replacement of the `--features` parameter with `--options` in the CLI tool. The current naming is semantically incorrect as it presupposes that template providers will use this parameter specifically for "features" when it should be a generic mechanism for passing contextual information and preferences to templates. The rename improves semantic clarity and enables richer template customization scenarios.

## Glossary

- **CLI_Tool**: The @m5nv/create-scaffold command-line interface
- **Template_Provider**: The author/maintainer of a template repository
- **Options_Parameter**: The parameter that accepts comma-separated contextual values for template customization
- **Environment_Object**: The object passed to setup scripts containing CLI parameters and context
- **Setup_Script**: The executable script in templates that receives the Environment_Object
- **Template_Context**: The situational and preferential information that guides template behavior

## Requirements

### Requirement 1

**User Story:** As a template provider, I want to receive contextual "options" that describe the user's situation and preferences so that I can customize the template appropriately for their specific use case.

#### Acceptance Criteria

1. WHEN a user provides `--options context1,preference1,hint1`, THE CLI_Tool SHALL pass these values to the template setup script
2. THE CLI_Tool SHALL validate options parameter format to ensure security and proper parsing
3. THE CLI_Tool SHALL include options in the Environment_Object as an array property
4. THE CLI_Tool SHALL sanitize options parameter values to prevent injection attacks
5. THE CLI_Tool SHALL support both short form `-o` and long form `--options` aliases

### Requirement 2

**User Story:** As a user scaffolding in different contexts, I want to provide contextual hints to templates so that they can adapt their behavior to my specific situation and preferences.

#### Acceptance Criteria

1. WHEN a user provides `--options monorepo,no-git,mvp`, THE CLI_Tool SHALL pass these contextual hints to the template
2. THE CLI_Tool SHALL support common contextual options like project stage indicators (poc, prototype, mvp, production)
3. THE CLI_Tool SHALL support environment hints (monorepo, standalone, existing-project)
4. THE CLI_Tool SHALL support preference indicators (no-git, minimal, full-featured, typescript-strict)
5. THE CLI_Tool SHALL allow template providers to define their own custom option vocabularies

### Requirement 3

**User Story:** As a developer maintaining the CLI tool, I want robust validation and error handling for the options parameter so that security and usability are maintained.

#### Acceptance Criteria

1. THE CLI_Tool SHALL validate options parameter format using secure parsing rules
2. THE CLI_Tool SHALL prevent path traversal attacks in option values
3. THE CLI_Tool SHALL prevent injection attacks in option values
4. THE CLI_Tool SHALL limit individual option length to prevent resource exhaustion
5. THE CLI_Tool SHALL provide clear error messages for invalid option formats

### Requirement 4

**User Story:** As a template setup script author, I want to access the options array in the Environment_Object so that I can customize template behavior based on user context and preferences.

#### Acceptance Criteria

1. THE CLI_Tool SHALL include an `options` property in the Environment_Object containing an array of strings
2. THE CLI_Tool SHALL ensure the options array contains validated, sanitized option strings
3. THE CLI_Tool SHALL provide an empty array when no options are specified
4. THE CLI_Tool SHALL maintain consistent Environment_Object structure across all invocations
5. THE CLI_Tool SHALL remove any references to the old `features` property from the Environment_Object

### Requirement 5

**User Story:** As a user reading help documentation, I want to understand how to use the `--options` parameter with clear examples of common use cases so that I can effectively communicate my needs to templates.

#### Acceptance Criteria

1. THE CLI_Tool SHALL display `--options` parameter prominently in help text
2. THE CLI_Tool SHALL include practical usage examples showing common option patterns
3. THE CLI_Tool SHALL document example contextual options (monorepo, no-git, mvp, prototype, etc.)
4. THE CLI_Tool SHALL explain how options enable template customization
5. THE CLI_Tool SHALL include both short `-o` and long `--options` forms in help documentation