---
title: "Setup Script Recipes"
type: "how-to"
audience: "template-authors"
estimated_time: "10 minutes"
prerequisites:
  - "Read environment.md reference"
  - "Basic JavaScript module understanding"
related_docs:
  - "template-author-workflow.md"
  - "../reference/environment.md"
last_updated: "2025-11-28"
---

# Setup Script Recipes

Copy-ready snippets for common setup script tasks using the Schema V1.0 helper toolkit.

## Overview

Setup scripts (`_setup.mjs`) run in a secure Node.js VM sandbox with restricted capabilities. Scripts receive an environment object with context and tools, but cannot access Node built-ins like `fs`, `path`, `import`, or `require`. All operations must use the provided `tools` object for security and consistency.

**Available in sandbox:**
- `console` (for logging, but flagged by validation)
- `setTimeout`/`clearTimeout`, `setInterval`/`clearInterval`
- `process.env` (read-only)
- `structuredClone` (if available)

**Blocked in sandbox:**
- `import` statements
- `require()`, `eval()`, `Function()` constructor
- Node built-ins (`fs`, `path`, `os`, `crypto`, etc.)
- Direct filesystem access

> **Note on Placeholder Formats**: Examples in this guide use `{{TOKEN}}` (mustache) format for clarity. Your actual templates should use the format declared in `template.json` via `placeholderFormat`. The default is `unicode` (`⦃TOKEN⦄`), which is recommended for React/JSX compatibility. The tools automatically use the format from your template manifest.

---

## Basic Placeholder Replacement

Replace placeholders in template files with user-provided values.

### Recipe

```javascript
// _setup.mjs
export default async function setup({ ctx, tools }) {
  // Replace project name in all files (default selector matches everything)
  await tools.placeholders.replaceAll({ PROJECT_NAME: ctx.projectName });

  // Or replace in specific file types
  await tools.placeholders.replaceAll(
    { PROJECT_NAME: ctx.projectName },
    ['*.md', '*.json', '*.html']
  );
}
```

### Template Files

**Before (README.md):**
```markdown
# {{PROJECT_NAME}}

Welcome to {{PROJECT_NAME}}!
```

**After scaffolding (with projectName = "my-app"):**
```markdown
# my-app

Welcome to my-app!
```

---

## Apply Collected Inputs

Use values collected from the user during scaffolding.

### Recipe

```javascript
// _setup.mjs
export default async function setup({ ctx, tools }) {
  // Apply all collected placeholder inputs
  await tools.placeholders.applyInputs(['README.md', 'package.json']);
}
```

### Template Files

**Template (README.md):**
```markdown
# {{PROJECT_NAME}}
Created by {{AUTHOR}}
License: {{LICENSE}}
```

**Result (after scaffolding):**
```markdown
# my-app
Created by Jane Doe
License: MIT
```

**Note**: `applyInputs()` automatically uses values from `ctx.inputs` collected during scaffolding.

---

## Set JSON Values

Update JSON files programmatically.

### Recipe

```javascript
// _setup.mjs
export default async function setup({ ctx, tools }) {
  // Set simple values
  await tools.json.set('package.json', 'name', ctx.projectName);
  await tools.json.set('package.json', 'version', '1.0.0');

  // Set nested values
  await tools.json.set('package.json', 'author.name', 'Jane Doe');
  await tools.json.set('package.json', 'author.email', 'jane@example.com');

  // Set scripts
  await tools.json.set('package.json', 'scripts.dev', 'vite');
  await tools.json.set('package.json', 'scripts.build', 'vite build');
}
```

**Result (package.json):**
```json
{
  "name": "my-app",
  "version": "1.0.0",
  "author": {
    "name": "Jane Doe",
    "email": "jane@example.com"
  },
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  }
}
```

---

## Merge JSON Objects

Merge objects into existing JSON files.

### Recipe

```javascript
// _setup.mjs
export default async function setup({ ctx, tools }) {
  // Merge dependencies
  await tools.json.merge('package.json', {
    dependencies: {
      'react': '^18.2.0',
      'react-dom': '^18.2.0'
    },
    devDependencies: {
      'vite': '^5.0.0',
      '@vitejs/plugin-react': '^4.2.0'
    }
  });
}
```

**Before (package.json):**
```json
{
  "name": "my-app",
  "dependencies": {}
}
```

**After:**
```json
{
  "name": "my-app",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0"
  }
}
```

---

## Insert Text Block After Marker

Add content after a specific marker in a file.

### Recipe

```javascript
// _setup.mjs
export default async function setup({ ctx, tools }) {
  await tools.text.ensureBlock({
    file: 'README.md',
    marker: `# ${ctx.projectName}`,
    block: [
      '',
      '## Getting Started',
      '',
      '```bash',
      'npm install',
      'npm run dev',
      '```'
    ]
  });
}
```

**Before (README.md):**
```markdown
# my-app
```

**After:**
````markdown
# my-app

## Getting Started

```bash
npm install
npm run dev
```
````

---

## Replace Content Between Markers

Replace content between two markers.

### Recipe

```javascript
// _setup.mjs
export default async function setup({ ctx, tools }) {
  await tools.text.replaceBetween({
    file: 'docs/config.md',
    start: '<!-- features:start -->',
    end: '<!-- features:end -->',
    block: [
      '## Enabled Features',
      '',
      '- Authentication',
      '- Testing',
      '- Internationalization'
    ]
  });
}
```

**Before (docs/config.md):**
```markdown
<!-- features:start -->
Old content here
<!-- features:end -->
```

**After:**
```markdown
<!-- features:start -->
## Enabled Features

- Authentication
- Testing
- Internationalization
<!-- features:end -->
```

---

## Append Lines to File

Add lines to the end of a file.

### Recipe

```javascript
// _setup.mjs
export default async function setup({ ctx, tools }) {
  await tools.text.appendLines({
    file: 'NOTES.md',
    lines: [
      '',
      '## Scaffold Information',
      '',
      `Project: ${ctx.projectName}`,
      `Created: ${new Date().toISOString()}`,
      `Template: ${ctx.templateName || 'custom'}`
    ]
  });
}
```

**Result (NOTES.md):**
```markdown
# Project Notes

## Scaffold Information

Project: my-app
Created: 2025-11-12T10:30:00.000Z
Template: react-vite
```

---

## Copy Author Assets

Copy template-specific files into the project.

### Recipe

```javascript
// _setup.mjs
export default async function setup({ ctx, tools }) {
  // Copy entire directory
  await tools.templates.copy(
    'auth',
    'src/auth',
    { overwrite: false }
  );

  // Copy single file
  await tools.templates.copy(
    'tailwind.config.js',
    'tailwind.config.js'
  );
}
```

**Template Structure:**
```console
template/
├── __scaffold__/
│   ├── auth/
│   │   ├── AuthProvider.tsx
│   │   └── useAuth.ts
│   └── tailwind.config.js
└── src/
```

**Result (scaffolded project):**
```console
my-app/
├── src/
│   └── auth/
│       ├── AuthProvider.tsx
│       └── useAuth.ts
└── tailwind.config.js
```

**Note**: `__scaffold__/` directory is automatically removed after setup completes.

---

## IDE Configuration with Author Assets

Configure IDE settings by copying curated configurations from the template's `__scaffold__` directory.

### Recipe

```javascript
// _setup.mjs
export default async function setup({ ctx, tools }) {
  // Copy VSCode configuration
  await tools.templates.copy('.vscode', '.vscode');

  // Copy Cursor configuration
  await tools.templates.copy('.cursor', '.cursor');

  // Copy Windsurf configuration
  await tools.templates.copy('.windsurf', '.windsurf');
}
```

### Template Structure

```console
template/
├── __scaffold__/
│   ├── .vscode/
│   │   ├── settings.json
│   │   ├── extensions.json
│   │   └── launch.json
│   ├── .cursor/
│   │   └── config.json
│   └── .windsurf/
│       └── settings.json
├── src/
└── _setup.mjs
```

### Benefits

- **Full Control**: Template authors customize configurations for their specific stack
- **Template-Specific**: Settings can vary based on project type, frameworks, or options
- **Consumer Override**: Generated configs can be modified by end users
- **Version Controlled**: IDE configs evolve with template updates

**Note**: This approach gives template authors complete control over IDE configurations without making assumptions about what settings are "right" for everyone.

---

## Conditional Features with Dimensions

Use template dimensions to conditionally add features.

### Recipe

```javascript
// _setup.mjs
export default async function setup({ ctx, tools }) {
  const features = ctx.options.byDimension.features || [];

  // Check if feature is enabled
  if (tools.options.in('features', 'auth')) {
    await tools.templates.copy('auth', 'src/auth');
    await tools.json.merge('package.json', {
      dependencies: {
        'jsonwebtoken': '^9.0.0'
      }
    });
    tools.logger.info('Added authentication');
  }

  if (tools.options.in('features', 'testing')) {
    await tools.templates.copy('testing', 'test');
    await tools.json.merge('package.json', {
      devDependencies: {
        'vitest': '^1.0.0'
      }
    });
    tools.logger.info('Added testing setup');
  }

  if (tools.options.in('features', 'i18n')) {
    await tools.templates.copy('i18n', 'src/i18n');
    await tools.json.merge('package.json', {
      dependencies: {
        'i18next': '^23.0.0',
        'react-i18next': '^14.0.0'
      }
    });
    tools.logger.info('Added internationalization');
  }
}
```

**Template Structure:**
```console
template/
├── __scaffold__/
│   ├── auth/
│   ├── testing/
│   └── i18n/
└── template.json
```

**Usage:**
```bash
npm create @m5nv/scaffold my-app -- --template react-vite --selection ./my-selection.json
```

---

## Single-Select Dimensions

Handle single-select options like deployment targets.

### Recipe

```javascript
// _setup.mjs
export default async function setup({ ctx, tools }) {
  const deployment = ctx.options.byDimension.deployment || 'cloudflare-workers';

  switch (deployment) {
    case 'cloudflare-workers':
      await tools.templates.copy('infra/cloudflare', 'infra');
      await tools.templates.copy('wrangler.jsonc', 'wrangler.jsonc');
      await tools.json.merge('package.json', {
        devDependencies: {
          'wrangler': '^3.0.0'
        }
      });
      tools.logger.info('Configured Cloudflare Workers');
      break;

    case 'deno-deploy':
      await tools.templates.copy('infra/deno', 'infra');
      await tools.json.merge('package.json', {
        scripts: {
          'deploy': 'deployctl deploy'
        }
      });
      tools.logger.info('Configured Deno Deploy');
      break;

    case 'akamai-linode':
      await tools.templates.copy('infra/akamai-linode', 'infra');
      tools.logger.info('Configured Akamai Linode');
      break;

    case 'do-droplet':
      await tools.templates.copy('infra/digitalocean', 'infra');
      tools.logger.info('Configured DigitalOcean Droplet');
      break;
  }

  // Handle identity dimension
  const identity = ctx.options.byDimension.identity || 'none';
  if (identity !== 'none') {
    await tools.templates.copy(`auth/${identity}`, 'src/auth');
    tools.logger.info(`Configured ${identity} authentication`);
  }

  // Handle billing dimension
  const billing = ctx.options.byDimension.billing || 'none';
  if (billing === 'stripe') {
    await tools.templates.copy('billing/stripe', 'src/billing');
    tools.logger.info('Configured Stripe billing');
  }
}
```

**Usage:**
```bash
npm create @m5nv/scaffold my-app -- --template react-vite --selection ./my-selection.json
```

---

## Generate Environment Files

Create `.env` files with configuration.

### Recipe

```javascript
// _setup.mjs
export default async function setup({ ctx, tools }) {
  const envContent = [
    '# Environment Variables',
    '',
    `# Project: ${ctx.projectName}`,
    `PORT=${ctx.constants.DEFAULT_PORT || 3000}`,
    `NODE_ENV=development`,
    '',
    '# API Configuration',
    'API_URL=http://localhost:3000/api',
    `API_TIMEOUT=${ctx.constants.API_TIMEOUT || 5000}`,
    '',
    '# Feature Flags',
    'ENABLE_AUTH=true',
    'ENABLE_ANALYTICS=false'
  ].join('\n');

  await tools.files.write('.env.example', envContent);
  tools.logger.info('Created .env.example');
}
```

**Result (.env.example):**
```text
# Environment Variables

# Project: my-app
PORT=3000
NODE_ENV=development

# API Configuration
API_URL=http://localhost:3000/api
API_TIMEOUT=5000

# Feature Flags
ENABLE_AUTH=true
ENABLE_ANALYTICS=false
```

---

## Add Dependencies Based on Options

Conditionally install dependencies.

### Recipe

```javascript
// _setup.mjs
export default async function setup({ ctx, tools }) {
  const features = ctx.options.byDimension.features || [];
  const deps = {};
  const devDeps = {};

  // Build dependency object based on features
  if (features.includes('auth')) {
    deps['jsonwebtoken'] = '^9.0.0';
    deps['bcrypt'] = '^5.1.0';
  }

  if (features.includes('testing')) {
    devDeps['vitest'] = '^1.0.0';
    devDeps['@testing-library/react'] = '^14.0.0';
  }

  if (features.includes('i18n')) {
    deps['i18next'] = '^23.0.0';
    deps['react-i18next'] = '^14.0.0';
  }

  // Merge all at once
  if (Object.keys(deps).length > 0 || Object.keys(devDeps).length > 0) {
    await tools.json.merge('package.json', {
      ...(Object.keys(deps).length > 0 && { dependencies: deps }),
      ...(Object.keys(devDeps).length > 0 && { devDependencies: devDeps })
    });
  }
}
```

---

## Render Templates with Data

Use template files with placeholder substitution.

### Recipe

```javascript
// _setup.mjs
export default async function setup({ ctx, tools }) {
  // Render template file with data
  await tools.templates.renderFile(
    'README.template.md',
    'README.md',
    {
      projectName: ctx.projectName,
      author: ctx.author?.name || 'Unknown',
      description: 'My awesome project',
      features: (ctx.options.byDimension.features || []).join(', ')
    }
  );
}
```

**Template (README.template.md):**
```markdown
# {{projectName}}

Created by {{author}}

## Description

{{description}}

## Features

{{features}}
```

**Result (README.md):**
```markdown
# my-app

Created by Jane Doe

## Description

My awesome project

## Features

auth, testing, i18n
```

---

## Logging

Add informative logging to setup scripts.

### Recipe

```javascript
// _setup.mjs
export default async function setup({ ctx, tools }) {
  tools.logger.info('Starting setup...');

  await tools.json.set('package.json', 'name', ctx.projectName);
  tools.logger.info(`Set project name to: ${ctx.projectName}`);

  const features = ctx.options.byDimension.features || [];

  if (features.length > 0) {
    tools.logger.info(`Enabling features: ${features.join(', ')}`);
  } else {
    tools.logger.info('No additional features enabled');
  }

  tools.logger.info('Setup complete!');
}
```

**Console Output:**
```text
ℹ Starting setup...
ℹ Set project name to: my-app
ℹ Enabling features: auth, testing
ℹ Setup complete!
```

---

## Complete Example

Comprehensive setup script combining multiple patterns.

### Recipe

```javascript
// _setup.mjs
export default async function setup({ ctx, tools }) {
  tools.logger.info('Configuring project...');

  // 1. Basic project setup
  await tools.json.set('package.json', 'name', ctx.projectName);
  await tools.json.set('package.json', 'version', '1.0.0');

  // 2. Apply placeholder inputs
  await tools.placeholders.applyInputs(['README.md', 'package.json']);

  // 3. Handle deployment dimension
  const deployment = ctx.options.byDimension.deployment || 'cloudflare-workers';

  if (deployment === 'cloudflare-workers') {
    await tools.templates.copy('infra/cloudflare', 'infra');
    await tools.templates.copy('wrangler.jsonc', 'wrangler.jsonc');
    await tools.json.merge('package.json', {
      devDependencies: {
        'wrangler': '^3.0.0'
      }
    });
    tools.logger.info('Configured Cloudflare Workers');
  }

  // 4. Handle features dimension
  const features = ctx.options.byDimension.features || [];

  if (features.includes('auth')) {
    await tools.templates.copy('auth', 'src/auth');
    await tools.json.merge('package.json', {
      dependencies: {
        'jsonwebtoken': '^9.0.0'
      }
    });
    tools.logger.info('Added authentication');
  }

  if (features.includes('testing')) {
    await tools.templates.copy('testing', 'test');
    await tools.json.merge('package.json', {
      devDependencies: {
        'vitest': '^1.0.0'
      }
    });
    tools.logger.info('Added testing');
  }

  // 5. Generate environment file
  const envContent = [
    '# Environment Variables',
    `PORT=${ctx.constants.DEFAULT_PORT || 3000}`,
    'NODE_ENV=development'
  ].join('\n');

  await tools.files.write('.env.example', envContent);

  // 6. Update README with next steps
  await tools.text.ensureBlock({
    file: 'README.md',
    marker: `# ${ctx.projectName}`,
    block: [
      '',
      '## Quick Start',
      '',
      '```bash',
      'npm install',
      'npm run dev',
      '```'
    ]
  });

  tools.logger.info('Setup complete!');
}
```

---

## Best Practices

1. **Use Idempotent Operations**: All helper functions are idempotent - running them multiple times produces the same result
2. **Check Options First**: Always check if dimensions are set before using them
3. **Provide Defaults**: Use `||` operator to provide sensible defaults
4. **Log Important Actions**: Help users understand what's being configured
5. **Group Related Operations**: Organize code by concern (styling, features, config, etc.)
6. **Error Handling**: Let errors propagate - the CLI handles them appropriately
7. **Test Thoroughly**: Test all dimension combinations
8. **Keep It Simple**: Don't over-engineer - start simple and add complexity as needed

---

## Next Steps

- **[Environment Reference](../reference/environment.md)** - Complete API documentation
- **[Template Author Workflow](template-author-workflow.md)** - Template authoring guide
- **[CLI Reference](../reference/cli-reference.md)** - Command-line interface


