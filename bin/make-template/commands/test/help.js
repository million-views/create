export const testHelp = {
  name: 'test',
  usage: 'test <template-path> [options]',
  description: 'Test template functionality',

  detailedDescription: [
    'Tests a template by performing a trial conversion and restoration.',
    'Verifies that the template works correctly end-to-end.'
  ],

  optionGroups: [
    {
      title: 'Options',
      options: [
        {
          long: '--verbose',
          desc: 'Show detailed test output'
        },
        {
          long: '--keep-temp',
          desc: 'Preserve temporary directories after testing'
        }
      ]
    }
  ],

  examples: [
    { cmd: 'test ./my-template', desc: 'Test template functionality' },
    { cmd: 'test ./my-template --verbose', desc: 'Test with detailed output' }
  ]
};
