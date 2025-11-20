---
title: "make-template Tutorial"
description:
  "Learn to create templates using make-template, building a progressive modern
  stack from React SPA to full-stack Cloudflare applications"
type: tutorial
audience: "intermediate"
estimated_time: "30 minutes"
prerequisites:
  - "Node.js v22+ installed"
  - "Git installed and configured"
  - "Basic command line familiarity"
related_docs:
  - "../how-to/creating-templates.md"
  - "../reference/cli-reference.md"
  - "../tutorial/getting-started.md"
  - "../tutorial/create-scaffold.md"
  - "../how-to/author-workflow.md"
last_updated: "2025-11-12"
---

# `make-template` Tutorial

## What you'll learn

In this tutorial, you'll learn how to create three templates that demonstrate a
progressive modern stack for Cloudflare deployment. You'll start by learning the
make-template workflow using automated initialization and templatization while
creating your first template, then build up complexity from a simple React SPA
to a full-stack application with edge computing and databases.

## What you'll build

You'll create three templates that showcase a progressive modern stack for
Cloudflare deployment:

1. **Basic React SPA** - Modern frontend foundation with Vite + React (learn
   automated templatization workflow)
2. **SSR Portfolio App** - React Router v7 with SSR and direct D1 database
   access (auto-templatization demo)
3. **Full-Stack Portfolio** - Split architecture with API server (Workers + D1)
   and client app (auto-templatization demo)

Each template demonstrates different levels of complexity and Cloudflare
integration, building toward a complete portfolio management system.

## Prerequisites

Before starting this tutorial, make sure you have:

- **Node.js v22+** installed ([Download here](https://nodejs.org/))
  - Verify: `node --version` should show v22 or higher
- **Git** installed and configured
  ([Setup guide](https://git-scm.com/book/en/v2/Getting-Started-First-Time-Git-Setup))
  - Verify: `git --version` should show git version info
- **30 minutes** available
- **Basic command line familiarity** (navigating directories, running commands)
- **Completed the [getting-started tutorial](getting-started.md)**

## Step 1: Create Basic React SPA Template

Learn the make-template workflow by understanding what templates really are:
plain text files with placeholders. Nothing magical.

### Quick Setup

```bash
mkdir template-workshop && cd template-workshop
mkdir basic-react-spa && cd basic-react-spa
npm create vite@latest . -- --template react --no-interactive --immediate
```

You now have a working React app. Let's turn it into a template.

### Understanding Templates (Manual First)

Before using automation, let's see what templatization actually means. Open
`package.json` and look at the `name` field:

```json
{
  "name": "basic-react-spa",
  "version": "0.0.0"
}
```

To make this a template, you'd manually replace the specific value with a
placeholder:

```json
{
  "name": "⦃PROJECT_NAME⦄",
  "version": "0.0.0"
}
```

That's it. Templates are just files with `⦃PLACEHOLDERS⦄` instead of specific
values. When someone uses your template, those placeholders get replaced with
their values.

**Why unicode delimiters?** We use `⦃⦄` instead of `{{}}` because mustache
braces conflict with JSX syntax. This lets you keep your React app running even
while it's being templatized.

**Don't actually edit the file yet.** We're about to use automation, but now
you understand what's happening under the hood.

### Initialize Template Configuration

Now let's use the automation to do this for us:

```bash
npx make-template init
```

This creates:

- `template.json` - Template metadata and placeholder definitions
- `.templatize.json` - Configuration for what content to templatize

**What gets auto-detected:**

- Project name, author, and description from `package.json`
- Common placeholders like `⦃PROJECT_NAME⦄`, `⦃AUTHOR⦄`, etc.
- File patterns for different content types (JSX, JSON, Markdown, HTML)

### Review What Was Generated

Look at the generated `template.json`:

```bash
cat template.json
```

You'll see placeholder definitions like:

```json
{
  "placeholders": {
    "PROJECT_NAME": {
      "default": "basic-react-spa",
      "description": "Project name"
    }
  }
}
```

This tells the system: "Replace 'basic-react-spa' with `⦃PROJECT_NAME⦄`
everywhere it appears."

### Convert to Template

Now apply the transformations:

```bash
npx make-template convert . --yes
```

This creates `.template-undo.json` with reverse mappings and updates your files
with placeholders.

### See What Changed

Check `package.json` now:

```bash
grep "name" package.json
```

You should see `"name": "⦃PROJECT_NAME⦄"` - exactly what we described
manually earlier.

### Test the Template

Scaffold a new project to verify the placeholders work:

```bash
cd ..
npx create-scaffold new test-spa --template ./basic-react-spa --yes
cd test-spa
cat package.json | grep name
```

You should see `"name": "test-spa"` - the placeholder was replaced!

### Restore Original Project

Return to the template directory and undo the conversion:

```bash
cd ../basic-react-spa
npx make-template restore --yes
cat package.json | grep name
```

Back to `"name": "basic-react-spa"`. The `.template-undo.json` file stored the
original values.

### What You Learned

- **Templates are just text files** with `⦃PLACEHOLDERS⦄` replacing specific
  values
- **Unicode delimiters**: `⦃⦄` avoid JSX conflicts, keeping React apps runnable
  during templatization
- **Manual vs Automated**: You could edit files by hand, but `make-template`
  automates the detection and replacement
- **Bidirectional**: `convert` creates templates, `restore` undoes it
- **Nothing magical**: The tool just does find-and-replace based on rules you
  define

### Clean Up Test Scaffold

```bash
cd .. && rm -rf test-spa
cd basic-react-spa
```

## Step 2: Organize Placeholders by Feature

Now let's create a more sophisticated template to understand composability.
We'll build a lawn-mowing SaaS service with distinct features.

### Setup Project

```bash
cd ..
mkdir lawnmow-saas && cd lawnmow-saas
npm create vite@latest . -- --template react --no-interactive --immediate
npm install
```

### Add Feature-Specific Code

Create files for different features:

**src/features/scheduling/ScheduleView.jsx:**

```jsx
export default function ScheduleView() {
  return (
    <div>
      <h2>LawnMow Pro - Scheduling</h2>
      <p>Book your next mowing appointment</p>
      <img src="/images/calendar-icon.png" alt="Calendar icon" />
      <img src="/images/clock-icon.png" alt="Clock icon" />
      <a href="mailto:support@lawnmow.io">Contact Support</a>
    </div>
  );
}
```

**src/features/payments/BillingView.jsx:**

```jsx
export default function BillingView() {
  return (
    <div>
      <h2>LawnMow Pro - Billing</h2>
      <p>Manage your subscription</p>
      <img src="/images/payment-icon.png" alt="Payment icon" />
      <img src="/images/card-icon.png" alt="Credit card icon" />
      <a href="mailto:billing@lawnmow.io">Billing Support</a>
    </div>
  );
}
```

**src/features/customers/CustomerList.jsx:**

```jsx
export default function CustomerList() {
  return (
    <div>
      <h2>LawnMow Pro - Customers</h2>
      <p>Manage your customer base</p>
      <img src="/images/users-icon.png" alt="Users icon" />
      <img src="/images/chart-icon.png" alt="Analytics chart icon" />
      <a href="mailto:hello@lawnmow.io">Get Help</a>
    </div>
  );
}
```

### Create Feature-Organized Configuration

Now create `.templatize.json` manually to organize placeholders by feature.

**About `.templatize.json`**: This configuration file tells the system **what** to templatize and **where** to find it. It uses:
- **`rules`**: Maps file patterns (like `"package.json"` or `"src/**/*.jsx"`) to extraction rules
- **`context`**: MIME-type format (`text/jsx`, `text/html#attribute`, `application/json`) that determines how to extract values
- **`selector`**: CSS selectors for HTML/JSX, JSONPath for JSON
- **`placeholder`**: The name to use in the template (e.g., `PROJECT_NAME`)
- **`allowMultiple`**: Whether to auto-number multiple matches (`_0`, `_1`, etc.)

For complete details on pattern types, selectors, and advanced configuration, see the [Templatization Patterns Reference](../reference/templatization-patterns.md).

```json
{
  "version": "1.0",
  "autoDetect": true,
  "rules": {
    "package.json": [
      {
        "context": "application/json",
        "path": "$.name",
        "placeholder": "PROJECT_NAME"
      }
    ],
    "src/features/scheduling/*.jsx": [
      {
        "context": "text/jsx",
        "selector": "h2",
        "placeholder": "SCHEDULING_APP_NAME"
      },
      {
        "context": "text/jsx#attribute",
        "selector": "img[src]",
        "placeholder": "SCHEDULING_ICON_SRC",
        "allowMultiple": true
      },
      {
        "context": "text/jsx#attribute",
        "selector": "img[alt]",
        "placeholder": "SCHEDULING_ICON_ALT",
        "allowMultiple": true
      },
      {
        "context": "text/jsx#attribute",
        "selector": "a[href^='mailto']",
        "placeholder": "SCHEDULING_SUPPORT_EMAIL"
      }
    ],
    "src/features/payments/*.jsx": [
      {
        "context": "text/jsx",
        "selector": "h2",
        "placeholder": "PAYMENTS_APP_NAME"
      },
      {
        "context": "text/jsx#attribute",
        "selector": "img[src]",
        "placeholder": "PAYMENTS_ICON_SRC",
        "allowMultiple": true
      },
      {
        "context": "text/jsx#attribute",
        "selector": "img[alt]",
        "placeholder": "PAYMENTS_ICON_ALT",
        "allowMultiple": true
      },
      {
        "context": "text/jsx#attribute",
        "selector": "a[href^='mailto']",
        "placeholder": "PAYMENTS_SUPPORT_EMAIL"
      }
    ],
    "src/features/customers/*.jsx": [
      {
        "context": "text/jsx",
        "selector": "h2",
        "placeholder": "CUSTOMERS_APP_NAME"
      },
      {
        "context": "text/jsx#attribute",
        "selector": "img[src]",
        "placeholder": "CUSTOMERS_ICON_SRC",
        "allowMultiple": true
      },
      {
        "context": "text/jsx#attribute",
        "selector": "img[alt]",
        "placeholder": "CUSTOMERS_ICON_ALT",
        "allowMultiple": true
      },
      {
        "context": "text/jsx#attribute",
        "selector": "a[href^='mailto']",
        "placeholder": "CUSTOMERS_SUPPORT_EMAIL"
      }
    ]
  }
}
```

**Key feature demonstrated: `allowMultiple`**

This answers the critical question: **"What if I have multiple images/links each
needing different values?"**

The `allowMultiple: true` flag tells the system to number multiple matches
automatically:

- First `img src` → `⦃SCHEDULING_ICON_SRC_0⦄`
- Second `img src` → `⦃SCHEDULING_ICON_SRC_1⦄`
- First `img alt` → `⦃SCHEDULING_ICON_ALT_0⦄`
- Second `img alt` → `⦃SCHEDULING_ICON_ALT_1⦄`

You write ONE rule, the system handles multiple instances. No tedious
repetition.

### Review and Enhance Generated Placeholders

The system auto-generates `template.json` with entries for all detected placeholders (including `_0`, `_1` suffixes from `allowMultiple`). Enhance the descriptions to help template users:

```json
{
  "schemaVersion": "1.0.0",
  "id": "yourname/lawnmow-saas",
  "name": "LawnMow SaaS Template",
  "description": "Multi-feature SaaS template with organized placeholders",
  "placeholders": {
    "PROJECT_NAME": {
      "default": "my-lawnmow-service",
      "description": "Overall project name"
    },
    "SCHEDULING_APP_NAME": {
      "default": "MyMow Pro",
      "description": "Brand name shown in scheduling feature"
    },
    "SCHEDULING_ICON_SRC_0": {
      "default": "/images/calendar-icon.png",
      "description": "First icon in scheduling feature"
    },
    "SCHEDULING_ICON_SRC_1": {
      "default": "/images/clock-icon.png",
      "description": "Second icon in scheduling feature"
    },
    "SCHEDULING_ICON_ALT_0": {
      "default": "Calendar icon",
      "description": "Alt text for first scheduling icon"
    },
    "SCHEDULING_ICON_ALT_1": {
      "default": "Clock icon",
      "description": "Alt text for second scheduling icon"
    },
    "SCHEDULING_SUPPORT_EMAIL": {
      "default": "mailto:support@mymow.io",
      "description": "Support email for scheduling"
    },
    "PAYMENTS_APP_NAME": {
      "default": "MyMow Pro",
      "description": "Brand name shown in billing feature"
    },
    "PAYMENTS_ICON_SRC_0": {
      "default": "/images/payment-icon.png",
      "description": "First icon in payments feature"
    },
    "PAYMENTS_ICON_SRC_1": {
      "default": "/images/card-icon.png",
      "description": "Second icon in payments feature"
    },
    "PAYMENTS_ICON_ALT_0": {
      "default": "Payment icon",
      "description": "Alt text for first payment icon"
    },
    "PAYMENTS_ICON_ALT_1": {
      "default": "Credit card icon",
      "description": "Alt text for second payment icon"
    },
    "PAYMENTS_SUPPORT_EMAIL": {
      "default": "mailto:billing@mymow.io",
      "description": "Billing support email"
    },
    "CUSTOMERS_APP_NAME": {
      "default": "MyMow Pro",
      "description": "Brand name shown in customer management"
    },
    "CUSTOMERS_ICON_SRC_0": {
      "default": "/images/users-icon.png",
      "description": "First icon in customers feature"
    },
    "CUSTOMERS_ICON_SRC_1": {
      "default": "/images/chart-icon.png",
      "description": "Second icon in customers feature"
    },
    "CUSTOMERS_ICON_ALT_0": {
      "default": "Users icon",
      "description": "Alt text for first customers icon"
    },
    "CUSTOMERS_ICON_ALT_1": {
      "default": "Analytics chart icon",
      "description": "Alt text for second customers icon"
    },
    "CUSTOMERS_SUPPORT_EMAIL": {
      "default": "mailto:hello@mymow.io",
      "description": "General support email"
    }
  }
}
```

Notice the `_0` and `_1` suffixes? The system automatically numbered the
placeholders because `allowMultiple: true` was set.

### Convert and Inspect

```bash
npx make-template convert . --yes
```

Now look at one of the feature files:

```bash
cat src/features/scheduling/ScheduleView.jsx
```

You should see:

```jsx
<h2>⦃SCHEDULING_APP_NAME⦄ - Scheduling</h2>
<img src="⦃SCHEDULING_ICON_SRC_0⦄" alt="⦃SCHEDULING_ICON_ALT_0⦄" />
<img src="⦃SCHEDULING_ICON_SRC_1⦄" alt="⦃SCHEDULING_ICON_ALT_1⦄" />
<a href="⦃SCHEDULING_SUPPORT_EMAIL⦄">Contact Support</a>
```

Each feature has its own namespaced placeholders. Notice:

- **Auto-numbered placeholders**: `_0`, `_1` suffixes for multiple images
- **One rule, multiple matches**: You wrote ONE `img[src]` rule, the system
  handled two images
- **Feature isolation**: Each feature's icons are independent
  (`SCHEDULING_ICON_SRC_0` vs `PAYMENTS_ICON_SRC_0`)

### Understanding Placeholder-to-Feature Mapping

Look at the generated `template.json`:

```bash
cat template.json
```

The placeholder names tell you which feature they belong to:

```json
{
  "placeholders": {
    "SCHEDULING_APP_NAME": { ... },         // ← SCHEDULING_ prefix = scheduling feature
    "SCHEDULING_ICON_SRC_0": { ... },       // ← _0 = first image
    "SCHEDULING_ICON_SRC_1": { ... },       // ← _1 = second image
    "SCHEDULING_ICON_ALT_0": { ... },       // ← _0 = first image alt text
    "SCHEDULING_ICON_ALT_1": { ... },       // ← _1 = second image alt text
    "PAYMENTS_APP_NAME": { ... },           // ← PAYMENTS_ prefix = payments feature
    "PAYMENTS_ICON_SRC_0": { ... },         // ← _0 = first image
    "PAYMENTS_ICON_SRC_1": { ... }          // ← _1 = second image
    // ... similar pattern for CUSTOMERS_
  }
}
```

The naming convention creates a clear hierarchy:

- **Feature prefix**: `SCHEDULING_`, `PAYMENTS_` isolates features
- **Entity type**: `ICON_SRC`, `ICON_ALT` describes what it is
- **Auto-numbering**: `_0`, `_1` handles multiple instances

Users immediately understand: "This template has multiple icons per feature, and
I can customize each one independently."

### Why This Matters

This example answers a key template author question: **"What if I have multiple
images/links each needing different values?"**

The answer: **`allowMultiple: true`**

Without this feature, you'd need to:

1. Write separate rules for each image (`img:nth-child(1)`, `img:nth-child(2)`)
2. Create unique placeholders manually (`ICON_PATH_1`, `ICON_PATH_2`)
3. Repeat this for every feature

With `allowMultiple`, you write:

```json
{
  "context": "text/jsx#attribute",
  "selector": "img[src]",
  "placeholder": "SCHEDULING_ICON_SRC",
  "allowMultiple": true
}
```

The system automatically:

- Finds all matching images
- Numbers them sequentially (`_0`, `_1`, `_2`...)
- Creates placeholders in `template.json`

This is the difference between writing 3 rules vs 30 rules for a complex
template.

### What You Learned

- **`allowMultiple: true`**: Write one rule, handle multiple instances
  automatically
- **Auto-numbering**: System adds `_0`, `_1` suffixes to duplicate matches
- **Feature organization**: Group placeholders by functional area with prefixes
- **CSS selectors**: Target elements precisely (`img`, `a[href^='mailto']`)
- **Scalability**: Configuration stays simple even with many similar elements
- **Manual configuration**: Complex structures need explicit `.templatize.json`
  rules

### Clean Up

```bash
cd ..
```

## Step 3: Advanced - Cloudflare Portfolio with Auto-Detection

Now apply what you learned to a real-world Cloudflare application.

### Create SSR App with D1 Database

```bash
mkdir portfolio-app && cd portfolio-app
npm create react-router@latest . -- --template cloudflare --yes
npm install @m5nv/stl
```

### Add Database Configuration

Edit `wrangler.toml` to add D1 configuration:

```toml
name = "my-portfolio-app"
compatibility_date = "2024-01-01"
account_id = "abc123def456"

[[d1_databases]]
binding = "DB"
database_name = "portfolio_db"
database_id = "xyz789abc123"
```

### Create Database Schema

**app/db/schema.sql:**

```sql
CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT
);

INSERT INTO projects (title, description, url) VALUES
  ('My Portfolio Site', 'Personal portfolio built with React', 'https://mysite.dev');
```

### Convert with Auto-Detection

```bash
npx make-template init
npx make-template convert . --yes
```

The auto-detection will find:

- `{{PROJECT_NAME}}` from package.json and wrangler.toml
- `{{CLOUDFLARE_ACCOUNT_ID}}` from wrangler.toml
- `{{D1_DATABASE_BINDING}}` from wrangler.toml
- `{{D1_DATABASE_NAME}}` from wrangler.toml
- `{{D1_DATABASE_ID}}` from wrangler.toml

### Verify Cloudflare-Specific Placeholders

```bash
cat wrangler.toml
```

You should see:

```toml
name = "⦃PROJECT_NAME⦄"
account_id = "⦃CLOUDFLARE_ACCOUNT_ID⦄"

[[d1_databases]]
binding = "⦃D1_DATABASE_BINDING⦄"
database_name = "⦃D1_DATABASE_NAME⦄"
database_id = "⦃D1_DATABASE_ID⦄"
```

### What You Learned

- **Context-aware detection**: make-template recognizes Cloudflare-specific
  configuration patterns
- **Cross-file consistency**: The same placeholder can appear in multiple files
  (package.json, wrangler.toml)
- **Platform patterns**: Different project types have different placeholder
  patterns

### Clean Up

```bash
cd ..
```

## What You Accomplished

You created three templates demonstrating progressive learning:

1. **Basic React SPA** - Learned templates are just files with placeholders;
   manual → automated workflow
2. **LawnMow SaaS** - Organized placeholders by feature; understood
   composability and namespacing
3. **Cloudflare Portfolio** - Applied learning to real-world platform with
   context-aware detection

Key insights:

- **No magic**: Templates are text files with `⦃PLACEHOLDERS⦄`
- **Unicode delimiters**: Keep your app running during templatization by avoiding
  JSX conflicts
- **Automation helps**: `make-template` automates detection and replacement
- **Organization matters**: Feature-based placeholder namespacing enables
  composability
- **Context-aware**: Different platforms need different placeholder patterns

## Next Steps

- **[Create Scaffold Tutorial](create-scaffold.md)** - Use these templates to
  scaffold new projects
- [Template Validation](../reference/cli-reference.md#make-template-commands) -
  Ensure template quality

## Template Locations

Your templates are ready in `template-workshop/`:

- `basic-react-spa/` - React SPA with basic templatization
- `lawnmow-saas/` - Feature-organized composable template
- `portfolio-app/` - Cloudflare SSR with D1 database

## Troubleshooting

**"Nothing was replaced"**: Check that your `.templatize.json` rules match your
file structure. Remember, you can always edit files manually with
`⦃PLACEHOLDERS⦄` first to understand what should happen.

**Init fails:** Ensure you're in a Node.js project directory with package.json

**Conversion fails:** Run `npm install` first, ensure .templatize.json exists
(run `make-template init` if missing)

**Placeholders not detected:** Review `.templatize.json` rules and adjust
patterns to match your file structure

**Restore fails:** Ensure `.template-undo.json` exists from a previous
conversion
