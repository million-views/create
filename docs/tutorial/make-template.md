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

Scaffold a new project to verify the placeholders work:

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
        <p>Email: hello@lawnmow.io</p>
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
        "selector": "div > p",
        "placeholder": "CONTACT_INFO",
        "allowMultiple": true
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

**Key feature demonstrated: `allowMultiple`**

This answers the critical question: **"What if I have multiple hero images or testimonials each needing different values?"**

The `allowMultiple: true` flag tells the system to number multiple matches automatically:

- First hero image src → `⦃HERO_IMAGE_SRC_0⦄`
- Second hero image src → `⦃HERO_IMAGE_SRC_1⦄`
- First testimonial quote → `⦃TESTIMONIAL_QUOTE_0⦄`
- Second testimonial quote → `⦃TESTIMONIAL_QUOTE_1⦄`
- Third testimonial quote → `⦃TESTIMONIAL_QUOTE_2⦄`

You write ONE rule, the system handles multiple instances. No tedious repetition.

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
      "default": "Email: hello@business.com",
      "description": "Email address"
    },
    "CONTACT_INFO_2": {
      "default": "Address: 123 Main St, City, State 12345",
      "description": "Physical address"
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
    "BUSINESS_NAME": { ... },           // ← Hero section brand
    "HERO_IMAGE_SRC_0": { ... },        // ← _0 = first hero image
    "HERO_IMAGE_SRC_1": { ... },        // ← _1 = second hero image
    "CONTACT_INFO_0": { ... },          // ← _0 = phone
    "CONTACT_INFO_1": { ... },          // ← _1 = email
    "CONTACT_INFO_2": { ... },          // ← _2 = address
    "TESTIMONIAL_QUOTE_0": { ... },     // ← _0 = first testimonial
    "TESTIMONIAL_QUOTE_1": { ... },     // ← _1 = second testimonial
    "TESTIMONIAL_QUOTE_2": { ... }      // ← _2 = third testimonial
  }
}
```

The naming convention creates a clear hierarchy:

- **Section prefix**: `HERO_`, `CONTACT_`, `TESTIMONIAL_` isolates website sections
- **Entity type**: `IMAGE_SRC`, `QUOTE`, `AUTHOR` describes what it is
- **Auto-numbering**: `_0`, `_1`, `_2` handles multiple instances

This organization mirrors marketing website structure: hero section, contact section, testimonials section. Users immediately understand: "This template has multiple testimonials, and I can customize each section independently."

### Understanding Manual Configuration

**The `make-template init` command creates both configuration files:**

- **`.templatize.json`**: Defines extraction rules (what to replace with placeholders)
- **`template.json`**: Defines placeholder metadata (default values, descriptions, validation)

For marketing websites with structured content like this, you need explicit `.templatize.json` rules. Auto-detection won't understand your business logic—which hero images, testimonials, or contact fields to templatize.

The `.templatize.json` file tells the system HOW to find values, while `template.json` tells users WHAT those values mean.

For detailed patterns, selectors, and advanced configuration, see:
- [Templatization Patterns Reference](../reference/templatization-patterns.md)
- [Template Configuration Explanation](../explanation/template-configuration.md)

### What You Learned

- **`allowMultiple: true`**: Write one rule, handle multiple instances automatically
- **Auto-numbering**: System adds `_0`, `_1`, `_2` suffixes to duplicate matches
- **Section organization**: Group placeholders by website section with prefixes (HERO_, CONTACT_, TESTIMONIAL_)
- **CSS selectors**: Target elements precisely (`blockquote p`, `img[src]`, `a[href^='mailto']`)
- **Marketing website structure**: Hero section, contact forms, testimonials—all independently customizable
- **HTML form handling**: Form actions, input placeholders, and contact information
- **Scalability**: Configuration stays simple even with many similar elements (3+ testimonials)
- **Manual configuration**: Marketing sites with structured content need explicit `.templatize.json` rules

### Clean Up

```bash
cd ..
```

## Build Template 2: Customer-Facing App (LawnMow App)

Now build our second production template: the actual digital transformation product—a customer-facing application where lawn care customers can schedule services and make payments. You'll deploy this to Cloudflare's edge platform using React Router v7 with server-side rendering and a D1 database to store appointments and payments.

### Create LawnMow App Project

```bash
mkdir lawnmow-app && cd lawnmow-app
npm create react-router@latest . -- --template cloudflare --yes
npm install
```

### Add Database Configuration

Edit `wrangler.toml` to configure D1 for customer appointments and payments:

```toml
name = "lawnmow-app"
compatibility_date = "2024-01-01"
account_id = "abc123def456"

[[d1_databases]]
binding = "DB"
database_name = "lawnmow_customer_db"
database_id = "xyz789abc123"
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

The auto-detection will find Cloudflare-specific and customer-facing placeholders:

- `⦃PROJECT_NAME⦄` from package.json and wrangler.toml
- `⦃CLOUDFLARE_ACCOUNT_ID⦄` from wrangler.toml
- `⦃D1_DATABASE_BINDING⦄` from wrangler.toml
- `⦃D1_DATABASE_NAME⦄` from wrangler.toml (lawnmow_customer_db)
- `⦃D1_DATABASE_ID⦄` from wrangler.toml
- Form fields, payment methods, and service pricing in React components
- SQL table/column names in schema.sql (appointments, payments, service_types)

### Verify Cloudflare and App Placeholders

Check infrastructure configuration:

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

Check customer-facing UI:

```bash
cat app/routes/schedule.tsx
```

You should see form fields and service options templatized:

```tsx
<input type="text" name="customer_name" placeholder="⦃SCHEDULE_NAME_PLACEHOLDER⦄" required />
<option value="basic">⦃SERVICE_BASIC_NAME⦄ - $⦃SERVICE_BASIC_PRICE⦄</option>
<option value="full">⦃SERVICE_FULL_NAME⦄ - $⦃SERVICE_FULL_PRICE⦄</option>
```

### What You Learned

- **Platform-specific patterns**: Cloudflare Workers, D1 databases, and edge runtime configurations are automatically detected
- **Customer-facing features**: Scheduling forms, payment interfaces, and service pricing can be templatized
- **Business data modeling**: Database schemas for customer appointments, payments, and service catalogs can be templatized
- **Cross-file consistency**: The same placeholder appears in package.json, wrangler.toml, React components, and SQL schemas
- **Production deployment**: Real-world digital transformation templates include infrastructure configuration, UI, and database schemas
- **Multi-context extraction**: JSON (package.json), TOML (wrangler.toml), TSX (React Router), and SQL (schema.sql) all processed by different extractors
- **Full-stack templates**: Customer portal (frontend) + database (backend) + infrastructure (Cloudflare) in one template

### Clean Up

```bash
cd ..
```

## What You Accomplished

You created two production templates demonstrating a complete web presence for service businesses:

**LawnMow Web** - Marketing website with hero section, contact forms, and testimonials; demonstrated `allowMultiple` for multiple images and testimonials, manual configuration with structured placeholder rules

**LawnMow App** - Customer-facing digital transformation product with scheduling, payments, and Cloudflare deployment; demonstrated full-stack template authoring with infrastructure, database schemas, and auto-detection

You also learned the core workflow using a basic React SPA: templates are just files with placeholders, automated initialization with `init`, and the `restore` feature for safe, non-destructive iteration.

Key insights:

- **No magic**: Templates are text files with `⦃PLACEHOLDERS⦄`
- **Unicode delimiters**: Keep your app running during templatization by avoiding JSX conflicts
- **Restore feature**: Convert → test → restore → develop → convert again—template authoring is non-destructive
- **Production deployment**: Templates include infrastructure (Cloudflare Workers, D1 databases) not just code
- **Multi-context extraction**: Different file types (JSON, TOML, SQL, TSX, JSX) use different processors
- **`allowMultiple` feature**: Write one rule, handle multiple instances with auto-numbered placeholders

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
