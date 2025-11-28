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
  "placeholderFormat": "unicode",
  "placeholders": {},
  "tags": ["tag1", "tag2"],
  "author": "Author Name",
  "license": "MIT",
  "handoff": ["Next step 1", "Next step 2"],
  "setup": {
    "policy": "strict",
    "authoringMode": "composable"
  },
  "dimensions": {
    /* user-selectable options */
  },
  "gates": {
    /* compatibility constraints */
  },
  "featureSpecs": {
    /* feature definitions */
  },
  "hints": {
    /* advisory catalog */
  },
  "constants": {
    /* fixed values */
  },
  "scaffold": {
    /* scaffolding steps */
  }
}
```

## Minimal Template

The simplest valid template requires 6 fields:

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
| `name`              | `string`   | Yes      | Human-readable template name (1-120 chars)                      |
| `description`       | `string`   | Yes      | Detailed description (1-500 chars)                              |
| `placeholderFormat` | `string`   | Yes      | Delimiter format: `unicode`, `mustache`, `dollar`, or `percent` |
| `placeholders`      | `object`   | Yes      | Placeholder definitions (can be empty `{}`)                     |
| `tags`              | `string[]` | No       | Categorization tags (lowercase, alphanumeric + hyphens)         |
| `author`            | `string`   | No       | Template author or organization name                            |
| `license`           | `string`   | No       | License under which template is distributed                     |
| `handoff`           | `string[]` | No       | Post-scaffold instructions (max 240 chars each)                 |

### Placeholder Formats

| Format     | Syntax           | Best For                                        |
| ---------- | ---------------- | ----------------------------------------------- |
| `unicode`  | `⦃TOKEN⦄`        | React/JSX (default, avoids `{{}}` conflicts)    |
| `mustache` | `{{TOKEN}}`      | General templates (conflicts with JSX)          |
| `dollar`   | `$TOKEN$`        | Avoids conflicts with template literals         |
| `percent`  | `%TOKEN%`        | Avoids conflicts with CSS/custom syntax         |

Set via `create template convert --placeholder-format <format>`.

## Setup Section

The `setup` section configures template behavior and validation policies.

### Setup Properties

| Property        | Type     | Required | Description                                                |
| --------------- | -------- | -------- | ---------------------------------------------------------- |
| `policy`        | `string` | No       | `"strict"` or `"lenient"` validation (default: `"strict"`) |
| `authoringMode` | `string` | No       | `"wysiwyg"` or `"composable"` (default: `"composable"`)    |

### Validation Policies

- **`strict`**: Reject invalid selections (recommended for production)
- **`lenient`**: Allow unknown values with warnings (development only)

### Authoring Modes

- **`composable`**: Features assembled via `_setup.mjs` (recommended)
- **`wysiwyg`**: Visual editor with pre-built combinations

## Dimensions

Dimensions define user-selectable options. The schema supports flexible
dimension definitions with validation.

### Dimension Types

Dimensions can be defined in two formats:

#### Simple Format (Legacy)

```json
{
  "dimension_name": {
    "values": ["option1", "option2", "option3"],
    "default": "option1"
  }
}
```

#### Structured Format (V1.0.0)

```json
{
  "dimension_name": {
    "name": "Human Readable Name",
    "description": "Dimension description",
    "options": [
      {
        "id": "option1",
        "name": "Option 1",
        "description": "Description of option 1"
      }
    ],
    "default": "option1"
  }
}
```

### Required Dimensions (V1.0.0)

Schema V1.0.0 defines 7 standard dimensions:

| Name         | Type     | Purpose                    |
| ------------ | -------- | -------------------------- |
| `deployment` | `single` | Deployment platform        |
| `features`   | `multi`  | Custom feature toggles     |
| `database`   | `single` | Database technology choice |
| `storage`    | `single` | Storage solution           |
| `auth`       | `multi`  | Authentication providers   |
| `payments`   | `single` | Payment processor          |
| `analytics`  | `single` | Analytics service          |

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

#### auth

**Type:** `multi` (required)

**Purpose:** Authentication providers for user login.

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
  "auth": {
    "values": ["auth0", "clerk", "firebase", "supabase", "none"],
    "default": []
  }
}
```

#### payments

**Type:** `single` (required)

**Purpose:** Payment processor for monetization.

**Allowed Values:**

- `stripe` - Stripe payments
- `paypal` - PayPal
- `lemonsqueezy` - Lemon Squeezy
- `custom` - Custom payment processor
- `none` - No payments

**Schema Example:**

```json
{
  "payments": {
    "values": ["stripe", "paypal", "lemonsqueezy", "none"],
    "default": "none"
  }
}
```

#### analytics

**Type:** `single` (required)

**Purpose:** Analytics service for tracking.

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

## FeatureSpecs

FeatureSpecs define available features and their requirements. Each feature
specifies what capabilities it needs from the selected dimensions.

### FeatureSpec Schema

```json
{
  "featureSpecs": {
    "feature_name": {
      "label": "Human readable name",
      "description": "Feature description",
      "category": "authentication|database|storage|payments|analytics|ui|api|deployment|other",
      "needs": {
        "database": "required|optional|none",
        "auth": "required|optional|none",
        "payments": "required|optional|none",
        "storage": "required|optional|none"
      }
    }
  }
}
```

### Needs Values

- **`required`**: Feature requires this capability to be available
- **`optional`**: Feature can use this capability if available
- **`none`**: Feature doesn't use this capability

### FeatureSpec Example

```json
{
  "featureSpecs": {
    "auth": {
      "label": "Authentication",
      "description": "User authentication and session management",
      "category": "authentication",
      "needs": {
        "auth": "required",
        "database": "required"
      }
    },
    "payments": {
      "label": "Payment Processing",
      "description": "Accept and process payments",
      "category": "payments",
      "needs": {
        "payments": "required",
        "database": "required"
      }
    }
  }
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
          "auth": "required|optional|none",
          "payments": "required|optional|none",
          "storage": "required|optional|none"
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
- **`needs`**: Capability requirements (same as featureSpecs)

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
          "auth": "none",
          "database": "none",
          "payments": "none",
          "storage": "none"
        },
        "examples": ["Legal Pages", "About Us"]
      },
      {
        "id": "auth_dataentry_simple",
        "label": "Auth Data Entry (Simple)",
        "description": "Authenticated forms without uploads.",
        "needs": {
          "auth": "required",
          "database": "required",
          "payments": "none",
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
  "description": "A complete web application with authentication, database, and payments",
  "tags": ["web", "fullstack", "react"],
  "author": "Acme Corp",
  "license": "MIT",
  "handoff": [
    "Run 'npm install' to install dependencies",
    "Copy .env.example to .env and configure your environment variables",
    "Run 'npm run dev' to start the development server"
  ],
  "setup": {
    "policy": "strict",
    "authoringMode": "composable"
  },
  "dimensions": {
    "deployment_target": {
      "values": ["vercel", "netlify", "railway", "render"],
      "default": "vercel"
    },
    "features": {
      "values": ["auth", "payments", "analytics", "testing"],
      "default": ["testing"]
    },
    "database": {
      "values": ["postgres", "mysql", "sqlite", "mongodb", "none"],
      "default": "postgres"
    },
    "storage": {
      "values": ["local", "s3", "cloudflare", "vercel-blob", "none"],
      "default": "s3"
    },
    "auth": {
      "values": ["auth0", "clerk", "firebase", "supabase", "none"],
      "default": ["auth0"]
    },
    "payments": {
      "values": ["stripe", "paypal", "lemonsqueezy", "none"],
      "default": "stripe"
    },
    "analytics": {
      "values": [
        "google-analytics",
        "mixpanel",
        "posthog",
        "plausible",
        "none"
      ],
      "default": "google-analytics"
    }
  },
  "gates": {
    "deployment_target": {
      "platform": "vercel",
      "constraint": "Vercel supports specific database and storage options",
      "allowed": {
        "database": ["postgres", "mysql"],
        "storage": ["s3", "cloudflare"]
      }
    }
  },
  "featureSpecs": {
    "auth": {
      "label": "Authentication",
      "description": "User authentication and session management",
      "category": "authentication",
      "needs": {
        "auth": "required",
        "database": "required"
      }
    },
    "payments": {
      "label": "Payment Processing",
      "description": "Accept and process payments",
      "category": "payments",
      "needs": {
        "payments": "required",
        "database": "required"
      }
    },
    "analytics": {
      "label": "Analytics",
      "description": "Track user behavior and app metrics",
      "category": "analytics",
      "needs": {
        "analytics": "required"
      }
    }
  },
  "hints": {
    "features": [
      {
        "id": "public_static",
        "label": "Public Static",
        "description": "Static marketing pages (no forms).",
        "needs": {
          "auth": "none",
          "database": "none",
          "payments": "none",
          "storage": "none"
        },
        "examples": ["Legal Pages", "About Us"]
      },
      {
        "id": "auth_dataentry_simple",
        "label": "Auth Data Entry (Simple)",
        "description": "Authenticated forms without uploads.",
        "needs": {
          "auth": "required",
          "database": "required",
          "payments": "none",
          "storage": "none"
        },
        "examples": ["Password Update", "Team Invite"]
      }
    ]
  },
  "constants": {
    "language": "typescript",
    "framework": "next.js",
    "styling": "tailwindcss",
    "ci_cd": "github-actions",
    "runtime": "node",
    "code_quality": "eslint+prettier",
    "transactional_emails": "resend"
  },
  "scaffold": {
    "steps": [
      {
        "type": "copy",
        "source": "src/app.ts",
        "target": "src/app.ts"
      },
      {
        "type": "render",
        "source": "templates/package.json.ejs",
        "target": "package.json"
      },
      {
        "type": "json-edit",
        "file": "package.json",
        "operations": [
          {
            "op": "add",
            "path": "/dependencies/express",
            "value": "^4.18.0",
            "condition": "framework === 'express'"
          }
        ]
      },
      {
        "type": "shell",
        "command": "npm install",
        "cwd": "."
      }
    ]
  }
}
```

## Validation

Templates are validated using `TemplateValidator` which performs:

1. **Schema Validation**: JSON Schema Draft 2020-12 compliance
2. **Domain Validation**: Business rule validation
3. **Consumption Validation**: Runtime compatibility checks

Validation policies:

- **Strict**: Schema + domain errors are fatal
- **Lenient**: Schema + domain errors become warnings

## See Also

- [Template Author Workflow](../how-to/template-author-workflow.md) - Template authoring guide
- [Template Validation](template-validation.md) - Validation rules and error
  messages
- [Environment Reference](environment.md) - Runtime environment variables
