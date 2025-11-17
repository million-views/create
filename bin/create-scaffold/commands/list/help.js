export const listHelp = {
  name: 'list',
  usage: 'list [options]',
  description: 'List available templates',

  detailedDescription: [
    'Display templates from configured registries.',
    'Shows templates from user-defined and official registries.'
  ],

  optionGroups: [
    {
      title: 'Options',
      options: [
        {
          long: '--registry',
          value: '<name>',
          desc: 'Registry to list templates from',
          detailed: [
            'Filter templates by specific registry.',
            'If not specified, shows all registries.'
          ]
        },
        {
          long: '--format',
          value: '<format>',
          desc: 'Output format (table|json, default: table)',
          detailed: [
            'Choose output format:',
            '  • table - Human-readable table format',
            '  • json  - Machine-readable JSON format'
          ]
        },
        {
          long: '--verbose',
          desc: 'Show detailed information'
        }
      ]
    }
  ],

  examples: [
    { cmd: 'list', desc: 'List all templates from all registries' },
    {
      cmd: 'list --registry official',
      desc: 'List templates from official registry'
    },
    { cmd: 'list --format json', desc: 'Output in JSON format' }
  ]
};
