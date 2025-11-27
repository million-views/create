# make-template convert

Convert project to template using configurable patterns

## Usage

```bash
make-template convert [project-path] [options]
```

## Description

Convert an existing project into a reusable template using configurable templatization patterns.

Prerequisites:
  • Run 'make-template init' first to create configuration files
  • Configuration files required: template.json and .templatize.json

The conversion process:
  1. Validates that configuration files exist
  2. Reads templatization rules from .templatize.json
  3. Replaces project-specific values with placeholders using specified format
  4. Creates .template-undo.json for restoration capabilities
  5. Updates template.json with detected placeholders (preserves metadata)

Defaults to current directory if no path specified.

## Options

### Configuration

| Option | Description |
|--------|-------------|
| `--config <file>` | Use specific configuration file |

Specify custom .templatize.json file path.
Defaults to ./.templatize.json in project directory.

### Templatization Options

| Option | Description |
|--------|-------------|
| `--placeholder-format <format>` | Specify placeholder format |

Choose placeholder style for replacements:
  • unicode  - ⦃PLACEHOLDER⦄ (default, React-friendly, avoids JSX conflicts)
  • mustache - {{PLACEHOLDER}} (works everywhere, but conflicts with JSX)
  • dollar   - $PLACEHOLDER$ (avoids conflicts with template literals)
  • percent  - %PLACEHOLDER% (avoids conflicts with CSS/custom syntax)

### Operation Modes

| Option | Description |
|--------|-------------|
| `-d, --dry-run` | Preview changes without executing them |
| `--yes` | Skip confirmation prompts |
| `--silent` | Suppress prompts and non-essential output |

### Security

| Option | Description |
|--------|-------------|
| `--sanitize-undo` | Remove sensitive data from undo log |

Prevents sensitive data from being stored in restoration logs

## Examples

```bash
# Convert current directory
make-template convert

# Convert specific project directory
make-template convert ./my-project

# Preview changes without applying them
make-template convert --dry-run

# Use custom config file and skip prompts
make-template convert --config custom-config.json --yes

# Use $PLACEHOLDER format for replacements
make-template convert --placeholder-format dollar

# Use ⦃PLACEHOLDER⦄ format for React compatibility
make-template convert ./my-project --placeholder-format unicode
```

## Notes

Related commands:
  • make-template init - Initialize template configuration files
  • make-template restore - Undo templatization changes
  • make-template config validate - Validate configuration

For detailed configuration options, see:
  • docs/how-to/templatization-configuration.md
  • docs/reference/templatization-patterns.md

## See Also

- [init](./init.md)
- [restore](./restore.md)
- [config validate](./config-validate.md)
