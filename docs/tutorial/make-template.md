---
title: "make-template Tutorial"
type: "tutorial"
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

# make-template Tutorial

## What you'll learn

In this tutorial, you'll learn how to create three templates that demonstrate a progressive modern stack for Cloudflare deployment. You'll see how to build up complexity from a simple React SPA to a full-stack application with edge computing and databases.

## What you'll build

You'll create three templates that showcase a progressive modern stack for Cloudflare deployment:

1. **Basic React SPA** - Modern frontend foundation with Vite + React
2. **SSR Portfolio App** - React Router v7 with SSR and direct D1 database access
3. **Full-Stack Portfolio** - Split architecture with API server (Workers + D1) and client app

Each template demonstrates different levels of complexity and Cloudflare integration, building toward a complete portfolio management system.

## Prerequisites

Before starting this tutorial, make sure you have:

- **Node.js v22+** installed ([Download here](https://nodejs.org/))
  - Verify: `node --version` should show v22 or higher
- **Git** installed and configured ([Setup guide](https://git-scm.com/book/en/v2/Getting-Started-First-Time-Git-Setup))
  - Verify: `git --version` should show git version info
- **30 minutes** available
- **Basic command line familiarity** (navigating directories, running commands)
- **Completed the [getting-started tutorial](getting-started.md)**

## Step 1: Create Basic React SPA Template

Let's start by creating a modern React SPA template using Vite - the foundation for our progressive stack.

### Instructions

1. **Create a new directory for your templates:**
   ```bash
   mkdir template-workshop
   cd template-workshop
   ```

2. **Create the modern React SPA project:**
   ```bash
   mkdir basic-react-spa
   cd basic-react-spa
   npm create vite@latest . -- --template react --yes
   npm install
   ```

3. **Customize the project structure:**
   ```bash
   # Vite creates a good structure, but let's add our template placeholders
   ```

4. **Update the main React files with placeholders:**

   **src/App.jsx:**
   ```jsx
   import React from 'react'
   import './App.css'

   function App() {
     return (
       <div className="App">
         <header className="App-header">
           <h1>{{PROJECT_NAME}}</h1>
           <p>Welcome to your modern React SPA!</p>
           <p>Built with Vite + React</p>
         </header>
       </div>
     )
   }

   export default App
   ```

   **index.html:**
   ```html
   <!doctype html>
   <html lang="en">
     <head>
       <meta charset="UTF-8" />
       <link rel="icon" type="image/svg+xml" href="/vite.svg" />
       <meta name="viewport" content="width=device-width, initial-scale=1.0" />
       <title>{{PROJECT_NAME}}</title>
     </head>
     <body>
       <div id="root"></div>
       <script type="module" src="/src/main.jsx"></script>
     </body>
   </html>
   ```

5. **Update package.json with template metadata:**
   ```json
   {
     "name": "{{PROJECT_NAME}}",
     "version": "1.0.0",
     "description": "A modern React SPA template built with Vite",
     "type": "module",
     "scripts": {
       "dev": "vite",
       "build": "vite build",
       "preview": "vite preview"
     },
     "keywords": ["react", "vite", "spa", "frontend", "template"],
     "author": "{{AUTHOR_NAME}}",
     "license": "MIT"
   }
   ```

6. **Convert to template:**
   ```bash
   npx make-template convert --yes
   ```

### Expected Result

You should see:
```
🔄 Converting project to template...
📄 Generated template.json
⚙️  Generated _setup.mjs
🔄 Generated .template-undo.json
✅ Conversion complete!
```

The template is now ready and demonstrates modern React development with Vite.

## Step 2: Create SSR Portfolio App Template

Now let's create a React Router v7 SSR application that directly accesses D1 database - demonstrating server-side rendering with database queries.

### Instructions

1. **Navigate back to the workshop directory:**
   ```bash
   cd ..
   ```

2. **Create the React Router v7 SSR project:**
   ```bash
   mkdir ssr-portfolio-app
   cd ssr-portfolio-app
   npm create react-router@latest . -- --template cloudflare --yes
   npm install
   ```

3. **Install additional dependencies for D1:**
   ```bash
   npm install drizzle-orm
   npm install --save-dev drizzle-kit
   ```

4. **Set up the database schema and types:**
   ```bash
   mkdir -p app/db app/lib
   touch app/db/schema.ts app/db/client.ts drizzle.config.ts
   ```

5. **Create the database schema:**

   **app/db/schema.ts:**
   ```typescript
   import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

   export const projects = sqliteTable('projects', {
     id: integer('id').primaryKey({ autoIncrement: true }),
     title: text('title').notNull(),
     description: text('description'),
     status: text('status').default('draft'),
     createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
   });

   export const tasks = sqliteTable('tasks', {
     id: integer('id').primaryKey({ autoIncrement: true }),
     projectId: integer('project_id').references(() => projects.id),
     title: text('title').notNull(),
     completed: integer('completed', { mode: 'boolean' }).default(false),
     createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
   });
   ```

   **app/db/client.ts:**
   ```typescript
   import { drizzle } from 'drizzle-orm/d1';
   import * as schema from './schema';

   export function createDb(connection: D1Database) {
     return drizzle(connection, { schema });
   }

   export type Database = ReturnType<typeof createDb>;
   ```

   **drizzle.config.ts:**
   ```typescript
   import { defineConfig } from 'drizzle-kit';

   export default defineConfig({
     dialect: 'sqlite',
     schema: './app/db/schema.ts',
     out: './migrations',
   });
   ```

6. **Create the main app structure:**

   **app/routes/_index.tsx:**
   ```tsx
   import { json } from '@react-router/node';
   import { useLoaderData } from 'react-router';
   import type { LoaderFunctionArgs } from '@react-router/node';
   import { createDb } from '~/db/client';
   import { projects } from '~/db/schema';
   import { desc } from 'drizzle-orm';

   export async function loader({ context }: LoaderFunctionArgs) {
     const db = createDb(context.cloudflare.env.DB);
     const allProjects = await db.select().from(projects).orderBy(desc(projects.createdAt));

     return json({ projects: allProjects });
   }

   export default function Index() {
     const { projects } = useLoaderData<typeof loader>();

     return (
       <div className="container mx-auto p-6">
         <header className="mb-8">
           <h1 className="text-4xl font-bold mb-2">{{PROJECT_NAME}}</h1>
           <p className="text-gray-600">Creator Portfolio - Built with React Router v7 & D1</p>
         </header>

         <div className="grid gap-6">
           {projects.map((project) => (
             <div key={project.id} className="border rounded-lg p-6 shadow-sm">
               <h2 className="text-2xl font-semibold mb-2">{project.title}</h2>
               <p className="text-gray-700 mb-4">{project.description}</p>
               <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                 {project.status}
               </span>
             </div>
           ))}
         </div>
       </div>
     );
   }
   ```

7. **Set up Cloudflare configuration:**

   **wrangler.toml:**
   ```toml
   name = "{{PROJECT_NAME}}"
   main = "server/index.ts"
   compatibility_date = "2024-01-01"

   [[d1_databases]]
   binding = "DB"
   database_name = "{{PROJECT_NAME}}_db"
   database_id = ""
   migrations_dir = "migrations"
   ```

8. **Create database migrations:**
   ```bash
   mkdir migrations
   npx drizzle-kit generate
   ```

9. **Update package.json:**
   ```json
   {
     "name": "{{PROJECT_NAME}}",
     "version": "1.0.0",
     "description": "SSR Portfolio App with React Router v7 and D1 database",
     "type": "module",
     "scripts": {
       "build": "react-router build",
       "dev": "react-router dev",
       "start": "wrangler dev",
       "deploy": "npm run build && wrangler deploy",
       "db:generate": "drizzle-kit generate",
       "db:migrate": "wrangler d1 migrations apply {{PROJECT_NAME}}_db"
     },
     "keywords": ["react-router", "ssr", "d1", "cloudflare", "portfolio", "template"],
     "author": "{{AUTHOR_NAME}}",
     "license": "MIT"
   }
   ```

10. **Convert to template:**
    ```bash
    npx make-template convert --yes
    ```

### Expected Result

A modern SSR application template with direct D1 database access, demonstrating React Router v7's server-side capabilities.

## Step 3: Create Full-Stack Portfolio Template

Finally, let's create a split-architecture full-stack application: a Cloudflare Worker API server with D1 database, and a separate React Router v7 client that fetches data from the API.

### Instructions

1. **Navigate back to the workshop directory:**
   ```bash
   cd ..
   ```

2. **Create the API server (Cloudflare Worker + D1):**
   ```bash
   mkdir portfolio-api
   cd portfolio-api
   npm create cloudflare@latest . -- --template hello-world --yes
   npm install drizzle-orm itty-router
   npm install --save-dev drizzle-kit
   ```

3. **Set up the API server structure:**
   ```bash
   mkdir -p src/db src/routes
   touch src/db/schema.ts src/db/client.ts src/routes/projects.ts src/routes/tasks.ts drizzle.config.ts
   ```

4. **Create the database schema:**

   **src/db/schema.ts:**
   ```typescript
   import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

   export const projects = sqliteTable('projects', {
     id: integer('id').primaryKey({ autoIncrement: true }),
     title: text('title').notNull(),
     description: text('description'),
     status: text('status').default('draft'),
     createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
   });

   export const tasks = sqliteTable('tasks', {
     id: integer('id').primaryKey({ autoIncrement: true }),
     projectId: integer('project_id').references(() => projects.id),
     title: text('title').notNull(),
     completed: integer('completed', { mode: 'boolean' }).default(false),
     createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
   });
   ```

   **src/db/client.ts:**
   ```typescript
   import { drizzle } from 'drizzle-orm/d1';
   import * as schema from './schema';

   export function createDb(env: { DB: D1Database }) {
     return drizzle(env.DB, { schema });
   }
   ```

   **drizzle.config.ts:**
   ```typescript
   import { defineConfig } from 'drizzle-kit';

   export default defineConfig({
     dialect: 'sqlite',
     schema: './src/db/schema.ts',
     out: './migrations',
   });
   ```

5. **Create API routes:**

   **src/routes/projects.ts:**
   ```typescript
   import { Router } from 'itty-router';
   import { createDb } from '../db/client';
   import { projects, tasks } from '../db/schema';
   import { eq, desc } from 'drizzle-orm';

   const router = Router();

   router.get('/api/projects', async (request, env) => {
     const db = createDb(env);
     const allProjects = await db.select().from(projects).orderBy(desc(projects.createdAt));
     return Response.json(allProjects);
   });

   router.post('/api/projects', async (request, env) => {
     const db = createDb(env);
     const body = await request.json();
     const result = await db.insert(projects).values({
       title: body.title,
       description: body.description,
       status: body.status || 'draft',
       createdAt: new Date(),
     }).returning();
     return Response.json(result[0], { status: 201 });
   });

   router.get('/api/projects/:id/tasks', async (request, env) => {
     const db = createDb(env);
     const projectId = parseInt(request.params.id);
     const projectTasks = await db.select().from(tasks).where(eq(tasks.projectId, projectId));
     return Response.json(projectTasks);
   });

   export default router;
   ```

6. **Update the main worker file:**

   **src/index.ts:**
   ```typescript
   import projectsRouter from './routes/projects';

   export interface Env {
     DB: D1Database;
   }

   export default {
     async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
       // Handle API routes
       const apiResponse = await projectsRouter.handle(request, env, ctx);
       if (apiResponse) return apiResponse;

       // Health check
       if (request.url.endsWith('/health')) {
         return Response.json({ status: 'OK', service: '{{PROJECT_NAME}} API' });
       }

       return new Response('Not Found', { status: 404 });
     },
   };
   ```

7. **Set up wrangler configuration:**

   **wrangler.toml:**
   ```toml
   name = "{{PROJECT_NAME}}-api"
   main = "src/index.ts"
   compatibility_date = "2024-01-01"

   [[d1_databases]]
   binding = "DB"
   database_name = "{{PROJECT_NAME}}_db"
   database_id = ""
   migrations_dir = "migrations"
   ```

8. **Generate migrations:**
   ```bash
   npx drizzle-kit generate
   ```

9. **Create the client app in a separate directory:**
   ```bash
   cd ..
   mkdir portfolio-client
   cd portfolio-client
   npm create react-router@latest . -- --template basic --yes
   npm install
   ```

10. **Update the client app to fetch from API:**

    **app/routes/_index.tsx:**
    ```tsx
    import { useLoaderData } from 'react-router';
    import type { LoaderFunctionArgs } from '@react-router/node';

    export async function loader({}: LoaderFunctionArgs) {
      // In development, fetch from local API server
      // In production, this would be the deployed Worker URL
      const apiUrl = process.env.NODE_ENV === 'development'
        ? 'http://localhost:8787'
        : 'https://{{PROJECT_NAME}}-api.{{AUTHOR_NAME}}.workers.dev';

      try {
        const response = await fetch(`${apiUrl}/api/projects`);
        const projects = await response.json();
        return { projects, apiUrl };
      } catch (error) {
        console.error('Failed to fetch projects:', error);
        return { projects: [], apiUrl, error: 'Failed to load projects' };
      }
    }

    export default function Index() {
      const { projects, apiUrl, error } = useLoaderData<typeof loader>();

      return (
        <div className="container mx-auto p-6">
          <header className="mb-8">
            <h1 className="text-4xl font-bold mb-2">{{PROJECT_NAME}}</h1>
            <p className="text-gray-600">Creator Portfolio - Split Architecture</p>
            <p className="text-sm text-gray-500">API: {apiUrl}</p>
          </header>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <div className="grid gap-6">
            {projects.map((project) => (
              <div key={project.id} className="border rounded-lg p-6 shadow-sm">
                <h2 className="text-2xl font-semibold mb-2">{project.title}</h2>
                <p className="text-gray-700 mb-4">{project.description}</p>
                <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                  {project.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    ```

11. **Update package.json files:**

    **portfolio-api/package.json:**
    ```json
    {
      "name": "{{PROJECT_NAME}}-api",
      "version": "1.0.0",
      "description": "Portfolio API server with Cloudflare Workers and D1",
      "scripts": {
        "dev": "wrangler dev",
        "deploy": "wrangler deploy",
        "db:generate": "drizzle-kit generate",
        "db:migrate": "wrangler d1 migrations apply {{PROJECT_NAME}}_db"
      },
      "keywords": ["api", "cloudflare", "workers", "d1", "portfolio", "template"],
      "author": "{{AUTHOR_NAME}}",
      "license": "MIT"
    }
    ```

    **portfolio-client/package.json:**
    ```json
    {
      "name": "{{PROJECT_NAME}}-client",
      "version": "1.0.0",
      "description": "Portfolio client app with React Router v7",
      "scripts": {
        "dev": "react-router dev",
        "build": "react-router build",
        "start": "react-router-serve ./build/server/index.js"
      },
      "keywords": ["react-router", "client", "portfolio", "template"],
      "author": "{{AUTHOR_NAME}}",
      "license": "MIT"
    }
    ```

12. **Convert both to templates:**
    ```bash
    # Convert API server
    cd portfolio-api
    npx make-template convert --yes

    # Convert client app
    cd ../portfolio-client
    npx make-template convert --yes
    ```

### Expected Result

A complete split-architecture application with separate API server and client, demonstrating modern full-stack development with Cloudflare.

## What you accomplished

You successfully created three templates that demonstrate a progressive modern stack for Cloudflare deployment:

1. **Basic React SPA** - Modern frontend foundation with Vite + React
2. **SSR Portfolio App** - React Router v7 with SSR and direct D1 database access
3. **Full-Stack Portfolio** - Split architecture with API server (Workers + D1) and client app

Each template demonstrates:
- Modern tooling and frameworks (Vite, React Router v7, Cloudflare Workers)
- Progressive complexity building from SPA → SSR → Split Architecture
- Database integration with D1 and Drizzle ORM
- Cloudflare deployment patterns and configurations
- Template features like placeholders, setup scripts, and assetsDir

## Next steps

Now that you've created these templates, learn how to use them:

- **[Create Scaffold Tutorial](create-scaffold.md)** — Learn how to scaffold new projects using the templates you just created
- [How to Create Templates](../how-to/creating-templates.md) — Advanced template authoring techniques
- [Author Workflow](../how-to/author-workflow.md) — Professional template development practices
- [Template Validation](../reference/cli-reference.md#make-template-validate) — Ensure template quality

## Template locations

Your templates are now ready in the `template-workshop` directory:
- `template-workshop/basic-react-spa/` - Modern React SPA with Vite
- `template-workshop/ssr-portfolio-app/` - React Router v7 SSR app with D1
- `template-workshop/portfolio-api/` - Cloudflare Workers API server
- `template-workshop/portfolio-client/` - React Router v7 client app

These will be used in the next tutorial to demonstrate scaffolding from templates and the progressive stack approach.

## Troubleshooting

### Template conversion fails

**Problem:** `make-template convert` fails with errors
**Solution:**
1. Ensure you're in a Node.js project directory with `package.json`
2. Check for file permission issues
3. Clean the project of build artifacts and temporary files
4. Use `--yes` flag to skip development repository warnings

### Missing dependencies

**Problem:** Template creation fails due to missing npm packages
**Solution:**
1. Run `npm install` in each project directory before conversion
2. Ensure all required dependencies are listed in `package.json`
3. Check that package names are spelled correctly

### Placeholder variables not working

**Problem:** Placeholders like `{{PROJECT_NAME}}` aren't being replaced
**Solution:**
1. Verify placeholders use double curly braces: `{{VARIABLE_NAME}}`
2. Check that variables are defined in the template's `template.json`
3. Ensure placeholders are in the correct file types (not binary files)

### Template structure issues

**Problem:** Converted template doesn't have expected structure
**Solution:**
1. Review the generated `template.json` for correct metadata
2. Check that `_setup.mjs` was created properly
3. Verify all source files are included in the template
4. Use `make-template validate` to check template integrity</content>
<parameter name="filePath">/Users/vijay/workspaces/ws-million-views/create/docs/tutorial/make-template.md