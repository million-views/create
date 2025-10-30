---
title: "Setup Script Recipes"
type: "how-to"
audience: "template-authors"
estimated_time: "10 minutes"
prerequisites:
  - "Read reference/environment.md"
  - "Basic understanding of JavaScript modules"
related_docs:
  - "creating-templates.md"
  - "../reference/environment.md"
  - "../tutorial/first-template.md"
last_updated: "2025-10-30"
---

# Setup Script Recipes

Use these copy-ready snippets to solve common setup tasks without reaching for third-party tooling. Each recipe now distinguishes between:

- **Template artifact** – the file as it exists in your template repository (often containing `{{TOKEN}}` markers documented in `metadata.placeholders`).
- **Sample runtime input** – values supplied by the user when they instantiate the template (surface through `ctx` and `ctx.options`).
- **Setup fragment** – the `_setup.mjs` code you can paste directly into your script.
- **Result** – the generated file after the fragment runs (assumes you also run your standard placeholder replacement if tokens remain).

> **Tip:** The helpers read data that your template declares in `template.json`. Placeholders documented under `metadata.placeholders` stay available for `tools.placeholders.*`, and any `setup.dimensions` entries are exposed as normalized selections in `ctx.options.byDimension` for the option-related recipes.

## Apply collected placeholder inputs

**Template artifact (`README.md`, `package.json`)**
```markdown
# {{PROJECT_NAME}}
```
```json
{
  "name": "{{PROJECT_NAME}}",
  "description": "Created by {{AUTHOR}}"
}
```

**Sample runtime input**

- `ctx.projectName`: `acme-demo`
- `ctx.inputs.AUTHOR`: `Jane Doe`

**Setup fragment**
```javascript
await tools.placeholders.applyInputs(['README.md', 'package.json']);
```

**Result**
```markdown
# acme-demo
```
```json
{
  "name": "acme-demo",
  "description": "Created by Jane Doe"
}
```

> `applyInputs` automatically merges `ctx.inputs` (values collected from the instantiator) with `ctx.projectName`. Reach for `replaceAll` only when you need custom or computed replacements beyond the captured answers.

## Render author templates with placeholder data

**Template artifact (author assets)**
```
__scaffold__/
└── docs/
    └── README.tpl
```
`README.tpl`
```markdown
# {{projectName}}
Authored by {{author}}
```

**Sample runtime input**

- `ctx.projectName`: `acme-demo`
- `ctx.inputs.AUTHOR`: `Jane Doe`

**Setup fragment**
```javascript
await tools.templates.renderFile(
  '__scaffold__/docs/README.tpl',
  'docs/README.md',
  {
    projectName: ctx.projectName,
    author: tools.inputs.get('AUTHOR', 'Unknown')
  }
);
```

**Result (`docs/README.md`)**
```markdown
# acme-demo
Authored by Jane Doe
```

## Add lint and test scripts

**Template artifact (`package.json`)**
```json
{
  "name": "{{PROJECT_NAME}}",
  "type": "module",
  "scripts": {}
}
```

**Sample runtime input**

- `ctx.projectName`: `acme-demo`

**Setup fragment**
```javascript
export default async function setup({ ctx, tools }) {
  await tools.json.set('package.json', 'scripts.lint', 'npm run format && npm run typecheck');
  await tools.json.set('package.json', 'scripts.test', 'node --test');
  await tools.json.addToArray('package.json', 'keywords', ctx.projectName, { unique: true });
}
```

**Result (`package.json`)** *(after this fragment and placeholder replacement)*
```json
{
  "name": "acme-demo",
  "type": "module",
  "scripts": {
    "lint": "npm run format && npm run typecheck",
    "test": "node --test"
  },
  "keywords": ["acme-demo"]
}
```

## Insert a block after a marker

**Template artifact (`README.md`)**
```markdown
# {{PROJECT_NAME}}
```

**Sample runtime input**

- `ctx.projectName`: `acme-demo`

**Setup fragment**
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

**Result (`README.md`)** *(after placeholder replacement turns the heading into `# acme-demo`)*
```markdown
# acme-demo
## Getting Started
- npm install
- npm run dev
```

## Replace content between markers

**Template artifact (`docs/extras.md`)**
```markdown
<!-- integrations:start -->
Old content
<!-- integrations:end -->
```

**Sample runtime input**

- `ctx.projectName`: `acme-demo`
- `new Date().toISOString()`: `2024-11-07T00:00:00.000Z`

**Setup fragment**
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

**Result (`docs/extras.md`)**
```markdown
<!-- integrations:start -->
Project: acme-demo
Generated: 2024-11-07T00:00:00.000Z
<!-- integrations:end -->
```
> Timestamp shown for illustration; actual output reflects the current date.

## Append scaffold-specific notes

**Template artifact (`NOTES.md`)**
```markdown
# Internal Notes
```

**Sample runtime input**

- `ctx.projectName`: `acme-demo`

**Setup fragment**
```javascript
await tools.text.appendLines({
  file: 'NOTES.md',
  lines: [
    '## Scaffold Notes',
    `Created by @m5nv/create-scaffold for ${ctx.projectName}`
  ]
});
```

**Result (`NOTES.md`)**
```markdown
# Internal Notes
## Scaffold Notes
Created by @m5nv/create-scaffold for acme-demo
```

## Copy author assets into the project

**Template artifact (staged during scaffold)**
```
__scaffold__/
└── infra/
  └── docker-compose.yml
```

**Sample runtime input**

- `ctx.authoringMode`: `composable`
- `ctx.options.byDimension.capabilities`: `['api']`

**Setup fragment**
```javascript
await tools.files.copyTemplateDir('__scaffold__/infra', 'infra', { overwrite: false });
```

**Result (project directory)**
```
infra/
└── docker-compose.yml
```
> The `__scaffold__/` directory itself is removed after setup completes, so only the copied files remain in the generated project.

## Summarize selected capabilities

**Template artifact (`template.json` excerpt)**
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

**Sample runtime input**

- `ctx.options.byDimension.capabilities`: `['auth', 'logging']`

**Setup fragment**
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

**Result (`README.md`)**
```markdown
## Enabled Features
- Authentication
- Structured logging
```

Use these recipes as building blocks—compose them to create richer scaffolding behavior tailored to your team.
