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



# Dimensions Glossary# Dimensions Glossary



Complete reference for template dimensions in Schema V1.0.Templates declare option vocabularies through `metadata.dimensions` in `template.json`. This glossary summarises the reserved dimensions and provides guidance for introducing your own.



## Overview## Reserved dimensions



Dimensions are user-selectable options defined in `template.json` under `metadata.dimensions`. They let template users customize scaffolded projects during creation.| Name | Type | Description |

|------|------|-------------|

---| `ide` | `single` | User-selectable dimension for IDE-specific configurations. Values include `kiro`, `vscode`, `cursor`, `windsurf`. Mark this dimension with `"builtIn": true` if you mirror it in metadata. |

| `stack` | `single` | Optional hint describing the primary framework (e.g., `react-vite`, `express`, `nextjs`). Useful when a template repository contains multiple stacks. |

## Dimension Types| `infrastructure` | `single` | Infrastructure target such as `cloudflare-d1`, `cloudflare-turso`, `none`. Surface defaults to keep scaffolds deterministic. |

| `capabilities` | `multi` | Default multi-select dimension for feature toggles. When present, @m5nv/create-scaffold treats it as the “catch-all” dimension for tokens that do not specify a dimension explicitly. |

### Single-Select Dimensions

## Naming conventions

Users choose **one value** from a list.

- Use lowercase identifiers starting with a letter: `^[a-z][a-z0-9_-]{0,49}$`.

**Schema:**- Keep values short (≤ 50 characters) and descriptive: `auth`, `testing`, `observability`.

```json- Reserve `builtIn: true` for dimensions populated by @m5nv/create-scaffold (`ide`, future CLI flags). Custom dimensions should omit this flag.

{

  "metadata": {## Dependency and conflict patterns

    "dimensions": {

      "styling": {Use `requires` and `conflicts` to keep selections coherent:

        "description": "Choose CSS framework",

        "type": "single-select",```json

        "values": ["css-modules", "tailwind", "styled-components"],"capabilities": {

        "default": "css-modules"  "type": "multi",

      }  "values": ["auth", "testing", "docs"],

    }  "requires": {

  }    "testing": ["auth"]

}  },

```  "conflicts": {

    "docs": ["testing"]

**Usage:**  }

```bash}

npm create @m5nv/scaffold my-app -- --template react-vite --options "styling=tailwind"```

```

- `requires` enforces that whenever `testing` is selected, `auth` must also be present.

### Multi-Select Dimensions- `conflicts` prevents `docs` and `testing` from being selected together.

- combine with `policy: "strict"` (default) to fail fast when users pick unsupported values.

Users choose **multiple values** from a list.

## Introducing new dimensions

**Schema:**

```json1. Ensure the dimension aligns with a single authoring concern (e.g., `deployment`, `database`, `frontend`).

{2. Provide defaults so users can omit the dimension without surprises.

  "metadata": {3. Reference the dimension explicitly in `_setup.mjs` via `tools.options.in('dimension', 'value')`.

    "dimensions": {4. Update your template README to document available values and how they interact.

      "features": {

        "description": "Optional features to include",By following these conventions, template authors can extend the option taxonomy without surprising @m5nv/create-scaffold operators.

        "type": "multi-select",
        "values": ["auth", "testing", "i18n", "analytics"],
        "default": []
      }
    }
  }
}
```

**Usage:**
```bash
npm create @m5nv/scaffold my-app -- --template react-vite --options "features=auth+testing+i18n"
```

---

## Common Dimension Patterns

### Styling Dimensions

Choose CSS framework or styling approach.

**Common Names:** `styling`, `css`, `styles`

**Example Values:**
- `css-modules` - CSS Modules
- `tailwind` - Tailwind CSS
- `styled-components` - Styled Components
- `sass` - Sass/SCSS
- `less` - Less
- `vanilla` - Plain CSS

**Example:**
```json
{
  "styling": {
    "description": "CSS framework",
    "type": "single-select",
    "values": ["css-modules", "tailwind", "styled-components"],
    "default": "css-modules"
  }
}
```

### Features Dimensions

Optional capabilities to include.

**Common Names:** `features`, `capabilities`, `addons`

**Example Values:**
- `auth` - Authentication
- `testing` - Test suite
- `i18n` - Internationalization
- `analytics` - Analytics tracking
- `logging` - Structured logging
- `docs` - Documentation

**Example:**
```json
{
  "features": {
    "description": "Optional features",
    "type": "multi-select",
    "values": ["auth", "testing", "i18n", "analytics"],
    "default": []
  }
}
```

### Stack Dimensions

Primary framework or runtime.

**Common Names:** `stack`, `framework`, `platform`

**Example Values:**
- `react-vite` - React with Vite
- `next` - Next.js
- `remix` - Remix
- `express` - Express.js
- `fastify` - Fastify
- `sveltekit` - SvelteKit

**Example:**
```json
{
  "stack": {
    "description": "Framework choice",
    "type": "single-select",
    "values": ["react-vite", "next", "remix"],
    "default": "react-vite"
  }
}
```

### Infrastructure Dimensions

Deployment target or infrastructure.

**Common Names:** `infrastructure`, `deployment`, `platform`

**Example Values:**
- `vercel` - Vercel
- `cloudflare` - Cloudflare Workers/Pages
- `aws` - AWS (Lambda, ECS, etc.)
- `docker` - Docker containers
- `none` - No specific infrastructure

**Example:**
```json
{
  "infrastructure": {
    "description": "Deployment target",
    "type": "single-select",
    "values": ["vercel", "cloudflare", "aws", "none"],
    "default": "none"
  }
}
```

### Database Dimensions

Database choice.

**Common Names:** `database`, `db`, `storage`

**Example Values:**
- `postgres` - PostgreSQL
- `mysql` - MySQL
- `sqlite` - SQLite
- `mongodb` - MongoDB
- `redis` - Redis
- `none` - No database

**Example:**
```json
{
  "database": {
    "description": "Database choice",
    "type": "single-select",
    "values": ["postgres", "mysql", "sqlite", "none"],
    "default": "none"
  }
}
```

---

## Naming Conventions

### Dimension Names

- **Lowercase**: Use all lowercase letters
- **Descriptive**: Choose clear, meaningful names
- **Concise**: Keep names short (≤ 50 characters)
- **Pattern**: `^[a-z][a-z0-9_-]{0,49}$`

**Good Examples:**
- `styling`
- `features`
- `database`
- `deployment-target`
- `auth-provider`

**Avoid:**
- `STYLING` (uppercase)
- `123features` (starts with number)
- `my.dimension` (contains dot)
- `very-long-dimension-name-that-goes-on-forever` (too long)

### Value Names

- **Lowercase**: Use all lowercase
- **Kebab-case**: Prefer hyphens for multi-word values
- **Short**: Keep concise (≤ 50 characters)

**Good Examples:**
- `tailwind`
- `styled-components`
- `cloudflare-workers`
- `auth-jwt`

**Avoid:**
- `Tailwind` (mixed case)
- `styled_components` (underscores - use hyphens)
- `cloudflare.workers` (dots)

---

## Dependency Management

### Requires

Enforce that certain values need others to be selected.

**Example:**
```json
{
  "features": {
    "type": "multi-select",
    "values": ["auth", "testing", "api"],
    "requires": {
      "testing": ["auth"]
    }
  }
}
```

**Effect**: If user selects `testing`, they must also select `auth`.

### Conflicts

Prevent certain values from being selected together.

**Example:**
```json
{
  "features": {
    "type": "multi-select",
    "values": ["rest-api", "graphql-api", "grpc-api"],
    "conflicts": {
      "rest-api": ["graphql-api", "grpc-api"],
      "graphql-api": ["rest-api", "grpc-api"]
    }
  }
}
```

**Effect**: Users can only choose one API type.

### Combined Example

```json
{
  "features": {
    "type": "multi-select",
    "values": ["auth", "testing", "docs", "api"],
    "requires": {
      "testing": ["auth"],
      "api": ["auth"]
    },
    "conflicts": {
      "docs": ["testing"]
    }
  }
}
```

---

## Validation Policies

Control how unknown values are handled.

### Strict Policy (Default)

Reject unknown values with an error.

```json
{
  "styling": {
    "type": "single-select",
    "values": ["tailwind", "styled-components"],
    "policy": "strict"
  }
}
```

**Behavior**: Error if user provides unlisted value.

### Warn Policy

Accept unknown values but log a warning.

```json
{
  "styling": {
    "type": "single-select",
    "values": ["tailwind", "styled-components"],
    "policy": "warn"
  }
}
```

**Behavior**: Warning logged, but scaffolding continues.

**Recommendation**: Use `strict` for production templates, `warn` only during development.

---

## Default Values

Always provide sensible defaults.

### Single-Select Default

```json
{
  "styling": {
    "type": "single-select",
    "values": ["css-modules", "tailwind"],
    "default": "css-modules"
  }
}
```

**Effect**: If user doesn't specify styling, `css-modules` is used.

### Multi-Select Default

```json
{
  "features": {
    "type": "multi-select",
    "values": ["auth", "testing", "i18n"],
    "default": ["testing"]
  }
}
```

**Effect**: If user doesn't specify features, `testing` is included by default.

### Empty Default

```json
{
  "features": {
    "type": "multi-select",
    "values": ["auth", "testing", "i18n"],
    "default": []
  }
}
```

**Effect**: No features included by default.

---

## Accessing Dimensions in Setup Scripts

Use `ctx.options.byDimension` and `tools.options` to work with dimensions.

### Reading Values

```javascript
// _setup.mjs
export default async function setup({ ctx, tools }) {
  // Single-select dimension
  const styling = ctx.options.byDimension.styling || 'css-modules';
  
  // Multi-select dimension
  const features = ctx.options.byDimension.features || [];
  
  console.log(`Styling: ${styling}`);
  console.log(`Features: ${features.join(', ')}`);
}
```

### Checking Values

```javascript
// _setup.mjs
export default async function setup({ ctx, tools }) {
  // Check if value is present (multi-select)
  if (tools.options.in('features', 'auth')) {
    // Setup authentication
  }
  
  // Check multiple values
  if (tools.options.in('features', 'auth') && 
      tools.options.in('features', 'testing')) {
    // Setup auth tests
  }
}
```

---

## Complete Example

Comprehensive dimension configuration:

```json
{
  "schemaVersion": "1.0.0",
  "metadata": {
    "name": "full-stack-template",
    "description": "Full-stack application template",
    "author": {
      "name": "Template Author",
      "email": "author@example.com"
    },
    "dimensions": {
      "frontend": {
        "description": "Frontend framework",
        "type": "single-select",
        "values": ["react", "vue", "svelte"],
        "default": "react"
      },
      "styling": {
        "description": "CSS framework",
        "type": "single-select",
        "values": ["tailwind", "styled-components", "css-modules"],
        "default": "css-modules"
      },
      "backend": {
        "description": "Backend framework",
        "type": "single-select",
        "values": ["express", "fastify", "hono"],
        "default": "express"
      },
      "database": {
        "description": "Database choice",
        "type": "single-select",
        "values": ["postgres", "mysql", "sqlite", "none"],
        "default": "none"
      },
      "features": {
        "description": "Optional features",
        "type": "multi-select",
        "values": ["auth", "testing", "i18n", "analytics", "logging"],
        "default": ["testing"],
        "requires": {
          "testing": ["auth"]
        }
      },
      "infrastructure": {
        "description": "Deployment target",
        "type": "single-select",
        "values": ["vercel", "cloudflare", "aws", "docker", "none"],
        "default": "none"
      }
    }
  }
}
```

**Usage:**
```bash
npm create @m5nv/scaffold my-app -- \
  --template full-stack \
  --options "frontend=react,styling=tailwind,backend=express,database=postgres,features=auth+testing+logging,infrastructure=vercel"
```

---

## Best Practices

1. **Provide Defaults**: Always include sensible default values
2. **Clear Descriptions**: Write helpful description fields
3. **Logical Grouping**: Group related options into dimensions
4. **Limit Choices**: Keep 3-7 values per dimension
5. **Test Combinations**: Verify all option combinations work
6. **Document Well**: Explain dimensions in template README
7. **Use Strict Policy**: Default to strict validation
8. **Consistent Naming**: Follow naming conventions
9. **Handle Missing**: Always check if dimension exists before using
10. **Idempotent Setup**: Ensure setup scripts work with any combination

---

## Migration Guide

If you have templates using older patterns, here's how to migrate:

### From Array to Dimensions

**Old:**
```json
{
  "setup": {
    "supportedOptions": ["typescript", "testing", "eslint"]
  }
}
```

**New (Schema V1.0):**
```json
{
  "metadata": {
    "dimensions": {
      "features": {
        "description": "Optional features",
        "type": "multi-select",
        "values": ["typescript", "testing", "eslint"],
        "default": []
      }
    }
  }
}
```

---

## Next Steps

- **[Creating Templates](../how-to/creating-templates.md)** - Template authoring guide
- **[Environment Reference](environment.md)** - Setup script API
- **[Setup Recipes](../how-to/setup-recipes.md)** - Common patterns
- **[CLI Reference](cli-reference.md)** - Command usage

---

## Related Documentation

- [Getting Started Tutorial](../tutorial/getting-started.md) - First project walkthrough
- [First Template Tutorial](../tutorial/first-template.md) - Hands-on examples
- [Author Workflow](../how-to/author-workflow.md) - Template development
