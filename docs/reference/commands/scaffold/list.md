# scaffold list

List templates from a registry repository

## Usage

```bash
scaffold list [options]
```

## Description

Display templates from a registry repository.
By default, lists templates from the official million-views/templates registry.
Use --registry to specify a different repository URL or configured registry name.

Registries are Git repositories containing template directories.
Each template directory should contain project files like package.json, template.json, etc.
If a repository contains a single template, --template is not needed when using it.
If a repository contains multiple templates, --template specifies which directory to use.

## Options

| Option | Description |
|--------|-------------|
| `--registry <name-or-url>` | Registry to list templates from |
| `--format <format>` | Output format (table|json, default: table) |
| `--verbose` | Show detailed information |

Specify a registry by name (from .m5nvrc) or repository URL.
If not specified, uses the default million-views/templates registry.
Examples: --registry my-templates, --registry https://github.com/user/repo.git

Choose output format:
  • table - Human-readable table format
  • json  - Machine-readable JSON format

## Examples

```bash
# List templates from default registry (million-views/templates)
scaffold list

# List templates from a specific repository URL
scaffold list --registry https://github.com/user/templates.git

# List templates from a configured registry shortcut
scaffold list --registry my-templates

# Output template information in JSON format
scaffold list --format json

# Show detailed template information including versions and authors
scaffold list --verbose
```
