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

In this tutorial, you'll learn how to create three templates that demonstrate a progressive modern stack for Cloudflare deployment. You'll start by learning the make-template workflow (manual → auto-templatization) while creating your first template, then build up complexity from a simple React SPA to a full-stack application with edge computing and databases.

## What you'll build

You'll create three templates that showcase a progressive modern stack for Cloudflare deployment:

1. **Basic React SPA** - Modern frontend foundation with Vite + React (learn manual → auto templatization workflow)
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

Let's start by creating a modern React SPA template using Vite - the foundation for our progressive stack. Along the way, you'll learn the complete make-template workflow: manual templatization, auto-templatization, testing, and undo features.

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
   npm create vite@latest . -- --template react --no-interactive --immediate
   ```

3. **Customize the project with specific content:**

   **src/App.jsx:**
   ```jsx
   import React from 'react'
   import './App.css'

   function App() {
     return (
       <div className="App">
         <header className="App-header">
           <h1>My Awesome Project</h1>
           <p>Welcome to your modern React SPA!</p>
           <p>Built with Vite + React</p>
           <img src="/logo.png" alt="My Company Logo" />
           <a href="https://github.com/johndoe" className="github-link">View on GitHub</a>
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
       <title>My Awesome Project</title>
     </head>
     <body>
       <div id="root"></div>
       <script type="module" src="/src/main.jsx"></script>
     </body>
   </html>
   ```

   **package.json (update these fields):**
   ```json
   {
     "name": "my-awesome-project",
     "description": "A portfolio website built with React",
     "author": "John Doe <john@example.com>",
     "repository": {
       "type": "git",
       "url": "https://github.com/johndoe/my-awesome-project.git"
     }
   }
   ```

4. **Manual Templatization - Replace values with placeholders manually:**

   Before using the automatic features, let's manually convert some values to placeholders to understand how templatization works. This will help you appreciate what the auto-detection does.

   **Edit src/App.jsx and replace the specific values with placeholders:**

   ```bash
   # Open the file in your editor
   # Replace "My Awesome Project" with "{{PROJECT_NAME}}"
   # Replace "Welcome to your modern React SPA!" with "{{WELCOME_MESSAGE}}"
   # Replace "Built with Vite + React" with "{{TECH_STACK}}"
   # Replace "/logo.png" with "{{LOGO_URL}}"
   # Replace "My Company Logo" with "{{COMPANY_NAME}}"
   # Replace "https://github.com/johndoe" with "{{GITHUB_URL}}"
   ```

   **Edit index.html and replace the title:**

   ```bash
   # Replace "My Awesome Project" with "{{PROJECT_NAME}}"
   ```

   **Edit package.json and replace the specific values:**

   ```bash
   # Replace "my-awesome-project" with "{{PROJECT_NAME}}"
   # Replace "A portfolio website built with React" with "{{PROJECT_DESCRIPTION}}"
   # Replace "John Doe <john@example.com>" with "{{AUTHOR}}"
   # Replace the repository URL with "{{REPOSITORY_URL}}"
   ```

5. **Create template.json with placeholder definitions:**

   Now you need to create a `template.json` file that defines your placeholders. This tells make-template what placeholders exist and what their default values should be (the original values you just replaced):

   **template.json:**
   ```json
   {
     "name": "Basic React SPA Template",
     "description": "A modern React SPA built with Vite",
     "placeholders": {
       "PROJECT_NAME": {
         "default": "my-awesome-project",
         "description": "The name of your project"
       },
       "PROJECT_DESCRIPTION": {
         "default": "A portfolio website built with React",
         "description": "Brief description of your project"
       },
       "AUTHOR": {
         "default": "John Doe <john@example.com>",
         "description": "Project author information"
       },
       "REPOSITORY_URL": {
         "default": "https://github.com/johndoe/my-awesome-project.git",
         "description": "Git repository URL"
       },
       "WELCOME_MESSAGE": {
         "default": "Welcome to your modern React SPA!",
         "description": "Welcome message displayed on the homepage"
       },
       "TECH_STACK": {
         "default": "Built with Vite + React",
         "description": "Technology stack description"
       },
       "LOGO_URL": {
         "default": "/logo.png",
         "description": "Path to logo image"
       },
       "COMPANY_NAME": {
         "default": "My Company Logo",
         "description": "Alt text for logo"
       },
       "GITHUB_URL": {
         "default": "https://github.com/johndoe",
         "description": "GitHub profile URL"
       }
     }
   }
   ```

   **Why this matters:** The `template.json` file defines your placeholders and their default values. During scaffolding, users can override these defaults. The `.template-undo.json` (created during conversion) uses these defaults for the restore functionality.

6. **Convert to template:**

   Now convert your manually templatized project:

   ```bash
   npx make-template convert --yes
   ```

   This creates the `.template-undo.json` file with the reverse mappings for restoration.

7. **Now let's see Auto-Templatization:**

   Instead of manually replacing all strings, let's start fresh and let make-template automatically detect placeholders:

   ```bash
   # Restore the original project first
   npx make-template restore --yes 2>/dev/null || echo "No template to restore"
   
   # Now convert with auto-detection
   npx make-template convert --placeholder-format "{{NAME}}" --yes
   ```

   This creates a template with auto-detected placeholders. Let's see what was detected:

   ```bash
   cat .template-undo.json | head -20
   ```

8. **Compare Manual vs Auto Results:**

   The auto-templatization should have detected placeholders like:
   - `{{PROJECT_NAME}}` for "my-awesome-project"
   - `{{AUTHOR}}` for "John Doe <john@example.com>"
   - `{{README_TITLE}}` for the README title
   - `{{HTML_TITLE}}` for the HTML title
   - `{{TEXT_CONTENT_0}}` for "My Awesome Project"
   - `{{TEXT_CONTENT_1}}` for "Welcome to your modern React SPA!"
   - `{{TAGLINE}}` for "Built with Vite + React"
   - `{{IMAGE_URL_0}}` for "/logo.png"
   - `{{ALT_TEXT_0}}` for "My Company Logo"
   - `{{LINK_URL_0}}` for "https://github.com/johndoe"

9. **Test the Template:**

   Let's test that the template works by scaffolding a new project:

   ```bash
   cd ..
   npx create-scaffold scaffold basic-react-spa --yes
   cd basic-react-spa-scaffolded
   npm install
   npm run dev
   ```

   You should see the template working with placeholder values.

10. **Undo Feature - Restore the original project:**

   Now let's demonstrate the undo feature to restore the original project:

   ```bash
   cd ../basic-react-spa
   npx make-template restore --yes
   ```

   This restores all the original values from the `.template-undo.json` file.

11. **Verify Restoration:**

   Check that your original values are back:

   ```bash
   grep "My Awesome Project" src/App.jsx
   grep "John Doe" package.json
   ```

12. **Advanced Auto-Templatization:**

   Let's try a different project type to see more auto-detection features. Create a Cloudflare Worker project:

   ```bash
   cd ..
   mkdir cf-worker-demo
   cd cf-worker-demo
   npm create cloudflare@latest . -- --template hello-world --yes
   ```

   Add a wrangler.jsonc with specific values:

   **wrangler.jsonc:**
   ```jsonc
   {
     "name": "my-special-worker",
     "main": "src/index.ts",
     "compatibility_date": "2024-01-01",
     "account_id": "1234567890abcdef",
     "d1_databases": [
       {
         "binding": "MY_DATABASE",
         "database_name": "my_special_db",
         "database_id": "abcdef1234567890"
       }
     ]
   }
   ```

   Now convert this Cloudflare project:

   ```bash
   npx make-template convert --type cf-d1 --yes
   ```

   The auto-templatization should detect:
   - `{{WORKER_NAME}}` for "my-special-worker"
   - `{{CLOUDFLARE_ACCOUNT_ID}}` for the account ID
   - `{{D1_DATABASE_BINDING_0}}` for "MY_DATABASE"
   - `{{D1_DATABASE_ID_0}}` for the database ID

13. **Clean up and continue:**

    ```bash
    cd ..
    rm -rf basic-react-spa cf-worker-demo *-scaffolded
    ```

### What You Learned

- **Manual Templatization**: Editing files directly to replace project-specific values with placeholders
- **Auto-Detection**: make-template automatically finds project-specific values in:
  - package.json (name, description, author, repository)
  - README.md titles
  - HTML titles and content
  - JSX text content, images, links, and alt text
  - Cloudflare wrangler.jsonc configurations
- **Undo Feature**: `restore` command reverses templatization using `.template-undo.json`
- **Project Types**: Different auto-detection rules for different project types (`vite-react`, `cf-d1`, `cf-turso`)

### Expected Result

You should see:
```
🔄 Converting project to template...
📄 Generated template.json
⚙️  Generated _setup.mjs
🔄 Generated .template-undo.json
✅ Conversion complete!
```

The template is now ready and demonstrates modern React development with Vite, plus you've learned the complete make-template workflow!

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
   npm create vite@latest . -- --template react --no-interactive --immediate
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

14. **Navigate back to the workshop directory:**
   ```bash
   cd ..
   ```

15. **Create the React Router v7 SSR project:**
   ```bash
   mkdir ssr-portfolio-app
   cd ssr-portfolio-app
   npm create react-router@latest . -- --template cloudflare --yes
   npm install
   ```

16. **Install additional dependencies for D1:**
   ```bash
   npm install drizzle-orm
   npm install --save-dev drizzle-kit
   ```

17. **Set up the database schema and types:**
   ```bash
   mkdir -p app/db app/lib
   touch app/db/schema.ts app/db/client.ts drizzle.config.ts
   ```

18. **Create the database schema:**

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

19. **Create the main app structure:**

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

20. **Set up Cloudflare configuration:**

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

21. **Create database migrations:**
   ```bash
   mkdir migrations
   npx drizzle-kit generate
   ```

22. **Update package.json:**
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

23. **Convert to template:**
    ```bash
    npx make-template convert --yes
    ```

### Expected Result

A modern SSR application template with direct D1 database access, demonstrating React Router v7's server-side capabilities.

## Step 3: Create Full-Stack Portfolio Template

Finally, let's create a split-architecture full-stack application: a Cloudflare Worker API server with D1 database, and a separate React Router v7 client that fetches data from the API.

### Instructions

24. **Navigate back to the workshop directory:**
   ```bash
   cd ..
   ```

25. **Create the API server (Cloudflare Worker + D1):**
   ```bash
   mkdir portfolio-api
   cd portfolio-api
   npm create cloudflare@latest . -- --template hello-world --yes
   npm install drizzle-orm itty-router
   npm install --save-dev drizzle-kit
   ```

26. **Set up the API server structure:**
   ```bash
   mkdir -p src/db src/routes
   touch src/db/schema.ts src/db/client.ts src/routes/projects.ts src/routes/tasks.ts drizzle.config.ts
   ```

27. **Create the database schema:**

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

28. **Create API routes:**

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

29. **Update the main worker file:**

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

30. **Set up wrangler configuration:**

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

31. **Generate migrations:**
   ```bash
   npx drizzle-kit generate
   ```

32. **Create the client app in a separate directory:**
   ```bash
   cd ..
   mkdir portfolio-client
   cd portfolio-client
   npm create react-router@latest . -- --template basic --yes
   npm install
   ```

33. **Update the client app to fetch from API:**

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

34. **Update package.json files:**

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

35. **Convert both to templates:**
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

1. **Basic React SPA** - Modern frontend foundation with Vite + React (learned complete workflow in steps 1-13)
2. **SSR Portfolio App** - React Router v7 with SSR and direct D1 database access (steps 14-23)
3. **Full-Stack Portfolio** - Split architecture with API server (Workers + D1) and client app (steps 24-35)

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
- `template-workshop/basic-react-spa/` - Modern React SPA with Vite (learned complete workflow)
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