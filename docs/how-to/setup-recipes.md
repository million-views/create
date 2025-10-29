---
title: "Setup Script Recipes"
type: "how-to"
audience: "template-authors"
estimated_time: "10 minutes"
prerequisites:
  - "Read reference/environment.md"
  - "Basic understanding of JavaScript modules"
related_docs:
  - "../creating-templates.md"
  - "../reference/environment.md"
  - "../tutorial/first-template.md"
last_updated: "2024-11-07"
---

# Setup Script Recipes

Use these copy-ready snippets to solve common setup tasks without reaching for third-party tooling. Each recipe shows the **input**, the **setup code**, and the resulting **output** so you know exactly what to expect.

## Add lint and test scripts

**Input (`package.json`)**
```json
{
  "name": "{{PROJECT_NAME}}",
  "type": "module",
  "scripts": {}
}
```

**Code**
```javascript
export default async function setup({ ctx, tools }) {
  await tools.json.set('package.json', 'scripts.lint', 'npm run format && npm run typecheck');
  await tools.json.set('package.json', 'scripts.test', 'node --test');
  await tools.json.addToArray('package.json', 'keywords', ctx.projectName, { unique: true });
}
```

**Output (`package.json`)**
```json
{
  "name": "{{PROJECT_NAME}}",
  "type": "module",
  "scripts": {
    "lint": "npm run format && npm run typecheck",
    "test": "node --test"
  },
  "keywords": ["{{PROJECT_NAME}}"]
}
```

## Insert a block after a marker

**Input (`README.md`)**
```markdown
# {{PROJECT_NAME}}
```

**Code**
```javascript
await tools.text.ensureBlock({
  file: 'README.md',
  marker: `# ${ctx.projectName}`,
  block: [
    '## Getting Started',
    '- npm install',
    '- npm run dev'
  ]
});
```

**Output (`README.md`)**
```markdown
# {{PROJECT_NAME}}
## Getting Started
- npm install
- npm run dev
```

## Replace content between markers

**Input (`docs/extras.md`)**
```markdown
<!-- integrations:start -->
Old content
<!-- integrations:end -->
```

**Code**
```javascript
await tools.text.replaceBetween({
  file: 'docs/extras.md',
  start: '<!-- integrations:start -->',
  end: '<!-- integrations:end -->',
  block: [
    `Project: ${ctx.projectName}`,
    `Generated: ${new Date().toISOString()}`
  ]
});
```

**Output (`docs/extras.md`)**
```markdown
<!-- integrations:start -->
Project: {{PROJECT_NAME}}
Generated: 2024-11-07T00:00:00.000Z
<!-- integrations:end -->
```
> Timestamp shown for illustration; actual output reflects the current date.

## Append scaffold-specific notes

**Input (`NOTES.md`)**
```markdown
# Internal Notes
```

**Code**
```javascript
await tools.text.appendLines({
  file: 'NOTES.md',
  lines: [
    '## Scaffold Notes',
    `Created by @m5nv/create-scaffold for ${ctx.projectName}`
  ]
});
```

**Output (`NOTES.md`)**
```markdown
# Internal Notes
## Scaffold Notes
Created by @m5nv/create-scaffold for {{PROJECT_NAME}}
```

## Copy author assets into the project

**Input (staged during scaffold)**
```
__scaffold__/
└── infra/
    └── docker-compose.yml
```

**Code**
```javascript
await tools.files.copyTemplateDir('__scaffold__/infra', 'infra', { overwrite: false });
```

**Output (project directory)**
```
infra/
└── docker-compose.yml
```
> The `__scaffold__/` directory itself is removed after setup completes, so only the copied files remain in the generated project.

## Summarize selected capabilities

**Input (`template.json` excerpt)**
```json
{
  "setup": {
    "dimensions": {
      "capabilities": {
        "type": "multi",
        "values": ["auth", "api", "logging"]
      }
    }
  }
}
```

**Code**
```javascript
const enabled = [];
if (tools.options.in('capabilities', 'auth')) enabled.push('Authentication');
if (tools.options.in('capabilities', 'api')) enabled.push('API');
if (tools.options.in('capabilities', 'logging')) enabled.push('Structured logging');

if (enabled.length > 0) {
  await tools.text.appendLines({
    file: 'README.md',
    lines: ['## Enabled Features', ...enabled.map(item => `- ${item}`)]
  });
}
```

**Output (`README.md`)**
```markdown
## Enabled Features
- Authentication
- Structured logging
```

Use these recipes as building blocks—compose them to create richer scaffolding behavior tailored to your team.
