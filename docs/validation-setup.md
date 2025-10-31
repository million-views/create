---
title: "Validation Setup and Maintenance Liability Prevention"
type: "explanation"
audience: "developer"
estimated_time: "5 minutes read"
prerequisites:
  - "Understanding of documentation standards"
  - "Basic knowledge of ast-grep and validation tools"
related_docs:
  - "../CONTRIBUTING.md"
  - "_templates/maintenance-checklist.md"
last_updated: "2025-10-30"
---

# Validation Setup and Maintenance Liability Prevention

## Overview

This project uses a comprehensive validation system to prevent maintenance liabilities and ensure documentation quality. The system combines custom markdown validation with ast-grep code analysis to catch issues before they become technical debt.

## What Are Maintenance Liabilities?

Maintenance liabilities are specific numbers, counts, or version requirements in documentation that will become outdated as the codebase evolves. Examples include:

- **Specific test counts**: "36 functional tests" → becomes wrong when tests are added/removed
- **Version requirements**: "Node.js version 22+ required" → becomes outdated with new releases
- **File counts**: "Contains 15 files" → changes as project grows
- **Component counts**: "Supports 8 endpoints" → changes with API evolution

## Validation Tools

### 1. Documentation Validation (`validate-docs.mjs`)

Custom script that validates:

- **Frontmatter metadata** - Ensures all docs have required metadata
- **Internal links** - Checks that all internal links work
- **Code examples** - Basic syntax validation for code blocks
- **Terminology consistency** - Enforces consistent naming
- **Maintenance liabilities** - Detects specific numbers that will change
- **Optional fixes** - Run with `--fix` to normalize frontmatter indentation and spacing automatically

### 2. Code Analysis (`ast-grep`)

Uses ast-grep rules to detect:

- **Console.log statements** - Flags debugging code in production
- **Hardcoded test counts** - Prevents maintenance liabilities in test descriptions

### 3. Comprehensive Validation (`comprehensive-validation.mjs`)

Unified script that runs both validations and provides colored output with detailed reporting.

> `npm run validate` now runs `npm run schema:check` first, guaranteeing the published schema, generated types, and runtime stub stay up to date before documentation and ast-grep checks execute.

## Available Commands

```bash
# Run all validations
npm run validate

# Rebuild or verify template schema artifacts
npm run schema:build
npm run schema:check

# Run only documentation validation
npm run validate:docs

# Auto-fix frontmatter indentation issues before validation
node scripts/validate-docs.mjs --fix

# Run only code analysis
npm run validate:code

# Run comprehensive validation with options
node scripts/comprehensive-validation.mjs --help
node scripts/comprehensive-validation.mjs --docs-only
node scripts/comprehensive-validation.mjs --code-only
```

## ast-grep Configuration

The project includes ast-grep rules in the `rules/` directory:

- `js-console-debug.yml` - Detects console.log statements
- `js-test-maintenance.yml` - Prevents hardcoded test counts

### Adding New Rules

To add new ast-grep rules:

1. Create a new `.yml` file in the `rules/` directory
2. Follow the ast-grep rule format:

```yaml
id: rule-name
message: "Description of what this rule catches"
severity: warning # or error, info
language: javascript # or typescript, yaml, etc.
rule:
  pattern: "pattern to match"
```

3. Test the rule: `ast-grep scan --rule rules/your-rule.yml`

## Integration with CI/CD

The validation scripts are designed to be CI/CD friendly:

- **Exit codes**: Scripts exit with code 1 on failure, 0 on success
- **JSON output**: ast-grep supports JSON output for parsing
- **Colored output**: Automatically disabled in non-terminal environments
- **Detailed reporting**: Clear error messages with file locations

Example CI integration:

```yaml
- name: Validate Documentation
  run: npm run validate:docs

- name: Validate Code Quality
  run: npm run validate:code
```

## Maintenance Guidelines

### Regular Updates

1. **Review validation results** - Check for new patterns to catch
2. **Update rules** - Add new maintenance liability patterns as discovered
3. **Refine patterns** - Improve regex patterns to reduce false positives
4. **Test thoroughly** - Ensure rules don't break legitimate use cases

### When Validation Fails

1. **Fix the issue** - Remove maintenance liabilities or fix broken links
2. **Don't disable rules** - Avoid the temptation to skip validation
3. **Update patterns** - If legitimate use case, refine the rule pattern
4. **Document exceptions** - Clearly document why specific patterns are acceptable

## Best Practices

### Documentation Writing

- Use generic descriptions instead of specific counts
- Prefer "comprehensive test suite" over "36 tests"
- Use "latest LTS" instead of "Node.js 22+"
- Focus on capabilities, not implementation details

### Code Quality

- Remove console.log statements from production code
- Use proper logging libraries instead of console methods
- Avoid hardcoded numbers in test descriptions
- Keep version requirements flexible

### Rule Development

- Start with broad patterns, then refine to reduce false positives
- Test rules against the entire codebase before committing
- Document the purpose and rationale for each rule
- Consider severity levels carefully (error vs warning vs info)

## Troubleshooting

### Common Issues

**False Positives**: Rule catches legitimate use cases

- Solution: Refine the regex pattern or add exclusions

**Missing Issues**: Rule doesn't catch known problems

- Solution: Broaden the pattern or add additional rule variants

**Performance**: Validation takes too long

- Solution: Optimize patterns or limit scope of validation

### Getting Help

- Check ast-grep documentation: https://ast-grep.github.io/
- Review existing rules in `rules/` directory for examples
- Test patterns in ast-grep playground: https://ast-grep.github.io/playground.html

## Future Enhancements

Potential improvements to the validation system:

1. **Custom language support** - Add markdown parsing to ast-grep
2. **Automated fixes** - Use ast-grep's fix capabilities for common issues
3. **Integration testing** - Validate that documentation matches actual behavior
4. **Performance optimization** - Cache validation results for unchanged files
5. **IDE integration** - Real-time validation in editors

## Conclusion

The validation system helps maintain high-quality documentation and code by preventing maintenance liabilities before they become technical debt. By catching issues early, we reduce the long-term maintenance burden and ensure our documentation stays accurate and helpful.

Remember: **Prevention is better than cure** - it's much easier to prevent maintenance liabilities than to fix them later.
