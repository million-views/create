# Cross-Reference Linking Standards

## Overview

This document defines how to create consistent, helpful cross-references between different types of documentation in our Diátaxis-based system.

## Linking Patterns

### From Tutorials

Tutorials should link to:
- **How-to Guides**: "Now that you understand the basics, learn [how to create templates](../how-to/creating-templates.md)"
- **Reference**: "For complete parameter details, see the [CLI Reference](../reference/cli-reference.md#parameters)"
- **Explanation**: "To understand why we use this approach, read [Template System Architecture](../explanation/template-system.md)"

### From How-to Guides

How-to guides should link to:
- **Reference**: "See [Environment Reference](../reference/environment.md) for all available properties"
- **Tutorials**: "New to templates? Start with our [Getting Started Tutorial](../tutorial/getting-started.md)"
- **Other Guides**: "Also see [Troubleshooting Guide](../guides/troubleshooting.md)"
- **Explanation**: "For background on this approach, see [Security Model Explained](../explanation/security-model.md)"

### From Reference

Reference documentation should link to:
- **How-to Guides**: "For practical examples, see [Creating Templates Guide](../how-to/creating-templates.md)"
- **Tutorials**: "For a hands-on introduction, try our [Getting Started Tutorial](../tutorial/getting-started.md)"
- **Explanation**: "For design rationale, see [Template System Architecture](../explanation/template-system.md)"

### From Explanation

Explanation content should link to:
- **Tutorials**: "See this concept in action: [Getting Started Tutorial](../tutorial/getting-started.md)"
- **How-to Guides**: "Apply this knowledge: [Creating Templates](../how-to/creating-templates.md)"
- **Reference**: "Implementation details: [CLI Reference](../reference/cli-reference.md)"

## Link Formatting

### Internal Links

```markdown
# Relative path format
[Link Text](../reference/cli-reference.md)

# Link to specific section
[Link Text](../reference/cli-reference.md#parameters)

# Link with context
For complete details, see the [CLI Reference](../reference/cli-reference.md).
```

### External Links

```markdown
# External link with context
Learn more about the [Diátaxis framework](https://diataxis.fr/) that guides our documentation structure.

# External link in new tab (when needed)
<a href="https://nodejs.org/" target="_blank">Node.js official site</a>
```

## Navigation Sections

### "What's Next" Sections

Every document should end with appropriate next steps:

```markdown
## What's Next

Now that you've [completed this task/learned this concept], you might want to:

- 🎯 **Apply this knowledge**: [How to Create Templates](../how-to/creating-templates.md)
- 📖 **Get complete details**: [Environment Reference](../reference/environment.md)
- 💡 **Understand the why**: [Template System Explained](../explanation/template-system.md)
```

### "Related Information" Sections

For quick reference to related content:

```markdown
## Related Information

- 📚 **Tutorial**: [Getting Started](../tutorial/getting-started.md) - Learn the basics hands-on
- 🛠️ **How-to**: [Creating Templates](../how-to/creating-templates.md) - Build your own project templates
- 📖 **Reference**: [CLI Parameters](../reference/cli-reference.md) - Complete parameter documentation
- 💡 **Explanation**: [Security Model](../explanation/security-model.md) - Why we prioritize security
```

## Link Context Guidelines

### Provide Context

Good:
```markdown
For complete parameter documentation, see the [CLI Reference](../reference/cli-reference.md).
```

Poor:
```markdown
See [here](../reference/cli-reference.md) for more information.
```

### Use Descriptive Link Text

Good:
```markdown
Learn [how to create custom templates](../how-to/creating-templates.md) for your team.
```

Poor:
```markdown
[Click here](../how-to/creating-templates.md) to learn about templates.
```

### Indicate Link Purpose

Use prefixes to indicate content type:
- 📚 Tutorial content
- 🛠️ How-to guides
- 📖 Reference material
- 💡 Explanation content
- 🔗 External resources

## Bidirectional Linking

Ensure related content links to each other:

### Example: Template Creation Content

**Tutorial: Getting Started**
→ Links to: How-to Guide (Creating Templates), Reference (CLI Parameters)

**How-to Guide: Creating Templates**
→ Links to: Tutorial (Getting Started), Reference (Environment Object), Explanation (Template System)

**Reference: Environment Object**
→ Links to: How-to Guide (Creating Templates), Tutorial (Getting Started)

**Explanation: Template System**
→ Links to: Tutorial (Getting Started), How-to Guide (Creating Templates), Reference (Environment Object)

## Link Validation

### Automated Checks

All links should be validated for:
- Correct relative paths
- Valid anchor links (#section-name)
- Accessible target files
- No broken external links

### Manual Review

During content review, verify:
- Links provide appropriate context
- Link text is descriptive
- Navigation flows make sense
- No circular or redundant linking

## Common Patterns

### Progressive Disclosure

Start with basics, link to advanced:
```markdown
This guide covers basic template creation. For advanced patterns like multi-IDE support, see [Creating Templates](../how-to/creating-templates.md).
```

### Just-in-Time Information

Link to detailed info when needed:
```markdown
The `--features` parameter accepts a comma-separated list of options. For all available features, see the [CLI Reference](../reference/cli-reference.md#features-parameter).
```

### Conceptual Bridges

Connect practical and theoretical:
```markdown
This approach follows our security-first philosophy. To understand the reasoning behind these restrictions, see [Security Model Explained](../explanation/security-model.md).
```

## Anti-Patterns to Avoid

### Don't

- Use "click here" or "read more" as link text
- Create circular linking (A → B → A with no additional value)
- Link to content that assumes different knowledge level
- Create orphaned content with no inbound links
- Use absolute URLs for internal content

### Do

- Use descriptive, contextual link text
- Create logical progression paths
- Match link targets to user's current knowledge level
- Ensure all content is discoverable through navigation
- Use relative paths for internal content

## Maintenance

### Regular Review

- Quarterly link validation
- Update links when content moves
- Review navigation flows for new users
- Gather feedback on discoverability

### Content Updates

When updating content:
- Update related cross-references
- Verify bidirectional links remain valid
- Check that navigation suggestions are current
- Update "last_updated" metadata
