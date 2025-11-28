# @m5nv/cli - Minimal CLI Routing Framework

A lightweight, composable CLI routing framework for Node.js applications.

## Design Philosophy

1. **Minimal abstractions** - Only two classes: `Command` and `Router`
2. **Composition over configuration** - Nest routers to create hierarchies
3. **Distributed ownership** - Commands own their subcommands
4. **Standalone testability** - Every command works in isolation
5. **No forced patterns** - Use namespaces or not, your choice

## Core Classes

### Command

A leaf node that handles argument parsing and execution.

```typescript
import { Command } from '@m5nv/cli';

class ValidateCommand extends Command {
  constructor() {
    super({
      name: 'validate',
      description: 'Validate template configuration',
      usage: 'validate [config-file]',
      options: [
        { short: '-s', long: '--strict', desc: 'Enable strict validation' }
      ],
      examples: [
        { cmd: 'validate', desc: 'Validate .templatize.json' },
        { cmd: 'validate my-config.json', desc: 'Validate specific file' }
      ]
    });
  }

  parseArg(arg, args, index, parsed) {
    if (!arg.startsWith('-') && !parsed.configFile) {
      parsed.configFile = arg;
    }
  }

  async run(parsed) {
    const configPath = parsed.configFile || '.templatize.json';
    // ... validation logic
  }
}
```

**Key methods:**

| Method | Purpose | Override? |
|--------|---------|-----------|
| `execute(args)` | Entry point - parses args, handles --help, calls run() | No |
| `parseArgs(args)` | Iterates args, calls parseArg() for each | No |
| `parseArg(arg, args, i, parsed)` | Handle a single argument | Yes |
| `run(parsed)` | Execute command logic | Yes |
| `showHelp()` | Display brief help | No |
| `showDetailedHelp()` | Display man-page style help | No |

### Router

Routes to commands or nested routers. Handles help patterns.

```typescript
import { Router } from '@m5nv/cli';

class ConfigRouter extends Router {
  constructor() {
    super();
    this.toolName = 'config';
    this.description = 'Manage template configuration';
    this.commands = {
      validate: new ValidateCommand(),
      show: new ShowCommand()
    };
  }
}
```

**Key methods:**

| Method | Purpose | Override? |
|--------|---------|-----------|
| `route(args)` | Parse first arg, delegate to command/router | No |
| `execute(args)` | Alias for route() - enables uniform interface | No |
| `showGeneralHelp()` | Display available commands | No |

---

## Theory of Operation

This section explains how the framework handles arguments, help, and the developer's responsibilities.

### Argument Parsing Contract

The framework provides argument iteration; the developer provides argument interpretation.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ARGUMENT PARSING FLOW                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  User input: command --flag value --other pos1 pos2                         │
│                                                                             │
│  ┌─────────────────┐                                                        │
│  │ execute(args)   │  ← Framework: Entry point                              │
│  └────────┬────────┘                                                        │
│           ↓                                                                 │
│  ┌─────────────────┐                                                        │
│  │ parseArgs(args) │  ← Framework: Iterates through args[]                  │
│  └────────┬────────┘                                                        │
│           ↓                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │ For each arg[i]:                                            │            │
│  │   1. Check --help/-h → set parsed.help, return early        │ ← Framework│
│  │   2. Call parseArg(arg, args, i, parsed)                    │            │
│  │   3. If returns number → skip to that index                 │            │
│  │   4. If returns undefined AND arg starts with '--'          │            │
│  │      → throw "Unknown option" error                         │ ← Framework│
│  └─────────────────────────────────────────────────────────────┘            │
│           ↓                                                                 │
│  ┌─────────────────┐                                                        │
│  │ run(parsed)     │  ← Developer: Receives parsed object                   │
│  └─────────────────┘                                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### The parseArg() Method: Developer's Contract

**Signature:**
```typescript
parseArg(arg: string, args: string[], index: number, parsed: Record<string, unknown>): number | undefined
```

**Parameters:**
- `arg` - The current argument being processed
- `args` - The full arguments array (for lookahead)
- `index` - Current position in args array
- `parsed` - Object to populate with parsed values

**Return value is CRITICAL:**

| Return | Meaning | When to use |
|--------|---------|-------------|
| `undefined` | Did not handle this arg | Positional args, unrecognized flags |
| `index` | Handled, stay at current position | Boolean flags (`--verbose`) |
| `index + 1` | Handled, skip next arg | Value flags (`--file path`) |
| `index + N` | Handled, skip N args | Multi-value flags |

### Common Patterns

**Pattern 1: Boolean flag (no value)**
```typescript
parseArg(arg, args, i, parsed) {
  if (arg === '--verbose' || arg === '-v') {
    parsed.verbose = true;
    return i;  // ✅ MUST return index to indicate "handled"
  }
  // Return undefined for unhandled args
}
```

**Pattern 2: Flag with value**
```typescript
parseArg(arg, args, i, parsed) {
  if (arg === '--file' || arg === '-f') {
    parsed.file = args[i + 1];  // Get next arg as value
    return i + 1;  // ✅ Skip the value arg in next iteration
  }
}
```

**Pattern 3: Flag with `=` syntax**
```typescript
parseArg(arg, args, i, parsed) {
  if (arg.startsWith('--file=')) {
    parsed.file = arg.split('=')[1];
    return i;  // Value is embedded, don't skip
  }
  if (arg === '--file') {
    parsed.file = args[i + 1];
    return i + 1;  // Value is next arg, skip it
  }
}
```

**Pattern 4: Positional arguments**
```typescript
parseArg(arg, args, i, parsed) {
  // Handle flags first
  if (arg === '--verbose') {
    parsed.verbose = true;
    return i;
  }
  
  // Positional: does not start with '-'
  if (!arg.startsWith('-')) {
    if (!parsed.projectName) {
      parsed.projectName = arg;
      // ✅ Return undefined - framework ignores positional by default
      // This is correct! Non-flag args don't need explicit return.
    }
  }
}
```

**Pattern 5: Accumulating flags (arrays)**
```typescript
parseArg(arg, args, i, parsed) {
  if (arg === '--include' || arg === '-I') {
    parsed.includes = parsed.includes || [];
    parsed.includes.push(args[i + 1]);
    return i + 1;
  }
}
```

### Common Mistakes

**❌ Mistake 1: Forgetting to return index for handled flags**
```typescript
// WRONG - causes "Unknown option" error
parseArg(arg, args, i, parsed) {
  if (arg === '--check') {
    parsed.check = true;
    // Missing return! Framework thinks flag wasn't handled
  }
}
```

**✅ Fix:**
```typescript
parseArg(arg, args, i, parsed) {
  if (arg === '--check') {
    parsed.check = true;
    return i;  // Tell framework we handled it
  }
}
```

**❌ Mistake 2: Wrong index for value flags**
```typescript
// WRONG - value gets processed as separate arg
parseArg(arg, args, i, parsed) {
  if (arg === '--output') {
    parsed.output = args[i + 1];
    return i;  // Should be i + 1!
  }
}
```

**✅ Fix:**
```typescript
parseArg(arg, args, i, parsed) {
  if (arg === '--output') {
    parsed.output = args[i + 1];
    return i + 1;  // Skip the value in next iteration
  }
}
```

### What the Framework Handles Automatically

| Feature | Behavior | Developer action |
|---------|----------|------------------|
| `--help`, `-h` | Sets `parsed.help = true`, stops parsing | Check `parsed.help` in `run()` (optional - `execute()` handles it) |
| Unknown `--flags` | Throws error if `parseArg` returns `undefined` | Return index for all recognized flags |
| Positional args | Ignored if `parseArg` returns `undefined` | Store in `parsed` object manually |
| Help display | Calls `showHelp()` when `parsed.help` is true | Define help metadata in constructor |
| Error display | Shows help after parse errors | No action needed |

### Execution Flow Summary

```typescript
// What execute() does (you don't override this)
async execute(args) {
  let parsed;
  try {
    parsed = this.parseArgs(args);  // Calls your parseArg()
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    this.showHelp();
    process.exit(1);
  }

  if (parsed.help) {
    this.showHelp();  // --help was passed
    return;
  }

  return await this.run(parsed);  // Your logic here
}
```

### Quick Reference Card

```text
┌────────────────────────────────────────────────────────────┐
│                  parseArg() QUICK REFERENCE                │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Boolean flag:     return i;                               │
│  Value flag:       return i + 1;                           │
│  Multi-value:      return i + N;                           │
│  Positional:       return undefined; (or don't return)     │
│  Unrecognized:     return undefined; (framework errors)    │
│                                                            │
│  ⚠️  Forgetting return → "Unknown option" error            │
│  ⚠️  Wrong skip count → value treated as next command      │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Composition Patterns

### Pattern 1: Flat Commands

Single-level routing, no nesting.

```console
tool <command> [args]
```

```typescript
class MyToolRouter extends Router {
  constructor() {
    super();
    this.toolName = 'my-tool';
    this.commands = {
      init: new InitCommand(),
      build: new BuildCommand(),
      test: new TestCommand()
    };
  }
}
```

### Pattern 2: Nested Commands

Commands that have subcommands.

```console
tool <command> <subcommand> [args]
```

```typescript
class ConfigRouter extends Router {
  constructor() {
    super();
    this.toolName = 'config';
    this.commands = {
      validate: new ValidateCommand(),
      show: new ShowCommand()
    };
  }
}

class MyToolRouter extends Router {
  constructor() {
    super();
    this.toolName = 'my-tool';
    this.commands = {
      init: new InitCommand(),
      config: new ConfigRouter()  // Router as command
    };
  }
}
```

Invocation: `my-tool config validate`

### Pattern 3: Namespaced Tools (Super-Router)

Multiple tools under one binary.

```console
tool <namespace> <command> [args]
```

```typescript
class ScaffoldRouter extends Router {
  constructor() {
    super();
    this.toolName = 'scaffold';
    this.description = 'Create projects from templates';
    this.commands = {
      new: new NewCommand(),
      list: new ListCommand()
    };
  }
}

class TemplateRouter extends Router {
  constructor() {
    super();
    this.toolName = 'template';
    this.description = 'Author and manage templates';
    this.commands = {
      init: new InitCommand(),
      convert: new ConvertCommand(),
      config: new ConfigRouter()
    };
  }
}

class M5nvRouter extends Router {
  constructor() {
    super();
    this.toolName = 'm5nv';
    this.description = 'Project scaffolding and template authoring toolkit';
    this.commands = {
      scaffold: new ScaffoldRouter(),
      template: new TemplateRouter()
    };
  }
}
```

Invocations:
- `m5nv scaffold new my-app`
- `m5nv template init`
- `m5nv template config validate`

---

## Help System

The help system is a key architectural feature, providing **uniform, predictable help access** across all command levels through a separation of concerns between structure and content.

### Design Principles

1. **Two access patterns, same content**: `<command> --help` and `help <command>` show equivalent information
2. **Separation of structure and content**: Help metadata is declarative, rendering is handled by the framework
3. **Two-tier help display**: Brief help for quick reference, detailed help for comprehensive documentation
4. **Hierarchical traversal**: `help` command can navigate nested command structures

### Help Access Patterns

| Pattern | Scope | Handler | Output |
|---------|-------|---------|--------|
| `tool --help` | Tool level | `Router.route()` | General help (commands list) |
| `tool -h` | Tool level | `Router.route()` | Same as --help |
| `tool help` | Tool level | `Router.route()` | Same as --help |
| `tool help <cmd>` | Command level | `Router.handleHelpCommand()` | Detailed command help |
| `tool help <cmd> <sub>` | Subcommand level | `Router.handleHelpCommand()` | Detailed subcommand help |
| `tool <cmd> --help` | Command level | `Command.execute()` | Brief command help |
| `tool <cmd> <sub> --help` | Subcommand level | `Command.execute()` | Brief subcommand help |

### Help Content Structure

Each command declares its help metadata as a structured object:

```typescript
interface CommandHelp {
  name: string;                    // Command name
  description: string;             // One-line description (for listings)
  usage: string;                   // Usage synopsis
  detailedDescription?: string[];  // Extended description paragraphs
  options?: HelpOption[];          // Flat options list
  optionGroups?: HelpOptionGroup[]; // Grouped options (for complex commands)
  examples?: HelpExample[];        // Usage examples with descriptions
}

interface HelpOption {
  short?: string;    // e.g., '-s'
  long: string;      // e.g., '--strict'
  value?: string;    // e.g., '<file>' for options that take values
  desc: string;      // Brief description
  detailed?: string[]; // Extended explanation (for detailed help)
}

interface HelpExample {
  cmd: string;       // The example command
  desc?: string;     // Explanation of what it does
}
```

### Two-Tier Help Display

**Brief help** (`showHelp()`) - displayed for `<command> --help`:
- Quick reference format
- Shows usage, options summary, examples
- Footer points to detailed help

**Detailed help** (`showDetailedHelp()`) - displayed for `help <command>`:
- Man-page style format
- Sections: NAME, SYNOPSIS, DESCRIPTION, OPTIONS, EXAMPLES
- Extended descriptions and option details

```text
┌─────────────────────────────────────────────────────────────┐
│ Brief Help (showHelp)                                       │
├─────────────────────────────────────────────────────────────┤
│ Validate template configuration                             │
│                                                             │
│ USAGE: validate [config-file]                               │
│                                                             │
│ Options:                                                    │
│   -s, --strict              Enable strict validation        │
│                                                             │
│ Examples:                                                   │
│   validate                                                  │
│   validate my-config.json                                   │
│                                                             │
│ Run 'help validate' for more detailed information.          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Detailed Help (showDetailedHelp)                            │
├─────────────────────────────────────────────────────────────┤
│ NAME                                                        │
│     validate - Validate template configuration              │
│                                                             │
│ SYNOPSIS                                                    │
│     validate [config-file]                                  │
│                                                             │
│ DESCRIPTION                                                 │
│     Check the .templatize.json configuration file for       │
│     syntax and semantic errors.                             │
│                                                             │
│     Validates pattern definitions, file paths, and          │
│     configuration structure.                                │
│                                                             │
│ OPTIONS                                                     │
│     -s, --strict                                            │
│         Enable strict validation mode. Reports warnings     │
│         as errors and enforces stricter schema rules.       │
│                                                             │
│ EXAMPLES                                                    │
│     validate                                                │
│         Validate default .templatize.json                   │
│                                                             │
│     validate my-config.json                                 │
│         Validate specific configuration file                │
└─────────────────────────────────────────────────────────────┘
```

### Hierarchical Help Traversal

The `help` command can navigate nested command structures:

```console
m5nv help                      → Shows m5nv general help
m5nv help template             → Shows template namespace help
m5nv help template config      → Shows config router help
m5nv help template config validate → Shows validate command help
```

This is implemented via recursive traversal in `handleHelpCommand()`:

```typescript
handleHelpCommand(args: string[]): void {
  if (args.length === 0) {
    this.showGeneralHelp();
    return;
  }

  const target = this.commands[args[0]];
  if (!target) {
    this.showGeneralHelp();
    return;
  }

  // If target is a Router and there's more args, traverse deeper
  if (args.length > 1 && 'commands' in target) {
    const subRouter = target as Router;
    const subTarget = subRouter.commands[args[1]];
    if (subTarget) {
      subTarget.showDetailedHelp();
      return;
    }
  }

  target.showDetailedHelp();
}
```

### Uniform --help Handling

The `--help` flag is handled uniformly at two levels:

**At Router level** (in `route()`):
```typescript
if (args[0] === '--help' || args[0] === '-h') {
  this.showGeneralHelp();
  return;
}
```

**At Command level** (in `parseArgs()` and `execute()`):
```typescript
// In parseArgs - early exit on help flag
if (arg === '--help' || arg === '-h') {
  parsed.help = true;
  return parsed;  // Stop parsing
}

// In execute - show help instead of running
if (parsed.help) {
  this.showHelp();
  return;
}
```

This ensures `--help` works consistently whether invoked on:
- The tool itself: `m5nv --help`
- A namespace: `m5nv template --help`
- A command: `m5nv template init --help`
- A subcommand: `m5nv template config validate --help`

### Benefits of This Design

1. **Predictable UX**: Users can always use `--help` or `help <thing>` to get assistance
2. **Consistent output**: Same content structure regardless of access pattern
3. **Discoverable**: Brief help points to detailed help for more information
4. **Maintainable**: Help content is co-located with command implementation
5. **Testable**: Help output can be verified in isolation per command

---

## Routing Algorithm

```text
route(args):
  1. If empty or --help/-h → showGeneralHelp()
  2. If --version/-v → show version
  3. If 'help' → delegate to handleHelpCommand()
  4. Look up args[0] in commands
  5. If command has route() → command.route(args.slice(1))
  6. Else → command.execute(args.slice(1))
```

## Uniform Interface

Both `Command` and `Router` implement `execute(args)`:

```typescript
// Command.execute() - parses and runs
async execute(args) {
  const parsed = this.parseArgs(args);
  if (parsed.help) { this.showHelp(); return; }
  return await this.run(parsed);
}

// Router.execute() - delegates to route()
async execute(args) {
  return this.route(args);
}
```

This enables Router to treat all children uniformly:

```typescript
const command = this.commands[name];
await command.execute(remainingArgs);  // Works for Command or Router
```

## Testability

Every component is testable in isolation:

```typescript
// Test a leaf command
import { ValidateCommand } from './validate/index.mts';

test('validate command parses config file', async () => {
  const cmd = new ValidateCommand();
  const result = await cmd.execute(['my-config.json']);
  expect(result).toBeDefined();
});

test('validate --help shows usage', () => {
  const cmd = new ValidateCommand();
  // Capture console output or check parsed.help
});

// Test a router
import { ConfigRouter } from './config/index.mts';

test('config router routes to validate', async () => {
  const router = new ConfigRouter();
  await router.route(['validate', 'my-config.json']);
});
```

## Migration Path

### From centralized subcommands:

```typescript
// Before: Router owns subcommands
this.subcommands = {
  config: { validate: new ConfigValidateCommand() }
};

// After: ConfigRouter owns validate
this.commands = {
  config: new ConfigRouter()  // ConfigRouter has validate
};
```

### Import path evolution:

| Phase | Import |
|-------|--------|
| Current | `import { Router } from '@m5nv/create-scaffold/lib/cli/router.mts'` |
| Workspace | `import { Router } from '@m5nv/cli'` |
| Published | Same (npm resolves) |

## File Structure

```text
lib/cli/
  index.mts          # Exports Command, Router
  command.mts        # Command base class
  router.mts         # Router class
  design.md          # This document
```

---

## Domain-Specific Language (DSL) Design

When designing a CLI, you're not just organizing code—you're creating a **domain-specific language** that users will speak. Every command, subcommand, and flag is a word in this language. Thoughtful DSL design makes the difference between a CLI that feels intuitive and one that feels arbitrary.

### The Language Metaphor

Think of your CLI as a language with two valid sentence structures:

**Verb-first (imperative):** `<verb> <object> <adverbs>`
- `build schema --check` → "build the schema with checking"
- `lint docs --verbose` → "lint docs verbosely"

**Noun-first (subject-focused):** `<subject> <verb> <adverbs>`
- `template init --force` → "template: initialize forcefully"
- `config validate --strict` → "config: validate strictly"

| Linguistic Concept | Verb-First CLI | Noun-First CLI |
|-------------------|----------------|----------------|
| Subject/Namespace | Implicit (the tool) | First word: `template`, `config` |
| Verb/Action | First word: `build`, `lint` | Second word: `init`, `validate` |
| Object/Target | Second word: `schema`, `docs` | Third word or args |
| Adjective/Adverb | Flags: `--verbose`, `--strict` | Flags: `--verbose`, `--strict` |

**Choose one paradigm and apply it consistently throughout your CLI.**

### Semantic Coherence

Commands and their options must make semantic sense together. Consider:

```text
❌ WRONG: validate all --docs-only
   "validate all but only docs" - contradictory
   
✅ RIGHT: validate docs
   "validate docs" - clear and direct
   
✅ RIGHT: validate (no args) → runs all
   "validate everything" - implicit scope
```

**Key principle:** If you find yourself adding flags that negate the command name, you need separate commands instead.

### Designing Command Hierarchies

#### When to use a namespace (Router):

- Multiple related operations on a single **target/noun**
- Example: `config` is a thing you `validate`, `show`, `edit`

```console
config validate    # validate the config
config show        # show the config
config edit        # edit the config
```

#### When to use separate commands:

- Different **targets/nouns** for the same operation
- Example: `validate` is an action on different things

```console
validate docs      # validate documentation
validate code      # validate code
validate           # validate all (default behavior)
```

#### When to use flags:

- Modifying **how** an action is performed, not **what** it targets
- Example: `--verbose`, `--strict`, `--dry-run`

```text
✅ validate docs --verbose    # how to validate
❌ validate --target=docs     # should be a subcommand
```

### Default Behavior Pattern

Routers can provide sensible defaults when invoked without subcommands:

```typescript
class ValidateRouter extends Router {
  constructor() {
    super();
    this.toolName = 'validate';
    this.commands = {
      docs: new ValidateDocsCommand(),
      code: new ValidateCodeCommand()
    };
  }

  // Override route() to handle no-subcommand case
  async route(args) {
    if (args.length === 0 || !this.commands[args[0]]) {
      // No subcommand = run all validations
      await this.runAll();
      return;
    }
    return super.route(args);
  }
}
```

This enables the natural pattern:
- `validate` → run all
- `validate docs` → run docs only
- `validate code` → run code only

### Naming Guidelines

These guidelines apply regardless of chosen paradigm:

| Principle | Good | Bad | Why |
|-----------|------|-----|-----|
| **Nouns for targets** | `schema`, `docs`, `config` | `building`, `validating` | Targets are things, not actions |
| **Verbs for actions** | `build`, `validate`, `generate` | `builder`, `validator` | Actions are verbs |
| **Singular form** | `build schema` | `build schemas` | Cleaner, more command-like |
| **Avoid redundancy** | `lint docs` | `lint-docs lint` | Don't repeat concepts |
| **Domain language** | `scaffold new` | `project create` | Match user mental model |

### Anti-Patterns to Avoid

#### 1. Flag-based dispatching (instead of commands)

```text
❌ validate --type=docs --type=code
✅ validate docs
✅ validate code
✅ validate (runs both)
```

#### 2. Mutually exclusive flags

```text
❌ validate all --docs-only --code-only
✅ validate docs
✅ validate code
```

#### 3. Deep nesting for simple operations

```text
❌ project template config schema validate
✅ template config validate
✅ schema validate
```

#### 4. Inconsistent verb placement

```text
❌ docs generate / validate docs  (verb position varies)
✅ docs generate / docs validate  (consistent: noun verb)
✅ generate docs / validate docs  (consistent: verb noun)
```

### Mapping User Intent to Structure

Start with user stories and work backwards:

| User Intent | Natural Expression | Verb-First CLI | Noun-First CLI |
|-------------|-------------------|----------------|----------------|
| "I want to check my docs" | "validate docs" | `lint docs` | `docs validate` |
| "I want to check everything" | "validate all" | `lint` (no args) | `validate` (no args) |
| "I want to build the schema" | "build schema" | `build schema` | `schema build` |
| "I want verbose output" | "...but louder" | `--verbose` flag | `--verbose` flag |

The CLI should feel like **completing a sentence**, not navigating a menu.

### Consistency-First Design

**Critical insight:** Choose a paradigm (verb-first or noun-first) and apply it consistently. Mixing paradigms is the primary source of CLI confusion.

#### The Anti-Pattern: Mixed Paradigms

```console
# Looks organized, but paradigms are mixed:
schema build           # noun-first (schema is subject)
docs generate          # noun-first (docs is subject)
validate docs          # verb-first (validate is action)
lint mocks             # verb-first (lint is action)
```

Problems:
- `schema build` (noun-first) vs `validate docs` (verb-first)
- User can't predict command structure
- Discoverability suffers

#### The Fix: Choose One Paradigm

**Option A: Verb-First (imperative style)**
```console
build schema           # verb: build, target: schema
build docs             # verb: build, target: docs
lint docs              # verb: lint, target: docs
lint code              # verb: lint, target: code
lint mocks             # verb: lint, target: mocks
```

**Option B: Noun-First (subject-focused style)**
```console
schema build           # subject: schema, verb: build
docs generate          # subject: docs, verb: generate
docs validate          # subject: docs, verb: validate
code lint              # subject: code, verb: lint
mocks check            # subject: mocks, verb: check
```

Either paradigm works—the key is consistency.

#### How to Identify Domains

Ask: "What is the **organizing principle** for this tool's commands?"

A domain is the **first-level grouping** in your CLI hierarchy. Depending on your chosen paradigm, domains can be:

**Verb-first paradigm** — domains are actions:
| Tool Type | Domains (Actions) | Targets within each |
|-----------|-------------------|---------------------|
| Build tool | `build`, `clean`, `watch` | `schema`, `docs`, `types` |
| Dev workflow | `lint`, `test`, `deploy` | `docs`, `code`, `mocks` |
| Package manager | `install`, `publish`, `run` | package names, script names |

**Noun-first paradigm** — domains are subject areas:
| Tool Type | Domains (Subjects) | Operations within each |
|-----------|-------------------|------------------------|
| Scaffolding tool | `scaffold`, `template` | `new`, `list`, `convert` |
| Version control | `branch`, `remote`, `stash` | `create`, `delete`, `list` |
| Cloud CLI | `compute`, `storage`, `network` | `create`, `list`, `delete` |

**Structure:** `<domain> <target-or-operation> [<args>] [<options>]`

- **Domain** - The organizing principle (verb-first: action; noun-first: subject area)
- **Target/Operation** - What follows (verb-first: noun/target; noun-first: verb)
- **Args** - Additional objects or values
- **Options** - Modifiers (how to do it)

**Example hierarchies:**

Verb-first:
```text
build schema --check
│     │       └── option (adverb: "with validation checking")
│     └── target (noun: what to build)
└── domain (verb: the action)
```

Noun-first:
```text
template config validate ./my-config.json --strict
│        │      │        │                └── option (adverb)
│        │      │        └── argument (object: which config)
│        │      └── operation (verb: what to do)
│        └── subdomain (nested subject area)
└── domain (noun: subject area)
```

The key insight: domains provide **structure**—they organize related commands. Whether they're verbs or nouns depends on your chosen paradigm.

---

## Configurable Terminology

The framework uses generic internal terminology (`Router`, `Command`) but developers can present **domain-specific vocabulary** to their users in help text and documentation.

### The Problem

Different CLI tools use different mental models:

| Domain | What they call "groups" | What they call "actions" |
|--------|------------------------|-------------------------|
| DevOps | tools, modules | commands |
| Learning | skills, packs | operations, exercises |
| Gaming | realms, worlds | actions, quests |
| Enterprise | services, domains | operations, tasks |

### The Solution

Router's display properties are fully configurable:

```typescript
class SkillsRouter extends Router {
  constructor() {
    super();
    this.toolName = 'learn';
    this.description = 'Interactive learning platform';
    
    // These appear in help text
    this.commandsLabel = 'SKILLS';      // Instead of "COMMANDS"
    this.commandsItemLabel = 'skill';   // "Run 'learn help <skill>'"
    
    this.commands = {
      javascript: new JavaScriptSkillRouter(),
      python: new PythonSkillRouter(),
      rust: new RustSkillRouter()
    };
  }
}

class JavaScriptSkillRouter extends Router {
  constructor() {
    super();
    this.toolName = 'javascript';
    this.description = 'JavaScript fundamentals and advanced concepts';
    
    this.commandsLabel = 'EXERCISES';
    this.commandsItemLabel = 'exercise';
    
    this.commands = {
      variables: new VariablesExercise(),
      functions: new FunctionsExercise(),
      async: new AsyncExercise()
    };
  }
}
```

**Help output:**

```console
$ learn --help
Interactive learning platform

USAGE:
  learn <skill> [options]

SKILLS:
  javascript     JavaScript fundamentals and advanced concepts
  python         Python programming from basics to data science
  rust           Systems programming with Rust

See 'learn help <skill>' for more information on a specific skill.

$ learn javascript --help
JavaScript fundamentals and advanced concepts

USAGE:
  learn javascript <exercise> [options]

EXERCISES:
  variables      Working with let, const, and var
  functions      Function declarations, expressions, and arrows
  async          Promises, async/await, and event loop

See 'learn javascript help <exercise>' for more information.
```

### Terminology Mapping Examples

| Use Case | Router Label | Command Label | Help Footer |
|----------|-------------|---------------|-------------|
| DevOps CLI | `TOOLS` | `tool` | `help <tool>` |
| Learning Platform | `SKILLS` | `skill` | `help <skill>` |
| Game CLI | `REALMS` | `realm` | `help <realm>` |
| Operations | `PACKS` | `pack` | `help <pack>` |
| Default | `COMMANDS` | `command` | `help <command>` |

### Implementation

Router properties for customization:

```typescript
class Router {
  // Display customization
  commandsLabel: string = 'COMMANDS';     // Section header in help
  commandsItemLabel: string = 'command';  // Used in footer text
  
  // Standard properties
  toolName: string = '';
  description: string = '';
  version: string = '';
  commands: Record<string, Routable> = {};
}
```

The help rendering uses these properties:

```typescript
showGeneralHelp(): void {
  console.log(`${this.description}\n`);
  console.log(`USAGE:`);
  console.log(`  ${this.toolName} <${this.commandsItemLabel}> [options]\n`);

  console.log(`${this.commandsLabel}:`);
  Object.entries(this.commands).forEach(([name, cmd]) => {
    const desc = cmd.help?.description || cmd.description || '';
    console.log(`  ${name.padEnd(15)} ${desc}`);
  });
  
  // ... options, examples ...
  
  console.log(`See '${this.toolName} help <${this.commandsItemLabel}>' for more information.`);
}
```

---

## Future Considerations

- **Middleware**: Pre/post hooks for commands
- **Validation**: Schema-based argument validation
- **Completion**: Shell completion generation
- **Plugins**: Dynamic command registration

These are NOT planned - listed only to show the design can accommodate them without breaking changes.
