# Requirements Document

## Introduction

This feature adds IDE adaptation support to the @m5nv/create CLI tool, allowing template developers to customize their templates for specific IDEs (Kiro, VSCode, Cursor, Windsurf) through enhanced _setup.js scripts. The feature provides a secure, extensible environment for template customization with a clean, modern interface design.

## Glossary

- **CLI_Tool**: The @m5nv/create command-line interface application
- **Template_Repository**: A git repository containing one or more project templates
- **Setup_Script**: The _setup.mjs file within a template that performs post-copy customization
- **IDE_Parameter**: The --ide command-line argument specifying target IDE
- **Features_Parameter**: The --features command-line argument specifying enabled features
- **Template_Parameter**: The --template command-line argument specifying which template to use
- **Environment_Object**: A sandboxed parameter object passed to setup scripts containing project context
- **Template_Developer**: A user who creates and maintains template repositories
- **End_User**: A user who uses the CLI tool to scaffold projects from templates

## Requirements

### Requirement 1

**User Story:** As an End_User, I want to specify my preferred IDE when creating a project, so that the template can be customized for my development environment.

#### Acceptance Criteria

1. WHEN the End_User provides the --ide argument, THE CLI_Tool SHALL validate the IDE value against the supported list
2. THE CLI_Tool SHALL support exactly four IDE values: "kiro", "vscode", "cursor", "windsurf"
3. IF an invalid IDE value is provided, THEN THE CLI_Tool SHALL display an error message and exit with code 1
4. WHERE no --ide argument is provided, THE CLI_Tool SHALL pass null as the IDE value to the Setup_Script
5. THE CLI_Tool SHALL pass the IDE value to the Setup_Script through the Environment_Object

### Requirement 2

**User Story:** As an End_User, I want to specify project features when creating a project, so that the template can include or exclude functionality based on my needs.

#### Acceptance Criteria

1. WHEN the End_User provides the --features argument, THE CLI_Tool SHALL parse comma-separated feature names
2. THE CLI_Tool SHALL validate that feature names contain only alphanumeric characters, hyphens, and underscores
3. THE CLI_Tool SHALL pass the features array to the Setup_Script through the Environment_Object
4. WHERE no --features argument is provided, THE CLI_Tool SHALL pass an empty array as the features value
5. THE CLI_Tool SHALL trim whitespace from individual feature names during parsing

### Requirement 3

**User Story:** As a Template_Developer, I want to receive a comprehensive environment object in my setup script, so that I can customize templates based on project context and user preferences.

#### Acceptance Criteria

1. THE CLI_Tool SHALL pass an Environment_Object as the sole parameter to the Setup_Script function
2. THE Environment_Object SHALL contain projectDirectory, projectName, ide, and features properties
3. THE Environment_Object SHALL include the current working directory as the cwd property
4. THE Environment_Object SHALL be immutable to prevent Setup_Script modifications
5. THE CLI_Tool SHALL provide comprehensive validation and error handling for the Environment_Object

### Requirement 4

**User Story:** As a Template_Developer, I want my setup script to receive validated and sanitized input, so that I can trust the data without additional validation.

#### Acceptance Criteria

1. THE CLI_Tool SHALL validate all Environment_Object properties before passing to Setup_Script
2. THE CLI_Tool SHALL sanitize projectDirectory and projectName to prevent path traversal attacks
3. THE CLI_Tool SHALL ensure IDE values are from the approved list or null
4. THE CLI_Tool SHALL ensure features array contains only valid feature name strings
5. THE CLI_Tool SHALL prevent Setup_Script access to system environment variables through the Environment_Object

### Requirement 5

**User Story:** As a Template_Developer, I want a clean, well-designed setup script interface, so that I can build robust template customizations without legacy constraints.

#### Acceptance Criteria

1. THE CLI_Tool SHALL pass only the Environment_Object as a parameter to Setup_Script functions
2. THE CLI_Tool SHALL require Setup_Scripts to use the Environment_Object parameter format
3. THE CLI_Tool SHALL provide clear error messages when Setup_Scripts use incorrect parameter formats
4. THE CLI_Tool SHALL ensure all documentation and examples use the Environment_Object format
5. THE CLI_Tool SHALL validate Setup_Script function signatures before execution

### Requirement 6

**User Story:** As a Template_Developer, I want clear documentation and examples for the IDE adaptation features, so that I can effectively customize my templates for different IDEs.

#### Acceptance Criteria

1. THE CLI_Tool SHALL provide help text that includes --ide, --features, and --template arguments
2. THE CLI_Tool SHALL include usage examples for IDE-specific template creation
3. THE CLI_Tool SHALL document the Environment_Object structure and properties
4. THE CLI_Tool SHALL provide comprehensive examples of IDE-specific customizations
5. THE CLI_Tool SHALL include Setup_Script best practices in documentation