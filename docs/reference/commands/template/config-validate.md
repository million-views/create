# template config validate

Validate .templatize.json configuration file

## Usage

```bash
template config validate [config-file]
```

## Description

Check the .templatize.json configuration file for syntax and semantic errors.
Validates pattern definitions, file paths, and configuration structure.
Run this before conversion to catch configuration issues early.

## Examples

```bash
# Validate default .templatize.json
template config validate

# Validate specific configuration file
template config validate custom-config.json
```
