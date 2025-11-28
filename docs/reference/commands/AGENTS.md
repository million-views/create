# Command Reference Documentation

## ⚠️ IMPORTANT: Do Not Edit Generated Files Directly

The markdown files in this directory are **generated from source help files**. Any direct edits will be overwritten.

## Source of Truth

Command documentation is defined in help modules:

```console
bin/
├── scaffold/commands/
│   ├── new/help.mts       → new.md
│   ├── list/help.mts      → list.md
│   └── validate/help.mts  → validate.md
└── template/commands/
    ├── init/help.mts      → init.md
    ├── convert/help.mts   → convert.md
    ├── restore/help.mts   → restore.md
    ├── validate/help.mts  → validate.md
    ├── hints/help.mts     → hints.md
    ├── test/help.mts      → test.md
    └── config/validate/help.mts → config-validate.md
```

## How to Update Command Documentation

1. **Edit the source help.mts file** in `bin/<tool>/commands/<command>/help.mts`
2. **Run the generator**: `node scripts/generate-cli-reference.mjs`
3. **Verify the output** in this directory

## Adding a New Command

1. Create `bin/<tool>/commands/<command>/help.mts` following the help structure pattern
2. Implement the command in `bin/<tool>/commands/<command>/index.mts`
3. Run the generator to create the documentation

## Help Structure Pattern

```typescript
export const commandHelp = {
  name: 'command-name',
  usage: 'command-name [args] [options]',
  description: 'One-line description',
  
  detailedDescription: [
    'Multi-line detailed explanation.',
    'Each array element becomes a paragraph.'
  ],
  
  optionGroups: [
    {
      title: 'Group Name',
      options: [
        {
          short: '-x',
          long: '--example',
          value: '<arg>',
          desc: 'Short description',
          detailed: ['Extended explanation']
        }
      ]
    }
  ],
  
  examples: [
    { cmd: 'command arg', desc: 'What this example does' }
  ],
  
  footer: ['Additional notes']
};
```

## Regenerating All Documentation

```bash
node scripts/generate-cli-reference.mjs
```

This updates all files in `docs/reference/commands/` based on the source help.mts files.
