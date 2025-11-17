import { buildValidateHelp } from '../../../../lib/cli/help-utils.mjs';

export const validateHelp = buildValidateHelp({
  name: 'validate',
  usage: 'validate [options]',
  description: 'Validate template.json',
  detailedDescription: [
    'Validates template.json in the current directory.',
    'Checks for required fields, valid structure, and common issues.'
  ],
  includeFile: true,
  target: 'template.json'
});
