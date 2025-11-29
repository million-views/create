---
title: "Create Scaffold Tutorial"
description: "Learn to scaffold new projects using lawn care templates with marketing websites and customer-facing apps"
type: tutorial
audience: "intermediate"
estimated_time: "35 minutes"
prerequisites:
  - "Completed Getting Started tutorial"
  - "Completed create template tutorial"
related_docs:
  - "../reference/cli-reference.md"
  - "../how-to/setup-recipes.md"
  - "../tutorial/getting-started.md"
  - "../tutorial/template.md"
last_updated: "2025-11-19"
---

# `create scaffold` Tutorial

## What you'll learn

Scaffold projects using templates from the [create template tutorial](template.md). Master registry management and customization with `.m5nvrc` configuration.

## Prerequisites

**Required:** Completed [Getting Started](getting-started.md) and [create template](template.md) tutorials.

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
create scaffold list --registry workshop
```

**Use templates from registries:**
```bash
create scaffold new my-marketing-site --template workshop/lawnmow-web
create scaffold new my-customer-app --template workshop/lawnmow-app
```

## Example 1: Marketing Website

```bash
cd ..
mkdir scaffolded-projects
cd scaffolded-projects
create scaffold new greencare-site --template workshop/lawnmow-web
cd greencare-site
npm install && npm run dev
```

## Example 2: Custom Marketing Site with Branding

```bash
cd ..
create scaffold new sunshine-lawn --template workshop/lawnmow-web \
  --placeholder BUSINESS_NAME="Sunshine Lawn Care" \
  --placeholder BUSINESS_TAGLINE="Serving Phoenix since 2015" \
  --placeholder CONTACT_EMAIL="mailto:hello@sunshinelawn.com"
cd sunshine-lawn
npm install && npm run dev
```

## Example 3: Customer-Facing App

```bash
cd ..
create scaffold new greencare-app --template workshop/lawnmow-app \
  --selection '{}'
cd greencare-app
npm install && npm run dev
```

## Customization Methods

### CLI Flags
```bash
create scaffold new custom-site --template workshop/lawnmow-web \
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
create scaffold new env-test --template workshop/lawnmow-app
```

## Selection Files: Portable Configuration Recipes

Selection files (`selection.json`) are **portable configuration recipes** that capture your entire template configuration. They enable:

1. **Reproducible scaffolding** - Same configuration every time
2. **Team standards** - Share organization-wide configurations
3. **Testing** - Validate templates with known-good configurations
4. **CI/CD integration** - Automate project creation in pipelines

### Selection File Structure

A selection file contains:

```json
{
  "schemaVersion": "1.0.0",
  "templateId": "workshop/lawnmow-app",
  "timestamp": "2025-11-22T10:00:00Z",
  "choices": {
    "features": ["user-login", "checkout"]
  },
  "placeholders": {
    "PACKAGE_NAME": "my-lawn-app",
    "BUSINESS_NAME": "GreenCare Lawn Services"
  }
}
```

**Key fields:**

- **`choices`**: Dimension selections (e.g., features, deployment, database)
- **`placeholders`**: All configuration values for the template
- **`templateId`**: Which template this configuration applies to
- **`timestamp`**: When this configuration was created (audit trail)

### Using Selection Files

Create `standard-config.selection.json`:

```json
{
  "schemaVersion": "1.0.0",
  "templateId": "workshop/lawnmow-app",
  "timestamp": "2025-11-22T10:00:00Z",
  "choices": {
    "features": ["user-login", "checkout"]
  },
  "placeholders": {
    "PACKAGE_NAME": "standard-lawn-app",
    "BUSINESS_NAME": "Standard Lawn Care"
  }
}
```

Then scaffold with it:

```bash
cd ..
mkdir configured-projects && cd configured-projects

# Scaffold with standard configuration
create scaffold new standard-app \
  --template workshop/lawnmow-app \
  --selection ../standard-config.selection.json

# Override specific values
create scaffold new custom-app \
  --template workshop/lawnmow-app \
  --selection ../standard-config.selection.json \
  --placeholder BUSINESS_NAME="Custom Lawn Services"
```

**Note:** CLI flags override selection file values, allowing customization while maintaining base configuration.

### Selection Files for Team Standards

**Scenario:** Your organization has standard configurations for different project types.

**team-configs/basic-app.selection.json:**
```json
{
  "schemaVersion": "1.0.0",
  "templateId": "workshop/lawnmow-app",
  "choices": {
    "features": []
  },
  "placeholders": {
    "PACKAGE_NAME": "basic-app",
    "BUSINESS_NAME": "Basic Lawn Care"
  }
}
```

**team-configs/enterprise-app.selection.json:**
```json
{
  "schemaVersion": "1.0.0",
  "templateId": "workshop/lawnmow-app",
  "choices": {
    "features": ["user-login", "checkout", "usage-tracking"]
  },
  "placeholders": {
    "PACKAGE_NAME": "enterprise-app",
    "BUSINESS_NAME": "Enterprise Lawn Services"
  }
}
```

Team members scaffold with organization standards:

```bash
# New developer joining the team
create scaffold new client-project \
  --template workshop/lawnmow-app \
  --selection team-configs/enterprise-app.selection.json \
  --placeholder PACKAGE_NAME=acme-lawn \
  --placeholder BUSINESS_NAME="Acme Lawn Care"
```

### Selection Files in CI/CD

**Automated Testing:**

```bash
#!/bin/bash
# test-template.sh - Validate template with known configurations

set -e

echo "Testing minimal configuration..."
create scaffold new test-minimal \
  --template ./lawnmow-app \
  --selection ./test-configs/minimal.selection.json

echo "Testing full configuration..."
create scaffold new test-full \
  --template ./lawnmow-app \
  --selection ./test-configs/full.selection.json

# Run validation on generated projects
cd test-minimal && npm install && npm run lint
cd ../test-full && npm install && npm run lint

echo "✅ All configurations validated"
```

### Selection File Best Practices

**Do:**
- ✅ Version control selection files for team configurations
- ✅ Use descriptive filenames (`enterprise.selection.json`, `minimal.selection.json`)
- ✅ Include timestamp for audit trails
- ✅ Document what each selection file is for
- ✅ Test selection files regularly to ensure they remain valid

**Don't:**
- ❌ Hardcode secrets in selection files (use environment variables)
- ❌ Share selection files with production credentials
- ❌ Forget to update selection files when template schema changes
- ❌ Use selection files without validating against current template version

## Using Templates with Dimensions

If you followed the advanced sections of the [create template tutorial](template.md), your LawnMow App template now has dimensions for feature selection. Let's use them.

### Scaffold with Feature Selection

Templates with dimensions let you choose which features to include:

```bash
cd ..
mkdir advanced-projects && cd advanced-projects

# Create selection file for minimal configuration
cat > minimal.selection.json << 'EOF'
{
  "schemaVersion": "1.0.0",
  "templateId": "workshop/lawnmow-app",
  "choices": {
    "features": []
  },
  "placeholders": {
    "PACKAGE_NAME": "lawn-basic",
    "BUSINESS_NAME": "Basic Lawn Care"
  }
}
EOF

# Minimal configuration (no extra features)
create scaffold new lawn-basic \
  --template workshop/lawnmow-app \
  --selection minimal.selection.json

# Create selection file for full features
cat > premium.selection.json << 'EOF'
{
  "schemaVersion": "1.0.0",
  "templateId": "workshop/lawnmow-app",
  "choices": {
    "features": ["user-login", "checkout", "usage-tracking"]
  },
  "placeholders": {
    "PACKAGE_NAME": "lawn-premium",
    "BUSINESS_NAME": "Premium Lawn Services"
  }
}
EOF

# Full-featured configuration
create scaffold new lawn-premium \
  --template workshop/lawnmow-app \
  --selection premium.selection.json

# Check what was generated
cat lawn-premium/FEATURES.md
# Shows: user-login, checkout, usage-tracking
```

### Understanding Selection Files for Dimensions

When working with templates that have dimensions, use selection files to specify your choices:

```json
{
  "schemaVersion": "1.0.0",
  "templateId": "workshop/lawnmow-app",
  "choices": {
    "deployment": "cloudflare-workers",
    "database": "d1",
    "features": ["user-login", "checkout"]
  },
  "placeholders": {
    "PACKAGE_NAME": "my-app"
  }
}
```

**Selection file structure:**
- `choices` object contains dimension selections
- Single-select dimensions use string values (e.g., `"deployment": "cloudflare-workers"`)
- Multi-select dimensions use arrays (e.g., `"features": ["user-login", "checkout"]`)
- Values must match dimension options defined in the template's `template.json`

### Understanding Gates and Validation

If your template has gates, they prevent invalid dimension combinations:

```bash
# Create an invalid selection (Cloudflare Workers can't use Postgres)
cat > invalid.selection.json << 'EOF'
{
  "schemaVersion": "1.0.0",
  "templateId": "workshop/lawnmow-app",
  "choices": {
    "deployment": "cloudflare-workers",
    "database": "postgres"
  },
  "placeholders": {
    "PACKAGE_NAME": "invalid-combo"
  }
}
EOF

# This will FAIL because of gates (if configured)
create scaffold new invalid-combo \
  --template workshop/lawnmow-app \
  --selection invalid.selection.json

# Error: ❌ Invalid configuration:
#   deployment=cloudflare-workers requires database to be one of: [d1, none]
#   Selected: postgres
```

### Validating Templates

Before using a template, you can validate its configuration to catch issues early:

```bash
# Validate a template directory
create scaffold validate ../lawnmow-app

# Validate and get fix suggestions
create scaffold validate ../lawnmow-app --suggest
```

**What validation checks:**
- Required fields in `template.json` (schemaVersion, id, name, description, placeholderFormat, placeholders)
- Dimension definitions and values
- Gate constraints and references
- Hint requirements and feature references
- Placeholder format consistency
- Setup script syntax (if `_setup.mjs` exists)

**Example validation output:**

```console
✓ Template validation successful

Template: workshop/lawnmow-app
Schema version: 1.0.0
Placeholders: 12 defined
Dimensions: 3 (features, deployment, database)
Gates: 2 constraints defined
Hints: 3 feature combinations suggested

Summary: All checks passed
```

## What You Accomplished

Scaffolded projects using lawn care service templates with increasing sophistication:

### Basic Usage
1. **Marketing Website** - Static website using `lawnmow-web` template
2. **Custom Branding** - Marketing site with custom business name, tagline, contact info
3. **Customer App** - Basic app using `lawnmow-app` template

### Advanced Usage (if you completed create template advanced sections)
4. **Selection Files** - Portable configuration recipes for team standards
5. **Dimension-based Templates** - Templates with feature selection capabilities
6. **Options Syntax** - Single/multi-select dimension control via CLI
7. **Gates and Validation** - Understanding configuration constraints
8. **Team Standards** - Shared configurations for consistency

### Key Learnings

**Registry Management:**
- Registry configuration with `.m5nvrc`
- Local template directories for development
- Multiple registries (work, community, personal)

**Configuration Methods:**
- CLI flags (`--placeholder`, `--selection`)
- Environment variables (`CREATE_SCAFFOLD_PLACEHOLDER_*`)
- Configuration files (`.m5nvrc`)
- Selection files (`selection.json`)

**Advanced Features:**
- Dimensions system for structured choices
- Feature composition with conditional logic
- Gates preventing invalid combinations
- Selection files for reproducible scaffolding
- Team-standard configurations for consistency

## Next Steps

- [Template Author Workflow](../how-to/template-author-workflow.md)
- [CLI Reference](../reference/cli-reference.md)
- [Setup Recipes](../how-to/setup-recipes.md)

## Troubleshooting

**Template not found:** Verify path and `template.json` exists
**Directory not empty:** Choose different project name
**Dependencies fail:** Check Node.js version and internet connection
**App won't start:** Ensure dependencies installed and ports available
