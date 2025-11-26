# CLI Refactoring: Implement Command Dispatch Pattern with Template Method

## Context

Refactor two CLI tools (`create-scaffold` and `make-template`) to follow the
Command Dispatch Pattern with Template Method design demonstrated in
`./tmp/tui-design-sample/`.

**Reference Materials:**

- Design documentation: `./tmp/tui-design-sample/design-doc.md`
- Sample implementation: `./tmp/tui-design-sample/src/`
- Current CLI outputs: `./tmp/create-scaffold-cli-log.md`, `./tmp/make-template-cli-log.md`

**Important:** These tools are unreleased. Make breaking changes freely to
achieve correct design. No backward compatibility needed.

## Current State Analysis

### Existing CLI Tools

**1. create-scaffold** - Project scaffolding tool

- Commands: `new`, `list`, `validate`, `help`
- Global options: `--help`, `--verbose`, `--log-file`, `--json`, `--version`

**2. make-template** - Template conversion tool

- Commands: `convert`, `restore`, `init`, `validate`, `hints`, `test`, `help`
- Global options: `--help`, `--verbose`, `--log-file`, `--json`, `--version`

### Current File Structure
```

bin/ create-scaffold/ index.mjs # Entry point make-template/ index.mjs # Entry
point lib/ cli/ # Shared CLI infrastructure shared/ # Shared utilities
validators/ # Shared validation commands/ create-scaffold/ # create-scaffold
commands make-template/ # make-template commands

````

## Identified Issues

### Critical Design Flaws

**1. Missing Required Arguments**

❌ **make-template convert** has no required arguments
```bash
convert [options]
````

This operates on current directory by default, risking accidental conversion.

✅ **Must be:**

```bash
convert <project-path> [options]
```

**2. Inconsistent Argument Patterns**

❌ **create-scaffold new** mixes required option with implicit argument:

```bash
new [options]
# But requires both --template AND project directory
```

✅ **Must follow DSL:**

```bash
new <project-name> --template <template-name> [options]
```

❌ **create-scaffold validate** claims `[options]` but error says
`<template-path>`:

```bash
validate [options]
# Error: validate <template-path>
```

✅ **Must be consistent:**

```bash
validate <template-path> [options]
```

**3. Option Naming Inconsistencies**

Different names for same concept:

- `--path` vs `--init-file` vs `--lint-file` vs `--log-file`

✅ **Standardize to:**

- `--file <PATH>` for single file operations
- `--path <PATH>` for directory operations
- `--output <PATH>` for output destinations

**4. Confusing Option Semantics**

❌ **make-template restore** has redundant option names:

```bash
--restore-files               # Restore only specified files
--restore-placeholders        # Restore only placeholder values
```

✅ **Must be:**

```bash
--files <FILES>               # Restore only specified files
--placeholders-only           # Restore only placeholder values
```

**5. No Two-Tier Help System**

Current help shows flat list. Need quick `--help` and detailed `help <command>`.

## Target Architecture

### Directory Structure

```
bin/
  create-scaffold/
    index.mjs                       # Entry point with router
    commands/
      new/
        index.js                    # NewCommand class
        help.js                     # Help configuration
        scaffolder.js               # Scaffolding logic
        validator.js                # Input validation
      list/
        index.js
        help.js
        registry-fetcher.js
      validate/
        index.js
        help.js
        template-validator.js
  make-template/
    index.mjs                       # Entry point with router
    commands/
      convert/
        index.js
        help.js
        converter.js
        detector.js
      restore/
        index.js
        help.js
        restorer.js
      init/
        index.js
        help.js
      validate/
        index.js
        help.js
      hints/
        index.js
        help.js
      test/
        index.js
        help.js
        tester.js

lib/
  base/
    base-command.js                 # BaseCommand class
    router.js                       # Router base class
  shared/
    validators.js                   # Shared validation
    formatters.js                   # Output formatting
    cache.js                        # Caching utilities
    git.js                          # Git operations

tests/
  helpers.js                        # Test utilities
  create-scaffold/
    commands/
      new.test.js
      list.test.js
      validate.test.js
    modules/
      scaffolder.test.js
      validator.test.js
  make-template/
    commands/
      convert.test.js
      restore.test.js
      init.test.js
    modules/
      converter.test.js
      detector.test.js
```

### File Organization Principles

**Base Infrastructure (lib/base/):**

- `base-command.js` - Abstract BaseCommand class
- `router.js` - Base Router class
- Only generic, reusable components

**Tool-Specific Code (bin/[tool]/):**

- Entry point with router instantiation
- All commands in `commands/` subdirectory
- Commands own their help and business logic

**Shared Utilities (lib/shared/):**

- Functions used by multiple tools
- No CLI-specific logic
- Pure business logic and utilities

**Tests (tests/[tool]/):**

- Mirror command structure
- Separate command tests from module tests

## Refactoring Plan

### Phase 1: Setup Base Infrastructure

**1.1 Create Base Classes**

```javascript
// lib/base/base-command.js
export class BaseCommand {
  constructor(help) {
    this.help = help;
  }

  showHelp() {
    // Render quick help
  }

  showDetailedHelp() {
    // Render detailed help
  }

  parseArgs(args) {
    // Parse arguments, check for --help
  }

  execute(args) {
    // Template method: parse → validate → run
  }

  // Abstract methods
  parseArg(arg, args, index, parsed) {
    throw new Error("Must implement parseArg");
  }

  run(parsed) {
    throw new Error("Must implement run");
  }
}
```

```javascript
// lib/base/router.js
export class Router {
  constructor() {
    this.commands = {};
    this.globalOptions = [
      { short: "-h", long: "--help", desc: "Print help" },
      { short: "-v", long: "--version", desc: "Show version" },
      { long: "--verbose", desc: "Enable verbose output" },
      { long: "--json", desc: "Output in JSON format" },
    ];
  }

  route(args) {
    // Handle global options
    // Dispatch to commands
    // Handle help system
  }

  showGeneralHelp() {
    // Show tool overview
  }
}
```

**1.2 Create Shared Utilities**

```javascript
// lib/shared/validators.js
export function validateProjectName(name) {}
export function validateTemplatePath(path) {}
export function validateGitUrl(url) {}

// lib/shared/formatters.js
export function formatTable(data) {}
export function formatJson(data) {}
export function formatError(error) {}
```

**1.3 Create Test Infrastructure**

```javascript
// tests/helpers.js
export function captureOutput(fn) {
  const logs = [];
  const errors = [];
  const originalLog = console.log;
  const originalError = console.error;

  console.log = (...args) => logs.push(args.join(" "));
  console.error = (...args) => errors.push(args.join(" "));

  try {
    fn();
    return { logs, errors };
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
}

export function mockExit(fn) {
  let exitCode = null;
  const originalExit = process.exit;

  process.exit = (code) => {
    exitCode = code;
    throw new Error("EXIT_CALLED");
  };

  try {
    fn();
  } catch (err) {
    if (err.message !== "EXIT_CALLED") throw err;
  } finally {
    process.exit = originalExit;
  }

  return exitCode;
}
```

### Phase 2: Refactor create-scaffold

**2.1 New Command**

```javascript
// bin/create-scaffold/commands/new/help.js
export const newHelp = {
  name: "new",
  usage: "new <project-name> --template <template-name> [options]",
  description: "Create a new project from a template",

  detailedDescription: [
    "Creates a new project by cloning and configuring a template from a registry.",
    "The command fetches the specified template, processes placeholders, and sets up a working project structure.",
  ],

  options: [
    {
      short: "-h",
      long: "--help",
      desc: "Print help",
    },
  ],

  optionGroups: [
    {
      title: "Required",
      options: [
        {
          short: "-T",
          long: "--template",
          value: "<name>",
          desc: "Template to use",
          detailed: [
            "Template identifier from a configured registry.",
            "Can be specified as:",
            "  • Short name: react-app",
            "  • Full URL: https://github.com/user/template.git",
            "  • Registry path: official/react-app",
          ],
        },
      ],
    },
    {
      title: "Template Options",
      options: [
        {
          short: "-b",
          long: "--branch",
          value: "<name>",
          desc: "Git branch to use (default: main)",
          detailed: [
            "Specify which branch to clone from the template repository",
          ],
        },
      ],
    },
    {
      title: "Cache Options",
      options: [
        {
          long: "--no-cache",
          desc: "Bypass cache system and clone directly",
          detailed: [
            "Skip local cache and fetch template directly from source",
          ],
        },
        {
          long: "--cache-ttl",
          value: "<hours>",
          desc: "Override default cache TTL",
          detailed: ["Specify cache time-to-live in hours (default: 24)"],
        },
      ],
    },
    {
      title: "Placeholder Options",
      options: [
        {
          long: "--placeholder",
          value: "<NAME=value>",
          desc: "Supply placeholder value",
          detailed: [
            "Provide placeholder values in NAME=value format. Can be specified multiple times.",
          ],
        },
        {
          long: "--experimental-placeholder-prompts",
          desc: "Enable experimental placeholder prompting",
          detailed: [
            "Enable advanced interactive prompting for placeholder values",
          ],
        },
      ],
    },
    {
      title: "Interactive Options",
      options: [
        {
          long: "--no-input-prompts",
          desc: "Suppress prompts and non-essential output",
        },
        {
          long: "--interactive",
          desc: "Force interactive mode",
        },
        {
          long: "--no-interactive",
          desc: "Force non-interactive mode",
        },
      ],
    },
    {
      title: "Configuration",
      options: [
        {
          long: "--no-config",
          desc: "Skip loading user configuration",
        },
        {
          long: "--options",
          value: "<file>",
          desc: "Path to options file for template configuration",
          detailed: ["Load template configuration from a JSON file"],
        },
      ],
    },
    {
      title: "Operation Modes",
      options: [
        {
          long: "--dry-run",
          desc: "Preview changes without executing them",
        },
        {
          long: "--log-file",
          value: "<path>",
          desc: "Enable detailed logging to specified file",
        },
      ],
    },
  ],

  examples: [
    {
      cmd: "new my-app --template react-app",
      desc: "Create React app from template",
    },
    {
      cmd: "new api-server --template express-api --branch develop",
      desc: "Use specific branch",
    },
    {
      cmd: "new my-app --template react-app --placeholder NAME=MyApp",
      desc: "Provide placeholder values",
    },
    {
      cmd: "new my-app --template react-app --no-cache",
      desc: "Skip cache and fetch fresh",
    },
  ],
};
```

```javascript
// bin/create-scaffold/commands/new/index.js
import { BaseCommand } from "../../../../lib/base/base-command.js";
import { newHelp } from "./help.js";
import { Scaffolder } from "./scaffolder.js";
import { validateProjectName } from "./validator.js";

export class NewCommand extends BaseCommand {
  constructor() {
    super(newHelp);
  }

  parseArg(arg, args, i, parsed) {
    if (arg === "--template" || arg === "-T") {
      parsed.template = args[i + 1];
      return i + 1;
    } else if (arg === "--branch" || arg === "-b") {
      parsed.branch = args[i + 1];
      return i + 1;
    } else if (arg === "--no-cache") {
      parsed.cache = false;
    } else if (arg === "--cache-ttl") {
      parsed.cacheTtl = parseInt(args[i + 1]);
      return i + 1;
    } else if (arg === "--placeholder") {
      if (!parsed.placeholders) parsed.placeholders = [];
      parsed.placeholders.push(args[i + 1]);
      return i + 1;
    } else if (arg === "--experimental-placeholder-prompts") {
      parsed.experimentalPlaceholderPrompts = true;
    } else if (arg === "--no-input-prompts") {
      parsed.inputPrompts = false;
    } else if (arg === "--interactive") {
      parsed.interactive = true;
    } else if (arg === "--no-interactive") {
      parsed.interactive = false;
    } else if (arg === "--no-config") {
      parsed.config = false;
    } else if (arg === "--options") {
      parsed.optionsFile = args[i + 1];
      return i + 1;
    } else if (arg === "--dry-run") {
      parsed.dryRun = true;
    } else if (arg === "--log-file") {
      parsed.logFile = args[i + 1];
      return i + 1;
    } else if (!arg.startsWith("-")) {
      // First positional argument is project name
      if (!parsed.projectName) {
        parsed.projectName = arg;
      }
    }
  }

  run(parsed) {
    // Validate required argument
    if (!parsed.projectName) {
      console.error("Error: <project-name> is required");
      this.showHelp();
      process.exit(1);
    }

    // Validate required option
    if (!parsed.template) {
      console.error("Error: --template is required");
      this.showHelp();
      process.exit(1);
    }

    // Validate project name
    const validation = validateProjectName(parsed.projectName);
    if (!validation.valid) {
      console.error(`Error: ${validation.error}`);
      this.showHelp();
      process.exit(1);
    }

    // Execute scaffolding
    const scaffolder = new Scaffolder(parsed);
    scaffolder.scaffold();
  }
}

// Direct execution support
if (import.meta.url === `file://${process.argv[1]}`) {
  const cmd = new NewCommand();
  const args = process.argv.slice(2);
  cmd.execute(args);
}
```

**2.2 List Command**

```javascript
// bin/create-scaffold/commands/list/help.js
export const listHelp = {
  name: "list",
  usage: "list [options]",
  description: "List available templates",

  detailedDescription: [
    "Display templates from configured registries.",
    "Shows templates from user-defined and official registries.",
  ],

  optionGroups: [
    {
      title: "Options",
      options: [
        {
          long: "--registry",
          value: "<name>",
          desc: "Registry to list templates from",
          detailed: [
            "Filter templates by specific registry.",
            "If not specified, shows all registries.",
          ],
        },
        {
          long: "--format",
          value: "<format>",
          desc: "Output format (table|json, default: table)",
          detailed: [
            "Choose output format:",
            "  • table - Human-readable table format",
            "  • json  - Machine-readable JSON format",
          ],
        },
        {
          long: "--verbose",
          desc: "Show detailed information",
        },
      ],
    },
  ],

  examples: [
    { cmd: "list", desc: "List all templates from all registries" },
    {
      cmd: "list --registry official",
      desc: "List templates from official registry",
    },
    { cmd: "list --format json", desc: "Output in JSON format" },
  ],
};
```

```javascript
// bin/create-scaffold/commands/list/index.js
import { BaseCommand } from "../../../../lib/base/base-command.js";
import { listHelp } from "./help.js";
import { RegistryFetcher } from "./registry-fetcher.js";

export class ListCommand extends BaseCommand {
  constructor() {
    super(listHelp);
  }

  parseArg(arg, args, i, parsed) {
    if (arg === "--registry") {
      parsed.registry = args[i + 1];
      return i + 1;
    } else if (arg === "--format") {
      parsed.format = args[i + 1];
      return i + 1;
    } else if (arg === "--verbose") {
      parsed.verbose = true;
    }
  }

  run(parsed) {
    const fetcher = new RegistryFetcher(parsed);
    fetcher.list();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const cmd = new ListCommand();
  const args = process.argv.slice(2);
  cmd.execute(args);
}
```

**2.3 Validate Command**

```javascript
// bin/create-scaffold/commands/validate/help.js
export const validateHelp = {
  name: "validate",
  usage: "validate <template-path> [options]",
  description: "Validate template configuration",

  detailedDescription: [
    "Validates a template directory or template.json file.",
    "Checks for required fields, valid structure, and common issues.",
  ],

  optionGroups: [
    {
      title: "Options",
      options: [
        {
          long: "--suggest",
          desc: "Show intelligent fix suggestions",
          detailed: ["Provide suggestions for fixing validation errors"],
        },
        {
          long: "--fix",
          desc: "Auto-apply safe fixes",
          detailed: [
            "Automatically fix issues that can be safely corrected.",
            "Manual review recommended after automated fixes.",
          ],
        },
      ],
    },
  ],

  examples: [
    { cmd: "validate ./my-template", desc: "Validate template in directory" },
    {
      cmd: "validate ./template.json",
      desc: "Validate template configuration file",
    },
    { cmd: "validate ./my-template --suggest", desc: "Get fix suggestions" },
    { cmd: "validate ./my-template --fix", desc: "Auto-fix safe issues" },
  ],
};
```

```javascript
// bin/create-scaffold/commands/validate/index.js
import { BaseCommand } from "../../../../lib/base/base-command.js";
import { validateHelp } from "./help.js";
import { TemplateValidator } from "./template-validator.js";

export class ValidateCommand extends BaseCommand {
  constructor() {
    super(validateHelp);
  }

  parseArg(arg, args, i, parsed) {
    if (arg === "--suggest") {
      parsed.suggest = true;
    } else if (arg === "--fix") {
      parsed.fix = true;
    } else if (!arg.startsWith("-")) {
      if (!parsed.templatePath) {
        parsed.templatePath = arg;
      }
    }
  }

  run(parsed) {
    if (!parsed.templatePath) {
      console.error("Error: <template-path> is required");
      this.showHelp();
      process.exit(1);
    }

    const validator = new TemplateValidator(parsed);
    const result = validator.validate();

    if (!result.valid) {
      process.exit(1);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const cmd = new ValidateCommand();
  const args = process.argv.slice(2);
  cmd.execute(args);
}
```

**2.4 Create Router**

```javascript
// bin/create-scaffold/index.mjs
#!/usr/bin/env node
import { Router } from '../../lib/base/router.js';
import { NewCommand } from './commands/new/index.js';
import { ListCommand } from './commands/list/index.js';
import { ValidateCommand } from './commands/validate/index.js';

class CreateScaffoldRouter extends Router {
  constructor() {
    super();
    this.toolName = '@m5nv/create-scaffold';
    this.description = 'Project scaffolding tool';
    this.commands = {
      new: new NewCommand(),
      list: new ListCommand(),
      validate: new ValidateCommand()
    };
    this.version = '1.0.0';
  }
}

const router = new CreateScaffoldRouter();
const args = process.argv.slice(2);
router.route(args);
```

### Phase 3: Refactor make-template

**3.1 Convert Command**

```javascript
// bin/make-template/commands/convert/help.js
export const convertHelp = {
  name: "convert",
  usage: "convert <project-path> [options]",
  description: "Convert project to template",

  detailedDescription: [
    "Convert an existing Node.js project into a reusable template.",
    "The tool replaces project-specific values with placeholders and generates template configuration.",
    "Always specify the project path explicitly to avoid accidental conversion.",
  ],

  optionGroups: [
    {
      title: "Project Options",
      options: [
        {
          long: "--type",
          value: "<type>",
          desc: "Force specific project type detection",
          detailed: [
            "Override automatic project type detection.",
            "Supported types: vite-react, next, express, generic",
          ],
        },
      ],
    },
    {
      title: "Placeholder Options",
      options: [
        {
          long: "--placeholder-format",
          value: "<format>",
          desc: "Specify placeholder format",
          detailed: [
            "Choose placeholder style:",
            "  • mustache - {{PLACEHOLDER}}",
            "  • dollar   - $PLACEHOLDER",
            "  • percent  - %PLACEHOLDER%",
          ],
        },
      ],
    },
    {
      title: "Operation Modes",
      options: [
        {
          long: "--dry-run",
          desc: "Preview changes without executing them",
        },
        {
          long: "--yes",
          desc: "Skip confirmation prompts",
        },
        {
          long: "--silent",
          desc: "Suppress prompts and non-essential output",
        },
      ],
    },
    {
      title: "Security",
      options: [
        {
          long: "--sanitize-undo",
          desc: "Remove sensitive data from undo log",
          detailed: [
            "Prevents sensitive data from being stored in restoration logs",
          ],
        },
      ],
    },
  ],

  examples: [
    { cmd: "convert ./my-project", desc: "Convert project to template" },
    { cmd: "convert ./my-project --dry-run", desc: "Preview conversion" },
    {
      cmd: "convert ./my-project --type vite-react --yes",
      desc: "Force type and skip prompts",
    },
    {
      cmd: "convert ./my-project --placeholder-format mustache",
      desc: "Use specific placeholder style",
    },
  ],
};
```

```javascript
// bin/make-template/commands/convert/index.js
import { BaseCommand } from "../../../../lib/base/base-command.js";
import { convertHelp } from "./help.js";
import { Converter } from "./converter.js";
import { validateProjectPath } from "./validator.js";

export class ConvertCommand extends BaseCommand {
  constructor() {
    super(convertHelp);
  }

  parseArg(arg, args, i, parsed) {
    if (arg === "--dry-run") {
      parsed.dryRun = true;
    } else if (arg === "--yes") {
      parsed.yes = true;
    } else if (arg === "--silent") {
      parsed.silent = true;
    } else if (arg === "--type") {
      parsed.type = args[i + 1];
      return i + 1;
    } else if (arg === "--placeholder-format") {
      parsed.placeholderFormat = args[i + 1];
      return i + 1;
    } else if (arg === "--sanitize-undo") {
      parsed.sanitizeUndo = true;
    } else if (!arg.startsWith("-")) {
      if (!parsed.projectPath) {
        parsed.projectPath = arg;
      }
    }
  }

  run(parsed) {
    if (!parsed.projectPath) {
      console.error("Error: <project-path> is required");
      console.error(
        "\n⚠️  Always specify the project path explicitly to avoid accidental conversion"
      );
      this.showHelp();
      process.exit(1);
    }

    const validation = validateProjectPath(parsed.projectPath);
    if (!validation.valid) {
      console.error(`Error: ${validation.error}`);
      process.exit(1);
    }

    const converter = new Converter(parsed);
    converter.convert();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const cmd = new ConvertCommand();
  const args = process.argv.slice(2);
  cmd.execute(args);
}
```

**3.2 Restore Command**

```javascript
// bin/make-template/commands/restore/help.js
export const restoreHelp = {
  name: "restore",
  usage: "restore <project-path> [options]",
  description: "Restore template to project",

  detailedDescription: [
    "Restore a template back to a working project state.",
    "Replaces placeholders with actual values and restores project structure.",
  ],

  optionGroups: [
    {
      title: "Restore Scope",
      options: [
        {
          long: "--files",
          value: "<files>",
          desc: "Restore only specified files (comma-separated)",
          detailed: ["Comma-separated list of file paths to restore"],
        },
        {
          long: "--placeholders-only",
          desc: "Restore only placeholder values, keep template structure",
          detailed: [
            "Useful for refreshing placeholder values without affecting template files",
          ],
        },
      ],
    },
    {
      title: "Configuration",
      options: [
        {
          long: "--generate-defaults",
          desc: "Generate .restore-defaults.json configuration",
          detailed: [
            "Creates a configuration file for default restoration values",
          ],
        },
      ],
    },
    {
      title: "Operation Modes",
      options: [
        {
          long: "--dry-run",
          desc: "Preview changes without executing them",
        },
        {
          long: "--yes",
          desc: "Skip confirmation prompts",
        },
      ],
    },
  ],

  examples: [
    { cmd: "restore ./my-template", desc: "Restore template to working state" },
    { cmd: "restore ./my-template --dry-run", desc: "Preview restoration" },
    {
      cmd: "restore ./my-template --files package.json,src/index.js",
      desc: "Restore specific files",
    },
    {
      cmd: "restore ./my-template --placeholders-only",
      desc: "Only restore placeholder values",
    },
  ],
};
```

```javascript
// bin/make-template/commands/restore/index.js
import { BaseCommand } from "../../../../lib/base/base-command.js";
import { restoreHelp } from "./help.js";
import { Restorer } from "./restorer.js";

export class RestoreCommand extends BaseCommand {
  constructor() {
    super(restoreHelp);
  }

  parseArg(arg, args, i, parsed) {
    if (arg === "--dry-run") {
      parsed.dryRun = true;
    } else if (arg === "--yes") {
      parsed.yes = true;
    } else if (arg === "--files") {
      parsed.files = args[i + 1].split(",");
      return i + 1;
    } else if (arg === "--placeholders-only") {
      parsed.placeholdersOnly = true;
    } else if (arg === "--generate-defaults") {
      parsed.generateDefaults = true;
    } else if (!arg.startsWith("-")) {
      if (!parsed.projectPath) {
        parsed.projectPath = arg;
      }
    }
  }

  run(parsed) {
    if (!parsed.projectPath) {
      console.error("Error: <project-path> is required");
      this.showHelp();
      process.exit(1);
    }

    const restorer = new Restorer(parsed);
    restorer.restore();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const cmd = new RestoreCommand();
  const args = process.argv.slice(2);
  cmd.execute(args);
}
```

**3.3 Init Command**

```javascript
// bin/make-template/commands/init/help.js
export const initHelp = {
  name: "init",
  usage: "init [options]",
  description: "Generate skeleton template.json",

  detailedDescription: [
    "Creates a skeleton template.json file with common fields.",
    "Useful for starting a new template from scratch.",
  ],

  optionGroups: [
    {
      title: "Options",
      options: [
        {
          long: "--file",
          value: "<path>",
          desc: "Specify output file path (default: template.json)",
          detailed: ["Custom path for the generated template configuration"],
        },
      ],
    },
  ],

  examples: [
    { cmd: "init", desc: "Generate template.json in current directory" },
    {
      cmd: "init --file my-template.json",
      desc: "Generate with custom filename",
    },
  ],
};
```

```javascript
// bin/make-template/commands/init/index.js
import { BaseCommand } from "../../../../lib/base/base-command.js";
import { initHelp } from "./help.js";
import fs from "fs";
import path from "path";

export class InitCommand extends BaseCommand {
  constructor() {
    super(initHelp);
  }

  parseArg(arg, args, i, parsed) {
    if (arg === "--file") {
      parsed.file = args[i + 1];
      return i + 1;
    }
  }

  run(parsed) {
    const outputFile = parsed.file || "template.json";

    const skeleton = {
      name: "",
      description: "",
      version: "1.0.0",
      placeholders: [],
      files: {
        include: ["**/*"],
        exclude: ["node_modules/**", ".git/**"],
      },
    };

    fs.writeFileSync(outputFile, JSON.stringify(skeleton, null, 2));
    console.log(`✓ Generated ${outputFile}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const cmd = new InitCommand();
  const args = process.argv.slice(2);
  cmd.execute(args);
}
```

**3.4 Validate Command**

```javascript
// bin/make-template/commands/validate/help.js
export const validateHelp = {
  name: "validate",
  usage: "validate [options]",
  description: "Validate template.json",

  detailedDescription: [
    "Validates template.json in the current directory.",
    "Checks for required fields, valid structure, and common issues.",
  ],

  optionGroups: [
    {
      title: "Options",
      options: [
        {
          long: "--file",
          value: "<path>",
          desc: "Specify input file path (default: template.json)",
          detailed: ["Custom path to template configuration file"],
        },
        {
          long: "--suggest",
          desc: "Show intelligent fix suggestions",
        },
        {
          long: "--fix",
          desc: "Auto-apply safe fixes",
        },
      ],
    },
  ],

  examples: [
    { cmd: "validate", desc: "Validate template.json in current directory" },
    { cmd: "validate --file my-template.json", desc: "Validate specific file" },
    { cmd: "validate --suggest", desc: "Get fix suggestions" },
  ],
};
```

**3.5 Hints Command**

```javascript
// bin/make-template/commands/hints/help.js
export const hintsHelp = {
  name: "hints",
  usage: "hints [options]",
  description: "Show hints catalog",

  detailedDescription: [
    "Display catalog of available hints for template creation.",
    "Provides guidance on best practices and common patterns.",
  ],

  examples: [{ cmd: "hints", desc: "Show all available hints" }],
};
```

**3.6 Test Command**

```javascript
// bin/make-template/commands/test/help.js
export const testHelp = {
  name: "test",
  usage: "test <template-path> [options]",
  description: "Test template functionality",

  detailedDescription: [
    "Tests a template by performing a trial conversion and restoration.",
    "Verifies that the template works correctly end-to-end.",
  ],

  optionGroups: [
    {
      title: "Options",
      options: [
        {
          long: "--verbose",
          desc: "Show detailed test output",
        },
      ],
    },
  ],

  examples: [
    { cmd: "test ./my-template", desc: "Test template functionality" },
    { cmd: "test ./my-template --verbose", desc: "Test with detailed output" },
  ],
};
```

**3.7 Create Router**

```javascript
// bin/make-template/index.mjs
#!/usr/bin/env node
import { Router } from '../../lib/base/router.js';
import { ConvertCommand } from './commands/convert/index.js';
import { RestoreCommand } from './commands/restore/index.js';
import { InitCommand } from './commands/init/index.js';
import { ValidateCommand } from './commands/validate/index.js';
import { HintsCommand } from './commands/hints/index.js';
import { TestCommand } from './commands/test/index.js';

class MakeTemplateRouter extends Router {
  constructor() {
    super();
    this.toolName = '@m5nv/make-template';
    this.description = 'Convert existing Node.js projects into reusable templates';
    this.commands = {
      convert: new ConvertCommand(),
      restore: new RestoreCommand(),
      init: new InitCommand(),
      validate: new ValidateCommand(),
      hints: new HintsCommand(),
      test: new TestCommand()
    };
    this.version = '1.0.0';
  }
}

const router = new MakeTemplateRouter();
const args = process.argv.slice(2);
router.route(args);
```

### Phase 4: Testing

**4.1 Test create-scaffold Commands**

```javascript
// tests/create-scaffold/commands/new.test.js
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NewCommand } from "../../../bin/create-scaffold/commands/new/index.js";
import { captureOutput, mockExit } from "../../helpers.js";

describe("NewCommand", () => {
  it("requires project-name argument", () => {
    const cmd = new NewCommand();
    const exitCode = mockExit(() => {
      captureOutput(() => cmd.execute([]));
    });
    assert.strictEqual(exitCode, 1);
  });

  it("requires --template option", () => {
    const cmd = new NewCommand();
    const exitCode = mockExit(() => {
      captureOutput(() => cmd.execute(["myapp"]));
    });
    assert.strictEqual(exitCode, 1);
  });

  it("parses project name and template", () => {
    const cmd = new NewCommand();
    const parsed = cmd.parseArgs(["myapp", "--template", "react-app"]);
    assert.strictEqual(parsed.projectName, "myapp");
    assert.strictEqual(parsed.template, "react-app");
  });

  it("handles options in any position", () => {
    const cmd = new NewCommand();
    const parsed1 = cmd.parseArgs([
      "myapp",
      "--template",
      "react-app",
      "--branch",
      "dev",
    ]);
    const parsed2 = cmd.parseArgs([
      "--template",
      "react-app",
      "myapp",
      "--branch",
      "dev",
    ]);
    const parsed3 = cmd.parseArgs([
      "--branch",
      "dev",
      "--template",
      "react-app",
      "myapp",
    ]);

    assert.strictEqual(parsed1.projectName, "myapp");
    assert.strictEqual(parsed2.projectName, "myapp");
    assert.strictEqual(parsed3.projectName, "myapp");
  });

  it("shows help with --help flag", () => {
    const cmd = new NewCommand();
    const { logs } = captureOutput(() => cmd.execute(["--help"]));
    const output = logs.join("\n");
    assert.match(output, /Create a new project from a template/);
    assert.match(output, /--template/);
  });
});
```

**4.2 Test make-template Commands**

```javascript
// tests/make-template/commands/convert.test.js
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ConvertCommand } from "../../../bin/make-template/commands/convert/index.js";
import { captureOutput, mockExit } from "../../helpers.js";

describe("ConvertCommand", () => {
  it("requires project-path argument", () => {
    const cmd = new ConvertCommand();
    const exitCode = mockExit(() => {
      captureOutput(() => cmd.execute([]));
    });
    assert.strictEqual(exitCode, 1);
  });

  it("shows safety warning when path missing", () => {
    const cmd = new ConvertCommand();
    mockExit(() => {
      const { errors } = captureOutput(() => cmd.execute([]));
      const output = errors.join("\n");
      assert.match(output, /project-path.*required/);
      assert.match(output, /specify the project path explicitly/);
    });
  });

  it("parses project-path correctly", () => {
    const cmd = new ConvertCommand();
    const parsed = cmd.parseArgs(["./my-project", "--dry-run"]);
    assert.strictEqual(parsed.projectPath, "./my-project");
    assert.strictEqual(parsed.dryRun, true);
  });

  it("handles options before path", () => {
    const cmd = new ConvertCommand();
    const parsed = cmd.parseArgs(["--type", "vite-react", "./my-project"]);
    assert.strictEqual(parsed.projectPath, "./my-project");
    assert.strictEqual(parsed.type, "vite-react");
  });
});
```

**4.3 Test Restore Command**

```javascript
// tests/make-template/commands/restore.test.js
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { RestoreCommand } from "../../../bin/make-template/commands/restore/index.js";
import { captureOutput, mockExit } from "../../helpers.js";

describe("RestoreCommand", () => {
  it("requires project-path argument", () => {
    const cmd = new RestoreCommand();
    const exitCode = mockExit(() => {
      captureOutput(() => cmd.execute([]));
    });
    assert.strictEqual(exitCode, 1);
  });

  it("parses files option as array", () => {
    const cmd = new RestoreCommand();
    const parsed = cmd.parseArgs([
      "./my-template",
      "--files",
      "a.js,b.js,c.js",
    ]);
    assert.deepStrictEqual(parsed.files, ["a.js", "b.js", "c.js"]);
  });

  it("parses placeholders-only flag", () => {
    const cmd = new RestoreCommand();
    const parsed = cmd.parseArgs(["./my-template", "--placeholders-only"]);
    assert.strictEqual(parsed.placeholdersOnly, true);
  });
});
```

### Phase 5: Documentation

**5.1 Update README**

Create comprehensive README for each tool documenting:

- Installation
- Quick start
- Command reference
- Examples
- Architecture overview

**5.2 Add ARCHITECTURE.md**

Document the design patterns used:

- Command Pattern
- Template Method Pattern
- Command DSL conventions
- File organization principles
- Extension points

## Success Criteria

### Functional Requirements

- [ ] All commands follow correct DSL (`<required>` for arguments, `--option`
      for options)
- [ ] No implicit or default arguments that could cause accidents
- [ ] Position-independent options work correctly
- [ ] Two-tier help system (quick --help and detailed help command)
- [ ] All dangerous operations require explicit arguments

### Code Quality

- [ ] All commands extend BaseCommand
- [ ] Help configuration separated into help.js
- [ ] Business logic in dedicated modules
- [ ] Commands directly executable for testing
- [ ] Consistent naming conventions

### Safety

- [ ] `convert` command requires explicit project path
- [ ] All commands validate required arguments before execution
- [ ] Clear error messages for missing arguments
- [ ] `--dry-run` available for destructive operations

### Testing

- [ ] Test coverage for all commands
- [ ] Tests for argument parsing (positional and options)
- [ ] Tests for validation and error cases
- [ ] All tests use node:test runner
- [ ] All tests pass

### Documentation

- [ ] Clear usage examples for each command
- [ ] Two-tier help implemented for all commands
- [ ] Architecture documentation
- [ ] No references to past design mistakes

## Implementation Timeline

**Phase 1: Foundation** (Day 1)

- Create base infrastructure
- Set up test framework

**Phase 2: create-scaffold** (Days 2-3)

- Refactor all commands
- Add tests
- Verify functionality

**Phase 3: make-template** (Days 4-6)

- Refactor all commands
- Add tests
- Verify functionality

**Phase 4: Documentation** (Day 7)

- Update README files
- Create architecture documentation
- Add usage examples

**Phase 5: Validation** (Day 8)

- Run full test suite
- Manual testing of all workflows
- Final review

## Next Steps

1. **Review this plan** - Confirm understanding and approach
2. **Analyze current codebase** - Map existing code to new structure
3. **Create detailed task list** - Break down into specific implementation tasks
4. **Begin implementation** - Start with Phase 1

---

**Ready to proceed?** Please confirm understanding of:

- Command DSL principles (arguments vs options)
- File organization structure
- Safety requirements (explicit arguments)
- Testing approach
- No backward compatibility needed


