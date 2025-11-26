tree tui-design-sample/
tui-design-sample/
├── design-doc.md
├── design-prompt.md
├── package.json
└── src
    ├── cli.js
    ├── commands
    │   ├── clean
    │   │   ├── cleaner.js
    │   │   ├── help.js
    │   │   └── index.js
    │   └── create
    │       ├── builder.js
    │       ├── help.js
    │       ├── index.js
    │       └── validator.js
    ├── lib
    │   └── base-command.js
    ├── router.js
    └── tests
        ├── commands
        │   ├── clean.test.js
        │   └── create.test.js
        ├── helpers.js
        ├── modules
        │   └── validator.test.js
        └── router.test.js