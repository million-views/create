# Dry Run Transcript

Captured on 2024-11-05 to document the stabilized dry-run summary format.

Command:
```bash
HOME=$PWD/tmp/home node ./bin/index.mjs \
  preview-project \
  --template react-vite \
  --repo $PWD/tmp/local-templates \
  --dry-run
```

Output:
```console
🔍 DRY RUN MODE - Preview of planned operations (no changes will be made)

📦 Template: react-vite
🌐 Repository: /Users/vijay/workspaces/ws-million-views/create/tmp/local-templates
📁 Target Directory: preview-project
🗂️ Template Path: /Users/vijay/workspaces/ws-million-views/create/tmp/home/.m5nv/cache/9ee6c9fb6c249b31/react-vite

📄 Summary:
   • Directories: 1
   • Files: 7
   • Setup Scripts: 1

📋 File Copy (7 total):
   • ./ (4 files)
   • templates/ (3 files)

📁 Directory Creation (1 operations):
   📁 Ensure directory: templates

⚙️ Setup Script (1 operations):
   ⚙️ Execute setup script: _setup.mjs

📊 Total operations: 9
💡 Dry run only – no changes will be made.

🌲 Template structure (depth 2):
/Users/vijay/workspaces/ws-million-views/create/tmp/home/.m5nv/cache/9ee6c9fb6c249b31/react-vite
├── README.md
├── _setup.mjs
├── index.js
├── package.json
├── template.json
└── templates
    ├── api-handler.js.tpl
    ├── auth-service.js.tpl
    └── test.spec.js.tpl

✅ Dry run completed - no actual changes were made
```
