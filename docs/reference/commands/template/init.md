# template init

Initialize template configuration files

## Usage

```bash
template init [project-path] [options]
```

## Description

Creates required configuration files for template creation:
  • template.json - Template metadata and placeholder definitions
  • .templatize.json - Templatization rules and patterns

This is the first step in converting a project to a template.
Run this command in the project directory you want to templatize.
After initialization, edit the configuration files to customize behavior,
then run 'make-template convert' to apply the templatization.

## Options

| Option | Description |
|--------|-------------|
| `-f, --file <path>` | Specify output file path (default: template.json) |

Custom path for the generated template configuration

## Examples

```bash
# Initialize in current directory
template init

# Initialize in specific directory
template init ./my-project

# Initialize with custom template.json filename
template init --file my-template.json
```

## Notes

Typical workflow:
  1. make-template init                  # Create configuration files
  2. Edit template.json and .templatize.json  # Customize for your project
  3. make-template convert ./project     # Apply templatization

Related commands:
  • make-template convert - Apply templatization to project
  • make-template config validate - Validate configuration files
