// @ts-nocheck
export const configValidateHelp = {
  name: 'config validate',
  usage: 'config validate [config-file]',
  description: 'Validate .templatize.json configuration file',

  detailedDescription: [
    'Check the .templatize.json configuration file for syntax and semantic errors.',
    'Validates pattern definitions, file paths, and configuration structure.',
    'Run this before conversion to catch configuration issues early.'
  ],

  optionGroups: [],

  examples: [
    { cmd: 'config validate', desc: 'Validate default .templatize.json' },
    { cmd: 'config validate custom-config.json', desc: 'Validate specific configuration file' }
  ]
};
