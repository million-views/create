# create template init

Initialize create template configuration files

## Usage

```bash
create template init [project-path] [options]
```

## Description

Creates required configuration files for template creation:
  • template.json - Template metadata and placeholder definitions
  • .templatize.json - Templatization rules and patterns

This is the first step in converting a project to a template.
Run this command in the project directory you want to templatize.
After initialization, edit the configuration files to customize behavior,
then run 'create template convert' to apply the templatization.

## Options

| Option | Description |
|--------|-------------|
| `-f, --file <path>` | Specify output file path (default: template.json) |

Custom path for the generated create template configuration

## Examples

```bash
# Initialize in current directory
create template init

# Initialize in specific directory
create template init ./my-project

# Initialize with custom template.json filename
create template init --file my-template.json
```

## Notes

Typical workflow:
  1. create template init                  # Create configuration files
  2. Edit template.json and .templatize.json  # Customize for your project
  3. create template convert ./project     # Apply templatization

Related commands:
  • create template convert - Apply templatization to project
  • create template config validate - Validate configuration files

## See Also

- [convert](./convert.md)
- [config validate](./config-validate.md)
