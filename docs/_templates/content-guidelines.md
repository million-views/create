# Documentation Content Guidelines

## Framework

This project follows the [Diátaxis framework](https://diataxis.fr/) for documentation organization. See the steering document `.kiro/steering/diataxis-documentation.md` for complete framework guidelines.

## Project-Specific Standards

### Universal Requirements

All documentation must include:

1. **Frontmatter metadata** (see templates)
2. **Clear, descriptive titles**
3. **Consistent terminology** (see glossary below)
4. **Working code examples** (tested and verified)
5. **Valid internal and external links**
6. **Last updated date**
7. **Maintenance-friendly language** (avoid specific counts that change frequently)

### Project-Specific Tone Guidelines

All content should reflect the CLI tool's professional yet approachable nature:
- **Professional but accessible** - Technical accuracy without intimidation
- **Action-oriented** - Focus on what users can accomplish
- **Security-conscious** - Emphasize safety and best practices
- **Developer-friendly** - Use appropriate technical language

## Writing Standards

### Code Examples

All code examples must:

- Be tested and working
- Include expected output when relevant
- Use realistic, meaningful examples
- Follow project coding standards
- Include necessary context (file paths, prerequisites)

### Links and Cross-References

#### Internal Links

- Use relative paths: `[text](../reference/cli-reference.md)`
- Link to specific sections: `[text](../how-to/creating-templates.md#advanced-options)`
- Verify all links work

#### External Links

- Use descriptive link text (not "click here")
- Open in new tab for external sites: `[text](https://example.com){:target="_blank"}`
- Include brief context for why the link is relevant

### Formatting Standards

#### Headers

- Use sentence case: "Getting started with templates"
- Be descriptive and scannable
- Follow logical hierarchy (H1 → H2 → H3)

#### Code Blocks

- Always specify language: `bash, `javascript, ```json
- Include comments for complex examples
- Show expected output when helpful

#### Lists

- Use parallel structure
- Start with action verbs for task lists
- Keep items concise but complete

#### Tables

- Include headers
- Align columns consistently
- Use for structured data only

## Maintenance Guidelines

### Avoid Maintenance Liabilities

**❌ AVOID (High Maintenance):**

```markdown
- "All changes must pass 78+ tests"
- "Node.js 22+ required"
- "36 functional tests covering..."
- "The project has 4 test suites"
```

**✅ USE (Low Maintenance):**

```markdown
- "All changes must pass our complete test suite"
- "Node.js (latest LTS) required"
- "Comprehensive functional tests covering..."
- "The project has multiple specialized test suites"
```

**✅ ACCEPTABLE SPECIFICITY:**

```markdown
- "estimated_time: 15 minutes" (user guidance)
- "Cache TTL (1-720 hours)" (API constraint)
- "Default TTL: 24 hours" (design decision)
- Command output examples with version numbers (realistic UX)
```

**Key Test:** Will this number change due to code evolution? If yes, make it generic.

### Project-Specific Examples

**Before (High Maintenance):**

```markdown
**Test-Driven Development**: Comprehensive test coverage with 78+ tests across 4 specialized test suites.

#### 1. Functional Tests (`test/cli.test.mjs`)

- **36 tests** covering end-to-end CLI behavior

npm run test:functional # 36 end-to-end CLI behavior tests
```

**After (Low Maintenance):**

```markdown
**Test-Driven Development**: Comprehensive test coverage across multiple specialized test suites.

#### 1. Functional Tests (`test/cli.test.mjs`)

- Comprehensive end-to-end CLI behavior tests

npm run test:functional # End-to-end CLI behavior tests
```

## Content Organization

### File Naming

- Use kebab-case: `getting-started.md`
- Be descriptive: `cli-reference.md` not `cli.md`
- Include type when helpful: `security-explained.md`

### Directory Structure
Follows Diátaxis organization (see steering document for details):
```
docs/
├── tutorial/           # Learning-oriented content
├── guides/            # Task-oriented content
├── reference/         # Information-oriented content
├── explanation/       # Understanding-oriented content
└── _templates/        # Templates and guidelines
```

### Navigation Patterns

Each document should include:

- Clear "What's Next" sections
- Links to related content in other categories
- Breadcrumb context when helpful

## Quality Checklist

Before publishing any documentation:

- [ ] Follows appropriate template structure
- [ ] Includes complete frontmatter metadata
- [ ] Uses consistent terminology from glossary
- [ ] All code examples tested and working
- [ ] All links verified (internal and external)
- [ ] Tone matches content type guidelines
- [ ] Includes appropriate cross-references
- [ ] Spelling and grammar checked
- [ ] Follows formatting standards
- [ ] **Avoids maintenance liabilities** (no specific test counts, evolving version numbers, or implementation metrics)

## Terminology Glossary

### Project-Specific Terms

- **@m5nv/create-scaffold**: The CLI tool (always use full package name in formal docs)
- **Template Repository**: A git repository containing template files and setup scripts
- **Setup Script**: The `_setup.mjs` file that customizes template after cloning
- **Environment Object**: The data structure passed to setup scripts
- **Template Author**: Developer who creates template repositories
- **End User**: Developer who uses the CLI to scaffold projects

### Technical Terms

- **CLI**: Command Line Interface (spell out on first use)
- **Git**: Version control system (not "git")
- **Node.js**: JavaScript runtime (not "NodeJS" or "node")
- **npm**: Package manager (lowercase)
- **ESM**: ES Modules (spell out on first use)

### Formatting Conventions

- **Commands**: Use backticks: `npm install`
- **File paths**: Use backticks: `src/index.js`
- **Parameters**: Use backticks: `--template`
- **Code**: Use code blocks with language specification
- **Emphasis**: Use **bold** for important concepts, _italic_ for subtle emphasis

## Review Process

1. **Self-review** using quality checklist
2. **Technical review** for accuracy
3. **User experience review** for clarity
4. **Final proofread** for consistency

## Maintenance

- Review and update quarterly
- Update "last_updated" dates when making changes
- Verify links and examples remain current
- Gather user feedback and iterate
