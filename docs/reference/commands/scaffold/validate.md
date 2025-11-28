# create scaffold validate

Validate create template configuration

## Usage

```bash
create scaffold validate <template-path> [options]
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
create scaffold validate ./my-template

# Validate create template configuration file
create scaffold validate ./template.json

# Get fix suggestions
create scaffold validate ./my-template --suggest
```

## See Also

- [new](./new.md)
- [list](./list.md)
