export const convertHelp = {
  name: 'convert',
  usage: 'convert [project-path] [options]',
  description: 'Convert project to template using configurable patterns',

  detailedDescription: [
    'Convert an existing project into a reusable template using configurable templatization patterns.',
    '',
    'Prerequisites:',
    '  • Run \'make-template init\' first to create configuration files',
    '  • Configuration files required: template.json and .templatize.json',
    '',
    'The conversion process:',
    '  1. Validates that configuration files exist',
    '  2. Reads templatization rules from .templatize.json',
    '  3. Replaces project-specific values with placeholders using specified format',
    '  4. Creates .template-undo.json for restoration capabilities',
    '  5. Updates template.json with detected placeholders (preserves metadata)',
    '',
    'Defaults to current directory if no path specified.'
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
    { cmd: 'convert', desc: 'Convert current directory' },
    { cmd: 'convert ./my-project', desc: 'Convert specific project directory' },
    { cmd: 'convert --dry-run', desc: 'Preview changes without applying them' },
    {
      cmd: 'convert --config custom-config.json --yes',
      desc: 'Use custom config file and skip prompts'
    },
    {
      cmd: 'convert --placeholder-format dollar',
      desc: 'Use $PLACEHOLDER format for replacements'
    },
    {
      cmd: 'convert ./my-project --placeholder-format unicode',
      desc: 'Use ⦃PLACEHOLDER⦄ format for React compatibility'
    }
  ],

  footer: [
    'Related commands:',
    '  • make-template init - Initialize template configuration files',
    '  • make-template restore - Undo templatization changes',
    '  • make-template config validate - Validate configuration',
    '',
    'For detailed configuration options, see:',
    '  • docs/how-to/templatization-configuration.md',
    '  • docs/reference/templatization-patterns.md'
  ]
};
