export const initHelp = {
  name: 'init',
  usage: 'init [project-path] [options]',
  description: 'Initialize template configuration files',

  detailedDescription: [
    'Creates required configuration files for template creation:',
    '  • template.json - Template metadata and placeholder definitions',
    '  • .templatize.json - Templatization rules and patterns',
    '',
    'This is the first step in converting a project to a template.',
    'Run this command in the project directory you want to templatize.',
    'After initialization, edit the configuration files to customize behavior,',
    'then run \'make-template convert\' to apply the templatization.'
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
    { cmd: 'init', desc: 'Initialize in current directory' },
    { cmd: 'init ./my-project', desc: 'Initialize in specific directory' },
    {
      cmd: 'init --file my-template.json',
      desc: 'Initialize with custom template.json filename'
    }
  ],

  footer: [
    'Typical workflow:',
    '  1. make-template init                  # Create configuration files',
    '  2. Edit template.json and .templatize.json  # Customize for your project',
    '  3. make-template convert ./project     # Apply templatization',
    '',
    'Related commands:',
    '  • make-template convert - Apply templatization to project',
    '  • make-template config validate - Validate configuration files'
  ]
};
