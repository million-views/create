export const newHelp = {
  name: 'new',
  usage: 'new <project-name> --template <template-name> [options]',
  description: 'Create a new project from a template',

  detailedDescription: [
    'Creates a new project by cloning and configuring a template from a registry.',
    'The command fetches the specified template, processes placeholders, and sets up a working project structure.'
  ],

  optionGroups: [
    {
      title: 'Required',
      options: [
        {
          long: '--template',
          short: '-T',
          value: '<name>',
          desc: 'Template to use',
          detailed: [
            'Template identifier from a configured registry.',
            'Can be specified as:',
            '  • Short name: react-app',
            '  • Full URL: https://github.com/user/template.git',
            '  • Registry path: official/react-app'
          ]
        }
      ]
    },
    {
      title: 'Template Options',
      options: [
        {
          long: '--branch',
          short: '-b',
          value: '<name>',
          desc: 'Git branch to use (default: main/master)',
          detailed: [
            'Specify which branch to clone from the template repository'
          ]
        }
      ]
    },
    {
      title: 'Cache Options',
      options: [
        {
          long: '--no-cache',
          desc: 'Bypass cache system and clone directly',
          detailed: [
            'Skip local cache and fetch template directly from source'
          ]
        },
        {
          long: '--cache-ttl',
          value: '<hours>',
          desc: 'Override default cache TTL',
          detailed: ['Specify cache time-to-live in hours (default: 24)']
        }
      ]
    },
    {
      title: 'Placeholder Options',
      options: [
        {
          long: '--placeholder',
          value: '<NAME=value>',
          desc: 'Supply placeholder value',
          detailed: [
            'Provide placeholder values in NAME=value format. Can be specified multiple times.'
          ]
        },
        {
          long: '--experimental-placeholder-prompts',
          desc: 'Enable experimental placeholder prompting features',
          detailed: [
            'Enable advanced interactive prompting for placeholder values'
          ]
        }
      ]
    },
    {
      title: 'Interactive Options',
      options: [
        {
          long: '--no-input-prompts',
          desc: 'Suppress prompts and non-essential output'
        },
        {
          long: '--interactive',
          desc: 'Force interactive mode'
        },
        {
          long: '--no-interactive',
          desc: 'Force non-interactive mode'
        }
      ]
    },
    {
      title: 'Configuration',
      options: [
        {
          long: '--no-config',
          desc: 'Skip loading user configuration'
        },
        {
          long: '--options',
          value: '<file>',
          desc: 'Path to options file for template configuration',
          detailed: ['Load template configuration from a JSON file']
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
          long: '--log-file',
          value: '<path>',
          desc: 'Enable detailed logging to specified file'
        }
      ]
    }
  ],

  examples: [
    {
      cmd: 'new my-app --template react-app',
      desc: 'Create React app from template'
    },
    {
      cmd: 'new api-server --template express-api --branch develop',
      desc: 'Use specific branch'
    },
    {
      cmd: 'new my-app --template react-app --placeholder NAME=MyApp',
      desc: 'Provide placeholder values'
    },
    {
      cmd: 'new my-app --template react-app --no-cache',
      desc: 'Skip cache and fetch fresh'
    },
    {
      cmd: 'npm create @m5nv/scaffold my-app --template react-app',
      desc: 'Use with npm create'
    },
    {
      cmd: 'npx @m5nv/create-scaffold new my-app --template react-app',
      desc: 'Use with npx'
    }
  ]
};
