export const restoreHelp = {
  name: 'restore',
  usage: 'restore <project-path> [options]',
  description: 'Restore template to project',

  detailedDescription: [
    'Restore a template back to a working project state.',
    'Replaces placeholders with actual values and restores project structure.'
  ],

  optionGroups: [
    {
      title: 'Restore Scope',
      options: [
        {
          long: '--files',
          value: '<files>',
          desc: 'Restore only specified files (comma-separated)',
          detailed: ['Comma-separated list of file paths to restore']
        },
        {
          long: '--placeholders-only',
          desc: 'Restore only placeholder values, keep template structure',
          detailed: [
            'Useful for refreshing placeholder values without affecting template files'
          ]
        }
      ]
    },
    {
      title: 'Configuration',
      options: [
        {
          long: '--generate-defaults',
          desc: 'Generate .restore-defaults.json configuration',
          detailed: [
            'Creates a configuration file for default restoration values'
          ]
        }
      ]
    },
    {
      title: 'Operation Modes',
      options: [
        {
          short: '-d',
          long: '--dry-run',
          desc: 'Preview changes without executing them'
        },
        {
          long: '--yes',
          desc: 'Skip confirmation prompts'
        }
      ]
    }
  ],

  examples: [
    { cmd: 'restore ./my-template', desc: 'Restore template to working state' },
    { cmd: 'restore ./my-template --dry-run', desc: 'Preview restoration' },
    {
      cmd: 'restore ./my-template --files package.json,src/index.js',
      desc: 'Restore specific files'
    },
    {
      cmd: 'restore ./my-template --placeholders-only',
      desc: 'Only restore placeholder values'
    }
  ]
};
