# Requirements Document

## Introduction
New users struggle to remember the required flags for `@m5nv/create-scaffold`, often bouncing between documentation and trial runs. The Interactive Mode feature provides a guided question-and-answer flow that launches when the CLI is invoked without explicit parameters, making it possible to scaffold a project without memorizing command syntax.

## Glossary
- **CLI_Tool**: The `@m5nv/create-scaffold` command line application.
- **Interactive_Mode**: A guided prompt experience that gathers user inputs before executing the standard scaffolding workflow.
- **Template_Catalog**: The cached list of templates pulled from the configured repository and branch.
- **Project_Configuration**: The combination of project directory, template identifier, repository/branch overrides, IDE choice, and options flags required to run the scaffolding flow.

## Requirements

### Requirement 1
**User Story:** As a first-time user, I want the CLI_Tool to guide me automatically when I invoke it without parameters, so I can scaffold a project without recalling specific flags.

#### Acceptance Criteria
1. WHEN the CLI_Tool is executed with no positional arguments and no templating flags, THE CLI_Tool SHALL enter Interactive_Mode unless the user explicitly opts out with `--no-interactive` or an equivalent environment variable.
2. WHEN Interactive_Mode begins, THE CLI_Tool SHALL clearly indicate that the user can exit at any time (for example by pressing `Ctrl+C`) without side effects.

### Requirement 2
**User Story:** As a user navigating Interactive_Mode, I want to pick a template confidently, so I can understand what each option provides before committing.

#### Acceptance Criteria
1. WHEN Interactive_Mode starts, THE CLI_Tool SHALL load the Template_Catalog using the existing discovery subsystem and present template names with their descriptions (falling back to "No description" when metadata is absent).
2. WHEN the Template_Catalog cannot be loaded (for example due to network failure or empty repository), THE CLI_Tool SHALL surface a clear error and exit Interactive_Mode without attempting to scaffold.

### Requirement 3
**User Story:** As a user proceeding through Interactive_Mode, I want to supply the remaining Project_Configuration values interactively, so that the CLI_Tool can run the standard scaffolding pipeline on my behalf.

#### Acceptance Criteria
1. WHEN a template is selected, THE CLI_Tool SHALL prompt for the project directory name and validate it with the same security and collision checks used in non-interactive mode.
2. WHEN additional flags are required (repository overrides, branch, IDE, options, placeholder prompts), THE CLI_Tool SHALL ask for each value using existing validation logic and provide sensible defaults or skip optional entries.
3. WHEN all required inputs are collected, THE CLI_Tool SHALL execute the same code path as a non-interactive invocation, passing the gathered Project_Configuration so that logging, caching, dry-run behavior, and error reporting remain consistent.

### Requirement 4
**User Story:** As a power user, I want deterministic control over when Interactive_Mode runs, so that automation scripts and advanced workflows remain stable.

#### Acceptance Criteria
1. WHEN the CLI_Tool is invoked with any positional argument, template flag, or `--interactive=false`, THE CLI_Tool SHALL bypass Interactive_Mode entirely and behave exactly as in current releases.
2. WHEN the CLI_Tool is invoked with `--interactive` in addition to traditional flags, THE CLI_Tool SHALL still collect missing values via Interactive_Mode but preserve any arguments already supplied on the command line.
