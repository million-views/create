export const convertHelp = {
  name: 'convert',
  usage: 'convert <project-path> [options]',
  description: 'Convert project to template',

  detailedDescription: [
    'Convert an existing Node.js project into a reusable template.',
    'The tool replaces project-specific values with placeholders and generates template configuration.',
    'Always specify the project path explicitly to avoid accidental conversion.'
  ],

  optionGroups: [
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
      title: 'Placeholder Options',
      options: [
        {
          long: '--placeholder-format',
          value: '<format>',
          desc: 'Specify placeholder format',
          detailed: [
            'Choose placeholder style:',
            '  • mustache - {{PLACEHOLDER}}',
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
    { cmd: 'convert ./my-project', desc: 'Convert project to template' },
    { cmd: 'convert ./my-project --dry-run', desc: 'Preview conversion' },
    {
      cmd: 'convert ./my-project --type vite-react --yes',
      desc: 'Force type and skip prompts'
    },
    {
      cmd: 'convert ./my-project --placeholder-format mustache',
      desc: 'Use specific placeholder style'
    }
  ]
};
