---
title: "Template Schema Reference"
description:
  "Complete reference for Schema V1.0 (template.json) structure and validation"
type: reference
audience: "template-authors"
estimated_time: "10 minutes"
prerequisites:
  - "Read reference/environment.md"
  - "Read how-to/template-author-workflow.md"
related_docs:
  - "../how-to/template-author-workflow.md"
  - "environment.md"
last_updated: "2025-11-19"
---

# Template Schema Reference

Complete reference for Schema V1.0 (`template.json`). This document covers all
sections of the template schema including metadata, setup configuration,
dimensions, gates, feature specifications, hints, constants, and scaffolding
steps.

## Overview

Schema V1.0.0 defines the structure for `template.json` files. Templates are
validated against this schema during:

- Template creation (`create scaffold new`)
- Template validation (`create template validate`)
- Runtime setup execution

**NO BACKWARD COMPATIBILITY**: Only Schema V1.0.0 is supported. Legacy templates
without `schemaVersion` are rejected.

## Schema Structure

```json
{
  "schemaVersion": "1.0.0",
  "id": "author/template-name",
  "name": "Template Name",
  "description": "Template description",
  "status": "published",
  "placeholderFormat": "unicode",
  "placeholders": {},
  "handoff": ["Next step 1", "Next step 2"],
  "setup": {
    "script": "_setup.mjs",
    "authoringMode": "composable",
    "authorAssetsDir": "__scaffold__"
  },
  "dimensions": {
    /* user-selectable options: deployment, database, storage, identity, billing, analytics, monitoring */
  },
  "gates": {
    /* compatibility constraints */
  },
  "features": [
    /* feature definitions with needs */
  ]
}
```

## Minimal Template

The simplest valid template requires 4 fields:

```json
{
  "schemaVersion": "1.0.0",
  "id": "author/minimal-template",
  "name": "Minimal Template",
  "description": "A minimal template example",
  "placeholderFormat": "unicode",
  "placeholders": {}
}
```

This minimal template:

- Can be scaffolded immediately with `create scaffold new`
- Uses unicode placeholder format (`⦃TOKEN⦄`) for React/JSX compatibility
- Contains no placeholders or advanced features
- Serves as a foundation for progressive enhancement

## Top-Level Properties

| Property            | Type       | Required | Description                                                     |
| ------------------- | ---------- | -------- | --------------------------------------------------------------- |
| `schemaVersion`     | `string`   | Yes      | Schema version (currently "1.0.0")                              |
| `id`                | `string`   | Yes      | Unique identifier in format `author/template-name`              |
| `name`              | `string`   | No       | Human-readable template name (max 120 chars)                    |
| `description`       | `string`   | No       | Detailed description (max 500 chars)                            |
| `status`            | `string`   | No       | Lifecycle status: `draft`, `published`, `deprecated` (default: `published`) |
| `placeholderFormat` | `string`   | Yes      | Delimiter format: `unicode`, `mustache`, `dollar`, or `percent` |
| `placeholders`      | `object`   | Yes      | Placeholder definitions (can be empty `{}`)                     |
| `handoff`           | `string[]` | No       | Post-scaffold instructions (max 240 chars each)                 |

### Status Values

| Status       | Description                                         |
| ------------ | --------------------------------------------------- |
| `draft`      | Testing/iteration, hidden from registry by default  |
| `published`  | Ready for use (default)                             |
| `deprecated` | Still usable but users should migrate               |

### Placeholder Formats

| Format     | Syntax           | Best For                                        |
| ---------- | ---------------- | ----------------------------------------------- |
| `unicode`  | `⦃TOKEN⦄`        | React/JSX (default, avoids `{{}}` conflicts)    |
| `mustache` | `{{TOKEN}}`      | General templates (conflicts with JSX)          |
| `dollar`   | `$TOKEN$`        | Avoids conflicts with template literals         |
| `percent`  | `%TOKEN%`        | Avoids conflicts with CSS/custom syntax         |

Set via `create template convert --placeholder-format <format>`.

## Setup Section

The `setup` section configures setup script behavior and authoring options.

### Setup Properties

| Property         | Type     | Required | Description                                                         |
| ---------------- | -------- | -------- | ------------------------------------------------------------------- |
| `script`         | `string` | No       | Setup script filename (default: `_setup.mjs`)                       |
| `authoringMode`  | `string` | No       | `"composable"` or `"wysiwyg"` (default: `"composable"`)             |
| `authorAssetsDir`| `string` | No       | Directory for author assets, removed after scaffolding (default: `__scaffold__`) |

### Setup Script

The setup script must export a default async function accepting `({ctx, tools})`:

```javascript
// _setup.mjs (or custom filename via setup.script)
export default async function setup({ ctx, tools }) {
  // ctx contains: projectName, projectDir, inputs, options, etc.
  // tools provides: json, templates, options, etc.
  
  if (tools.options.in('identity', 'auth0')) {
    await tools.json.set('package.json', 'dependencies.@auth0/nextjs-auth0', '^3.0.0');
  }
}
```

### Authoring Modes

- **`composable`**: Features assembled via setup script (default, recommended)
- **`wysiwyg`**: Visual editor with pre-built combinations

### Author Assets Directory

The `authorAssetsDir` contains template snippets for conditional copying:

```text
my-template/
├── __scaffold__/           # Author assets (removed after scaffolding)
│   ├── auth/
│   │   └── src/auth/
│   └── infra/
│       ├── cloudflare-d1/
│       └── vercel-postgres/
└── src/
```

Copy conditionally in setup script:

```javascript
if (tools.options.in('deployment', 'cloudflare-d1')) {
  await tools.templates.copy('infra/cloudflare-d1', 'infra');
}
```

## Dimensions

Dimensions define user-selectable infrastructure options. The schema supports
7 fixed dimensions with per-dimension validation policies.

### Standard Dimensions (V1.0.0)

Schema V1.0.0 defines 7 fixed infrastructure dimensions:

| Name         | Type     | Purpose                                         |
| ------------ | -------- | ----------------------------------------------- |
| `deployment` | `single` | WHERE it runs (deployment platform)             |
| `database`   | `single` | HOW data persists (database technology)         |
| `storage`    | `single` | HOW files persist (storage solution)            |
| `identity`   | `single` | WHO can access (authentication/authorization)   |
| `billing`    | `single` | HOW revenue flows (payment processing)          |
| `analytics`  | `single` | WHAT users do (business analytics)              |
| `monitoring` | `single` | HOW system behaves (operational observability)  |

> **Note**: The `features` dimension is a **special multi-select dimension** for custom feature toggles. It is not one of the 7 fixed infrastructure dimensions listed above.

### Dimension Properties

Each dimension supports the following properties:

| Property  | Type       | Required | Description                                                |
| --------- | ---------- | -------- | ---------------------------------------------------------- |
| `label`   | `string`   | No       | Header label in the UI                                     |
| `policy`  | `string`   | No       | `"strict"` or `"warn"` (default: `"strict"`)               |
| `default` | `string`   | No       | Default option ID                                          |
| `options` | `array`    | Yes      | Array of option objects with `id`, `label`, `desc`, `icon` |
| `display` | `object`   | No       | UI display settings (`variant`, `icon`)                    |

### Validation Policies

Each dimension can specify a `policy`:

- **`strict`** (default): Reject unknown values with an error
- **`warn`**: Allow unknown values with a warning (useful during development)

```json
{
  "dimensions": {
    "deployment": {
      "policy": "strict",
      "options": [
        { "id": "vercel", "label": "Vercel" },
        { "id": "netlify", "label": "Netlify" }
      ],
      "default": "vercel"
    }
  }
}
```

### Dimension Details

#### deployment

**Type:** `single` (required)

**Purpose:** Specifies the deployment platform and infrastructure target.

**Allowed Values:**

- `vercel` - Vercel platform
- `netlify` - Netlify platform
- `railway` - Railway platform
- `render` - Render platform
- `fly` - Fly.io platform
- `heroku` - Heroku platform
- `aws` - Amazon Web Services
- `gcp` - Google Cloud Platform
- `azure` - Microsoft Azure
- `local` - Local development

**Schema Example:**

```json
{
  "deployment": {
    "values": ["vercel", "netlify", "railway", "render"],
    "default": "vercel"
  }
}
```

#### features

**Type:** `multi` (required)

**Purpose:** Custom feature toggles specific to your template.

**Allowed Values:** Any string values following pattern `^[a-z][a-z0-9_-]*$`
(1-50 chars)

**Schema Example:**

```json
{
  "features": {
    "values": ["auth", "testing", "i18n", "logging"],
    "default": ["testing"]
  }
}
```

#### database

**Type:** `single` (required)

**Purpose:** Database technology choice.

**Allowed Values:**

- `postgres` - PostgreSQL
- `mysql` - MySQL
- `sqlite` - SQLite
- `mongodb` - MongoDB
- `redis` - Redis
- `none` - No database

**Schema Example:**

```json
{
  "database": {
    "values": ["postgres", "mysql", "sqlite", "mongodb", "none"],
    "default": "none"
  }
}
```

#### storage

**Type:** `single` (required)

**Purpose:** Storage solution for files and assets.

**Allowed Values:**

- `local` - Local file system
- `s3` - Amazon S3
- `cloudflare` - Cloudflare R2
- `vercel-blob` - Vercel Blob
- `none` - No storage

**Schema Example:**

```json
{
  "storage": {
    "values": ["local", "s3", "cloudflare", "vercel-blob", "none"],
    "default": "none"
  }
}
```

#### identity

**Type:** `single` (required)

**Purpose:** WHO can access - authentication and authorization provider.

**Allowed Values:**

- `auth0` - Auth0
- `clerk` - Clerk
- `firebase` - Firebase Auth
- `supabase` - Supabase Auth
- `custom` - Custom authentication
- `none` - No authentication

**Schema Example:**

```json
{
  "identity": {
    "values": ["auth0", "clerk", "firebase", "supabase", "none"],
    "default": "none"
  }
}
```

#### billing

**Type:** `single` (required)

**Purpose:** HOW revenue flows - payment processing for monetization.

**Allowed Values:**

- `stripe` - Stripe payments
- `paypal` - PayPal
- `lemonsqueezy` - Lemon Squeezy
- `custom` - Custom payment processor
- `none` - No payments

**Schema Example:**

```json
{
  "billing": {
    "values": ["stripe", "paypal", "lemonsqueezy", "none"],
    "default": "none"
  }
}
```

#### analytics

**Type:** `single` (required)

**Purpose:** WHAT users do - business analytics and tracking.

**Allowed Values:**

- `google-analytics` - Google Analytics
- `mixpanel` - Mixpanel
- `posthog` - PostHog
- `plausible` - Plausible Analytics
- `custom` - Custom analytics
- `none` - No analytics

**Schema Example:**

```json
{
  "analytics": {
    "values": ["google-analytics", "mixpanel", "posthog", "plausible", "none"],
    "default": "none"
  }
}
```

#### monitoring

**Type:** `single` (required)

**Purpose:** HOW system behaves - operational observability and monitoring.

**Allowed Values:**

- `datadog` - Datadog
- `sentry` - Sentry
- `newrelic` - New Relic
- `grafana` - Grafana Cloud
- `custom` - Custom monitoring
- `none` - No monitoring

**Schema Example:**

```json
{
  "monitoring": {
    "values": ["datadog", "sentry", "newrelic", "grafana", "none"],
    "default": "none"
  }
}
```

## Gates

Gates define compatibility constraints between dimension values. They prevent
invalid combinations during template creation.

### Gate Schema

```json
{
  "gates": {
    "dimension_name": {
      "platform": "platform_name",
      "constraint": "Human-readable description",
      "allowed": {
        "other_dimension": ["allowed_values"]
      },
      "forbidden": {
        "other_dimension": ["forbidden_values"]
      }
    }
  }
}
```

### Gate Properties

- **`platform`**: Platform this gate applies to
- **`constraint`**: Human-readable description of the constraint
- **`allowed`**: Dimension values allowed on this platform
- **`forbidden`**: Dimension values forbidden on this platform

### Gate Example

```json
{
  "gates": {
    "deployment_target": {
      "platform": "vercel",
      "constraint": "Vercel supports specific database and storage options",
      "allowed": {
        "database": ["postgres", "mysql"],
        "storage": ["s3", "cloudflare"]
      }
    }
  }
}
```

## Features

Features define available capabilities and their infrastructure requirements. Each feature specifies what it needs from the 7 fixed dimensions.

### Features Schema

Features are defined as an array of feature objects:

```json
{
  "features": [
    {
      "id": "feature_id",
      "label": "Human readable name",
      "description": "Feature description",
      "category": "authentication|database|storage|billing|analytics|monitoring|ui|api|deployment|other",
      "needs": {
        "database": "required|optional|none",
        "identity": "required|optional|none",
        "billing": "required|optional|none",
        "storage": "required|optional|none",
        "analytics": "required|optional|none",
        "monitoring": "required|optional|none"
      }
    }
  ]
}
```

### Needs Values

- **`required`**: Feature requires this capability to be available
- **`optional`**: Feature can use this capability if available
- **`none`**: Feature doesn't use this capability

### Features Example

```json
{
  "features": [
    {
      "id": "user-login",
      "label": "User Authentication",
      "description": "User authentication and session management",
      "category": "authentication",
      "needs": {
        "identity": "required",
        "database": "required"
      }
    },
    {
      "id": "checkout",
      "label": "Payment Processing",
      "description": "Accept and process payments",
      "category": "billing",
      "needs": {
        "billing": "required",
        "database": "required"
      }
    }
  ]
}
```

## Hints

Hints provide an advisory catalog of recommended features for different use
cases. They're used by the CLI to suggest features during template creation.

### Hints Schema

```json
{
  "hints": {
    "features": [
      {
        "id": "feature_id",
        "label": "Human readable name",
        "description": "Feature description",
        "examples": ["Example use case 1", "Example use case 2"],
        "needs": {
          "database": "required|optional|none",
          "identity": "required|optional|none",
          "billing": "required|optional|none",
          "storage": "required|optional|none",
          "analytics": "required|optional|none",
          "monitoring": "required|optional|none"
        }
      }
    ]
  }
}
```

### Hints Properties

- **`id`**: Unique feature identifier (2-64 chars, lowercase with
  underscores/hyphens/colons)
- **`label`**: Human-readable display name
- **`description`**: Detailed feature description
- **`examples`** (optional): Array of example use cases
- **`needs`**: Capability requirements (same as features)

### Hints Example

```json
{
  "hints": {
    "features": [
      {
        "id": "public_static",
        "label": "Public Static",
        "description": "Static marketing pages (no forms).",
        "needs": {
          "identity": "none",
          "database": "none",
          "billing": "none",
          "storage": "none"
        },
        "examples": ["Legal Pages", "About Us"]
      },
      {
        "id": "auth_dataentry_simple",
        "label": "Auth Data Entry (Simple)",
        "description": "Authenticated forms without uploads.",
        "needs": {
          "identity": "required",
          "database": "required",
          "billing": "none",
          "storage": "none"
        },
        "examples": ["Password Update", "Team Invite"]
      }
    ]
  }
}
```

## Constants

Constants define fixed values that define the template's identity and cannot be
changed by users.

### Constants Schema

```json
{
  "constants": {
    "language": "typescript",
    "framework": "react-router-v7",
    "styling": "tailwindcss",
    "ci_cd": "github-actions",
    "runtime": "node",
    "code_quality": "eslint",
    "transactional_emails": "resend"
  }
}
```

### Predefined Constants

The schema recognizes these common constants:

| Constant               | Type     | Description                            |
| ---------------------- | -------- | -------------------------------------- |
| `language`             | `string` | Programming language                   |
| `framework`            | `string` | Primary framework or library           |
| `styling`              | `string` | CSS framework or styling approach      |
| `ci_cd`                | `string` | CI/CD platform                         |
| `runtime`              | `string` | Runtime environment                    |
| `code_quality`         | `string` | Code quality tools and standards       |
| `transactional_emails` | `string` | Email service for transactional emails |

### Custom Constants

Template authors can add any additional constants:

```json
{
  "constants": {
    "language": "typescript",
    "framework": "react-router-v7",
    "styling": "tailwindcss",
    "monitoring": "datadog",
    "logging": "winston"
  }
}
```

## Scaffold Section

The `scaffold` section defines the steps to create the project structure.

### Scaffold Schema

```json
{
  "scaffold": {
    "steps": [
      {
        "type": "copy",
        "source": "src/template-file.js",
        "target": "dest/project-file.js",
        "condition": "features.includes('auth')"
      },
      {
        "type": "render",
        "source": "templates/config.ejs",
        "target": "config/app.js",
        "condition": "database === 'postgres'"
      },
      {
        "type": "json-edit",
        "file": "package.json",
        "operations": [
          {
            "op": "add",
            "path": "/dependencies/express",
            "value": "^4.18.0"
          }
        ],
        "condition": "framework === 'express'"
      },
      {
        "type": "shell",
        "command": "npm install",
        "cwd": ".",
        "condition": "features.includes('testing')"
      }
    ]
  }
}
```

### Step Types

#### copy

Copies a file from source to target.

```json
{
  "type": "copy",
  "source": "path/to/source/file",
  "target": "path/to/destination/file",
  "condition": "optional expression"
}
```

#### render

Renders a template file with placeholders.

```json
{
  "type": "render",
  "source": "path/to/template.ejs",
  "target": "path/to/output/file",
  "condition": "optional expression"
}
```

#### json-edit

Modifies JSON files with patch operations.

```json
{
  "type": "json-edit",
  "file": "path/to/json/file.json",
  "operations": [
    {
      "op": "add|replace|remove",
      "path": "jsonpath",
      "value": "optional value"
    }
  ],
  "condition": "optional expression"
}
```

#### shell

Executes shell commands.

```json
{
  "type": "shell",
  "command": "shell command",
  "cwd": "working directory",
  "condition": "optional expression"
}
```

### Conditions

Conditions are JavaScript expressions that evaluate to true/false. They have
access to:

- Dimension values (e.g., `database`, `features`)
- Template constants
- User selections

Examples:

- `"database === 'postgres'"`
- `"features.includes('auth')"`
- `"deployment_target === 'vercel'"`

## Complete Example

```json
{
  "schemaVersion": "1.0.0",
  "id": "acme/web-app",
  "name": "Full-Stack Web Application",
  "description": "A complete web application with authentication, database, and billing",
  "status": "published",
  "placeholderFormat": "unicode",
  "placeholders": {
    "PROJECT_NAME": {
      "description": "Name of the generated project",
      "default": "my-web-app"
    },
    "AUTHOR_NAME": {
      "description": "Author name for package.json",
      "default": "Developer"
    }
  },
  "handoff": [
    "Run 'npm install' to install dependencies",
    "Copy .env.example to .env and configure your environment variables",
    "Run 'npm run dev' to start the development server"
  ],
  "setup": {
    "script": "_setup.mjs",
    "authoringMode": "composable",
    "authorAssetsDir": "__scaffold__"
  },
  "dimensions": {
    "deployment": {
      "label": "Deployment Platform",
      "policy": "strict",
      "options": [
        { "id": "vercel", "label": "Vercel", "desc": "Vercel platform" },
        { "id": "netlify", "label": "Netlify", "desc": "Netlify platform" },
        { "id": "railway", "label": "Railway", "desc": "Railway platform" }
      ],
      "default": "vercel"
    },
    "database": {
      "label": "Database",
      "options": [
        { "id": "postgres", "label": "PostgreSQL" },
        { "id": "mysql", "label": "MySQL" },
        { "id": "sqlite", "label": "SQLite" },
        { "id": "none", "label": "None" }
      ],
      "default": "postgres"
    },
    "storage": {
      "label": "File Storage",
      "options": [
        { "id": "s3", "label": "Amazon S3" },
        { "id": "cloudflare", "label": "Cloudflare R2" },
        { "id": "local", "label": "Local filesystem" },
        { "id": "none", "label": "None" }
      ],
      "default": "s3"
    },
    "identity": {
      "label": "Authentication",
      "options": [
        { "id": "auth0", "label": "Auth0" },
        { "id": "clerk", "label": "Clerk" },
        { "id": "supabase", "label": "Supabase Auth" },
        { "id": "none", "label": "None" }
      ],
      "default": "auth0"
    },
    "billing": {
      "label": "Payment Processing",
      "options": [
        { "id": "stripe", "label": "Stripe" },
        { "id": "paypal", "label": "PayPal" },
        { "id": "none", "label": "None" }
      ],
      "default": "stripe"
    },
    "analytics": {
      "label": "Analytics",
      "options": [
        { "id": "google-analytics", "label": "Google Analytics" },
        { "id": "posthog", "label": "PostHog" },
        { "id": "plausible", "label": "Plausible" },
        { "id": "none", "label": "None" }
      ],
      "default": "google-analytics"
    },
    "monitoring": {
      "label": "Monitoring",
      "options": [
        { "id": "sentry", "label": "Sentry" },
        { "id": "datadog", "label": "Datadog" },
        { "id": "none", "label": "None" }
      ],
      "default": "sentry"
    }
  },
  "gates": {
    "deployment": {
      "vercel": {
        "database": ["postgres", "mysql", "none"],
        "storage": ["s3", "cloudflare", "none"]
      },
      "railway": {
        "database": ["postgres", "mysql", "sqlite", "none"]
      }
    }
  },
  "features": [
    {
      "id": "user-login",
      "label": "User Authentication",
      "description": "User authentication and session management",
      "needs": {
        "identity": "required",
        "database": "required"
      }
    },
    {
      "id": "checkout",
      "label": "Payment Processing",
      "description": "Accept and process payments",
      "needs": {
        "billing": "required",
        "database": "required"
      }
    },
    {
      "id": "usage-tracking",
      "label": "Analytics",
      "description": "Track user behavior and app metrics",
      "needs": {
        "analytics": "required"
      }
    }
  ]
}
```

## Validation

Templates are validated using `create template validate` which performs:

1. **Schema Validation**: JSON Schema Draft 2020-12 compliance
2. **Domain Validation**: Business rule validation (dimension constraints, gate consistency)
3. **Setup Script Validation**: Checks setup script exists and has correct exports

Validation uses dimension-level `policy`:

- **strict** (default): Unknown values are rejected with an error
- **warn**: Unknown values are allowed with a warning

## See Also

- [Template Author Workflow](../how-to/template-author-workflow.md) - Template authoring guide
- [Template Validation](template-validation.md) - Validation rules and error
  messages
- [Environment Reference](environment.md) - Runtime environment variables
