// @ts-nocheck
export const validateHelp = {
  name: 'validate',
  usage: 'validate [options]',
  description: 'Validate template.json',
  detailedDescription: [
    'Validates template.json in the current directory.',
    'Checks for required fields, valid structure, and common issues.'
  ],
  optionGroups: [{
    title: 'Options',
    options: [
      {
        short: '-f',
        long: '--file',
        value: '<path>',
        desc: 'Specify input file path',
        detailed: ['Custom path to configuration file']
      },
      {
        long: '--suggest',
        desc: 'Show intelligent fix suggestions',
        detailed: ['Provide suggestions for fixing validation errors']
      }
    ]
  }],
  examples: [
    {
      cmd: 'validate template.json',
      desc: 'Validate template.json in current directory'
    },
    {
      cmd: 'validate --file my-template.json',
      desc: 'Validate specific file'
    },
    {
      cmd: 'validate --file template.json --suggest',
      desc: 'Get fix suggestions'
    }
  ]
};
