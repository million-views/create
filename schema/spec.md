# Template Schema V1.0 Specification

**Version:** 1.0.0  
**Status:** Draft (Pre-Release)  
**Target:** Tooling Authors & UI Developers

## Core Architecture: The Registry Model

The V1.0 schema decouples Variable Definition from Variable Usage. This solves
the "Configuration Explosion" problem where input fields are duplicated across
multiple features.

### The Registry (placeholders)

The single source of truth for all user inputs. It defines the "Shape" of the
data (Label, Type, Description, Validation) but not the "Context" of when it is
needed.

- **Origin:** Populated automatically by the `create template` CLI tool by scanning
  source code for tokens (e.g., `{{STRIPE_KEY}}`).
- **Structure:** Flat key-value map.
- **Types:** text, number, boolean, email, password, url.

### The References (dimensions & hints)

These sections define the "Logic" of the template. They do not define new
inputs; they only claim keys from the Registry.

- **Dimensions (Infrastructure):** Mutually exclusive stack choices (e.g.,
  Deployment, Database).
  - **Example:** Selecting "Cloudflare" claims CLOUDFLARE_ACCOUNT_ID.
- **Hints (Features):** Additive functional modules (e.g., Billing, Blog).
  - **Example:** Selecting "Billing" claims STRIPE_SECRET_KEY.

### Aside: Disambiguating "Placeholders"

The term "placeholder" appears in two distinct contexts within the schema. It is
crucial to distinguish them:

1. **The Definition (Root Level):**

- **Location:** template.placeholders
- **Role:** The Dictionary. It defines WHAT the variable is (Type, Label,
  Description, Default Value).
- **Analogy:** Defining a column in a database schema.

2. **The Reference (Nested Level):**

- **Location:** dimensions...placeholders or hints...placeholders
- **Role:** The Dependency. It defines WHEN the variable is active. It is
  strictly a list of strings (keys) pointing back to the Dictionary.
- **Analogy:** Selecting which columns to display in a specific report.

**Key Rule:** A key string appearing in a Reference list (Nested) MUST
correspond to a key defined in the Definition object (Root).

## Consumption Protocol (The "Engine")

Any configurator (GUI or TUI) consuming this schema must implement the following
5-Step State Machine.

### Step 1: Stack Selection (Infrastructure)

**Input:** template.dimensions `->` **Action:** Render selection controls based
on display.variant.

- **card-grid:** Large, clickable cards with icons (Good for Deployment).
- **list-selection:** Compact list with radio/checkbox behavior (Good for
  DB/Auth).
- **dropdown:** Standard select (Good for Regions/Versions).

### Step 2: Feature Composition (Intent)

**Input:** template.hints `->` **Action:** Render a multi-select grid.

- These are "Capabilities." Selecting a hint is a declaration of intent.
- **Logic:** When a hint is selected, read its needs object (e.g.,
  `{ "database": "required" }`).

### Step 3: Constraint Resolution (The Solver)

**Input:** User Selections + template.gates + Feature needs `->` **Action:**

- **Apply Gates:** If Deployment = Cloudflare, disable Database = Mongo (via
  gates lookup).
- **Apply Needs:** If Features includes "User Profiles" (which needs DB), but
  Database = None, force the UI to auto-select a valid Database or show a
  validation error.
- **Goal:** Prevent invalid infrastructure states before configuration begins.

### Step 4: Configuration Aggregation (The Form)

**Input:** Active Dimensions + Active Features `->` **Action:**

- **Collect Keys:** Iterate through all selected items, merging their
  placeholders arrays into a Set<String>.
  - Deployment(Cloudflare) -> adds ["CLOUDFLARE_API_TOKEN"]
  - Feature(Billing) -> adds ["STRIPE_KEY"]
- **Render Form:** For each key in the Set, look up the definition in the
  Registry (template.placeholders) and render the appropriate input component.
- **Grouping Strategy:**
  - **Global:** Keys appearing in package.json (e.g., PACKAGE_NAME).
  - **Infrastructure:** Keys derived from dimensions.
  - **Content:** Keys derived from hints.

### Step 5: Output Generation

**Input:** Form State `->` **Action:** Generate selection.json.

- **Validation:** Ensure all required: true placeholders in the active set have
  values.
- **Serialization:** Output the strictly typed JSON payload.

## 3. Artifact Definition: selection.json

The selection.json file is the formal output of the configuration process. It
acts as a portable "receipt" that captures a user's intent in a schema-compliant
format suitable for automated consumption.

### 3.1 Structure Definition

The selection manifest enforces strict typing to ensure reproducibility.

| Property      | Type   | Description                                                                                                                                                                                                 |
| ------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| schemaVersion | string | Required. Must match the version of the Template Schema used (e.g., 1.0.0).                                                                                                                                 |
| templateId    | string | Required. The ID of the template this selection validates against (e.g., acme/remix-v2).                                                                                                                    |
| timestamp     | string | ISO 8601 timestamp of creation. Useful for audit logs.                                                                                                                                                      |
| choices       | object | The Stack. A map where keys correspond to dimensions in the template. Values are the selected Option IDs.<br>• Single Select: `"database": "postgres"`<br>• Multi Select: `"features": ["auth", "billing"]` |
| placeholders  | object | The Configuration. A map where keys correspond to the placeholders registry in the template. Values are the user's input.<br>• Example: `"PACKAGE_NAME": "my-app"`                                          |

### 3.2 Example Artifact

```json
{
  "schemaVersion": "1.0.0",
  "templateId": "author/template-name",
  "timestamp": "2023-11-20T14:00:00Z",
  "choices": {
    "deployment": "cloudflare-workers",
    "database": "d1",
    "features": ["auth", "billing"]
  },
  "placeholders": {
    "PACKAGE_NAME": "my-app",
    "CLOUDFLARE_API_TOKEN": "sk_...",
    "STRIPE_KEY": "sk_test_..."
  }
}
```

### 3.3 CLI Consumption

The CLI uses this file to execute the scaffold without prompts:

```bash
create scaffold new my-app --selection ./selection.json
```

Internally, this maps to:

- Dimensions (choices) determine which files are copied/deleted.
- Placeholders (placeholders) are fed into the template engine to replace tokens
  in the copied files.

## 4. UI/UX Guidelines

### For Web GUI (React/Vue)

- **Progressive Disclosure:** Hide Step 4 (Config) until Steps 1-3
  (Stack/Features) are valid.
- **Visual Feedback:** When a Feature is selected, highlight the Infrastructure
  it "Requires" (e.g., selecting "Auth" lights up the "Database" section).
- **Icons:** Use the icon string from schema to render Lucide/Heroicons
  dynamically.

### For TUI (CLI Wizard)

**Linear Flow:**

- Select Deployment? [List]
- Select Features? [Multi-Select]
- Select Database? [List] (Filter options based on Deployment)
- Configure Variables: (Loop through the aggregated Set of placeholders).
- Context: Show the description of the placeholder as help text below the
  prompt.

## 5. Extensibility Guide

This schema employs a Meta-Model Architecture. It separates the Grammar (the
rules of structure) from the Vocabulary (the specific technologies). This design
allows for significant future expansion without requiring version bumps to the
schema or updates to the consuming CLI tools.

### 5.1 Adding New Dimensions (e.g., "CI/CD Provider")

Because the schema uses patternProperties for the dimensions object, template
authors can introduce entirely new categories of infrastructure choices without
waiting for a schema update.

**Scenario:** Adding a choice between GitHub Actions and GitLab CI.

**Action:** The author simply adds a new key (e.g., ci_cd) to the dimensions
object in template.json.

**Result:**

- **Validator:** Passes (matches `^[a-z_]+$`).
- **GUI:** Automatically renders a new selection card labeled "CI/CD Provider".
- **CLI:** Captures the selection in choices.ci_cd.

### 5.2 Expanding Options (e.g., New Database Types)

The schema validates the structure of an option, not the content.

**Scenario:** Cloudflare releases "Hyperdrive".

**Action:** The author adds
`{ "id": "hyperdrive", "placeholders": ["HYPERDRIVE_ID"] }` to the existing
database dimension options.

**Result:** The option immediately appears in the UI. The dependency on
HYPERDRIVE_ID is automatically enforced via the registry lookup.

### 5.3 The "Unknown Unknowns" Safety Net

The placeholders registry supports primitive types (string, number, boolean,
secure). This allows the capture of configuration variables for technologies
that do not yet exist.

**Example:** If a future feature requires a complex 3-part key, it can be
modeled as three separate string inputs in the registry immediately. No schema
change is required to support new types of configuration parameters as long as
they can be represented as primitives.

## 6. Appendix: Complete Examples

The following examples demonstrate the data structure for the "LawnMow SaaS"
application discussed in the documentation.

### 6.1 Template Manifest (template.json)

This file is defined by the template author. It acts as the "Menu".

```json
{
  "schemaVersion": "1.0.0",
  "id": "acme/lawnmow-saas",
  "name": "LawnMow SaaS",
  "description": "A production-ready stack for service businesses.",

  "placeholders": {
    "PACKAGE_NAME": {
      "description": "Project name",
      "default": "my-app",
      "required": true
    },
    "CLOUDFLARE_ID": {
      "description": "Cloudflare Account ID",
      "required": true
    },
    "D1_ID": { "description": "D1 Database UUID", "required": true },
    "STRIPE_KEY": {
      "description": "Stripe Secret Key",
      "secure": true,
      "required": true
    },
    "CONTACT_EMAIL": {
      "description": "Support email",
      "type": "email",
      "required": true
    }
  },

  "dimensions": {
    "deployment": {
      "label": "Deployment Target",
      "display": { "variant": "card-grid", "icon": "globe" },
      "options": [
        {
          "id": "cloudflare-workers",
          "label": "Cloudflare Workers",
          "placeholders": ["CLOUDFLARE_ID"]
        },
        { "id": "deno-deploy", "label": "Deno Deploy" },
        { "id": "linode", "label": "Akamai Linode" },
        { "id": "do-droplet", "label": "DigitalOcean Droplet" }
      ],
      "default": "cloudflare-workers"
    },
    "database": {
      "label": "Database",
      "display": { "variant": "list-selection", "icon": "database" },
      "options": [
        { "id": "d1", "label": "Cloudflare D1", "placeholders": ["D1_ID"] },
        { "id": "sqlite", "label": "Local SQLite" },
        { "id": "none", "label": "No Database" }
      ]
    }
  },

  "hints": [
    {
      "id": "marketing_site",
      "label": "Marketing Website",
      "icon": "globe",
      "needs": { "database": "none" },
      "placeholders": ["CONTACT_EMAIL"]
    },
    {
      "id": "billing",
      "label": "SaaS Billing",
      "icon": "credit-card",
      "needs": { "database": "required" },
      "placeholders": ["STRIPE_KEY"]
    }
  ],

  "gates": {
    "deployment": {
      "cloudflare-workers": { "database": ["d1", "none"] },
      "deno-deploy": { "database": ["sqlite", "none"] },
      "linode": { "database": ["sqlite", "postgres", "none"] },
      "do-droplet": { "database": ["sqlite", "postgres", "none"] }
    }
  }
}
```

### 6.2 Selection Receipt (selection.json)

This file is generated by the Product-Mix UI. It acts as the "Order Ticket".

```json
{
  "schemaVersion": "1.0.0",
  "templateId": "acme/lawnmow-saas",
  "timestamp": "2023-11-20T10:30:00Z",
  "choices": {
    "deployment": "cloudflare-workers",
    "database": "d1",
    "features": ["marketing_site", "billing"]
  },
  "placeholders": {
    "PACKAGE_NAME": "green-care-pro",
    "CLOUDFLARE_ID": "a1b2c3d4",
    "D1_ID": "db-uuid-123",
    "STRIPE_KEY": "sk_live_xyz",
    "CONTACT_EMAIL": "hello@greencare.com"
  }
}
```
