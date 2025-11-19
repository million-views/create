export const initHelp = {
  name: 'init',
  usage: 'init [options]',
  description: 'Generate skeleton template.json',

  detailedDescription: [
    'Creates a skeleton template.json file with common fields.',
    'Useful for starting a new template from scratch.',
    'Must be run inside the project directory you want to templatize.'
  ],

  optionGroups: [
    {
      title: 'Options',
      options: [
        {
          short: '-f',
          long: '--file',
          value: '<path>',
          desc: 'Specify output file path (default: template.json)',
          detailed: ['Custom path for the generated template configuration']
        }
      ]
    }
  ],

  examples: [
    { cmd: 'init', desc: 'Generate template.json in current directory' },
    {
      cmd: 'init --file my-template.json',
      desc: 'Generate with custom filename'
    }
  ]
};
