// @ts-nocheck
export const listHelp = {
  name: 'list',
  usage: 'list [options]',
  description: 'List templates from a registry repository',

  detailedDescription: [
    'Display templates from a registry repository.',
    'By default, lists templates from the official million-views/templates registry.',
    'Use --registry to specify a different repository URL or configured registry name.',
    '',
    'Registries are Git repositories containing template directories.',
    'Each template directory should contain project files like package.json, template.json, etc.',
    'If a repository contains a single template, --template is not needed when using it.',
    'If a repository contains multiple templates, --template specifies which directory to use.'
  ],

  optionGroups: [
    {
      title: 'Options',
      options: [
        {
          long: '--registry',
          value: '<name-or-url>',
          desc: 'Registry to list templates from',
          detailed: [
            'Specify a registry by name (from .m5nvrc) or repository URL.',
            'If not specified, uses the default million-views/templates registry.',
            'Examples: --registry my-templates, --registry https://github.com/user/repo.git'
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
    { cmd: 'list', desc: 'List templates from default registry (million-views/templates)' },
    {
      cmd: 'list --registry https://github.com/user/templates.git',
      desc: 'List templates from a specific repository URL'
    },
    {
      cmd: 'list --registry my-templates',
      desc: 'List templates from a configured registry shortcut'
    },
    { cmd: 'list --format json', desc: 'Output template information in JSON format' },
    { cmd: 'list --verbose', desc: 'Show detailed template information including versions and authors' }
  ]
};
