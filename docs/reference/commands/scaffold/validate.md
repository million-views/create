# scaffold validate

Validate template configuration

## Usage

```bash
scaffold validate <template-path> [options]
```

## Description

Validates a template directory or template.json file.
Checks for required fields, valid structure, and common issues.

## Options

| Option | Description |
|--------|-------------|
| `--suggest` | Show intelligent fix suggestions |

Provide suggestions for fixing validation errors

## Examples

```bash
# Validate template in directory
scaffold validate ./my-template

# Validate template configuration file
scaffold validate ./template.json

# Get fix suggestions
scaffold validate ./my-template --suggest
```
