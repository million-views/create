---
title: "make-template Tutorial"
description:
  "Learn to create templates using make-template, building a complete web presence for a lawn care service—from basic React SPA to marketing website and digital transformation app"
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
last_updated: "2025-11-19"
---

# `make-template` Tutorial

## What you'll learn

In this tutorial, you'll learn how to create templates for a complete web presence by building both a marketing website and a digital transformation application for a lawn care service. You'll start by learning the make-template workflow using automated initialization and templatization (including the `restore` feature to undo conversions), then build a marketing website template with contact forms and business information, and finally create a customer-facing app template for scheduling services and payments. This approach teaches you to create templates that help service businesses establish their online presence and digitize their operations.

**Important**: This tutorial focuses on **template authoring**—how to turn existing projects into reusable templates. We provide simplified code examples to demonstrate the templatization process, but we don't cover building complete production applications. The goal is to learn the make-template tool, not full-stack web development.

## What you'll build

You'll learn template authoring by building two templates that showcase a complete web presence for service businesses:

**LawnMow Web** - Marketing website with contact forms, location/hours information, service descriptions, and testimonials (learn `allowMultiple`, HTML form handling, manual configuration)

**LawnMow App** - Customer-facing digital transformation product with scheduling, payments, and service management (learn platform-specific patterns with Cloudflare Workers + D1 database)

These templates demonstrate the two pillars of service business web presence: marketing (attract customers) and operations (serve customers), enabling you to create white-label software for lawn care, cleaning, plumbing, or consulting businesses.

Along the way, you'll use a basic React SPA to learn the core workflow including automated initialization and the `restore` feature for non-destructive iteration.

## Prerequisites

**Required:** Completed the [getting-started tutorial](getting-started.md) (verifies Node.js v22+, Git, and CLI tools are working).

## Learn the Workflow: Basic React SPA

Learn the make-template workflow by understanding what templates really are: plain text files with placeholders. Nothing magical. We'll use a basic React SPA to demonstrate the core concepts including the `restore` feature—how to undo a conversion when you want your template files back to their original state.

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
  "name": "⦃PACKAGE_NAME⦄",
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

This creates two configuration files:

- **`.templatize.json`** - Defines extraction rules (what to replace with
  placeholders)
- **`template.json`** - Defines placeholder metadata (what default values to use
  when scaffolding)

**What gets auto-detected:**

- Project name, author, and description from `package.json`
- Common placeholders like `⦃PACKAGE_NAME⦄`, `⦃AUTHOR⦄`, etc.
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
    "PACKAGE_NAME": {
      "default": "basic-react-spa",
      "description": "Project name"
    }
  }
}
```

This tells the system: "When someone uses this template, `⦃PACKAGE_NAME⦄` should
default to 'basic-react-spa' if they don't provide a value."

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

You should see `"name": "⦃PACKAGE_NAME⦄"` - exactly what we described
manually earlier.

### Test the Template

Before scaffolding manually, you can use the built-in test command to validate your template:

```bash
# Test template functionality
npx make-template test .

# Test with detailed output
npx make-template test . --verbose
```

**What the test command does:**
- Creates a temporary project from your template
- Validates `template.json` structure and metadata
- Tests placeholder resolution
- Verifies setup scripts execute correctly (if present)
- Cleans up temporary files automatically

**Example test output:**

```console
✓ Template validation passed
✓ Created temporary project
✓ Placeholder resolution successful
✓ Template structure valid

All tests passed!
```

Now let's manually scaffold a project to see the template in action:

```bash
cd ..
npx create-scaffold new test-spa --template ./basic-react-spa --yes
cd test-spa
cat package.json | grep name
```

You should see `"name": "basic-react-spa"` - the placeholder was replaced!

### Restore Original Project (Key Feature)

This is an important feature: **templates are reversible**. Let's undo the conversion:

```bash
cd ../basic-react-spa
npx make-template restore --yes
cat package.json | grep name
```

Back to `"name": "basic-react-spa"`. The `.template-undo.json` file stored the original values.

**Why this matters**: You can iterate on your templates—convert to test, restore to continue development, convert again. This makes template authoring non-destructive and safe.

### What You Learned

- **Templates are just text files** with `⦃PLACEHOLDERS⦄` replacing specific values
- **Unicode delimiters**: `⦃⦄` avoid JSX conflicts, keeping React apps runnable during templatization
- **Manual vs Automated**: You could edit files by hand, but `make-template` automates the detection and replacement
- **Bidirectional workflow (KEY)**: `convert` creates templates, `restore` undoes it—template authoring is non-destructive
- **Safe iteration**: Convert → test → restore → develop → convert again
- **Nothing magical**: The tool just does find-and-replace based on rules you define

### Clean Up Test Scaffold

```bash
cd .. && rm -rf test-spa
cd basic-react-spa
```

## Build Template 1: Marketing Website (LawnMow Web)

Now let's build our first production template: a marketing website for a lawn care service. This template focuses on attracting customers with contact forms, service descriptions, location/hours, and testimonials. This demonstrates how to organize public-facing business information into templatizable components, including the `allowMultiple` feature for handling multiple service offerings, contact methods, and testimonials.

### Setup Project

```bash
cd ..
mkdir lawnmow-web && cd lawnmow-web
npm create vite@latest . -- --template react --no-interactive --immediate
npm install
```

### Add Marketing Website Content

Create files for a marketing website showcasing the lawn care service:

**src/components/Hero.jsx:**

```jsx
export default function Hero() {
  return (
    <section>
      <h1>LawnMow Pro - Professional Lawn Care</h1>
      <p>Serving Springfield and surrounding areas since 2020</p>
      <img src="/images/lawn-mower.jpg" alt="Professional lawn mowing service" />
      <img src="/images/green-lawn.jpg" alt="Beautifully maintained lawn" />
    </section>
  );
}
```

**src/components/Contact.jsx:**

```jsx
export default function Contact() {
  return (
    <section>
      <h2>Contact Us</h2>
      <form action="/submit" method="POST">
        <input type="text" name="name" placeholder="Your Name" />
        <input type="email" name="email" placeholder="your@email.com" />
        <textarea name="message" placeholder="Tell us about your lawn care needs"></textarea>
        <button type="submit">Request Quote</button>
      </form>
      <div>
        <p>Phone: (555) 123-4567</p>
        <p>Email: <a href="mailto:hello@lawnmow.io">hello@lawnmow.io</a></p>
        <p>Address: 123 Main Street, Springfield, MA 01101</p>
      </div>
    </section>
  );
}
```

**src/components/Testimonials.jsx:**

```jsx
export default function Testimonials() {
  return (
    <section>
      <h2>What Our Customers Say</h2>
      <blockquote>
        <p>"Best lawn care service in Springfield!"</p>
        <cite>- John Smith</cite>
      </blockquote>
      <blockquote>
        <p>"Always on time and professional."</p>
        <cite>- Sarah Johnson</cite>
      </blockquote>
      <blockquote>
        <p>"My lawn has never looked better!"</p>
        <cite>- Mike Davis</cite>
      </blockquote>
    </section>
  );
}
```

### Create Manual Configuration for Marketing Content

Marketing websites need structured configuration. Let's create configuration files:

```bash
npx make-template init
```

This creates `.templatize.json` and `template.json` files. Now edit `.templatize.json` to organize placeholders for marketing content:

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
    "src/components/Hero.jsx": [
      {
        "context": "text/jsx",
        "selector": "h1",
        "placeholder": "BUSINESS_NAME"
      },
      {
        "context": "text/jsx",
        "selector": "p",
        "placeholder": "BUSINESS_TAGLINE"
      },
      {
        "context": "text/jsx#attribute",
        "selector": "img[src]",
        "placeholder": "HERO_IMAGE_SRC",
        "allowMultiple": true
      },
      {
        "context": "text/jsx#attribute",
        "selector": "img[alt]",
        "placeholder": "HERO_IMAGE_ALT",
        "allowMultiple": true
      }
    ],
    "src/components/Contact.jsx": [
      {
        "context": "text/jsx#attribute",
        "selector": "form[action]",
        "placeholder": "CONTACT_FORM_ACTION"
      },
      {
        "context": "text/jsx#attribute",
        "selector": "input[name='name']",
        "placeholder": "CONTACT_NAME_PLACEHOLDER",
        "attributeName": "placeholder"
      },
      {
        "context": "text/jsx#attribute",
        "selector": "input[name='email']",
        "placeholder": "CONTACT_EMAIL_PLACEHOLDER",
        "attributeName": "placeholder"
      },
      {
        "context": "text/jsx#attribute",
        "selector": "textarea[name='message']",
        "placeholder": "CONTACT_MESSAGE_PLACEHOLDER",
        "attributeName": "placeholder"
      },
      {
        "context": "text/jsx",
        "selector": "div > p:not(:has(a))",
        "placeholder": "CONTACT_INFO",
        "allowMultiple": true
      },
      {
        "context": "text/jsx#attribute",
        "selector": "a[href^='mailto']",
        "placeholder": "CONTACT_EMAIL_HREF"
      },
      {
        "context": "text/jsx",
        "selector": "a[href^='mailto']",
        "placeholder": "CONTACT_EMAIL_TEXT"
      }
    ],
    "src/components/Testimonials.jsx": [
      {
        "context": "text/jsx",
        "selector": "blockquote p",
        "placeholder": "TESTIMONIAL_QUOTE",
        "allowMultiple": true
      },
      {
        "context": "text/jsx",
        "selector": "cite",
        "placeholder": "TESTIMONIAL_AUTHOR",
        "allowMultiple": true
      }
    ]
  }
}
```

**Key features demonstrated:**

**1. `allowMultiple` for repeated elements**

This answers the critical question: **"What if I have multiple hero images or testimonials each needing different values?"**

The `allowMultiple: true` flag tells the system to number multiple matches automatically:

- First hero image src → `⦃HERO_IMAGE_SRC_0⦄`
- Second hero image src → `⦃HERO_IMAGE_SRC_1⦄`
- First testimonial quote → `⦃TESTIMONIAL_QUOTE_0⦄`
- Second testimonial quote → `⦃TESTIMONIAL_QUOTE_1⦄`
- Third testimonial quote → `⦃TESTIMONIAL_QUOTE_2⦄`

You write ONE rule, the system handles multiple instances. No tedious repetition.

**2. Selector specificity for mixed content**

Notice the Contact section has a paragraph with nested elements:
```jsx
<p>Email: <a href="mailto:hello@lawnmow.io">hello@lawnmow.io</a></p>
```

The selector `"div > p:not(:has(a))"` matches only paragraphs WITHOUT nested anchors. This prevents the parser from extracting multiple text nodes from a single paragraph. For the email link, we use separate specific selectors:
- `"a[href^='mailto']"` with `context: "text/jsx#attribute"` → extracts the `href` attribute
- `"a[href^='mailto']"` with `context: "text/jsx"` → extracts the link text

This demonstrates how to handle mixed content structures in JSX without restricting your design choices.

### Validate Configuration Before Converting

Before running the conversion, validate your `.templatize.json` configuration to catch errors early:

```bash
# Validate the configuration file
npx make-template config validate

# Validate a specific configuration file
npx make-template config validate .templatize.json
```

> **Note**: Configuration validation is automatically performed when you run `npx make-template convert`, so this step is optional. Use `config validate` when you want to verify your configuration without running the full conversion process.

**What config validation checks:**
- JSON syntax errors
- Required fields (version, rules)
- Valid context types (application/json, text/jsx, text/html, etc.)
- Selector syntax for each context type
- Placeholder naming conventions
- File path references exist
- Conflicting or duplicate rules

**Example validation output:**

```console
✓ Configuration validation successful

File: .templatize.json
Version: 1.0
Rules: 4 files configured
Placeholders: 23 extraction rules defined

Summary: All checks passed
```

If there are errors, you'll see specific messages:

```console
✗ Configuration validation failed

Error in src/components/Hero.jsx:
  - Invalid selector syntax: "img[src" (missing closing bracket)
  - Context "text/jsx#attribute" requires "attributeName" field

Fix these issues before running conversion.
```

### Convert to Apply Custom Rules

Now run the conversion to apply your custom `.templatize.json` rules:

```bash
npx make-template convert . --yes
```

This processes your source files using the custom rules you defined, replacing values with placeholders and generating the auto-numbered suffixes (`_0`, `_1`, `_2`) for `allowMultiple` rules.

### Review and Enhance Generated Placeholders

After conversion, check the generated `template.json`. The system auto-generated entries for all detected placeholders (including `_0`, `_1`, `_2` suffixes from `allowMultiple`). Now enhance the descriptions to help template users:

```json
{
  "schemaVersion": "1.0.0",
  "id": "yourname/lawnmow-web",
  "name": "LawnMow Web Marketing Template",
  "description": "Marketing website template for service businesses with contact forms and testimonials",
  "placeholders": {
    "PROJECT_NAME": {
      "default": "lawnmow-web",
      "description": "Overall project name"
    },
    "BUSINESS_NAME": {
      "default": "GreenCare Lawn Services",
      "description": "Business name displayed in hero section"
    },
    "BUSINESS_TAGLINE": {
      "default": "Serving Your City since 2020",
      "description": "Business tagline or service area description"
    },
    "HERO_IMAGE_SRC_0": {
      "default": "/images/lawn-mower.jpg",
      "description": "First hero section image"
    },
    "HERO_IMAGE_SRC_1": {
      "default": "/images/green-lawn.jpg",
      "description": "Second hero section image"
    },
    "HERO_IMAGE_ALT_0": {
      "default": "Professional lawn care equipment",
      "description": "Alt text for first hero image"
    },
    "HERO_IMAGE_ALT_1": {
      "default": "Well-maintained lawn",
      "description": "Alt text for second hero image"
    },
    "CONTACT_FORM_ACTION": {
      "default": "/submit",
      "description": "Contact form submission endpoint"
    },
    "CONTACT_NAME_PLACEHOLDER": {
      "default": "Your Name",
      "description": "Placeholder for name input field"
    },
    "CONTACT_EMAIL_PLACEHOLDER": {
      "default": "your@email.com",
      "description": "Placeholder for email input field"
    },
    "CONTACT_MESSAGE_PLACEHOLDER": {
      "default": "Tell us about your needs",
      "description": "Placeholder for message textarea"
    },
    "CONTACT_INFO_0": {
      "default": "Phone: (555) 123-4567",
      "description": "Phone number"
    },
    "CONTACT_INFO_1": {
      "default": "Address: 123 Main St, City, State 12345",
      "description": "Physical address"
    },
    "CONTACT_EMAIL_HREF": {
      "default": "mailto:hello@business.com",
      "description": "Contact email href attribute"
    },
    "CONTACT_EMAIL_TEXT": {
      "default": "hello@business.com",
      "description": "Contact email link text"
    },
    "TESTIMONIAL_QUOTE_0": {
      "default": "Outstanding service!",
      "description": "First customer testimonial"
    },
    "TESTIMONIAL_QUOTE_1": {
      "default": "Highly professional team.",
      "description": "Second customer testimonial"
    },
    "TESTIMONIAL_QUOTE_2": {
      "default": "Exceeded all expectations!",
      "description": "Third customer testimonial"
    },
    "TESTIMONIAL_AUTHOR_0": {
      "default": "- Customer Name",
      "description": "First testimonial author"
    },
    "TESTIMONIAL_AUTHOR_1": {
      "default": "- Another Customer",
      "description": "Second testimonial author"
    },
    "TESTIMONIAL_AUTHOR_2": {
      "default": "- Happy Client",
      "description": "Third testimonial author"
    }
  }
}
```

Notice the `_0`, `_1`, `_2` suffixes? The system automatically numbered the placeholders because `allowMultiple: true` was set.

### Convert and Inspect

```bash
npx make-template convert . --yes
```

Now look at the marketing components:

```bash
cat src/components/Hero.jsx
```

You should see:

```jsx
<h1>⦃BUSINESS_NAME⦄ - Professional Lawn Care</h1>
<p>⦃BUSINESS_TAGLINE⦄</p>
<img src="⦃HERO_IMAGE_SRC_0⦄" alt="⦃HERO_IMAGE_ALT_0⦄" />
<img src="⦃HERO_IMAGE_SRC_1⦄" alt="⦃HERO_IMAGE_ALT_1⦄" />
```

Check the testimonials:

```bash
cat src/components/Testimonials.jsx
```

You should see:

```jsx
<blockquote>
  <p>⦃TESTIMONIAL_QUOTE_0⦄</p>
  <cite>⦃TESTIMONIAL_AUTHOR_0⦄</cite>
</blockquote>
<blockquote>
  <p>⦃TESTIMONIAL_QUOTE_1⦄</p>
  <cite>⦃TESTIMONIAL_AUTHOR_1⦄</cite>
</blockquote>
<blockquote>
  <p>⦃TESTIMONIAL_QUOTE_2⦄</p>
  <cite>⦃TESTIMONIAL_AUTHOR_2⦄</cite>
</blockquote>
```

Each section has its own namespaced placeholders. Notice:

- **Auto-numbered placeholders**: `_0`, `_1`, `_2` suffixes for multiple testimonials
- **One rule, multiple matches**: You wrote ONE `blockquote p` rule, the system handled three testimonials
- **Section isolation**: Hero images, contact info, and testimonials are independently customizable

### Understanding Placeholder Organization for Marketing Sites

Look at the generated `template.json`:

```bash
cat template.json
```

The placeholder names tell you which section they belong to:

```json
{
  "placeholders": {
    "PROJECT_NAME": { ... },            // ← From package.json (first file)
    "BUSINESS_NAME": { ... },           // ← Hero section (second file)
    "BUSINESS_TAGLINE": { ... },        // ← Hero tagline
    "HERO_IMAGE_SRC_0": { ... },        // ← _0 = first hero image
    "HERO_IMAGE_SRC_1": { ... },        // ← _1 = second hero image
    "HERO_IMAGE_ALT_0": { ... },        // ← Alt text for first image
    "HERO_IMAGE_ALT_1": { ... },        // ← Alt text for second image
    "CONTACT_FORM_ACTION": { ... },     // ← Contact form (third file)
    "CONTACT_INFO_0": { ... },          // ← _0 = phone
    "CONTACT_INFO_1": { ... },          // ← _1 = address
    "CONTACT_EMAIL_HREF": { ... },      // ← email href attribute
    "CONTACT_EMAIL_TEXT": { ... },      // ← email link text
    "TESTIMONIAL_QUOTE_0": { ... },     // ← Testimonials (fourth file)
    "TESTIMONIAL_AUTHOR_0": { ... },    // ← _0 = first author
    "TESTIMONIAL_QUOTE_1": { ... },     // ← _1 = second testimonial
    "TESTIMONIAL_AUTHOR_1": { ... },    // ← _1 = second author
    "TESTIMONIAL_QUOTE_2": { ... },     // ← _2 = third testimonial
    "TESTIMONIAL_AUTHOR_2": { ... }     // ← _2 = third author
  }
}
```

**Predictable File-Order Processing**:

Placeholders appear in `template.json` in the same order files are declared in `.templatize.json`:
1. `package.json` placeholders appear first
2. `src/components/Hero.jsx` placeholders appear second
3. `src/components/Contact.jsx` placeholders appear third
4. `src/components/Testimonials.jsx` placeholders appear last

Within each file, placeholders follow document order (top-to-bottom as they appear in the source code).

This creates natural, predictable organization without requiring explicit configuration. Technical writers can document: "This organization mirrors marketing website structure: hero section, contact section, testimonials section" and the placeholder order in `template.json` matches that description automatically.

**Naming Conventions**:

- **Section prefix**: `HERO_`, `CONTACT_`, `TESTIMONIAL_` isolates website sections
- **Entity type**: `IMAGE_SRC`, `QUOTE`, `AUTHOR` describes what it is
- **Auto-numbering**: `_0`, `_1`, `_2` handles multiple instances from `allowMultiple`

Users immediately understand: "This template has multiple testimonials, and I can customize each section independently."

### Understanding Manual Configuration

**The `make-template init` command creates both configuration files:**

- **`.templatize.json`**: Defines extraction rules (what to replace with placeholders)
- **`template.json`**: Defines placeholder metadata (default values, descriptions, validation)

For marketing websites with structured content like this, you need explicit `.templatize.json` rules. Auto-detection won't understand your business logic—which hero images, testimonials, or contact fields to templatize.

The `.templatize.json` file tells the system HOW to find values, while `template.json` tells users WHAT those values mean.

For detailed patterns, selectors, and advanced configuration, see:
- [Templatization Patterns Reference](../reference/templatization-patterns.md)
- [Template Configuration Explanation](../explanation/template-configuration.md)

### Test the Marketing Template

Now that you've created a more complex template with custom configuration, test it to ensure everything works:

```bash
# Test the template
npx make-template test . --verbose
```

**What gets validated:**
- All 23 placeholder extraction rules
- `allowMultiple` auto-numbering for images and testimonials
- CSS selector syntax for JSX contexts
- `template.json` metadata completeness
- File structure and configuration consistency

If there are issues, you'll see specific error messages:

```console
✗ Template test failed

Issues found:
  - src/components/Hero.jsx: Selector "img[src" has invalid syntax
  - template.json: Missing description for TESTIMONIAL_QUOTE_2
```

### What You Learned

- **`allowMultiple: true`**: Write one rule, handle multiple instances automatically
- **Auto-numbering**: System adds `_0`, `_1`, `_2` suffixes to duplicate matches
- **Selector specificity**: Use `:not(:has(a))` to exclude paragraphs with nested elements, preventing unwanted text node extraction
- **Mixed content handling**: Target nested elements separately (email link handled with two rules: one for href, one for text)
- **Section organization**: Group placeholders by website section with prefixes (HERO_, CONTACT_, TESTIMONIAL_)
- **CSS selectors**: Target elements precisely (`blockquote p`, `img[src]`, `a[href^='mailto']`, `p:not(:has(a))`)
- **Marketing website structure**: Hero section, contact forms, testimonials—all independently customizable
- **HTML form handling**: Form actions, input placeholders, and contact information
- **Scalability**: Configuration stays simple even with many similar elements (3+ testimonials)
- **Manual configuration**: Marketing sites with structured content need explicit `.templatize.json` rules
- **Template testing**: Use `make-template test` to validate complex templates before distribution

### Clean Up

```bash
cd ..
```

## Build Template 2: Customer-Facing App (LawnMow App)

Now build our second production template: the actual digital transformation product—a customer-facing application where lawn care customers can schedule services and make payments. You'll deploy this to Cloudflare's edge platform using React Router v7 with server-side rendering and a D1 database to store appointments and payments.

### Create LawnMow App Project

```bash
npm create cloudflare@latest lawnmow-app -- --framework=react-router
cd lawnmow-app
npm install
```

**Note**: React Router v7 uses Cloudflare's C3 CLI for project creation. The scaffolding automatically sets up React Router with Cloudflare Workers integration.

### Add Database Configuration

Edit `wrangler.jsonc` to configure D1 for customer appointments and payments:

```jsonc
{
  "name": "lawnmow-app",
  "compatibility_date": "2024-01-01",
  "account_id": "abc123def456",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "lawnmow_customer_db",
      "database_id": "xyz789abc123"
    }
  ]
}
```

### Add Customer Portal Components

Create the customer-facing interface for scheduling and payments:

**app/routes/schedule.tsx:**

```tsx
export default function Schedule() {
  return (
    <div>
      <h1>Schedule Your Service</h1>
      <form method="POST" action="/api/appointments">
        <input type="text" name="customer_name" placeholder="Your Name" required />
        <input type="email" name="customer_email" placeholder="your@email.com" required />
        <input type="text" name="property_address" placeholder="Service Address" required />
        <select name="service_type" required>
          <option value="">Select Service</option>
          <option value="basic">Basic Mowing - $45</option>
          <option value="full">Full Service - $75</option>
          <option value="premium">Premium Care - $120</option>
        </select>
        <input type="date" name="service_date" required />
        <button type="submit">Book Appointment</button>
      </form>
    </div>
  );
}
```

**app/routes/payment.tsx:**

```tsx
export default function Payment() {
  return (
    <div>
      <h1>Payment</h1>
      <form method="POST" action="/api/payments">
        <input type="text" name="card_number" placeholder="Card Number" required />
        <input type="text" name="card_name" placeholder="Name on Card" required />
        <input type="text" name="card_expiry" placeholder="MM/YY" required />
        <input type="text" name="card_cvc" placeholder="CVC" required />
        <button type="submit">Pay Now</button>
      </form>
      <p>We accept all major credit cards</p>
      <img src="/images/visa-logo.png" alt="Visa" />
      <img src="/images/mastercard-logo.png" alt="Mastercard" />
    </div>
  );
}
```

### Create Database Schema

**app/db/schema.sql:**

```sql
CREATE TABLE appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  service_date TEXT NOT NULL,
  service_type TEXT NOT NULL,
  property_address TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  transaction_id TEXT,
  paid_at TEXT,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id)
);

CREATE TABLE service_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  base_price REAL NOT NULL
);

INSERT INTO service_types (name, description, base_price) VALUES
  ('Basic Mowing', 'Standard lawn mowing service', 45.00),
  ('Full Service', 'Mowing, edging, and cleanup', 75.00),
  ('Premium Care', 'Complete lawn care package', 120.00);
```

### Convert with Auto-Detection

```bash
npx make-template init
npx make-template convert . --yes
```

The auto-detection recognizes Cloudflare Workers patterns and automatically replaces infrastructure configurations with placeholders:

- `⦃PROJECT_NAME⦄` from package.json and wrangler.jsonc
- `⦃CLOUDFLARE_ACCOUNT_ID⦄` from wrangler.jsonc
- `⦃D1_DATABASE_BINDING⦄` from wrangler.jsonc
- `⦃D1_DATABASE_NAME⦄` from wrangler.jsonc
- `⦃D1_DATABASE_ID⦄` from wrangler.jsonc

These patterns are built into the system, so you don't need to configure them manually.

### Verify Cloudflare Infrastructure Placeholders

Check that Cloudflare Workers configuration was templatized:

```bash
cat wrangler.jsonc
```

You should see:

```jsonc
{
  "name": "⦃PROJECT_NAME⦄",
  "compatibility_date": "2024-01-01",
  "account_id": "⦃CLOUDFLARE_ACCOUNT_ID⦄",
  "d1_databases": [
    {
      "binding": "⦃D1_DATABASE_BINDING⦄",
      "database_name": "⦃D1_DATABASE_NAME⦄",
      "database_id": "⦃D1_DATABASE_ID⦄"
    }
  ]
}
```

**Note**: This tutorial demonstrates infrastructure auto-detection. For application-specific features (React Router components, SQL schemas, business logic), you would add custom rules in `.templatize.json`.

### What You Learned

- **Infrastructure auto-detection**: Cloudflare Workers, D1 databases, and wrangler configurations are automatically detected
- **Platform patterns built-in**: Common infrastructure patterns (account_id, database bindings) don't require manual configuration
- **Wrangler configuration**: Uses `wrangler.jsonc` format (recommended as of Wrangler v3.91.0+)
- **Focus on your app**: Template authors only configure application-specific business logic, not infrastructure boilerplate
- **Customer-facing features**: Scheduling forms, payment interfaces, and service pricing can be templatized
- **Business data modeling**: Database schemas for customer appointments, payments, and service catalogs can be templatized
- **Cross-file consistency**: The same placeholder can appear in package.json, wrangler.jsonc, React components, and SQL schemas
- **Production deployment**: Real-world digital transformation templates include infrastructure configuration, UI, and database schemas
- **Multi-context extraction**: JSON (package.json, wrangler.jsonc), TSX (React Router), and SQL (schema.sql) all processed by different extractors
- **Full-stack templates**: Customer portal (frontend) + database (backend) + infrastructure (Cloudflare) in one template

### Clean Up

```bash
cd ..
```

## Making Templates Dynamic: Setup Scripts

So far, you've learned that templates are files with placeholders that get replaced during scaffolding. This works great for static content like business names, emails, and contact information. But what if you want templates that **adapt based on what the consumer needs**?

For example, what if some consumers want authentication while others don't? What if the LawnMow App should configure itself differently based on whether they need payment processing?

This is where **setup scripts (`_setup.mjs`)** come in—they transform your templates from static boilerplates into intelligent, adaptive scaffolding tools.

### What are Setup Scripts?

A `_setup.mjs` file is a JavaScript module that runs **after** files are copied but **before** the project is handed to the consumer. Think of it as a post-processing step that can:

- Add or remove files based on configuration
- Modify package.json based on selected features
- Generate dynamic content like documentation
- Ensure consistency between related files

The setup script receives an **Environment** object with two key properties:

- **`ctx`**: Immutable context (project name, consumer choices, placeholder values)
- **`tools`**: Curated utilities for file operations, JSON manipulation, text processing

**Important**: Setup scripts run in a **secure sandbox** (Node.js VM) with no access to `fs`, `require()`, or `import`. All operations must use the provided `tools` API.

### Enhance LawnMow App with a Setup Script

Let's enhance the LawnMow App template to let consumers choose which features to include.

#### Step 1: Add Setup Script

Navigate back to the LawnMow App directory:

```bash
cd lawnmow-app
```

Create the setup script:

**_setup.mjs:**

```javascript
export default async function setup({ ctx, tools }) {
  // Always replace core placeholders
  await tools.placeholders.applyInputs([
    'package.json',
    'wrangler.jsonc'
  ]);

  // Track enabled features for documentation
  const features = [];

  // Check if consumer wants authentication
  if (ctx.inputs.ENABLE_AUTH === 'true' || ctx.inputs.ENABLE_AUTH === true) {
    features.push('authentication');

    // Add auth dependencies
    await tools.json.merge('package.json', {
      dependencies: {
        '@auth/core': '^0.18.0'
      }
    });

    tools.logger.info('✓ Added authentication support');
  }

  // Check if consumer wants payment processing
  if (ctx.inputs.ENABLE_PAYMENTS === 'true' || ctx.inputs.ENABLE_PAYMENTS === true) {
    features.push('payments');

    // Add Stripe dependencies
    await tools.json.merge('package.json', {
      dependencies: {
        '@stripe/stripe-js': '^2.2.0'
      }
    });

    tools.logger.info('✓ Added payment processing');
  }

  // Generate feature documentation
  if (features.length > 0) {
    await tools.files.write('FEATURES.md',
      `# ${ctx.projectName} - Features\n\n` +
      'This project includes:\n\n' +
      features.map(f => `- ${f}`).join('\n') +
      '\n\nSee package.json for specific dependencies.'
    );
  }
}
```

#### Step 2: Add Feature Placeholders

Update `template.json` to include feature flags:

```json
{
  "schemaVersion": "1.0.0",
  "id": "workshop/lawnmow-app",
  "name": "LawnMow App",
  "description": "Customer-facing lawn care app",
  "placeholderFormat": "unicode",
  "placeholders": {
    "PROJECT_NAME": {
      "description": "Project name",
      "default": "lawnmow-app",
      "required": true
    },
    "CLOUDFLARE_ACCOUNT_ID": {
      "description": "Cloudflare account ID",
      "required": false
    },
    "D1_DATABASE_NAME": {
      "description": "D1 database name",
      "required": false
    },
    "ENABLE_AUTH": {
      "description": "Enable authentication features",
      "type": "boolean",
      "default": false,
      "required": false
    },
    "ENABLE_PAYMENTS": {
      "description": "Enable payment processing",
      "type": "boolean",
      "default": false,
      "required": false
    }
  }
}
```

#### Step 3: Test the Dynamic Template

Now when consumers scaffold from this template, they can enable features:

```bash
cd ..
mkdir test-dynamic && cd test-dynamic

# Minimal app (no extra features)
npx @m5nv/create-scaffold new basic-app \
  --template ../lawnmow-app \
  --placeholder PROJECT_NAME=basic-app \
  --placeholder ENABLE_AUTH=false \
  --placeholder ENABLE_PAYMENTS=false \
  --yes

# Full-featured app
npx @m5nv/create-scaffold new premium-app \
  --template ../lawnmow-app \
  --placeholder PROJECT_NAME=premium-app \
  --placeholder ENABLE_AUTH=true \
  --placeholder ENABLE_PAYMENTS=true \
  --yes

# Check what was generated
cat basic-app/package.json | grep "@auth"
# (no auth dependency)

cat premium-app/package.json | grep "@auth"
# Should show: "@auth/core": "^0.18.0"

cat premium-app/FEATURES.md
# Shows enabled features
```

### Understanding the Tools API

The `tools` object provides several modules for common operations:

**`tools.placeholders`** - Replace tokens in files
- `applyInputs(files)` - Apply consumer-provided placeholder values
- `replaceAll(replacements, files)` - Custom replacements

**`tools.files`** - File operations
- `write(file, content)` - Write files
- `copy(from, to)` - Copy files/directories
- `move(from, to)` - Move/rename files
- `remove(path)` - Delete files/directories
- `ensureDirs(paths)` - Create directories

**`tools.json`** - JSON manipulation
- `merge(file, patch)` - Deep merge objects
- `set(file, path, value)` - Set nested values
- `read(file)` - Read JSON files

**`tools.text`** - Text operations
- `insertAfter({ file, marker, block })` - Insert text after marker
- `appendLines({ file, lines })` - Append to file
- `replace({ file, search, replace })` - String/regex replacement

**`tools.logger`** - Logging (use sparingly)
- `info(message)` - Info logs
- `warn(message)` - Warnings

See [Environment Reference](../reference/environment.md) for complete API documentation.

### What You Learned

- **Setup scripts**: JavaScript modules that run during scaffolding
- **Dynamic behavior**: Templates can adapt based on consumer choices
- **Tools API**: Rich utilities for file/JSON/text operations
- **Secure sandbox**: No Node.js built-ins, only provided tools
- **Feature flags**: Boolean placeholders to enable/disable features
- **Documentation generation**: Create files based on configuration

### Best Practices

**Do:**
- ✅ Keep setup scripts simple and focused
- ✅ Use `tools` API for all operations
- ✅ Document what features are enabled
- ✅ Test with different placeholder combinations

**Don't:**
- ❌ Use `console.log()` excessively (use `tools.logger` sparingly)
- ❌ Try to import Node.js modules
- ❌ Assume placeholders always have values (check first)
- ❌ Create complex nested conditionals

## Using Template Assets for Conditional Features

So far, our setup script uses simple boolean flags. But what if you want to include entire files conditionally? This is where **template assets** come in.

Templates can include an assets directory (by default `__scaffold__/`) that contains files used during setup but not copied directly to the generated project.

### Create Template Assets Directory

In the `lawnmow-app` directory:

```bash
mkdir -p __scaffold__/features
```

Create feature-specific template files:

**__scaffold__/features/auth-config.js.tpl:**
```javascript
// Authentication configuration for ⦃PROJECT_NAME⦄
export const authConfig = {
  providers: ['google', 'github'],
  sessionSecret: process.env.SESSION_SECRET
};
```

**__scaffold__/features/payment-config.js.tpl:**
```javascript
// Payment configuration for ⦃PROJECT_NAME⦄
export const paymentConfig = {
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY
};
```

### Update Setup Script to Use Assets

Update **_setup.mjs:**

```javascript
export default async function setup({ ctx, tools }) {
  await tools.placeholders.applyInputs([
    'package.json',
    'wrangler.jsonc'
  ]);

  const features = [];

  // Conditionally add authentication
  if (ctx.inputs.ENABLE_AUTH === 'true' || ctx.inputs.ENABLE_AUTH === true) {
    features.push('authentication');

    // Create auth directory
    await tools.files.ensureDirs(['src/config']);

    // Render auth config from template
    await tools.templates.renderFile(
      '__scaffold__/features/auth-config.js.tpl',
      'src/config/auth.js',
      { PROJECT_NAME: ctx.projectName }
    );

    await tools.json.merge('package.json', {
      dependencies: {
        '@auth/core': '^0.18.0'
      }
    });

    tools.logger.info('✓ Added authentication with config');
  }

  // Conditionally add payments
  if (ctx.inputs.ENABLE_PAYMENTS === 'true' || ctx.inputs.ENABLE_PAYMENTS === true) {
    features.push('payments');

    await tools.files.ensureDirs(['src/config']);

    await tools.templates.renderFile(
      '__scaffold__/features/payment-config.js.tpl',
      'src/config/payments.js',
      { PROJECT_NAME: ctx.projectName }
    );

    await tools.json.merge('package.json', {
      dependencies: {
        '@stripe/stripe-js': '^2.2.0'
      }
    });

    tools.logger.info('✓ Added payment processing with config');
  }

  // Generate documentation
  if (features.length > 0) {
    await tools.files.write('FEATURES.md',
      `# ${ctx.projectName} - Features\n\n` +
      'Enabled features:\n' +
      features.map(f => `- ${f}`).join('\n') +
      '\n\nConfiguration files:\n' +
      (features.includes('authentication') ? '- src/config/auth.js\n' : '') +
      (features.includes('payments') ? '- src/config/payments.js\n' : '')
    );
  }
}
```

**Key concepts:**

- **`__scaffold__/` directory**: Contains template-only files
- **`tools.templates.renderFile()`**: Renders template with placeholders and writes to destination
- **Template files (`.tpl`)**: Files with placeholders that get processed
- **Automatic cleanup**: `__scaffold__/` and `_setup.mjs` are removed after scaffolding

Test the enhanced template:

```bash
cd ../test-dynamic

npx @m5nv/create-scaffold new configured-app \
  --template ../lawnmow-app \
  --placeholder PROJECT_NAME=configured-app \
  --placeholder ENABLE_AUTH=true \
  --placeholder ENABLE_PAYMENTS=true \
  --yes

# Check generated config files
ls configured-app/src/config/
# Should show: auth.js  payments.js

cat configured-app/src/config/auth.js
# Should have PROJECT_NAME replaced
```

### What You Learned

- **Template assets**: `__scaffold__/` directory for template-only files
- **Conditional file generation**: Create files only when features are enabled
- **Template rendering**: `tools.templates.renderFile()` processes placeholders in template files
- **Organized features**: Keep feature code in separate template files
- **Automatic cleanup**: Assets directory removed after setup completes

## Structured Configuration with Dimensions

So far, we've used simple boolean placeholders (`ENABLE_AUTH=true`). This works, but has limitations:

- Consumers must know exactly which placeholders exist
- No guidance on valid combinations
- Hard to visualize what the template offers

**Dimensions** solve this by providing a structured way to define configuration options. They enable:

1. **Discoverable options** - Consumers see what's available
2. **Type safety** - Single-select vs multi-select enforced
3. **Visual configuration** - Tools like validator.breadcrumbs.workers.dev can render your template's options
4. **Better validation** - Prevent invalid combinations before scaffolding

### Understanding Dimensions

Dimensions are named configuration categories in your `template.json`:

```json
{
  "setup": {
    "dimensions": {
      "features": {
        "type": "multi",
        "values": ["auth", "payments", "analytics"],
        "default": []
      },
      "deployment": {
        "type": "single",
        "values": ["cloudflare-workers", "vercel"],
        "default": "cloudflare-workers"
      }
    }
  }
}
```

**Dimension types:**
- **`single`**: Consumer selects exactly one value (like a radio button)
- **`multi`**: Consumer can select multiple values (like checkboxes)

### Add Dimensions to LawnMow App

Update `lawnmow-app/template.json`:

```json
{
  "schemaVersion": "1.0.0",
  "id": "workshop/lawnmow-app",
  "name": "LawnMow App",
  "description": "Customer-facing lawn care app with configurable features",
  "placeholderFormat": "unicode",

  "placeholders": {
    "PROJECT_NAME": {
      "description": "Project name",
      "default": "lawnmow-app",
      "required": true
    },
    "CLOUDFLARE_ACCOUNT_ID": {
      "description": "Cloudflare account ID",
      "required": false
    },
    "D1_DATABASE_NAME": {
      "description": "D1 database name",
      "required": false
    }
  },

  "setup": {
    "policy": "strict",
    "dimensions": {
      "features": {
        "type": "multi",
        "values": ["auth", "payments", "analytics"],
        "default": []
      }
    }
  }
}
```

### Update Setup Script to Use Dimensions

Now update `_setup.mjs` to check dimension selections instead of placeholder booleans:

```javascript
export default async function setup({ ctx, tools }) {
  await tools.placeholders.applyInputs([
    'package.json',
    'wrangler.jsonc'
  ]);

  const features = [];

  // Use tools.options to check dimension selections
  await tools.options.when('auth', async () => {
    features.push('authentication');

    await tools.files.ensureDirs(['src/config']);
    await tools.templates.renderFile(
      '__scaffold__/features/auth-config.js.tpl',
      'src/config/auth.js',
      { PROJECT_NAME: ctx.projectName }
    );

    await tools.json.merge('package.json', {
      dependencies: { '@auth/core': '^0.18.0' }
    });

    tools.logger.info('✓ Authentication enabled');
  });

  await tools.options.when('payments', async () => {
    features.push('payments');

    await tools.files.ensureDirs(['src/config']);
    await tools.templates.renderFile(
      '__scaffold__/features/payment-config.js.tpl',
      'src/config/payments.js',
      { PROJECT_NAME: ctx.projectName }
    );

    await tools.json.merge('package.json', {
      dependencies: { '@stripe/stripe-js': '^2.2.0' }
    });

    tools.logger.info('✓ Payment processing enabled');
  });

  await tools.options.when('analytics', async () => {
    features.push('analytics');

    await tools.json.merge('package.json', {
      dependencies: { '@vercel/analytics': '^1.1.0' }
    });

    tools.logger.info('✓ Analytics enabled');
  });

  // Generate documentation
  if (features.length > 0) {
    await tools.files.write('FEATURES.md',
      `# ${ctx.projectName}\n\n` +
      'Enabled features:\n' +
      features.map(f => `- ${f}`).join('\n')
    );
  }
}
```

**Key difference**: Instead of checking `ctx.inputs.ENABLE_AUTH`, we use `tools.options.when('auth', callback)`. This checks if 'auth' was selected in the `features` dimension.

### Using Dimensions with Selection Files

Now consumers configure templates using **selection files**—JSON files that combine dimension choices, placeholder values, and metadata into a single, shareable configuration.

**Why selection files?**
- **Complete configuration**: Dimensions + placeholders in one file
- **Shareable**: Commit to version control, share with team
- **Reproducible**: Same file = same output every time
- **Visual tools**: Generated by validator.breadcrumbs.workers.dev

Create selection files for different configurations:

```bash
cd ../test-dynamic

# Create selection file for auth only
cat > auth-only.selection.json << 'EOF'
{
  "schemaVersion": "1.0.0",
  "templateId": "workshop/lawnmow-app",
  "choices": {
    "features": ["auth"]
  },
  "placeholders": {
    "PROJECT_NAME": "app-with-auth"
  }
}
EOF

# Scaffold with auth feature
npx @m5nv/create-scaffold new app-with-auth \
  --template ../lawnmow-app \
  --selection auth-only.selection.json

# Create selection file for all features
cat > full-features.selection.json << 'EOF'
{
  "schemaVersion": "1.0.0",
  "templateId": "workshop/lawnmow-app",
  "choices": {
    "features": ["auth", "payments", "analytics"]
  },
  "placeholders": {
    "PROJECT_NAME": "app-full"
  }
}
EOF

# Scaffold with all features
npx @m5nv/create-scaffold new app-full \
  --template ../lawnmow-app \
  --selection full-features.selection.json

cat app-full/FEATURES.md
# Shows all three features
```

### Visual Configuration Tool

Upload your `template.json` to **validator.breadcrumbs.workers.dev** to:

- Interactively select dimensions and set placeholders
- Validate configurations against gates and hints
- **Download a complete selection file**
- Share the configuration URL with your team

This eliminates guesswork—consumers see exactly what your template offers and get a ready-to-use selection file.

### What You Learned

- **Dimensions**: Structured configuration options in `template.json`
- **Single vs multi**: Control whether consumers pick one or many values
- **`tools.options.when()`**: Conditional logic based on dimension selections
- **Selection files**: Complete, shareable configuration (dimensions + placeholders + metadata)
- **Visual configuration**: validator.breadcrumbs.workers.dev generates selection files interactively
- **Reproducible scaffolding**: Same selection file = same output every time

## Preventing Invalid Configurations with Gates and Hints

Dimensions let consumers select options, but what if some combinations don't make sense? For example:

- Cloudflare Workers can't use PostgreSQL (must use D1 or no database)
- Payment features require a database to store transactions

**Gates** and **Hints** solve these problems by adding validation rules to your template.

### Understanding Gates

Gates define compatibility constraints between dimension values. They prevent consumers from selecting invalid combinations.

Add gates to `lawnmow-app/template.json`:

```json
{
  "setup": {
    "dimensions": {
      "deployment": {
        "type": "single",
        "values": ["cloudflare-workers", "vercel"],
        "default": "cloudflare-workers"
      },
      "database": {
        "type": "single",
        "values": ["d1", "postgres", "none"],
        "default": "d1"
      },
      "features": {
        "type": "multi",
        "values": ["auth", "payments", "analytics"],
        "default": []
      }
    },
    "gates": {
      "deployment": {
        "cloudflare-workers": {
          "database": ["d1", "none"]
        },
        "vercel": {
          "database": ["postgres", "none"]
        }
      }
    }
  }
}
```

**What this does:**
- If consumer selects `deployment=cloudflare-workers`, then `database` can only be `d1` or `none`
- If consumer selects `deployment=vercel`, then `database` can only be `postgres` or `none`

**Error prevention:**
```bash
# Create selection with invalid combination
cat > invalid.selection.json << 'EOF'
{
  "schemaVersion": "1.0.0",
  "templateId": "workshop/lawnmow-app",
  "choices": {
    "deployment": "cloudflare-workers",
    "database": "postgres"
  },
  "placeholders": {
    "PROJECT_NAME": "invalid"
  }
}
EOF

# This will FAIL
npx @m5nv/create-scaffold new invalid \
  --template ../lawnmow-app \
  --selection invalid.selection.json

# Error: ❌ Invalid configuration:
#   deployment=cloudflare-workers requires database to be one of: [d1, none]
#   Selected: postgres
```

### Understanding Hints

Hints provide feature suggestions and declare what infrastructure they need. They help guide template consumers toward valid configurations.

Add hints to `lawnmow-app/template.json`:

```json
{
  "hints": [
    {
      "id": "simple_booking",
      "label": "Simple Booking",
      "description": "Basic appointment scheduling without authentication",
      "needs": {
        "database": "required"
      }
    },
    {
      "id": "auth_booking",
      "label": "Authenticated Booking",
      "description": "User accounts with booking history",
      "needs": {
        "database": "required",
        "features": ["auth"]
      }
    },
    {
      "id": "full_commerce",
      "label": "Full Commerce",
      "description": "Booking + payments + user accounts",
      "needs": {
        "database": "required",
        "features": ["auth", "payments"]
      }
    }
  ]
}
```

**What hints do:**
- Suggest common use cases to template consumers
- Declare infrastructure requirements
- Help visual tools (like validator.breadcrumbs.workers.dev) show compatible features

**Validation with hints:**
```bash
# Create valid selection - payments with database
cat > valid.selection.json << 'EOF'
{
  "schemaVersion": "1.0.0",
  "templateId": "workshop/lawnmow-app",
  "choices": {
    "deployment": "cloudflare-workers",
    "database": "d1",
    "features": ["payments"]
  },
  "placeholders": {
    "PROJECT_NAME": "valid"
  }
}
EOF

# This works - payments requires database, and consumer selected d1
npx @m5nv/create-scaffold new valid \
  --template ../lawnmow-app \
  --selection valid.selection.json

# Create invalid selection - payments without database
cat > invalid-hints.selection.json << 'EOF'
{
  "schemaVersion": "1.0.0",
  "templateId": "workshop/lawnmow-app",
  "choices": {
    "deployment": "cloudflare-workers",
    "database": "none",
    "features": ["payments"]
  },
  "placeholders": {
    "PROJECT_NAME": "invalid"
  }
}
EOF

# This fails - payments requires database, but consumer selected none
npx @m5nv/create-scaffold new invalid \
  --template ../lawnmow-app \
  --selection invalid-hints.selection.json

# Error: ❌ Invalid configuration:
#   Feature "payments" requires database but database=none was selected
```

### What You Learned

- **Gates**: Compatibility constraints preventing invalid dimension combinations
- **Hints**: Feature suggestions with infrastructure requirements
- **Validation**: Proactive error prevention before scaffolding
- **Consumer guidance**: Help consumers make valid configuration choices
- **Visual tools**: validator.breadcrumbs.workers.dev renders hints/gates interactively

## What You Accomplished

You created **two production templates** demonstrating a complete web presence for service businesses, then progressively enhanced one with advanced features:

### Template 1: LawnMow Web (Static Marketing Site)
**Focus:** Marketing website with hero section, contact forms, and testimonials

**What you learned:**
- `allowMultiple` for multiple images and testimonials
- Manual configuration with structured placeholder rules in `.templatize.json`
- Selector specificity for mixed JSX content
- Section-based placeholder organization (HERO_, CONTACT_, TESTIMONIAL_)

### Template 2: LawnMow App (Full-Stack with Progressive Enhancement)
**Focus:** Customer-facing digital transformation product that evolved through multiple enhancements

**Basic version learned:**
- Full-stack template authoring (frontend + backend + infrastructure)
- Cloudflare Workers auto-detection patterns
- Database schema templatization (SQL files)
- Multi-context extraction (JSON, TSX, SQL)
- Infrastructure-as-code in templates (wrangler.jsonc)

**Enhanced with setup scripts:**
- Dynamic behavior based on consumer choices (authentication, payments)
- Tools API for file/JSON/text operations
- Feature flags with boolean placeholders
- Documentation generation

**Enhanced with template assets:**
- `__scaffold__/` directory for conditional files
- `tools.templates.renderFile()` for template processing
- Organized feature modules
- Automatic cleanup after scaffolding

**Enhanced with dimensions:**
- Structured configuration options (not just boolean flags)
- Single-select vs multi-select controls
- `tools.options.when()` for conditional logic
- Visual configuration support (validator.breadcrumbs.workers.dev)

**Enhanced with gates and hints:**
- Compatibility constraints preventing invalid combinations
- Feature suggestions with infrastructure requirements
- Proactive validation before scaffolding
- Consumer guidance for valid configurations

### Core Workflow (Basic React SPA)
You also learned the fundamental workflow using a basic React SPA:

- **No magic**: Templates are just text files with `⦃PLACEHOLDERS⦄`
- **Unicode delimiters**: Keep your app running during templatization (avoid JSX conflicts)
- **Restore feature**: Convert → test → restore → develop → convert again (non-destructive)
- **Init automation**: `make-template init` generates configuration files
- **Manual vs automated**: Understanding when to use auto-detection vs custom rules
- **Template testing**: Use `make-template test` to validate templates before distribution

### Key Technical Insights

**Templatization:**
- `allowMultiple` feature: Write one rule, handle multiple instances with auto-numbered placeholders
- File-order processing: Placeholders in `template.json` follow `.templatize.json` file order
- Multi-context extraction: Different file types use different processors (JSON, JSX, HTML, SQL)
- Selector specificity: Critical for mixed content (paragraphs with nested elements)

**Dynamic Composition:**
- Setup scripts execute in secure VM sandbox (no Node.js built-ins)
- Tools API provides complete file/JSON/text operations
- Template assets staged before setup, cleaned after delivery
- Conditional logic enables infinite template variations

**Configuration:**
- Dimensions define structured choices (single or multi-select)
- Hints declare feature requirements, enabling smart validation
- Gates prevent invalid combinations proactively
- Boolean placeholders work for simple cases, dimensions for complex configurations

## Next Steps

- **[Create Scaffold Tutorial](create-scaffold.md)** - Use these templates to
  scaffold new projects
- [Template Validation](../reference/cli-reference.md#make-template-commands) -
  Ensure template quality

## Template Locations

Your templates are ready in `template-workshop/`:

- `lawnmow-web/` - Marketing website with contact forms, hero section, and testimonials (attracts customers)
- `lawnmow-app/` - Customer-facing app with scheduling, payments, and Cloudflare deployment (serves customers)

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
