---
title: "Dimensions Glossary"
type: "reference"
audience: "template-authors"
estimated_time: "5 minutes"
prerequisites:
  - "Read reference/environment.md"
  - "Read how-to/creating-templates.md"
related_docs:
  - "../how-to/creating-templates.md"
  - "environment.md"
  - "../how-to/author-workflow.md"
last_updated: "2025-11-12"
---

# Dimensions Glossary

Complete reference for template dimensions in Schema V1.0. Templates declare option vocabularies through `setup.dimensions` in `template.json`. This glossary summarizes the required dimensions and provides guidance for template authoring.

## Overview

Dimensions are user-selectable options defined in `template.json` under `setup.dimensions`. They let template users customize scaffolded projects during creation. Schema V1.0 requires seven specific dimensions that all templates must implement.

## Required Dimensions

All templates must define these seven dimensions in `setup.dimensions`:

| Name | Type | Description |
|------|------|-------------|
| `deployment_target` | `single` | Deployment platform (cloudflare-workers, linode, droplet, deno-deploy, or custom x- prefixed values) |
| `features` | `multi` | Custom feature toggles (any string values) |
| `database` | `single` | Database choice (d1, tursodb, sqlite3, none) |
| `storage` | `single` | Storage solution (r2, s3, file, none) |
| `auth_providers` | `multi` | Authentication providers (google, github) |
| `payments` | `single` | Payment processor (stripe, hyperswitch, none) |
| `analytics` | `single` | Analytics service (umami, plausible, none) |

## Dimension Details

### deployment_target

**Type:** `single` (required)  
**Purpose:** Specifies the deployment platform and infrastructure target.

**Allowed Values:**
- `cloudflare-workers` - Cloudflare Workers
- `linode` - Linode platform
- `droplet` - DigitalOcean Droplet
- `deno-deploy` - Deno Deploy
- Custom values starting with `x-` (e.g., `x-custom-platform`)

**Schema Example:**
```json
{
  "deployment_target": {
    "type": "single",
    "values": ["cloudflare-workers", "linode", "droplet"],
    "default": "cloudflare-workers"
  }
}
```

### features

**Type:** `multi` (required)  
**Purpose:** Custom feature toggles specific to your template.

**Allowed Values:** Any string values you define

**Schema Example:**
```json
{
  "features": {
    "type": "multi",
    "values": ["auth", "testing", "i18n", "logging"],
    "default": ["testing"]
  }
}
```

### database

**Type:** `single` (required)  
**Purpose:** Database technology choice.

**Allowed Values:**
- `d1` - Cloudflare D1
- `tursodb` - TursoDB
- `sqlite3` - SQLite3
- `none` - No database

**Schema Example:**
```json
{
  "database": {
    "type": "single",
    "values": ["d1", "tursodb", "sqlite3", "none"],
    "default": "none"
  }
}
```

### storage

**Type:** `single` (required)  
**Purpose:** File/object storage solution.

**Allowed Values:**
- `r2` - Cloudflare R2
- `s3` - Amazon S3
- `file` - Local file system
- `none` - No storage

**Schema Example:**
```json
{
  "storage": {
    "type": "single",
    "values": ["r2", "s3", "file", "none"],
    "default": "none"
  }
}
```

### auth_providers

**Type:** `multi` (required)  
**Purpose:** Authentication providers to configure.

**Allowed Values:**
- `google` - Google OAuth
- `github` - GitHub OAuth

**Schema Example:**
```json
{
  "auth_providers": {
    "type": "multi",
    "values": ["google", "github"],
    "default": []
  }
}
```

### payments

**Type:** `single` (required)  
**Purpose:** Payment processing service.

**Allowed Values:**
- `stripe` - Stripe
- `hyperswitch` - Hyperswitch
- `none` - No payments

**Schema Example:**
```json
{
  "payments": {
    "type": "single",
    "values": ["stripe", "hyperswitch", "none"],
    "default": "none"
  }
}
```

### analytics

**Type:** `single` (required)  
**Purpose:** Analytics and tracking service.

**Allowed Values:**
- `umami` - Umami Analytics
- `plausible` - Plausible Analytics
- `none` - No analytics

**Schema Example:**
```json
{
  "analytics": {
    "type": "single",
    "values": ["umami", "plausible", "none"],
    "default": "none"
  }
}
```

## Dimension Types

### Single-Select Dimensions

Users choose **one value** from a list. Required dimensions use this for mutually exclusive choices.

**Usage:**
```bash
npm create @m5nv/scaffold my-app -- --template my-template --options "database=d1"
```

### Multi-Select Dimensions

Users choose **multiple values** from a list. Use `+` to combine values.

**Usage:**
```bash
npm create @m5nv/scaffold my-app -- --template my-template --options "features=auth+testing"
```

## Gates and Compatibility

Templates use `setup.gates` to define which dimension combinations are valid for each deployment target.

**Example Gates:**
```json
{
  "gates": {
    "deployment_target": {
      "cloudflare-workers": {
        "database": ["d1", "tursodb", "sqlite3"],
        "storage": ["r2"]
      },
      "linode": {
        "database": ["d1", "tursodb", "sqlite3"],
        "storage": ["s3", "file"]
      }
    }
  }
}
```

## Accessing Dimensions in Setup Scripts

Use `ctx.options.byDimension` to access selected values:

```javascript
// _setup.mjs
export default async function setup({ ctx, tools }) {
  // Access required dimensions
  const deploymentTarget = ctx.options.byDimension.deployment_target;
  const features = ctx.options.byDimension.features || [];
  const database = ctx.options.byDimension.database;
  const storage = ctx.options.byDimension.storage;
  const authProviders = ctx.options.byDimension.auth_providers || [];
  const payments = ctx.options.byDimension.payments;
  const analytics = ctx.options.byDimension.analytics;

  // Use values to configure project
  if (tools.options.in('features', 'auth')) {
    // Setup authentication
  }

  if (database === 'd1') {
    // Configure D1 database
  }
}
```

## Complete Template Schema Example

```json
{
  "schemaVersion": "1.0.0",
  "title": "My Template",
  "id": "my-template",
  "description": "A template with all required dimensions",

  "setup": {
    "dimensions": {
      "deployment_target": {
        "type": "single",
        "values": ["cloudflare-workers", "linode"],
        "default": "cloudflare-workers"
      },
      "features": {
        "type": "multi",
        "values": ["auth", "testing", "logging"],
        "default": ["testing"]
      },
      "database": {
        "type": "single",
        "values": ["d1", "tursodb", "none"],
        "default": "none"
      },
      "storage": {
        "type": "single",
        "values": ["r2", "s3", "none"],
        "default": "none"
      },
      "auth_providers": {
        "type": "multi",
        "values": ["google", "github"],
        "default": []
      },
      "payments": {
        "type": "single",
        "values": ["stripe", "none"],
        "default": "none"
      },
      "analytics": {
        "type": "single",
        "values": ["umami", "none"],
        "default": "none"
      }
    },
    "gates": {
      "deployment_target": {
        "cloudflare-workers": {
          "database": ["d1", "tursodb"],
          "storage": ["r2"]
        },
        "linode": {
          "database": ["d1", "tursodb"],
          "storage": ["s3"]
        }
      }
    },
    "policy": "strict"
  },

  "featureSpecs": {},
  "constants": {}
}
```

## Best Practices

1. **Always Define All Required Dimensions**: Schema validation will fail if any are missing
2. **Use Appropriate Defaults**: Provide sensible defaults for all dimensions
3. **Configure Gates**: Use gates to prevent invalid combinations
4. **Test All Combinations**: Verify your setup scripts work with all valid dimension combinations
5. **Document Your Template**: Explain what each dimension value does in your README

## IDE Support

IDE customization is handled separately from dimensions. Use the `--ide` CLI flag and access via `ctx.ide` in setup scripts:

```bash
npm create @m5nv/scaffold my-app -- --template my-template --ide vscode
```

```javascript
// _setup.mjs
export default async function setup({ ctx, tools }) {
  const ide = ctx.ide; // 'vscode', 'cursor', etc.

  if (ide === 'vscode') {
    // Configure VS Code settings
  }
}
```

## Next Steps

- **[Creating Templates](../how-to/creating-templates.md)** - Template authoring guide
- **[Environment Reference](environment.md)** - Setup script API
- **[CLI Reference](cli-reference.md)** - Command usage including `--ide` flag

## Related Documentation

- [Getting Started Tutorial](../tutorial/getting-started.md) - First project walkthrough
- [create-scaffold Tutorial](../tutorial/create-scaffold.md) - Hands-on examples
- [Author Workflow](../how-to/author-workflow.md) - Template development
