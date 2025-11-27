# make-template config validate

Validate .templatize.json configuration file

## Usage

```bash
make-template config validate [config-file]
```

## Description

Check the .templatize.json configuration file for syntax and semantic errors.
Validates pattern definitions, file paths, and configuration structure.
Run this before conversion to catch configuration issues early.

## Examples

```bash
# Validate default .templatize.json
make-template config validate

# Validate specific configuration file
make-template config validate custom-config.json
```

## See Also

- [init](./init.md)
- [convert](./convert.md)
- [validate](./validate.md)
