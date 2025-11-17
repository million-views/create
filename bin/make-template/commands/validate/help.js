export const validateHelp = {
  name: 'validate',
  usage: 'validate [options]',
  description: 'Validate template.json',

  detailedDescription: [
    'Validates template.json in the current directory.',
    'Checks for required fields, valid structure, and common issues.'
  ],

  optionGroups: [
    {
      title: 'Options',
      options: [
        {
          short: '-f',
          long: '--file',
          value: '<path>',
          desc: 'Specify input file path (default: template.json)',
          detailed: ['Custom path to template configuration file']
        },
        {
          long: '--suggest',
          desc: 'Show intelligent fix suggestions'
        },
        {
          long: '--fix',
          desc: 'Auto-apply safe fixes'
        }
      ]
    }
  ],

  examples: [
    { cmd: 'validate', desc: 'Validate template.json in current directory' },
    { cmd: 'validate --file my-template.json', desc: 'Validate specific file' },
    { cmd: 'validate --suggest', desc: 'Get fix suggestions' }
  ]
};
