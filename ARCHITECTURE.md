# CLI Architecture: Command Dispatch Pattern with Template Method

This document describes the refactored CLI architecture that implements the Command Dispatch Pattern with Template Method design pattern.

## Overview

The CLI tools (`create-scaffold` and `make-template`) have been refactored to follow a consistent architecture based on:

- **Command Pattern**: Each command is a self-contained class with its own parsing, validation, and execution logic
- **Template Method Pattern**: Command provides the execution flow (parse → validate → run) that subclasses customize
- **Router Pattern**: Central dispatch mechanism that routes commands to their handlers

## Core Components

### Command (`lib/cli/command.js`)

Abstract base class that defines the command interface and execution flow.

```javascript
class Command {
  constructor(help) { ... }
  showHelp() { ... }           // Quick help
  showDetailedHelp() { ... }  // Detailed help with examples
  parseArgs(args) { ... }     // Parse command-line arguments using parseArg()
  execute(args) { ... }       // Template method: parse → validate → run
  parseArg(arg, args, i, parsed) { ... }  // Abstract: implement in subclass
  run(parsed) { ... }         // Abstract: implement in subclass
}
```

**Template Method Flow:**
1. `parseArgs()` - Parse command-line arguments using `parseArg()`
2. Check for `--help` flag
3. Call `run()` with parsed arguments
4. Subclasses implement `parseArg()` and `run()`

### Router (`lib/cli/router.js`)

Central dispatch mechanism that handles global options and routes to commands.

```javascript
class Router {
  constructor() { ... }
  route(args) { ... }  // Main entry point
  showGeneralHelp() { ... }  // Tool overview
}
```

**Responsibilities:**
- Handle global options (`--help`, `--version`, `--verbose`, `--json`)
- Route to command-specific handlers
- Provide two-tier help system

### Command Classes

Each command extends Command and implements:

- **Help Configuration** (`help.js`): Defines usage, description, options, examples
- **Argument Parsing** (`parseArg()`): Custom parsing logic for command-specific options
- **Business Logic** (`run()`): Core command execution
- **Validation**: Input validation and error handling

## Command DSL (Domain-Specific Language)

Commands follow a structured DSL for expressing their interface:

### Syntax Pattern
```bash
command-name [OPTIONS] <required-arg> [optional-arg]
```

### Arguments vs Options
- **Arguments**: Positional parameters (`<required>` or `[optional]`)
  - No prefix (dash)
  - Position matters
  - Core entities the command operates on
- **Options**: Named parameters (`--long` or `-short`)
  - Prefixed with dashes
  - Position usually doesn't matter
  - Modify command behavior

### Examples
```bash
# create-scaffold new
new <project-name> --template <template-name> [options]

# make-template convert
convert <project-path> [options]

# make-template restore
restore <project-path> [options]
```

## File Organization

### Directory Structure
```text
bin/
  create-scaffold/
    index.mjs                    # Router entry point
    commands/
      new/
        index.js                 # NewCommand class
        help.js                  # Help configuration
        scaffolder.js            # Business logic
        validator.js             # Input validation
      list/
        index.js
        help.js
        registry-fetcher.js
      validate/
        index.js
        help.js
        template-validator.js

lib/
  cli/
    command.js                   # Abstract base class
    router.js                    # Router base class

tests/
  helpers.js                     # Test utilities
  create-scaffold/
    commands/
      new.test.js
      list.test.js
      validate.test.js
```

### Principles
- **Base Infrastructure** (`lib/cli/`): Generic, reusable components
- **Tool-Specific Code** (`bin/[tool]/`): Command implementations
- **Tests** (`tests/[tool]/`): Mirror command structure
- **Separation of Concerns**: Help, parsing, validation, and business logic are separate

## Help System

### Two-Tier Help System
1. **Quick Help** (`--help`): Basic usage and options
2. **Detailed Help** (`help <command>`): Comprehensive documentation with examples

### Help Configuration
Each command defines its help in a separate `help.js` file:

```javascript
export const commandHelp = {
  name: "command-name",
  usage: "command-name [OPTIONS] <required-arg>",
  description: "Brief description",
  detailedDescription: ["Detailed description paragraphs"],
  optionGroups: [
    {
      title: "Group Name",
      options: [
        {
          long: "--option",
          value: "<value>",
          desc: "Option description",
          detailed: ["Detailed explanation"]
        }
      ]
    }
  ],
  examples: [
    { cmd: "command arg --option value", desc: "Example description" }
  ]
};
```

## Argument Parsing

### Parsing Flow
1. Arguments are processed left-to-right
2. Options can appear before or after positional arguments
3. `parseArg()` method handles each argument individually
4. Return skip count to consume option values

### Example Implementation
```javascript
parseArg(arg, args, i, parsed) {
  if (arg === "--template" || arg === "-T") {
    parsed.template = args[i + 1];
    return i + 1;  // Skip next arg (the value)
  } else if (arg === "--force") {
    parsed.force = true;
    // No skip, boolean flag
  } else if (!arg.startsWith("-")) {
    // Positional argument
    if (!parsed.name) {
      parsed.name = arg;
    }
  }
}
```

## Validation & Error Handling

### Input Validation
- Required arguments checked in `run()` method
- Clear error messages with suggestions
- Exit with appropriate error codes
- Safety warnings for dangerous operations

### Error Patterns
```javascript
if (!parsed.requiredArg) {
  console.error("❌ <required-arg> is required");
  console.error("💡 Suggestions:");
  console.error("   • Provide the required argument");
  this.showHelp();
  process.exit(1);
}
```

## Testing

### Test Infrastructure
- **Test Helpers** (`tests/helpers.js`): Utilities for capturing output and mocking exit
- **Command Tests**: Verify parsing, validation, and execution
- **Node.js Test Runner**: Native `node --test` for running tests

### Test Patterns
```javascript
describe("Command", () => {
  it("requires argument", () => {
    const exitCode = mockExit(() => cmd.execute([]));
    assert.strictEqual(exitCode, 1);
  });

  it("parses options", () => {
    const parsed = cmd.parseArgs(["--option", "value"]);
    assert.strictEqual(parsed.option, "value");
  });
});
```

## Architectural Trade-offs

### Layered Validation Architecture

The codebase implements multiple template validators across different architectural layers, each serving distinct purposes while maintaining similar naming patterns. This design reflects the inherent trade-offs between specialization and consistency in layered architectures.

#### Validator Distribution

```text
┌─────────────────┐
│   CLI Layer     │ ← User-friendly validation + console output
│   template-validator.js
├─────────────────┤
│ Registry Layer  │ ← Async discovery validation + events
│   template-validator.mjs
├─────────────────┤
│ Pipeline Layer  │ ← File I/O validation + processing results
│   manifest-validator.mjs
├─────────────────┤
│ Core Library    │ ← Pure validation logic + data transformation
│   template-manifest-validator.mjs
│   authoring-template-validator.mjs
└─────────────────┘
```

#### Architectural Justification

**Why Multiple Validators?**
- **Different Contracts**: Each layer has unique input/output requirements
  - CLI: File paths → console messages
  - Registry: Template objects → events + validation results
  - Pipeline: Directory paths → structured pipeline data
  - Core: Parsed JSON → normalized data structures
- **Different Error Handling**: Layers require different error presentation
  - CLI: User-friendly messages with suggestions
  - Core: Structured errors for programmatic handling
- **Performance Characteristics**: Sync vs async processing needs
- **Dependency Injection**: Layer-specific service dependencies

#### Naming Challenges

The similar naming (`template-validator.*`) creates developer confusion:

```javascript
// Confusing - which validator does what?
import { TemplateValidator } from './commands/validate/template-validator.js';
import { TemplateValidator } from './modules/registry/template-validator.mjs';
import { TemplateValidator } from './lib/validation/template-validator.mjs';
```

#### Recommended Resolution

**Proposed Naming Convention:**
```javascript
import { CliTemplateValidator } from './commands/validate/cli-template-validator.js';
import { RegistryTemplateValidator } from './modules/registry/registry-template-validator.mjs';
import { PipelineManifestValidator } from './modules/validators/pipeline-manifest-validator.mjs';
import { CoreManifestValidator } from './lib/core-manifest-validator.mjs';
import { AuthoringTemplateValidator } from './lib/authoring-template-validator.mjs';
```

#### Assessment

**Verdict**: Acceptable layered specialization, but naming confusion should be addressed during next major refactoring. The architectural separation is sound - the naming is the primary issue.

**Benefits**:
- ✅ Clear separation of concerns
- ✅ Layer-appropriate contracts
- ✅ Optimized for specific use cases

**Drawbacks**:
- ❌ Naming confusion for developers
- ❌ Potential code duplication
- ❌ Maintenance coordination across layers

## Future Extensions

### Adding New Commands
1. Create command directory under `bin/[tool]/commands/`
2. Implement help.js, index.js, and business logic modules
3. Add command to router in `index.mjs`
4. Add tests under `tests/[tool]/commands/`

### Adding Global Options
1. Add to Router.globalOptions array
2. Handle in Router.route() method
3. Pass to commands if needed

### Extending Help System
- Add new option group types
- Enhance formatting and display
- Add interactive help features