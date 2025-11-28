# template validate

Validate template.json

## Usage

```bash
template validate [options]
```

## Description

Validates template.json in the current directory.
Checks for required fields, valid structure, and common issues.

## Options

| Option | Description |
|--------|-------------|
| `-f, --file <path>` | Specify input file path |
| `--suggest` | Show intelligent fix suggestions |

Custom path to configuration file

Provide suggestions for fixing validation errors

## Examples

```bash
# Validate template.json in current directory
template validate template.json

# Validate specific file
template validate --file my-template.json

# Get fix suggestions
template validate --file template.json --suggest
```
