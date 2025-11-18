export const configInitHelp = {
  name: 'config init',
  usage: 'config init [options]',
  description: 'Initialize .templatize.json configuration file',

  detailedDescription: [
    'Generate a default .templatize.json configuration file for templatization.',
    'This file defines patterns for converting project content into reusable templates.',
    'Run this command before using \'make-template convert\' if no configuration exists.'
  ],

  optionGroups: [
    {
      title: 'Output',
      options: [
        {
          long: '--file',
          short: '-f',
          value: '<path>',
          desc: 'Specify output file path',
          detailed: [
            'Custom path for the configuration file.',
            'Defaults to ./.templatize.json'
          ]
        }
      ]
    }
  ],

  examples: [
    { cmd: 'config init', desc: 'Generate default .templatize.json in current directory' },
    { cmd: 'config init --file custom-config.json', desc: 'Generate config with custom filename' }
  ]
};
