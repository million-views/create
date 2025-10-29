# Design Document

## Overview

This design restructures the entire documentation system following the Diátaxis framework, creating four distinct documentation types that serve different user needs. The design emphasizes user journey optimization, from casual discovery through expert usage, while maintaining consistency with modern documentation best practices.

## Architecture

### Diátaxis Framework Implementation

```
Documentation Architecture
├── README.md (Landing/Discovery)
├── docs/
│   ├── tutorial/
│   │   ├── getting-started.md (Tutorial)
│   │   └── first-template.md (Tutorial)
│   ├── how-to/
│   │   ├── creating-templates.md (How-to)
│   │   ├── ide-integration.md (How-to)
│   │   ├── advanced-options.md (How-to)
│   │   └── troubleshooting.md (How-to)
│   ├── reference/
│   │   ├── cli-reference.md (Reference)
│   │   ├── environment-object.md (Reference)
│   │   ├── template-structure.md (Reference)
│   │   └── error-codes.md (Reference)
│   └── explanation/
│       ├── security-model.md (Explanation)
│       ├── template-system.md (Explanation)
│       ├── caching-strategy.md (Explanation)
│       └── design-philosophy.md (Explanation)
```

### User Journey Mapping

**Discovery Phase (README.md)**
- Compelling hook within first 10 seconds
- Clear value proposition
- Immediate actionable example
- Path to next steps

**Learning Phase (Tutorial)**
- Zero-to-hero guided experience
- Hands-on examples with expected outcomes
- Progressive complexity
- Confidence building

**Problem-Solving Phase (How-to Guides)**
- Task-oriented solutions
- Specific problem → specific solution
- Minimal context, maximum action
- Cross-references to reference docs

**Reference Phase (Reference)**
- Comprehensive parameter documentation
- Searchable and scannable format
- Complete examples for each feature
- Technical accuracy and completeness

**Understanding Phase (Explanation)**
- Context and reasoning
- Design decisions and trade-offs
- Conceptual understanding
- Broader ecosystem context

## Components and Interfaces

### README.md Structure

**New Structure:**
```markdown
# @m5nv/create-scaffold

[Compelling tagline and badges]

## What is this?
[One paragraph explaining the core value]

## Quick Start
[30-second copy-paste example]

## Why use this?
[Key benefits with concrete examples]

## Next Steps
- 📚 [Tutorial: Your First Project](docs/tutorial/getting-started.md)
- 🛠️ [Creating Templates](docs/how-to/creating-templates.md)
- 📖 [Complete CLI Reference](docs/reference/cli-reference.md)

## Community & Support
[Links to issues, discussions, etc.]
```

### Tutorial Structure

**Getting Started Tutorial:**
```markdown
# Getting Started with @m5nv/create-scaffold

## What you'll learn
- How to install and verify the tool
- How to create your first project
- How to understand what happened
- How to customize for your needs

## Prerequisites
- Node.js 22+
- Git installed
- 15 minutes

## Step 1: Installation
[Detailed step with verification]

## Step 2: Your First Project
[Guided creation with explanation]

## Step 3: Understanding the Result
[Explain what was created and why]

## Step 4: Customization
[Show how to modify the approach]

## What's Next?
[Clear paths to other documentation]
```

### How-to Guide Structure

**Template Creation Guide:**
```markdown
# How to Create Templates

## Overview
What you'll accomplish and when to use this guide.

## Prerequisites
What you need before starting.

## Step-by-step Instructions

### Create the Repository Structure
[Specific steps with commands]

### Add Your First Template
[Concrete example with code]

### Test Your Template
[Verification steps]

### Advanced Customization
[IDE integration, options handling]

## Troubleshooting
Common issues specific to template creation.

## Related
Links to reference docs and other guides.
```

### Reference Documentation Structure

**CLI Reference:**
```markdown
# CLI Reference

## Command Syntax
Complete syntax with all variations.

## Parameters
Comprehensive table with types, defaults, examples.

## Examples
Organized by use case with expected outputs.

## Exit Codes
Complete list with meanings.

## Environment Variables
All supported variables with effects.
```

### Explanation Content Structure

**Security Model:**
```markdown
# Security Model

## Why Security Matters
Context and threat landscape.

## Our Approach
Design decisions and trade-offs.

## Implementation Details
How security is achieved.

## Limitations
What we don't protect against and why.

## Best Practices
How users can maximize security.
```

## Data Models

### Documentation Metadata

Each documentation file will include frontmatter:

```yaml
---
title: "Getting Started Tutorial"
type: "tutorial"  # tutorial, guide, reference, explanation
audience: "beginner"  # beginner, intermediate, advanced
estimated_time: "15 minutes"
prerequisites: ["Node.js 22+", "Git"]
related_docs: ["cli-reference.md", "how-to/creating-templates.md"]
last_updated: "2024-01-15"
---
```

### Cross-Reference System

```yaml
# Internal linking structure
tutorials:
  - getting-started.md → how-to/creating-templates.md
  - first-template.md → reference/template-structure.md

how-to:
  - how-to/creating-templates.md → reference/environment-object.md
  - troubleshooting.md → reference/error-codes.md

reference:
  - cli-reference.md ← how-to/advanced-options.md
  - environment-object.md ← how-to/creating-templates.md

explanation:
  - security-model.md ← guides/troubleshooting.md
  - template-system.md ← tutorial/getting-started.md
```

## Error Handling

### Documentation Quality Assurance

**Content Validation:**
- All code examples must be tested and working
- All links must be valid (internal and external)
- All prerequisites must be clearly stated
- All steps must be reproducible

**User Experience Validation:**
- Each tutorial must be completable by a beginner
- Each how-to guide must solve a specific problem
- Each reference section must be comprehensive
- Each explanation must provide clear understanding

**Consistency Checks:**
- Terminology usage across all documents
- Code style and formatting consistency
- Link structure and navigation consistency
- Tone and voice consistency

## Testing Strategy

### Documentation Testing Approach

**Automated Testing:**
- Link validation for all internal/external links
- Code example execution and verification
- Markdown syntax and structure validation
- Cross-reference integrity checking

**Manual Testing:**
- User journey testing with real beginners
- Task completion testing for how-to guides
- Reference documentation accuracy verification
- Explanation clarity and comprehension testing

**Continuous Validation:**
- Documentation updates with code changes
- Regular review cycles for accuracy
- User feedback integration process
- Analytics tracking for popular content

## Implementation Phases

### Phase 1: Foundation
1. Restructure README.md for discovery optimization
2. Create documentation architecture and navigation
3. Establish content standards and templates

### Phase 2: Core Content
1. Write comprehensive getting-started tutorial
2. Rewrite template creation guide as proper how-to
3. Create complete CLI reference documentation

### Phase 3: Advanced Content
1. Create explanation content for key concepts
2. Expand troubleshooting into task-oriented guides
3. Add advanced how-to guides for complex scenarios

### Phase 4: Polish and Integration
1. Implement cross-reference system
2. Add search and navigation improvements
3. Validate all content with real users
4. Optimize for different reading contexts

## Content Strategy

### Tone and Voice Guidelines

**README.md:** Enthusiastic but professional, focused on quick value demonstration
**Tutorials:** Encouraging and supportive, assumes no prior knowledge
**How-to Guides:** Direct and efficient, assumes basic familiarity
**Reference:** Precise and comprehensive, optimized for scanning
**Explanation:** Thoughtful and contextual, assumes curiosity about deeper understanding

### Example Patterns

**Tutorial Opening:**
"In this tutorial, you'll create your first project using @m5nv/create-scaffold. By the end, you'll understand how templates work and be ready to customize them for your needs."

**How-to Opening:**
"This guide shows you how to create a template repository. Use this when you want to share reusable project structures with your team or the community."

**Reference Opening:**
"Complete reference for all CLI parameters, with examples and expected behavior."

**Explanation Opening:**
"Understanding why @m5nv/create-scaffold uses a security-first approach to template processing, and how this affects your workflow."