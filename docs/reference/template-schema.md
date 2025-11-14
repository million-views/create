---
title: "Template Schema Reference"
description: "Complete reference for Schema V1.0 (template.json) structure and validation"
type: reference
audience: "template-authors"
estimated_time: "10 minutes"
prerequisites:
  - "Read reference/environment.md"
  - "Read how-to/creating-templates.md"
related_docs:
  - "../how-to/creating-templates.md"
  - "environment.md"
  - "../how-to/author-workflow.md"
last_updated: "2025-11-13"
---

# Template Schema Reference

Complete reference for Schema V1.0 (`template.json`). This document covers all sections of the template schema including metadata, setup configuration, feature specifications, hints, and constants.

## Overview

Schema V1.0 defines the structure for `template.json` files. Templates are validated against this schema during creation and runtime. The schema ensures consistent behavior across all templates while allowing flexibility for different use cases.

## Schema Structure

```json
{
  "schemaVersion": "1.0.0",
  "title": "My Template",
  "id": "my-template",
  "name": "My Template",
  "description": "A template for building X",
  "setup": {
    "authoring": "composable",
    "policy": "strict",
    "dimensions": { /* required dimensions */ },
    "gates": { /* compatibility rules */ }
  },
  "featureSpecs": { /* feature definitions */ },
  "hints": { /* advisory feature catalog */ },
  "constants": { /* fixed template values */ }
}
```

## Top-Level Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `schemaVersion` | `string` | No | Schema version (currently "1.0.0") |
| `title` | `string` | No | Human-readable title |
| `id` | `string` | No | Unique template identifier |
| `name` | `string` | No | Short template name |
| `description` | `string` | No | Template description |

### Required Sections

| Property | Type | Description |
|----------|------|-------------|
| `setup` | `object` | Template configuration and dimensions |
| `featureSpecs` | `object` | Feature definitions with requirements |
| `constants` | `object` | Fixed template constants |

## Setup Section

The `setup` section configures template behavior and defines user-selectable options.

### Setup Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `authoring` | `string` | No | `"composable"` or `"fixed"` (default: `"composable"`) |
| `policy` | `string` | Yes | `"strict"` or `"lenient"` validation |
| `dimensions` | `object` | Yes | User-selectable options |
| `gates` | `object` | Yes | Compatibility constraints |

### Authoring Modes

- **`composable`**: Features assembled via `_setup.mjs` (recommended)
- **`fixed`**: Pre-built combinations, limited customization

### Validation Policies

- **`strict`**: Reject invalid selections (recommended for production)
- **`lenient`**: Allow unknown values with warnings (development only)

## Dimensions

Dimensions define user-selectable options. Schema V1.0 requires exactly 7 dimensions.

### Required Dimensions

All templates must define these dimensions:

| Name | Type | Purpose |
|------|------|---------|
| `deployment` | `single` | Deployment platform |
| `features` | `multi` | Custom feature toggles |
| `database` | `single` | Database technology choice |
| `storage` | `single` | Storage solution |
| `auth` | `multi` | Authentication providers |
| `payments` | `single` | Payment processor |
| `analytics` | `single` | Analytics service |

### Dimension Types

- **`single`**: User selects exactly one value from allowed options
- **`multi`**: User selects zero or more values from allowed options

### Dimension Schema

```json
{
  "dimension_name": {
    "type": "single|multi",
    "values": ["option1", "option2"],
    "default": "option1"
  }
}
```

## Dimension Details

### deployment

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
  "deployment": {
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

**Purpose:** Storage solution for files and assets.

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

### auth

**Type:** `multi` (required)

**Purpose:** Authentication providers for user login.

**Allowed Values:**
- `google` - Google OAuth
- `github` - GitHub OAuth
- Custom values starting with `x-`

**Schema Example:**
```json
{
  "auth": {
    "type": "multi",
    "values": ["google", "github"],
    "default": []
  }
}
```

### payments

**Type:** `single` (required)

**Purpose:** Payment processor for monetization.

**Allowed Values:**
- `stripe` - Stripe payments
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

**Purpose:** Analytics service for tracking.

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

## Gates

Gates define compatibility constraints between dimension values. They prevent invalid combinations during template creation.

### Gate Schema

```json
{
  "gates": {
    "dimension_name": {
      "value": {
        "requires|conflicts": {
          "other_dimension": ["allowed_values"]
        }
      }
    }
  }
}
```

### Gate Types

- **`requires`**: When this value is selected, other dimensions must have specific values
- **`conflicts`**: When this value is selected, other dimensions cannot have specific values

### Gate Examples

```json
{
  "gates": {
    "deployment": {
      "cloudflare-workers": {
        "requires": {
          "database": ["d1"],
          "storage": ["r2"]
        }
      }
    },
    "database": {
      "d1": {
        "requires": {
          "deployment": ["cloudflare-workers"]
        }
      }
    }
  }
}
```

## FeatureSpecs

FeatureSpecs define available features and their requirements. Each feature specifies what capabilities it needs from the selected dimensions.

### FeatureSpec Schema

```json
{
  "featureSpecs": {
    "feature_name": {
      "label": "Human readable name",
      "description": "Feature description",
      "needs": {
        "dimension_name": "required|optional|none"
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
      "needs": {
        "auth": "required",
        "database": "required"
      }
    },
    "payments": {
      "label": "Payment Processing",
      "description": "Accept and process payments",
      "needs": {
        "payments": "required",
        "database": "required"
      }
    }
  }
}
```

## Hints

Hints provide an advisory catalog of recommended features for different use cases. They're used by the CLI to suggest features during template creation and provide rich metadata for UI components.

### Hints Schema

```json
{
  "hints": {
    "features": [
      {
        "id": "feature_id",
        "label": "Human readable name",
        "description": "Feature description",
        "needs": {
          "database": "required|optional|none",
          "auth": "required|optional|none",
          "payments": "required|optional|none",
          "storage": "required|optional|none"
        },
        "examples": ["Example use case 1", "Example use case 2"]
      }
    ]
  }
}
```

### Hints Properties

- **`id`**: Unique feature identifier (2-64 chars, lowercase with underscores/hyphens/colons)
- **`label`**: Human-readable display name
- **`description`**: Detailed feature description
- **`needs`**: Capability requirements (same as featureSpecs)
- **`examples`** (optional): Array of example use cases

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

Constants define fixed values that define the template's identity and cannot be changed by users. These values distinguish one template from another - changing constants creates a different template entirely. Constants prevent combinatorial explosion by keeping core template aspects immutable.

The schema defines common constants that most templates use, while allowing template authors to add their own custom constants for any aspect that cannot be handled through the fixed dimensions.

### Constants Schema

```json
{
  "constants": {
    "language": "typescript",
    "framework": "react-router-v7",
    "styling": "tailwind+daisyui",
    "ci_cd": "github-actions",
    "runtime": "node",
    "dns_provider": "cloudflare"
  }
}
```

### Predefined Constants

The schema recognizes these common constants:

| Constant | Type | Description |
|----------|------|-------------|
| `language` | `string` | Programming language (typescript, javascript, python, etc.) |
| `framework` | `string` | Primary framework or library |
| `styling` | `string` | CSS framework or styling approach |
| `ci_cd` | `string` | CI/CD platform (github-actions, gitlab-ci, etc.) |
| `runtime` | `string` | Runtime environment (node, deno, bun, etc.) |
| `code_quality` | `string` | Code quality tools and standards |
| `transactional_emails` | `string` | Email service for transactional emails |

### Custom Constants

Template authors can add any additional constants beyond the predefined ones:

```json
{
  "constants": {
    "language": "typescript",
    "framework": "react-router-v7",
    "styling": "tailwind+daisyui",
    "ci_cd": "github-actions",
    "runtime": "node",
    "dns_provider": "cloudflare",
    "monitoring": "datadog",
    "logging": "winston",
    "caching": "redis"
  }
}
```

### Constants Purpose

Constants serve as the "DNA" of a template:
- **Identity**: Define what makes this template unique
- **Fixed**: Cannot be changed by users during configuration
- **Immutable**: Changing constants requires creating a new template
- **Extensible**: Template authors can add custom constants as needed
- **Boundaries**: Prevent feature creep and maintain template focus

### Constants vs Dimensions

| Aspect | Constants | Dimensions |
|--------|-----------|------------|
| **Purpose** | Template identity | User choices |
| **Changable** | Never (creates new template) | By users |
| **Scope** | Template-wide | Per-project |
| **Examples** | Language, framework, DNS provider | Database, auth providers |

### When to Use Constants vs Dimensions

Use **constants** for:
- Core technology choices that define the template's identity
- Infrastructure decisions that cannot vary per project
- Services that are fundamental to the template's architecture
- Any aspect that, if changed, would create a different template

Use **dimensions** for:
- Optional features users can choose
- Configuration that varies by use case
- Services that can be swapped out
- Aspects that don't change the fundamental nature of the template

## Complete Example

```json
{
  "schemaVersion": "1.0.0",
  "title": "Full-Stack Web App Template",
  "id": "fullstack-webapp",
  "name": "Full-Stack Web App",
  "description": "A complete web application with authentication, database, and payments",
  "setup": {
    "authoring": "composable",
    "policy": "strict",
    "dimensions": {
      "deployment": {
        "type": "single",
        "values": ["cloudflare-workers", "linode", "droplet"],
        "default": "cloudflare-workers"
      },
      "features": {
        "type": "multi",
        "values": ["auth", "payments", "analytics", "testing"],
        "default": ["testing"]
      },
      "database": {
        "type": "single",
        "values": ["d1", "tursodb", "sqlite3", "none"],
        "default": "d1"
      },
      "storage": {
        "type": "single",
        "values": ["r2", "s3", "file", "none"],
        "default": "r2"
      },
      "auth": {
        "type": "multi",
        "values": ["google", "github"],
        "default": []
      },
      "payments": {
        "type": "single",
        "values": ["stripe", "hyperswitch", "none"],
        "default": "none"
      },
      "analytics": {
        "type": "single",
        "values": ["umami", "plausible", "none"],
        "default": "none"
      }
    },
    "gates": {
      "deployment": {
        "cloudflare-workers": {
          "requires": {
            "database": ["d1"],
            "storage": ["r2"]
          }
        }
      }
    }
  },
  "featureSpecs": {
    "auth": {
      "label": "Authentication",
      "description": "User authentication and session management",
      "needs": {
        "auth": "required",
        "database": "required"
      }
    },
    "payments": {
      "label": "Payment Processing",
      "description": "Accept and process payments",
      "needs": {
        "payments": "required",
        "database": "required"
      }
    },
    "analytics": {
      "label": "Analytics",
      "description": "Track user behavior and app metrics",
      "needs": {
        "analytics": "required"
      }
    },
    "testing": {
      "label": "Testing Suite",
      "description": "Unit and integration tests",
      "needs": {}
    }
  },
  "hints": {
    "features": [
      {
        "id": "auth",
        "label": "Authentication",
        "description": "User authentication and session management",
        "needs": {
          "auth": "required",
          "database": "required",
          "payments": "none",
          "storage": "none"
        },
        "examples": ["User login", "Profile management"]
      },
      {
        "id": "payments",
        "label": "Payment Processing",
        "description": "Accept and process payments",
        "needs": {
          "auth": "required",
          "database": "required",
          "payments": "required",
          "storage": "none"
        },
        "examples": ["Subscription billing", "One-time purchases"]
      },
      {
        "id": "analytics",
        "label": "Analytics",
        "description": "Track user behavior and app metrics",
        "needs": {
          "auth": "none",
          "database": "none",
          "payments": "none",
          "storage": "none"
        },
        "examples": ["Page views", "User engagement"]
      }
    ]
  },
  "constants": {
    "typescript": "5.3.0",
    "react-router-v7": "7.0.0",
    "tailwind+daisyui": "3.4.0+4.6.0",
    "vitest": "1.0.0",
    "eslint": "8.50.0"
  }
}
```

## Migration from Earlier Versions

If you're updating from templates without the full schema:

1. Add the 7 required dimensions to `setup.dimensions`
2. Add `gates` object (can be empty `{}`)
3. Add `featureSpecs` with definitions for your features
4. Add `constants` with your fixed tooling versions
5. Optionally add `hints` for better user experience

## Validation

Templates are validated against Schema V1.0 during:
- Template creation (`create-scaffold new`)
- Template validation (`make-template validate`)
- Runtime setup execution

Validation ensures all required dimensions are present and values conform to allowed options.
