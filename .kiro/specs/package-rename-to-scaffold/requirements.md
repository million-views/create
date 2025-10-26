# Requirements Document

## Introduction

This feature renames the npm package from `@m5nv/create` to `@m5nv/create-scaffold` to align with npm create conventions and provide a clearer semantic meaning. The change enables users to run `npm create @m5nv/scaffold` which transforms to `npm exec @m5nv/create-scaffold`, making the scaffolding purpose explicit and following npm's documented patterns.

## Glossary

- **Package_Name**: The npm package identifier used in package.json and npm registry
- **CLI_Command**: The command users type to invoke the tool via npm create
- **Bin_Field**: The executable mapping in package.json that defines command names
- **Repository_URL**: The GitHub repository location (remains unchanged)
- **Documentation**: All user-facing documentation including README, help text, and examples
- **Test_Suite**: All automated tests that reference the package name or commands

## Requirements

### Requirement 1

**User Story:** As an End_User, I want to use a clear and semantic command to scaffold projects, so that the purpose of the tool is immediately obvious.

#### Acceptance Criteria

1. THE Package_Name SHALL be changed from "@m5nv/create" to "@m5nv/create-scaffold"
2. THE CLI_Command SHALL be "npm create @m5nv/scaffold" for the primary user experience
3. THE Bin_Field SHALL map "create-scaffold" to the main entry script
4. THE Package_Name SHALL follow npm create conventions for semantic clarity
5. THE Repository_URL SHALL remain "https://github.com/million-views/create"

### Requirement 2

**User Story:** As an End_User, I want comprehensive documentation that shows the correct usage patterns, so that I can successfully use the tool without confusion.

#### Acceptance Criteria

1. THE Documentation SHALL replace all instances of "@m5nv/create" with "@m5nv/create-scaffold"
2. THE Documentation SHALL feature "npm create @m5nv/scaffold" as the primary usage example
3. THE Documentation SHALL explain how "npm create @m5nv/scaffold" works due to package naming conventions
4. THE Documentation SHALL be written with roll-forward language (no references to old package name)
5. THE Documentation SHALL provide both npm create and npx usage examples

### Requirement 3

**User Story:** As a Developer, I want all tests to reflect the new package name and commands, so that the test suite validates the correct user experience.

#### Acceptance Criteria

1. THE Test_Suite SHALL replace all references to "@m5nv/create" with "@m5nv/create-scaffold"
2. THE Test_Suite SHALL simulate correct command invocation patterns
3. THE Test_Suite SHALL validate expected output with new package name
4. THE Test_Suite SHALL test both npm create and npx usage patterns
5. THE Test_Suite SHALL ensure all functionality works with the renamed package

### Requirement 4

**User Story:** As a Developer, I want the package.json to correctly define the new package identity, so that npm create commands work as expected.

#### Acceptance Criteria

1. THE package.json SHALL set name field to "@m5nv/create-scaffold"
2. THE package.json SHALL update description to reflect scaffolding purpose
3. THE package.json SHALL map "create-scaffold" binary to "./bin/index.mjs"
4. THE package.json SHALL maintain correct repository URL to GitHub
5. THE package.json SHALL update keywords to include scaffolding-related terms

### Requirement 5

**User Story:** As a Developer, I want all internal code references updated, so that the codebase is consistent with the new package identity.

#### Acceptance Criteria

1. THE codebase SHALL replace hardcoded "@m5nv/create" references with "@m5nv/create-scaffold"
2. THE codebase SHALL update any package name validation or checks
3. THE codebase SHALL maintain all existing functionality with new package name
4. THE codebase SHALL update error messages that reference the package name
5. THE codebase SHALL ensure no broken references remain after the rename

### Requirement 6

**User Story:** As an End_User, I want clear help text and examples that show the correct command usage, so that I can learn how to use the tool effectively.

#### Acceptance Criteria

1. THE help text SHALL show "npm create @m5nv/scaffold" as the primary usage pattern
2. THE help text SHALL include examples with the correct package name
3. THE help text SHALL update any package-specific references or badges
4. THE help text SHALL provide clear installation and usage instructions
5. THE help text SHALL explain the relationship between npm create and npx commands