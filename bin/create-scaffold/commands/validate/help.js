export const validateHelp = {
  name: 'validate',
  usage: 'validate <template-path> [options]',
  description: 'Validate template configuration',
  detailedDescription: [
    'Validates a template directory or template.json file.',
    'Checks for required fields, valid structure, and common issues.'
  ],
  optionGroups: [{
    title: 'Options',
    options: [{
      long: '--suggest',
      desc: 'Show intelligent fix suggestions',
      detailed: ['Provide suggestions for fixing validation errors']
    }]
  }],
  examples: [
    {
      cmd: 'validate ./my-template',
      desc: 'Validate template in directory'
    },
    {
      cmd: 'validate ./template.json',
      desc: 'Validate template configuration file'
    },
    {
      cmd: 'validate ./my-template --suggest',
      desc: 'Get fix suggestions'
    }
  ]
};
