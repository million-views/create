---
title: "Setup Script Recipes"
type: "how-to"
audience: "template-authors"
estimated_time: "10 minutes"
prerequisites:
  - "Read reference/environment-object.md"
  - "Basic understanding of JavaScript modules"
related_docs:
  - "../creating-templates.md"
  - "../reference/environment-object.md"
  - "../tutorial/first-template.md"
last_updated: "2024-11-05"
---

# Setup Script Recipes

Use these copy-ready snippets to solve common setup tasks without reaching for third-party tooling.

## Add lint and test scripts

Create or update entries inside `package.json` with dot-path helpers:

```javascript
export default async function setup(ctx, tools) {
  await tools.json.set('package.json', 'scripts.lint', 'npm run format && npm run typecheck');
  await tools.json.set('package.json', 'scripts.test', 'node --test');
  await tools.json.addToArray('package.json', 'keywords', ctx.projectName, { unique: true });
}
```

## Insert a block after a marker

Ensure a README section exists immediately after a heading:

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

## Replace content between markers

Keep documentation slots up to date without clobbering the markers:

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

## Append scaffold-specific notes

Add a section only once, even if the setup script runs multiple times:

```javascript
await tools.text.appendLines({
  file: 'NOTES.md',
  lines: [
    '## Scaffold Notes',
    `Created by @m5nv/create-scaffold for ${ctx.projectName}`
  ]
});
```

## Copy starter assets

Copy a project-local template directory into the final scaffold:

```javascript
await tools.files.copyTemplateDir('templates/docker', 'infra/docker', { overwrite: false });
```

## Merge feature options into documentation

Reflect selected options inside README bullets:

```javascript
const enabled = [];
await tools.options.when('auth', () => enabled.push('Authentication'));
await tools.options.when('api', () => enabled.push('API'));

if (enabled.length) {
  await tools.text.appendLines({
    file: 'README.md',
    lines: ['## Enabled Features', ...enabled.map(item => `- ${item}`)]
  });
}
```

Use these recipes as building blocks—compose them to create richer scaffolding behavior tailored to your team.
