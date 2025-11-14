---
title: "Template Schema Reference"
type: "reference"
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

Hints provide an advisory catalog of recommended features for different use cases. They're used by the CLI to suggest features during template creation.

### Hints Schema

```json
{
  "hints": {
    "category": {
      "label": "Category display name",
      "description": "Category description",
      "features": ["feature1", "feature2"]
    }
  }
}
```

### Hints Example

```json
{
  "hints": {
    "web-app": {
      "label": "Web Application",
      "description": "Features for building web applications",
      "features": ["auth", "database", "analytics"]
    },
    "api": {
      "label": "API Service",
      "description": "Features for building APIs",
      "features": ["auth", "database", "logging"]
    }
  }
}
```

## Constants

Constants define fixed values that templates can reference. These are typically tooling versions, framework choices, or other immutable template settings.

### Constants Schema

```json
{
  "constants": {
    "typescript": "5.3.0",
    "react": "18.2.0",
    "tailwindcss": "3.4.0"
  }
}
```

### Common Constants

```json
{
  "constants": {
    "typescript": "5.3.0",
    "react-router-v7": "7.0.0",
    "tailwind+daisyui": "3.4.0+4.6.0",
    "vitest": "1.0.0",
    "eslint": "8.50.0"
  }
}
```

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
    "minimal": {
      "label": "Minimal App",
      "description": "Basic web app with testing",
      "features": ["testing"]
    },
    "fullstack": {
      "label": "Full-Stack App",
      "description": "Complete application with all features",
      "features": ["auth", "payments", "analytics", "testing"]
    }
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
