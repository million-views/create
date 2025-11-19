export const testHelp = {
  name: 'test',
  usage: 'test <template-path> [options]',
  description: 'Test template functionality',

  detailedDescription: [
    'Test templates by creating projects and validating functionality.',
    '',
    'The testing process:',
    '  • Creates a temporary project from the template',
    '  • Validates template.json structure and metadata',
    '  • Tests placeholder resolution and restoration',
    '  • Verifies setup scripts execute correctly',
    '  • Cleans up temporary files (unless --keep-temp specified)',
    '',
    'Use --verbose for detailed output during testing phases.'
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
