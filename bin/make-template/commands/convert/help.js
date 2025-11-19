export const convertHelp = {
  name: 'convert',
  usage: 'convert <project-path> [options]',
  description: 'Convert project to template using configurable patterns',

  detailedDescription: [
    'Convert an existing project into a reusable template using configurable templatization patterns.',
    '',
    'The conversion process:',
    '  1. Reads templatization rules from .templatize.json (created by \'make-template init\')',
    '  2. Replaces project-specific values with placeholders using specified format',
    '  3. Creates .template-undo.json for restoration capabilities',
    '  4. Generates/updates template.json with detected placeholders',
    '',
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
      title: 'Templatization Options',
      options: [
        {
          long: '--placeholder-format',
          value: '<format>',
          desc: 'Specify placeholder format',
          detailed: [
            'Choose placeholder style for replacements:',
            '  • unicode  - ⦃PLACEHOLDER⦄ (default, React-friendly, avoids JSX conflicts)',
            '  • mustache - {{PLACEHOLDER}} (works everywhere, but conflicts with JSX)',
            '  • dollar   - $PLACEHOLDER$ (avoids conflicts with template literals)',
            '  • percent  - %PLACEHOLDER% (avoids conflicts with CSS/custom syntax)'
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
    },
    {
      cmd: 'convert ./my-project --placeholder-format unicode',
      desc: 'Use ⦃PLACEHOLDER⦄ format for React compatibility'
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
