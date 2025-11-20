---
title: "Create Scaffold Tutorial"
description: "Learn to scaffold new projects using lawn care templates with marketing websites and customer-facing apps"
type: tutorial
audience: "intermediate"
estimated_time: "35 minutes"
prerequisites:
  - "Completed Getting Started tutorial"
  - "Completed make-template tutorial"
related_docs:
  - "../reference/cli-reference.md"
  - "../how-to/setup-recipes.md"
  - "../tutorial/getting-started.md"
  - "../tutorial/make-template.md"
last_updated: "2025-11-19"
---

# `create-scaffold` Tutorial

## What you'll learn

Scaffold projects using templates from the [make-template tutorial](make-template.md). Master registry management and customization with `.m5nvrc` configuration.

## Prerequisites

**Required:** Completed [Getting Started](getting-started.md) and [make-template](make-template.md) tutorials.

## Registries Overview

Registries are template repositories that auto-discover available templates. Configure them in `.m5nvrc`:

```json
{
  "registries": {
    "workshop": "./tmp/template-workshop",
    "work": "git@github.com:your-org/templates.git",
    "community": [
      "https://github.com/community/templates.git"
    ]
  }
}
```

**List templates from a registry:**
```bash
npx @m5nv/create-scaffold list --registry workshop
```

**Use templates from registries:**
```bash
npx @m5nv/create-scaffold new my-marketing-site --template workshop/lawnmow-web
npx @m5nv/create-scaffold new my-customer-app --template workshop/lawnmow-app
```

## Example 1: Marketing Website

```bash
cd ..
mkdir scaffolded-projects
cd scaffolded-projects
npx @m5nv/create-scaffold new greencare-site --template workshop/lawnmow-web
cd greencare-site
npm install && npm run dev
```

## Example 2: Custom Marketing Site with Branding

```bash
cd ..
npx @m5nv/create-scaffold new sunshine-lawn --template workshop/lawnmow-web \
  --placeholder BUSINESS_NAME="Sunshine Lawn Care" \
  --placeholder BUSINESS_TAGLINE="Serving Phoenix since 2015" \
  --placeholder CONTACT_EMAIL="mailto:hello@sunshinelawn.com"
cd sunshine-lawn
npm install && npm run dev
```

## Example 3: Customer-Facing App

```bash
cd ..
npx @m5nv/create-scaffold new greencare-app --template workshop/lawnmow-app \
  --selection '{}'
cd greencare-app
npm install && npm run dev
```

## Customization Methods

### CLI Flags
```bash
npx @m5nv/create-scaffold new custom-site --template workshop/lawnmow-web \
  --placeholder BUSINESS_NAME="ProMow Services" \
  --placeholder CONTACT_EMAIL="mailto:info@promow.com"
```

### .m5nvrc Configuration
```json
{
  "placeholders": {
    "BUSINESS_NAME": "Your Lawn Care Business",
    "CONTACT_EMAIL": "mailto:info@yourbusiness.com",
    "BUSINESS_TAGLINE": "Professional lawn care services"
  }
}
```

### Environment Variables
```bash
CREATE_SCAFFOLD_PLACEHOLDER_PROJECT_NAME=MyLawnApp \
CREATE_SCAFFOLD_PLACEHOLDER_CLOUDFLARE_ACCOUNT_ID=abc123 \
npx @m5nv/create-scaffold new env-test --template workshop/lawnmow-app
```

## Selection Files for Variants

Use `selection.json` for predefined template configurations:

```bash
# Use existing selection for marketing site
npx @m5nv/create-scaffold new my-marketing-site --template workshop/lawnmow-web \
  --selection ./lawn-care-branding.selection.json

# Skip prompts with defaults for customer app
npx @m5nv/create-scaffold new quick-app --template workshop/lawnmow-app \
  --selection '{}'
```

## What You Accomplished

Scaffolded projects using lawn care service templates:
1. **Marketing Website** - Business website with contact forms and testimonials using `lawnmow-web`
2. **Custom Branding** - Marketing site with custom business name, tagline, and contact info
3. **Customer App** - Customer-facing scheduling and payment app using `lawnmow-app`

Learned:
- Registry configuration with local template directories
- CLI customization with `--placeholder` flags for business branding
- Global configuration with `.m5nvrc` for business defaults
- Selection files for template variants (marketing vs app)
- Two-pillar web presence: Marketing (attract) + App (serve)

## Next Steps

- [Template Authoring](../how-to/creating-templates.md)
- [CLI Reference](../reference/cli-reference.md)
- [Setup Recipes](../how-to/setup-recipes.md)

## Troubleshooting

**Template not found:** Verify path and `template.json` exists
**Directory not empty:** Choose different project name
**Dependencies fail:** Check Node.js version and internet connection
**App won't start:** Ensure dependencies installed and ports available
