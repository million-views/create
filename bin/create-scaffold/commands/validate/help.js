export const validateHelp = {
  name: 'validate',
  usage: 'validate <template-path> [options]',
  description: 'Validate template configuration',

  detailedDescription: [
    'Validates a template directory or template.json file.',
    'Checks for required fields, valid structure, and common issues.'
  ],

  optionGroups: [
    {
      title: 'Options',
      options: [
        {
          long: '--suggest',
          desc: 'Show intelligent fix suggestions',
          detailed: ['Provide suggestions for fixing validation errors']
        },
        {
          long: '--fix',
          desc: 'Auto-apply safe fixes',
          detailed: [
            'Automatically fix issues that can be safely corrected.',
            'Manual review recommended after automated fixes.'
          ]
        }
      ]
    }
  ],

  examples: [
    { cmd: 'validate ./my-template', desc: 'Validate template in directory' },
    {
      cmd: 'validate ./template.json',
      desc: 'Validate template configuration file'
    },
    { cmd: 'validate ./my-template --suggest', desc: 'Get fix suggestions' },
    { cmd: 'validate ./my-template --fix', desc: 'Auto-fix safe issues' }
  ]
};
