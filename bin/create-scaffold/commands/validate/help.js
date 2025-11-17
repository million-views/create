import { buildValidateHelp } from '../../../../lib/cli/help-utils.mjs';

export const validateHelp = buildValidateHelp({
  name: 'validate',
  usage: 'validate <template-path> [options]',
  description: 'Validate template configuration',
  detailedDescription: [
    'Validates a template directory or template.json file.',
    'Checks for required fields, valid structure, and common issues.'
  ],
  includeJson: true,
  target: './my-template'
});
