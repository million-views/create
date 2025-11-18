export const convertHelp = {
  name: 'convert',
  usage: 'convert <project-path> [options]',
  description: 'Convert project to template using configurable patterns',

  detailedDescription: [
    'Convert an existing project into a reusable template using configurable templatization patterns.',
    'Requires a .templatize.json configuration file to specify which content to replace with placeholders.',
    'Use \'npx make-template init\' to generate a default configuration file.',
    'Always specify the project path explicitly to avoid accidental conversion.'
  ],

  optionGroups: [
    {
      title: 'Configuration',
      options: [
        {
          long: '--config',
          value: '<file>',
          desc: 'Use specific configuration file',
          detailed: [
            'Specify custom .templatize.json file path.',
            'Defaults to ./.templatize.json in project directory.'
          ]
        }
      ]
    },
    {
      title: 'Project Options',
      options: [
        {
          long: '--type',
          value: '<type>',
          desc: 'Force specific project type detection',
          detailed: [
            'Override automatic project type detection.',
            'Supported types: vite-react, next, express, generic'
          ]
        }
      ]
    },
    {
      title: 'Templatization Options',
      options: [
        {
          long: '--placeholder-format',
          value: '<format>',
          desc: 'Specify placeholder format',
          detailed: [
            'Choose placeholder style for replacements:',
            '  • mustache - {{PLACEHOLDER}} (default)',
            '  • dollar   - $PLACEHOLDER',
            '  • percent  - %PLACEHOLDER%'
          ]
        }
      ]
    },
    {
      title: 'Operation Modes',
      options: [
        {
          short: '-d',
          long: '--dry-run',
          desc: 'Preview changes without executing them'
        },
        {
          long: '--yes',
          desc: 'Skip confirmation prompts'
        },
        {
          long: '--silent',
          desc: 'Suppress prompts and non-essential output'
        }
      ]
    },
    {
      title: 'Security',
      options: [
        {
          long: '--sanitize-undo',
          desc: 'Remove sensitive data from undo log',
          detailed: [
            'Prevents sensitive data from being stored in restoration logs'
          ]
        }
      ]
    }
  ],

  examples: [
    { cmd: 'convert ./my-project', desc: 'Convert project using existing or default config' },
    { cmd: 'convert ./my-project --dry-run', desc: 'Preview templatization changes' },
    {
      cmd: 'convert ./my-project --config custom-config.json --yes',
      desc: 'Use custom config file and skip prompts'
    },
    {
      cmd: 'convert ./my-project --placeholder-format dollar',
      desc: 'Use $PLACEHOLDER format for replacements'
    }
  ],

  footer: [
    'For configuration management:',
    '  • make-template config init - Generate .templatize.json',
    '  • make-template config validate - Validate configuration',
    '',
    'For detailed configuration options, see:',
    '  • docs/how-to/templatization-configuration.md',
    '  • docs/reference/templatization-patterns.md'
  ]
};
